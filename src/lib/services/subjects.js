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
