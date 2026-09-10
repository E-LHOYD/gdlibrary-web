<script>
	// A short tour of the site, one card at a time.
	//
	// It opens on its own once, for a new account, straight after the reader
	// picks their three interests (the interests prompt sets interestsPrompted).
	// Finishing or skipping it writes tutorialSeen: true to the user document,
	// so it is not shown again automatically, here or in the app. The "?" on the
	// profile page opens it again at any time.

	import Icon from '$lib/components/Icon.svelte';
	import { tick } from 'svelte';
	import { updateDoc } from 'firebase/firestore';
	import { session, findProfileRef } from '$lib/stores/session.js';
	import { tutorialRequested } from '$lib/stores/tutorial.js';

	// Illustrations of each part of the site, with the thing being described
	// ringed in yellow. Drawn to match the site rather than screenshots, so they
	// do not show anyone's real account.
	import welcomeImg from '$lib/assets/tutorial/welcome.png';
	import libraryImg from '$lib/assets/tutorial/library.png';
	import searchImg from '$lib/assets/tutorial/search.png';
	import subjectsImg from '$lib/assets/tutorial/subjects.png';
	import readingImg from '$lib/assets/tutorial/reading.png';
	import bookmarkImg from '$lib/assets/tutorial/bookmark.png';
	import shelfImg from '$lib/assets/tutorial/shelf.png';
	import profileImg from '$lib/assets/tutorial/profile.png';

	const STEPS = [
		{
			image: welcomeImg,
			title: 'Welcome to GD-Library',
			body: "Your school's digital library, open in any browser. This short tour shows you how to find a book, read it, and pick up right where you left off."
		},
		{
			image: libraryImg,
			title: 'Your Library',
			body: 'The Library is your home page. "Recommended for you" at the top has books picked for your year level, program and interests. Every other book in the library is listed underneath.'
		},
		{
			image: searchImg,
			title: 'Search',
			body: 'Looking for something in particular? Type a title, an author or a book number into the search bar on the Library page.'
		},
		{
			image: subjectsImg,
			title: 'Subjects and Browse all',
			body: 'Subjects groups the books by subject, such as Math or Science. Browse all shows the whole library in one list.'
		},
		{
			image: readingImg,
			title: 'Reading a book',
			body: 'Open any book to see its cover (or its first page) and description. Press "Read book" to start. Your place is saved as you read, here or in the mobile app. "Add to shelf" keeps a book somewhere easy to find.'
		},
		{
			image: bookmarkImg,
			title: 'Bookmarks',
			body: 'While reading, press "Bookmark" to mark the page you are on. Mark as many pages as you like, then open "Bookmarks" and click a page to jump straight to it. Press "Bookmarked", or the ✕ beside a page in the list, to remove one.'
		},
		{
			image: shelfImg,
			title: 'My shelf',
			body: 'My shelf has your reading history and the shelves you make yourself. You can create up to ten, name them what you like, and remove books from them any time.'
		},
		{
			image: profileImg,
			title: 'Profile and Settings',
			body: 'Profile shows your username, program, year level and interests, and you can change your interests there. Settings has "Keep me logged in" and lets you change your password. Press the ? on your Profile to see this tour again.'
		}
	];

	let step = 0;
	let saving = false;
	/** @type {HTMLDivElement} */
	let box;

	// Closed for the rest of the visit once dismissed, before the session even
	// reflects the saved flag.
	let dismissedFor = null;

	$: profile = $session.profile;
	$: interestCount = Array.isArray(profile?.interests)
		? profile.interests.filter((i) => typeof i === 'string' && i.trim()).length
		: 0;

	$: firstTime = Boolean(
		$session.user &&
			$session.profileReady &&
			profile?.interestsPrompted &&
			!profile?.tutorialSeen &&
			interestCount >= 3 &&
			dismissedFor !== $session.user.uid
	);

	$: open = Boolean($session.user) && ($tutorialRequested || firstTime);

	// Every opening starts from the first card, with focus inside the dialog so
	// the keyboard lands on it.
	let wasOpen = false;
	$: if (open !== wasOpen) {
		wasOpen = open;
		if (open) {
			step = 0;
			tick().then(() => box?.focus());
		}
	}

	async function close() {
		const auto = firstTime;
		tutorialRequested.set(false);

		if (!auto) return;

		const user = $session.user;
		dismissedFor = user.uid;
		saving = true;

		try {
			const ref = await findProfileRef(user);
			if (ref) await updateDoc(ref, { tutorialSeen: true });
			session.update((s) =>
				s.user?.uid === user.uid ? { ...s, profile: { ...s.profile, tutorialSeen: true } } : s
			);
		} catch (err) {
			// Not worth interrupting the reader over: at worst the tour shows once
			// more next time.
			console.error('Could not record that the tour was seen:', err);
		} finally {
			saving = false;
		}
	}

	function next() {
		if (step < STEPS.length - 1) step += 1;
		else close();
	}

	function back() {
		if (step > 0) step -= 1;
	}

	/** @param {KeyboardEvent} event */
	function onKey(event) {
		if (!open) return;
		if (event.key === 'Escape') close();
		else if (event.key === 'ArrowRight') next();
		else if (event.key === 'ArrowLeft') back();
	}

	$: current = STEPS[step];
	$: last = step === STEPS.length - 1;
</script>

<svelte:window on:keydown={onKey} />

{#if open}
	<div class="overlay">
		<div
			class="box"
			role="dialog"
			aria-modal="true"
			aria-labelledby="tour-title"
			aria-describedby="tour-body"
			tabindex="-1"
			bind:this={box}
		>
			<div class="top">
				<span class="muted">Step {step + 1} of {STEPS.length}</span>
				{#if !last}
					<button type="button" class="link-btn" on:click={close} disabled={saving}>Skip tour</button>
				{/if}
			</div>

			<img class="picture" src={current.image} alt="" width="640" height="440" />
			<h2 id="tour-title">{current.title}</h2>
			<p id="tour-body">{current.body}</p>

			<div class="dots" aria-hidden="true">
				{#each STEPS as _, i}
					<span class="dot" class:on={i === step}></span>
				{/each}
			</div>

			<div class="row actions">
				<button type="button" class="btn secondary" on:click={back} disabled={step === 0 || saving}>
					<Icon name="arrow-left" />Back
				</button>
				<button type="button" class="btn" on:click={next} disabled={saving}>
					{#if last}<Icon name="check" />Finish{:else}Next<Icon name="arrow-right" />{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 110;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
		background: rgba(32, 30, 29, 0.6);
	}

	.box {
		width: 100%;
		max-width: 520px;
		max-height: calc(100vh - 32px);
		overflow-y: auto;
		padding: 24px;
		background: #fff;
		border: 2px solid var(--ink);
		outline: none;
	}

	.top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		margin-bottom: 16px;
	}

	.picture {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 640 / 440;
		margin-bottom: 16px;
		border: 2px solid var(--ink);
		background: var(--tint);
	}

	h2 {
		margin: 0 0 8px 0;
		font-size: 1.3rem;
	}

	p {
		margin: 0 0 20px 0;
		line-height: 1.55;
	}

	.dots {
		display: flex;
		gap: 6px;
		margin-bottom: 20px;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--border);
	}

	.dot.on {
		background: var(--brand);
	}

	.actions {
		justify-content: space-between;
	}
</style>
