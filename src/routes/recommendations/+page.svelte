<script>
	import Icon from '$lib/components/Icon.svelte';
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { loadBooks } from '$lib/services/books.js';
	import { recommendBooks, recommendationReason } from '$lib/services/recommendations.js';
	import BookList from '$lib/components/BookList.svelte';

	/** The whole library, fetched once; what to recommend from it is decided below. */
	let allBooks = [];
	let books = [];
	let reason = '';
	let loading = true;
	let error = '';
	let run = 0;

	onMount(async () => {
		try {
			allBooks = await loadBooks();
		} catch (err) {
			console.error('Could not load books:', err);
			error = 'Could not load the library. Please try again.';
		} finally {
			// choose() takes over the loading flag once there is a library to
			// choose from; with an empty one there is nothing coming.
			if (allBooks.length === 0) loading = false;
		}
	});

	// Re-chosen when the profile arrives, not only when the page mounts. Without
	// a profile there are no interests and no track, so every book scores zero
	// and "For you" degrades into the library shuffled -- which is what showed
	// immediately after login, when the session has the user but not yet the
	// profile.
	$: choose(allBooks, $session.profile);

	/**
	 * @param {any[]} list
	 * @param {any} profile
	 */
	async function choose(list, profile) {
		if (list.length === 0) return;

		const mine = ++run;
		loading = true;
		error = '';

		try {
			// recommendBooks and recommendationReason both await the Firestore
			// subject mappings, so both have to be awaited here: assigning the
			// promise itself is what left the app's home screen empty.
			const [picked, why] = await Promise.all([
				recommendBooks(list, profile, 30),
				recommendationReason(profile)
			]);

			if (mine !== run) return;

			books = picked;
			reason = why;
		} catch (err) {
			console.error('Could not build recommendations:', err);
			if (mine === run) error = 'Could not work out what to recommend. Try the library instead.';
		} finally {
			if (mine === run) loading = false;
		}
	}
</script>

<svelte:head><title>For you · GD-Library</title></svelte:head>

<div class="page">
	<h1 class="page-title">For you</h1>

	{#if loading}
		<p class="muted">Choosing books…</p>
	{:else if error}
		<p class="error">{error}</p>
	{:else}
		<p class="reason">{reason}</p>

		<div class="chips">
			<button class="chip" on:click={() => choose(allBooks, $session.profile)}>
				<Icon name="refresh" />Show me others
			</button>
			<a class="chip" href="/browse"><Icon name="grid" />Browse all</a>
			<a class="chip" href="/profile"><Icon name="edit" />Edit interests</a>
		</div>

		<BookList
			{books}
			empty="No books match your year level and subjects yet. Try browsing the whole library."
		/>
	{/if}
</div>

<style>
	.reason {
		border-left: 4px solid var(--brand);
		padding-left: 12px;
		margin: 0 0 16px 0;
		color: var(--muted);
		font-size: 0.9rem;
	}
</style>
