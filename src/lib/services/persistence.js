// "Keep me logged in", in one place for the login page, the settings page and
// the session store.
//
// Two things make it work, because either one alone leaks:
//
//   persistence  Firebase Auth keeps the signed-in user in local storage
//                (survives closing the browser) or session storage (lasts as
//                long as the tab). Setting it while someone is signed in moves
//                their session across, so a change in settings needs no
//                sign-out.
//
//   last active  Session storage is not as short-lived as it sounds: browsers
//                bring it back when they restore tabs ("Continue where you left
//                off", reopening a closed tab), and with it the signed-in user.
//                So while the site is open it records when it was last active,
//                including the moment a tab is closed, and a page that opens
//                to find a user who asked not to be kept, after the site has
//                been closed for longer than a reload takes, signs them out.

import { setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { auth } from '$lib/firebase';

const KEEP_KEY = 'gdl.keepLoggedIn';
const ACTIVE_KEY = 'gdl.lastActive';

// Long enough for a reload on a slow connection, short enough that closing the
// site and coming back counts as coming back.
const CLOSED_AFTER_MS = 30 * 1000;
const HEARTBEAT_MS = 10 * 1000;

function read(key) {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function write(key, value) {
	try {
		localStorage.setItem(key, value);
	} catch {
		// Storage blocked: nothing to remember with, and nothing to do about it.
	}
}

/** The reader's choice, ticked unless they have unticked it. */
export function getKeepLoggedIn() {
	return read(KEEP_KEY) !== 'false';
}

/** Record that the site is open right now. */
export function markActive() {
	write(ACTIVE_KEY, String(Date.now()));
}

/**
 * Apply and remember the choice.
 * @param {boolean} keep
 */
export async function setKeepLoggedIn(keep) {
	await setPersistence(auth, keep ? browserLocalPersistence : browserSessionPersistence);
	write(KEEP_KEY, keep ? 'true' : 'false');
	markActive();
}

/**
 * True when a user found on page load should be signed out: they chose not to
 * be kept, and the site has been closed since they were last here.
 */
export function sessionHasLapsed() {
	if (getKeepLoggedIn()) return false;

	const last = Number(read(ACTIVE_KEY));
	if (!last) return true;

	return Date.now() - last > CLOSED_AFTER_MS;
}

let heartbeat = null;

/**
 * Keep "last active" current while any tab is open. Timers in background tabs
 * are throttled, so the moments a tab is hidden or closed are recorded too:
 * closing is exactly the time that has to be accurate.
 */
export function startActivityTracking() {
	if (heartbeat || typeof window === 'undefined') return;

	markActive();
	heartbeat = setInterval(markActive, HEARTBEAT_MS);
	window.addEventListener('pagehide', markActive);
	document.addEventListener('visibilitychange', markActive);
}
