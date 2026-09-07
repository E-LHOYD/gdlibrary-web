// Reading progress, shared with the mobile app through the same Firestore
// collection, so a book read on the web shows the same percentage in the app.

import {
	collection,
	doc,
	getDocs,
	query,
	where,
	setDoc,
	deleteDoc,
	getDoc
} from 'firebase/firestore';
import { auth, db } from '$lib/firebase';

// Page 1 alone is always just "viewed", whatever the percentage says: in a ten
// page book the first page is already 10%, so percentage on its own would call
// an unopened book read.
const READ_THRESHOLD_PERCENT = 10;

export function getCurrentUserId() {
	return auth.currentUser?.uid || null;
}

/** One document per user per book, so the id is deterministic. */
function progressId(userId, bookId) {
	return `${userId}_${bookId}`;
}

/** @param {string} bookId */
export async function getReadingProgress(bookId) {
	const userId = getCurrentUserId();
	if (!userId || !bookId) return null;

	try {
		const snapshot = await getDoc(doc(db, 'readingProgress', progressId(userId, bookId)));
		return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
	} catch (error) {
		console.error('Could not read progress:', error);
		return null;
	}
}

/**
 * @param {string} bookId
 * @param {number} currentPage
 * @param {number} totalPages
 * @param {number} percentage
 */
export async function saveReadingProgress(bookId, currentPage, totalPages, percentage) {
	const userId = getCurrentUserId();
	if (!userId || !bookId) return false;

	try {
		await setDoc(
			doc(db, 'readingProgress', progressId(userId, bookId)),
			{
				userId,
				bookId,
				currentPage,
				totalPages,
				percentage,
				lastReadAt: new Date(),
				status:
					currentPage <= 1
						? 'viewed'
						: percentage >= READ_THRESHOLD_PERCENT
							? 'read'
							: 'viewed'
			},
			{ merge: true }
		);
		return true;
	} catch (error) {
		console.error('Could not save progress:', error);
		return false;
	}
}

/** Every progress record for the signed-in user, in one query. */
export async function getAllReadingProgress() {
	const userId = getCurrentUserId();
	if (!userId) return [];

	try {
		const snapshot = await getDocs(
			query(collection(db, 'readingProgress'), where('userId', '==', userId))
		);
		return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
	} catch (error) {
		console.error('Could not read progress:', error);
		return [];
	}
}

/** @param {'read'|'viewed'} status */
async function bookIdsWithStatus(status) {
	const all = await getAllReadingProgress();
	return all.filter((entry) => entry.status === status).map((entry) => entry.bookId);
}

export function getReadBookIds() {
	return bookIdsWithStatus('read');
}

export function getViewedBookIds() {
	return bookIdsWithStatus('viewed');
}

/** @param {string} bookId */
export async function deleteReadingProgress(bookId) {
	const userId = getCurrentUserId();
	if (!userId || !bookId) return false;

	try {
		await deleteDoc(doc(db, 'readingProgress', progressId(userId, bookId)));
		return true;
	} catch (error) {
		console.error('Could not delete progress:', error);
		return false;
	}
}
