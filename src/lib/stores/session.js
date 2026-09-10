// Who is signed in, and their Firestore profile.
//
// The app reads the profile in every component that needs it; on the web one
// store is loaded once and shared, so a page can render as soon as it has what
// it needs rather than each doing its own round trip.

import { writable, derived } from 'svelte/store';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { auth, db } from '$lib/firebase';

/** @type {import('svelte/store').Writable<{loading: boolean, user: any, profile: any}>} */
export const session = writable({ loading: true, user: null, profile: null });

export const isSignedIn = derived(session, ($s) => Boolean($s.user));

let started = false;

/**
 * Where a signed-in user's profile lives in Firestore.
 *
 * Accounts made by the app and the dashboard's register page are stored under
 * the Auth uid, which is checked first. Anything written another way (an added
 * document with a generated id) still carries the uid or the email, so those
 * are tried next rather than showing the reader an empty profile.
 *
 * @param {{ uid: string, email?: string | null }} user
 * @returns {Promise<import('firebase/firestore').DocumentReference | null>}
 */
export async function findProfileRef(user) {
	const byId = doc(db, 'users', user.uid);
	const snapshot = await getDoc(byId);
	if (snapshot.exists()) return byId;

	const lookups = [where('uid', '==', user.uid)];
	if (user.email) lookups.push(where('email', '==', user.email));

	for (const condition of lookups) {
		try {
			const found = await getDocs(query(collection(db, 'users'), condition, limit(1)));
			if (!found.empty) return found.docs[0].ref;
		} catch (error) {
			// Security rules may refuse a query that a direct read would pass; the
			// next lookup, or no profile at all, is the answer then.
			console.error('Could not look the profile up:', error);
		}
	}

	return null;
}

/** Begin watching auth state. Safe to call more than once. */
export function startSession() {
	if (started || typeof window === 'undefined') return;
	started = true;

	onAuthStateChanged(auth, async (user) => {
		if (!user) {
			session.set({ loading: false, user: null, profile: null });
			return;
		}

		// The user is published before the profile is fetched, not after. The
		// layout sends anyone without a user to the login page, so holding the
		// user back for the length of a Firestore round trip meant a fresh
		// sign-in was briefly indistinguishable from being signed out, and the
		// guard bounced it straight back to /login. Fast networks hid it; slow
		// ones did not.
		session.set({ loading: false, user, profile: null });

		let profile = null;

		try {
			const ref = await findProfileRef(user);
			const snapshot = ref ? await getDoc(ref) : null;
			profile = snapshot?.exists() ? snapshot.data() : null;
		} catch (error) {
			// A missing or unreadable profile should not lock anyone out; pages
			// that need it say so themselves.
			console.error('Could not read the user profile:', error);
		}

		// Ignored if someone signed out, or signed in as someone else, while
		// this was in flight: that newer state is the true one.
		session.update((current) =>
			current.user?.uid === user.uid ? { ...current, profile } : current
		);
	});
}

export async function signOut() {
	await fbSignOut(auth);
}
