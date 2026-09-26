import { writable, get } from 'svelte/store';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '$lib/firebase';

// The fixed set of subject labels a book can carry. A book may have several.
//
// This list mirrors the one in the admin dashboard. Both sides must agree, or
// the app groups by labels the dashboard never writes. The dashboard now
// manages subjects dynamically, but this constant remains for backwards
// compatibility and as a default fallback.
export const DEFAULT_SUBJECTS = [
    'Math',
    'Science',
    'Filipino',
    'Business',
    'Computer',
    'Physical Education',
    'Health',
    'English',
    'Arts',
    'Music',
    'Literature'
];

// Default subjects export for backwards compatibility
export const SUBJECTS = DEFAULT_SUBJECTS;

/**
 * Every subject in the Firestore `subjects` collection, as managed on the
 * dashboard's Subjects page. Starts as DEFAULT_SUBJECTS and is replaced once
 * loadAllSubjects() resolves. No status filter: every subject is included.
 */
export const allSubjects = writable(DEFAULT_SUBJECTS);

/** @type {Promise<string[]> | null} */
let loading = null;

/**
 * Fetch every subject document (no isActive/status condition) and publish the
 * names to `allSubjects`. Falls back to DEFAULT_SUBJECTS only when the
 * collection is empty or cannot be read. Call from the browser (onMount).
 * @param {boolean} [force] refetch even if already loaded
 * @returns {Promise<string[]>}
 */
export function loadAllSubjects(force = false) {
    if (loading && !force) return loading;

    loading = getDocs(collection(db, 'subjects'))
        .then((snapshot) => {
            /** @type {string[]} */
            const names = [];
            snapshot.forEach((doc) => {
                const name = doc.data()?.name;
                if (typeof name === 'string' && name.trim() && !names.includes(name.trim())) {
                    names.push(name.trim());
                }
            });
            names.sort((a, b) => a.localeCompare(b));
            const list = names.length ? names : DEFAULT_SUBJECTS;
            allSubjects.set(list);
            return list;
        })
        .catch((error) => {
            console.error('Error loading subjects:', error);
            loading = null; // allow a retry later
            return get(allSubjects);
        });

    return loading;
}

/**
 * The canonical spelling of a subject name, matched case-insensitively
 * against every known subject, or undefined if it is not one.
 * @param {string} text
 * @returns {string | undefined}
 */
export function canonicalSubject(text) {
    const key = String(text ?? '').trim().toLowerCase();
    if (!key) return undefined;
    return get(allSubjects).find((s) => s.toLowerCase() === key)
        ?? DEFAULT_SUBJECTS.find((s) => s.toLowerCase() === key);
}

/**
 * The subjects a book carries, tolerating the older single-string field.
 * Books written before subjects became a list stored one `subject` string,
 * sometimes comma separated, so that is split rather than read as one label.
 * @param {any} book
 * @returns {string[]}
 */
export function bookSubjects(book) {
    if (Array.isArray(book?.subjects)) {
        return book.subjects.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim());
    }

    if (typeof book?.subject === 'string' && book.subject.trim()) {
        return book.subject
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    }

    return [];
}

/**
 * True if the book carries the given subject.
 * @param {any} book
 * @param {string} subject
 * @returns {boolean}
 */
export function hasSubject(book, subject) {
    return bookSubjects(book).includes(subject);
}
