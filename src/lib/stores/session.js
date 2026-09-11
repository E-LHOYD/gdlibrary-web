// Who is signed in, and their Firestore profile.
//
// The app reads the profile in every component that needs it; on the web one
// store holds it and is shared, so a page can render as soon as it has what it
// needs rather than each doing its own round trip.
//
// The profile is watched, not read once. It used to be read at sign-in and
// then left alone, so interests saved from the mobile app (or by the admin)
// never reached an open tab: its copy still said "no interests", and the
// "Choose your interests" box kept appearing for an account that had them.

import { writable, derived } from 'svelte/store';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '$lib/firebase';
import { sessionHasLapsed, startActivityTracking } from '$lib/services/persistence.js';

// profileReady turns true once the profile read has finished, found or not,
// so a page can tell "no profile yet" apart from "still reading it".
/** @type {import('svelte/store').Writable<{loading: boolean, user: any, profile: any, profileReady: boolean}>} */
export const session = writable({ loading: true, user: null, profile: null, profileReady: false });

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

	// Only the user the page opened with is checked against "keep me logged
	// in"; someone signing in on this page has just proved who they are.
	let checkedOpeningUser = false;

	/** Stops watching the previous account's profile. */
	/** @type {(() => void) | null} */
	let stopWatching = null;

	onAuthStateChanged(auth, async (user) => {
		const opening = !checkedOpeningUser;
		checkedOpeningUser = true;

		if (user && opening && sessionHasLapsed()) {
			// A tab the browser restored after the site was closed, for someone
			// who asked not to stay logged in. Signing out brings this callback
			// back with no user, which is what sends them to the login page.
			try {
				await fbSignOut(auth);
				return;
			} catch (error) {
				console.error('Could not end the lapsed session:', error);
			}
		}

		startActivityTracking();

		stopWatching?.();
		stopWatching = null;

		if (!user) {
			session.set({ loading: false, user: null, profile: null, profileReady: false });
			return;
		}

		// The user is published before the profile is fetched, not after. The
		// layout sends anyone without a user to the login page, so holding the
		// user back for the length of a Firestore round trip meant a fresh
		// sign-in was briefly indistinguishable from being signed out, and the
		// guard bounced it straight back to /login. Fast networks hid it; slow
		// ones did not.
		session.set({ loading: false, user, profile: null, profileReady: false });

		// Ignored if someone signed out, or signed in as someone else, while a
		// read was in flight: that newer state is the true one.
		const publish = (/** @type {any} */ profile) =>
			session.update((current) =>
				current.user?.uid === user.uid ? { ...current, profile, profileReady: true } : current
			);

		try {
			const ref = await findProfileRef(user);
			if (auth.currentUser?.uid !== user.uid) return;

			if (!ref) {
				publish(null);
				return;
			}

			// Every change to the document, wherever it was made, lands here.
			//
			// Nothing is published until Firestore has answered from the server.
			// Before that, a snapshot can come from the local cache, and the
			// cache can hold only this tab's own pending write (the lastSeenAt
			// stamp from presence.js) with none of the profile: that briefly
			// looked like an account with no interests, and "Choose your
			// interests" flashed up. Pages wait on profileReady, which only a
			// server-confirmed snapshot sets.
			//
			// Offline, the server never answers; after a few seconds the best
			// copy there is gets published, so the site still works.
			let confirmed = false;
			/** @type {any} */
			let latest = null;
			const fallback = setTimeout(() => {
				if (!confirmed && latest) {
					confirmed = true;
					publish(latest.exists() ? latest.data() : null);
				}
			}, 8000);

			const unsubscribe = onSnapshot(
				ref,
				{ includeMetadataChanges: true },
				(snapshot) => {
					latest = snapshot;
					if (!confirmed && (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites)) return;
					confirmed = true;
					clearTimeout(fallback);
					publish(snapshot.exists() ? snapshot.data() : null);
				},
				(error) => {
					// A missing or unreadable profile should not lock anyone out;
					// pages that need it say so themselves.
					console.error('Could not watch the user profile:', error);
					clearTimeout(fallback);
					publish(null);
				}
			);
			stopWatching = () => {
				clearTimeout(fallback);
				unsubscribe();
			};
		} catch (error) {
			console.error('Could not read the user profile:', error);
			publish(null);
		}
	});
}

export async function signOut() {
	await fbSignOut(auth);
}
