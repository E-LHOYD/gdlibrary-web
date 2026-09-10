// Choosing the order the library is shown in.
//
// recommendBooks filters as well as ranks, which is right for a list of
// recommendations and wrong for the library as a whole: a student browsing the
// library should still be able to reach every book. So the library ranks with
// the same scoring but keeps everything.

import { recommendBooks } from './recommendations.js';

/**
 * Every book, best fit first, nothing removed.
 * @param {any[]} books
 * @param {any} profile
 */
export async function rankOrRecommend(books, profile) {
	if (!Array.isArray(books)) return [];
	if (!profile) return books;

	try {
		const recommended = await recommendBooks(books, profile, Number.MAX_SAFE_INTEGER);
		const seen = new Set(recommended.map((b) => b.id));
		// Anything the recommendation filter dropped goes underneath, so the list
		// is still the whole library.
		return [...recommended, ...books.filter((b) => !seen.has(b.id))];
	} catch (error) {
		console.error('Could not rank the library:', error);
		return books;
	}
}
