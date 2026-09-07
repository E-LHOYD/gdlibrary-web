// Picking which books to put in front of a student.
//
// Three things decide the list, in this order:
//
//   year level  a filter. A book aimed at Grade 11 is not offered to a college
//               student, and a book with no level set suits everyone.
//   subjects    a filter, then a ranking. A student is not shown books from
//               outside their subjects, and within what is left the closest
//               matches come first.
//   chance      the tie-breaker. Books on the same score are shuffled, so the
//               page looks different each visit without a refresh button.
//
// A student's subjects come from two places, and they are not worth the same.
// The interests they picked at signup are an explicit choice, so they outweigh
// the subjects merely implied by their strand or course.

import { DEFAULT_SUBJECTS, bookSubjects } from './subjects.js';
import { matchesYearLevel, studentLevel } from './yearLevels.js';
import { getSubjectsForProgram, getSubjectsForDepartment } from './mappings.js';

// An interest chosen by hand counts double a subject inferred from a strand.
const INTEREST_WEIGHT = 2;
const TRACK_WEIGHT = 1;

// Which subjects each strand or course leans on. Only the canonical subject
// labels appear here, so every entry can actually match a book.
const TRACK_SUBJECTS = {
    // Senior high strands
    STEM: ['Math', 'Science', 'Computer', 'English'],
    ABM: ['Business', 'Math', 'English'],
    HUMSS: ['Literature', 'English', 'Filipino', 'Arts'],
    GAS: ['English', 'Filipino', 'Math', 'Science', 'Literature'],
    TVL: ['Computer', 'Business', 'Health'],
    'ARTS & DESIGN': ['Arts', 'Music', 'Literature'],

    // College courses
    BSCS: ['Computer', 'Math', 'English'],
    BSIT: ['Computer', 'Math', 'English'],
    BSIS: ['Computer', 'Business', 'Math'],
    BSBA: ['Business', 'Math', 'English']
};

// Signup used to offer sixteen interests of its own before it was pointed at
// the library's subject list. Accounts made then still hold labels no book can
// carry, and reading them literally would leave those students matching
// nothing. The ones with an obvious home are translated; History and Culinary
// Arts have none, so they are dropped rather than forced somewhere wrong.
const LEGACY_INTERESTS = {
    mathematics: 'Math',
    'computer science': 'Computer',
    technology: 'Computer',
    biology: 'Science',
    chemistry: 'Science',
    physics: 'Science'
};

const CANONICAL_SUBJECTS = new Map(DEFAULT_SUBJECTS.map((s) => [s.toLowerCase(), s]));

/**
 * The student's strand or course, whichever their signup filled in.
 * @param {any} user
 * @returns {string}
 */
export function studentTrack(user) {
    const raw = user?.strand || user?.course || '';
    return typeof raw === 'string' ? raw.trim() : '';
}

/**
 * The teacher's department, if applicable.
 * @param {any} user
 * @returns {string}
 */
export function teacherDepartment(user) {
    const raw = user?.department || '';
    return typeof raw === 'string' ? raw.trim() : '';
}

/**
 * The subjects a track leans on, or an empty list if the track is unknown.
 *
 * Matching is loose on purpose: signup takes the strand and course as free
 * text, so "bscs", "BS Computer Science" and "BSCS " all have to land on the
 * same entry.
 *
 * Now uses dynamic Firestore mappings first, then falls back to default TRACK_SUBJECTS.
 *
 * @param {string} track
 * @returns {Promise<string[]>}
 */
export async function subjectsForTrack(track) {
    if (typeof track !== 'string' || !track.trim()) return [];

    // Try dynamic mappings first
    const dynamicSubjects = await getSubjectsForProgram(track);
    if (dynamicSubjects.length > 0) {
        return dynamicSubjects;
    }

    // Fall back to default TRACK_SUBJECTS
    const text = track.trim().toUpperCase();

    if (TRACK_SUBJECTS[text]) return TRACK_SUBJECTS[text];

    for (const [key, subjects] of Object.entries(TRACK_SUBJECTS)) {
        if (text.includes(key)) return subjects;
    }

    // A few spelled-out forms that carry no course code.
    if (text.includes('COMPUTER') || text.includes('INFORMATION TECH')) return TRACK_SUBJECTS.BSCS;
    if (text.includes('BUSINESS') || text.includes('ACCOUNT')) return TRACK_SUBJECTS.BSBA;
    if (text.includes('ARTS') || text.includes('DESIGN')) return TRACK_SUBJECTS['ARTS & DESIGN'];

    return [];
}

/**
 * The interests a student chose, as subjects a book can actually carry.
 *
 * Anything that cannot be matched to a subject is dropped, so it neither ranks
 * a book nor narrows the list to nothing.
 *
 * @param {any} user
 * @returns {string[]}
 */
export function interestSubjects(user) {
    if (!Array.isArray(user?.interests)) return [];

    const out = [];

    for (const raw of user.interests) {
        if (typeof raw !== 'string') continue;

        const text = raw.trim().toLowerCase();
        if (!text) continue;

        const subject = CANONICAL_SUBJECTS.get(text) ?? LEGACY_INTERESTS[text];
        if (subject && !out.includes(subject)) out.push(subject);
    }

    return out;
}

/**
 * How closely a book fits, counting an interest twice over a track subject.
 * @param {any} book
 * @param {string[]} interests
 * @param {string[]} trackSubjects
 * @param {string[]} [departmentSubjects]
 * @returns {number}
 */
export function scoreBook(book, interests, trackSubjects, departmentSubjects = []) {
    let score = 0;

    for (const subject of bookSubjects(book)) {
        if (interests.includes(subject)) score += INTEREST_WEIGHT;
        if (trackSubjects.includes(subject)) score += TRACK_WEIGHT;
        if (departmentSubjects.includes(subject)) score += TRACK_WEIGHT;
    }

    return score;
}

/** Fisher-Yates, in place. */
function shuffle(items) {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
}

/**
 * Books to recommend to a student, closest fit first.
 *
 * @param {any[]} books
 * @param {any} user
 * @param {number} [limit]
 * @returns {Promise<any[]>}
 */
export async function recommendBooks(books, user, limit = 20) {
    if (!Array.isArray(books)) return [];

    const interests = interestSubjects(user);
    const trackSubjects = await subjectsForTrack(studentTrack(user));
    
    // For teachers, also get department subjects
    let departmentSubjects = [];
    if (user?.role === 'teacher' || user?.role === 'Teacher') {
        departmentSubjects = await getSubjectsForDepartment(teacherDepartment(user));
    }
    
    const preferred = [...new Set([...interests, ...trackSubjects, ...departmentSubjects])];

    const usable = books.filter((book) => book && book.title);

    // Year level is a filter, but not one worth showing an empty page over.
    // A library whose books are tagged for other years would otherwise leave
    // this student with nothing at all, the same way the subject filter below
    // is allowed to relax rather than empty the list.
    const atLevel = usable.filter((book) => matchesYearLevel(book, user));
    const inScope = atLevel.length > 0 ? atLevel : usable;

    // Keeping a student inside their own subjects is the point of the filter,
    // but an empty page is worse than a loose one: if nothing survives, the
    // whole year-appropriate library is shown rather than nothing at all.
    let candidates = inScope;

    if (preferred.length > 0) {
        const onSubject = inScope.filter((book) =>
            bookSubjects(book).some((subject) => preferred.includes(subject))
        );

        if (onSubject.length > 0) candidates = onSubject;
    }

    // Grouped by score so the closest fits lead, shuffled inside each group so
    // equally good books take turns at the top.
    const byScore = new Map();

    for (const book of candidates) {
        const score = scoreBook(book, interests, trackSubjects, departmentSubjects);
        if (!byScore.has(score)) byScore.set(score, []);
        byScore.get(score).push(book);
    }

    const ordered = [...byScore.keys()]
        .sort((a, b) => b - a)
        .flatMap((score) => shuffle(byScore.get(score)));

    return ordered.slice(0, limit);
}

/**
 * A short line describing why these books were chosen, shown above the list so
 * the page is not a black box.
 * @param {any} user
 * @returns {Promise<string>}
 */
export async function recommendationReason(user) {
    const level = studentLevel(user);
    const interests = interestSubjects(user);
    const trackSubjects = await subjectsForTrack(studentTrack(user));
    
    // For teachers, also get department subjects
    let departmentSubjects = [];
    if (user?.role === 'teacher' || user?.role === 'Teacher') {
        departmentSubjects = await getSubjectsForDepartment(teacherDepartment(user));
    }

    if (!level && interests.length === 0 && trackSubjects.length === 0 && departmentSubjects.length === 0) {
        return 'Showing the whole library. Add your year level, strand or course, and interests to get a shorter list.';
    }

    const parts = [];

    if (level) parts.push(`for ${level}`);
    if (interests.length > 0) parts.push(`led by your interests in ${interests.join(', ')}`);

    // Only the track/department subjects the interests have not already claimed, so the
    // sentence does not name the same subject twice. Reads as a follow-on when
    // there are interests to follow, and stands alone when there are not.
    const extra = [...trackSubjects, ...departmentSubjects].filter((s) => !interests.includes(s));

    if (extra.length > 0) {
        parts.push(`${interests.length > 0 ? 'then' : 'leaning on'} ${extra.join(', ')}`);
    }

    return `Books ${parts.join(', ')}.`;
}
