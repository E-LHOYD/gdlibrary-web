// Shelves live at shelves/{userId}/userShelves/{shelfId}, the same layout the
// mobile app and the dashboard's analytics both read, so a shelf made on the
// web is the same shelf everywhere.

import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '$lib/firebase';

export const MAX_CUSTOM_SHELVES = 10;

export function getCurrentUserId() {
	return auth.currentUser?.uid || null;
}

/** @param {string} userId */
function shelvesRef(userId) {
	return collection(db, 'shelves', userId, 'userShelves');
}

/**
 * Every shelf the user has, seeding the two built-in ones the first time.
 * @param {string} userId
 */
export async function getUserShelves(userId) {
	if (!userId) return [];

	const snapshot = await getDocs(shelvesRef(userId));
	const shelves = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

	// Read and Viewed are implied rather than created up front, so a user who
	// has never opened a book still gets both shelves.
	if (!shelves.some((s) => s.isReadShelf)) {
		shelves.push({ id: 'read', name: 'Read', isReadShelf: true, isViewedShelf: false, bookIds: [] });
	}
	if (!shelves.some((s) => s.isViewedShelf)) {
		shelves.push({
			id: 'viewed',
			name: 'Viewed',
			isReadShelf: false,
			isViewedShelf: true,
			bookIds: []
		});
	}

	return shelves;
}

/** @param {string} userId @param {any} shelf */
export async function saveShelf(userId, shelf) {
	if (!userId || !shelf?.id) return false;

	try {
		await setDoc(doc(db, 'shelves', userId, 'userShelves', shelf.id), shelf, { merge: true });
		return true;
	} catch (error) {
		console.error('Could not save shelf:', error);
		return false;
	}
}

/** @param {string} userId @param {string} name */
export async function createCustomShelf(userId, name) {
	const trimmed = String(name || '').trim();
	if (!userId || !trimmed) throw new Error('A shelf needs a name.');

	const shelves = await getUserShelves(userId);
	const custom = shelves.filter((s) => !s.isReadShelf && !s.isViewedShelf);

	if (custom.length >= MAX_CUSTOM_SHELVES) {
		throw new Error(`You can have at most ${MAX_CUSTOM_SHELVES} shelves.`);
	}

	if (custom.some((s) => String(s.name).toLowerCase() === trimmed.toLowerCase())) {
		throw new Error('You already have a shelf with that name.');
	}

	const shelf = {
		id: `shelf_${Date.now()}`,
		name: trimmed,
		isReadShelf: false,
		isViewedShelf: false,
		bookIds: []
	};

	await saveShelf(userId, shelf);
	return shelf;
}

/** @param {string} userId @param {string} shelfId @param {string} bookId */
export async function addBookToShelf(userId, shelfId, bookId) {
	if (!userId || !shelfId || !bookId) return false;

	const shelves = await getUserShelves(userId);
	const shelf = shelves.find((s) => s.id === shelfId);
	if (!shelf) return false;

	if ((shelf.bookIds || []).includes(bookId)) return true;

	shelf.bookIds = [...(shelf.bookIds || []), bookId];
	return saveShelf(userId, shelf);
}

/** @param {string} userId @param {string} shelfId @param {string} bookId */
export async function removeBookFromShelf(userId, shelfId, bookId) {
	if (!userId || !shelfId || !bookId) return false;

	const shelves = await getUserShelves(userId);
	const shelf = shelves.find((s) => s.id === shelfId);
	if (!shelf) return false;

	shelf.bookIds = (shelf.bookIds || []).filter((id) => id !== bookId);
	return saveShelf(userId, shelf);
}

/**
 * Take several books off a shelf at once.
 *
 * Not a loop over removeBookFromShelf: that reads the shelf and writes the
 * whole bookIds array back, so two of them in flight together would each write
 * an array built before the other's removal, and one removal would vanish. One
 * read, one write, all the books.
 *
 * @param {string} userId
 * @param {string} shelfId
 * @param {string[]} bookIds
 */
export async function removeBooksFromShelf(userId, shelfId, bookIds) {
	if (!userId || !shelfId || !Array.isArray(bookIds) || bookIds.length === 0) return false;

	const shelves = await getUserShelves(userId);
	const shelf = shelves.find((s) => s.id === shelfId);
	if (!shelf) return false;

	const dropping = new Set(bookIds);
	shelf.bookIds = (shelf.bookIds || []).filter((id) => !dropping.has(id));

	return saveShelf(userId, shelf);
}

/** @param {string} userId @param {string} shelfId */
export async function deleteCustomShelf(userId, shelfId) {
	if (!userId || !shelfId) return false;
	// The built-in shelves are derived, not stored, so there is nothing to delete
	// and removing them would only make them reappear.
	if (shelfId === 'read' || shelfId === 'viewed') return false;

	try {
		await deleteDoc(doc(db, 'shelves', userId, 'userShelves', shelfId));
		return true;
	} catch (error) {
		console.error('Could not delete shelf:', error);
		return false;
	}
}
