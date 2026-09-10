// Whether the app tour has been asked for by hand (the "?" on the profile).
// The first-time tour opens on its own; see Tutorial.svelte.

import { writable } from 'svelte/store';

export const tutorialRequested = writable(false);

export function openTutorial() {
	tutorialRequested.set(true);
}
