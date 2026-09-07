// Records that the signed-in user was here, so the dashboard's active-users
// figure counts web readers as well as app readers.

import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '$lib/firebase';

// Must stay comfortably below the dashboard's active-now window, currently five
// minutes. At exactly five, someone reading continuously would drop out of the
// count in the moments before their next write; at two they never do.
const MIN_INTERVAL_MS = 2 * 60 * 1000;
let lastWriteAt = 0;

/**
 * Stamp users/{uid}.lastSeenAt with the current time. Failures are logged and
 * swallowed: presence is never worth interrupting the reader for.
 * @param {boolean} force
 */
export async function recordActivity(force = false) {
	try {
		const user = auth.currentUser;
		if (!user) return false;

		const now = Date.now();
		if (!force && now - lastWriteAt < MIN_INTERVAL_MS) return false;
		lastWriteAt = now;

		await setDoc(doc(db, 'users', user.uid), { lastSeenAt: new Date() }, { merge: true });
		return true;
	} catch (error) {
		console.error('Could not record activity:', error);
		return false;
	}
}
