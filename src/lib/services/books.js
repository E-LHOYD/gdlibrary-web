// Loading books, in one place.
//
// The mobile app repeats this mapping in five components, which is how the
// cover URL came to be missing from some of them. Here every screen loads books
// through loadBooks, so they all see the same fields.

import { collection, getDocs } from 'firebase/firestore';
import { db } from '$lib/firebase';

/** @param {any} data @param {string} id */
function toBook(data, id) {
	return {
		id,
		title: data.title ?? '',
		author: data.author ?? '',
		detail: data.detail || '',
		fileUrl: data.fileUrl || null,
		coverUrl: data.coverUrl || null,
		// Kept as written so bookSubjects can read either the list or the older
		// single string.
		subjects: data.subjects || null,
		subject: data.subject || null,
		yearLevels: data.yearLevels || null,
		publishedDate: data.publishedDate || null,
		releaseDate: data.releaseDate || null
	};
}

/** Every book in the library. */
export async function loadBooks() {
	const snapshot = await getDocs(collection(db, 'books'));
	return snapshot.docs.map((doc) => toBook(doc.data(), doc.id));
}

/**
 * Matches on title or author, case-insensitively. Every whitespace-separated
 * term must appear somewhere, so "growth thompson" finds a book by matching one
 * word against the title and the other against the author.
 * @param {any} book
 * @param {string[]} terms
 */
export function matchesSearch(book, terms) {
	const haystack = `${book?.title ?? ''} ${book?.author ?? ''}`.toLowerCase();
	return terms.every((term) => haystack.includes(term));
}

/** @param {string} query */
export function searchTerms(query) {
	return String(query || '')
		.trim()
		.toLowerCase()
		.split(/\s+/)
		.filter(Boolean);
}
