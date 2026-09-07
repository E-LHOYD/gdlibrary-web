// Who is signed in, and their Firestore profile.
//
// The app reads the profile in every component that needs it; on the web one
// store is loaded once and shared, so a page can render as soon as it has what
// it needs rather than each doing its own round trip.

import { writable, derived } from 'svelte/store';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '$lib/firebase';

/** @type {import('svelte/store').Writable<{loading: boolean, user: any, profile: any}>} */
export const session = writable({ loading: true, user: null, profile: null });

export const isSignedIn = derived(session, ($s) => Boolean($s.user));

let started = false;

/** Begin watching auth state. Safe to call more than once. */
export function startSession() {
	if (started || typeof window === 'undefined') return;
	started = true;

	onAuthStateChanged(auth, async (user) => {
		if (!user) {
			session.set({ loading: false, user: null, profile: null });
			return;
		}

		let profile = null;

		try {
			const snapshot = await getDoc(doc(db, 'users', user.uid));
			profile = snapshot.exists() ? snapshot.data() : null;
		} catch (error) {
			// A missing or unreadable profile should not lock anyone out; pages
			// that need it say so themselves.
			console.error('Could not read the user profile:', error);
		}

		session.set({ loading: false, user, profile });
	});
}

export async function signOut() {
	await fbSignOut(auth);
}
