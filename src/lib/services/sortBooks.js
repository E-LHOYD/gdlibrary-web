// Ordering a shelf's books.
//
// Shelves arrive in whatever order the shelf document happens to list them,
// which is the order books were added. That is rarely the order anyone wants to
// read them in, so every shelf list can be sorted by what it shows.

/** A value with nothing worth ordering by. */
function isBlank(value) {
    return value === null || value === undefined || value === '';
}

/**
 * The moment a book was last opened, as a number, or null.
 *
 * Reading progress stores lastReadAt through the Firebase plugin, so it can
 * come back as a Firestore Timestamp, a Date, or a string depending on whether
 * it was just written locally or read back from the server. All three have to
 * compare the same way.
 *
 * @param {any} value
 * @returns {number|null}
 */
export function toTimestamp(value) {
    if (!value) return null;

    if (typeof value.toDate === 'function') {
        const date = value.toDate();
        return date instanceof Date && !isNaN(date.getTime()) ? date.getTime() : null;
    }

    if (value instanceof Date) {
        return isNaN(value.getTime()) ? null : value.getTime();
    }

    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed.getTime();
}

/**
 * Sort a copy of the books. Blanks always sort last, whichever direction is
 * chosen: a shelf where half the books have never been opened is no use if
 * ascending buries the ones that have, and flipping the direction should not
 * just move the gap to the top instead.
 *
 * @param {any[]} books
 * @param {(book: any) => any} accessor
 * @param {'asc'|'desc'} direction
 * @returns {any[]}
 */
export function sortBooks(books, accessor, direction = 'asc') {
    if (!Array.isArray(books) || typeof accessor !== 'function') return books || [];

    const sign = direction === 'desc' ? -1 : 1;

    return [...books].sort((a, b) => {
        const av = accessor(a);
        const bv = accessor(b);

        const aBlank = isBlank(av);
        const bBlank = isBlank(bv);

        if (aBlank && bBlank) return 0;
        if (aBlank) return 1;
        if (bBlank) return -1;

        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sign;

        return String(av).localeCompare(String(bv), undefined, {
            sensitivity: 'base',
            numeric: true
        }) * sign;
    });
}
