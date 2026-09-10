<script>
	import Icon from '$lib/components/Icon.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores/session.js';
	import { loadBooks } from '$lib/services/books.js';
	import { recommendBooks } from '$lib/services/recommendations.js';
	import BookList from '$lib/components/BookList.svelte';

	// How many recommendations lead the page before the rest of the library.
	const RECOMMENDED_COUNT = 12;

	let books = [];
	let recommended = [];
	let rest = [];
	let searchQuery = '';
	let loading = true;
	let choosing = false;
	let error = '';
	let run = 0;

	onMount(async () => {
		try {
			books = await loadBooks();
		} catch (err) {
			console.error('Could not load books:', err);
			error = 'Failed to load books. Please try again.';
		} finally {
			loading = false;
		}
	});

	// Chosen when the books arrive, and again when the profile does.
	//
	// The session publishes the signed-in user before it has read their profile,
	// so a page opened straight after login sees profile: null for the length of
	// one Firestore read. Without a profile there are no interests, track or
	// year level, and the recommendations would be the library shuffled; waiting
	// on the profile as well as the books is what makes them personal.
	$: choose(books, $session.profile);

	/**
	 * @param {any[]} list
	 * @param {any} profile
	 */
	async function choose(list, profile) {
		if (list.length === 0) {
			recommended = [];
			rest = [];
			return;
		}

		const mine = ++run;
		choosing = true;

		try {
			// Everything the recommendation system keeps, best fit first. The top of
			// it is what the page recommends; the remainder, plus whatever the
			// year-level and subject filters dropped, is the rest of the library.
			const ranked = await recommendBooks(list, profile, Number.MAX_SAFE_INTEGER);

			// A choice begun without the profile must not land on top of one begun
			// after it arrived.
			if (mine !== run) return;

			const top = ranked.slice(0, RECOMMENDED_COUNT);
			const shown = new Set(top.map((b) => b.id));

			recommended = top;
			rest = [...ranked.slice(RECOMMENDED_COUNT), ...list.filter((b) => !ranked.includes(b))].filter(
				(b) => b?.title && !shown.has(b.id)
			);
		} catch (err) {
			console.error('Could not build recommendations:', err);
			if (mine === run) {
				recommended = [];
				rest = list;
			}
		} finally {
			if (mine === run) choosing = false;
		}
	}

	function submitSearch() {
		if (searchQuery.trim()) goto('/search?q=' + encodeURIComponent(searchQuery.trim()));
	}
</script>

<svelte:head><title>Library · GD-Library</title></svelte:head>

<div class="page">
	<h1 class="page-title">Library</h1>

	<form class="search" on:submit|preventDefault={submitSearch}>
		<input type="search" placeholder="Search title, author or book number" bind:value={searchQuery} />
		{#if searchQuery}
			<button type="button" class="btn secondary" on:click={() => (searchQuery = '')}>
				<Icon name="x" />Clear
			</button>
			<button type="submit" class="btn"><Icon name="search" />Search</button>
		{/if}
	</form>

	<div class="chips">
		<a class="chip" href="/subjects"><Icon name="list" />Subjects</a>
		<a class="chip" href="/browse"><Icon name="grid" />Browse all</a>
	</div>

	{#if loading}
		<p class="muted">Loading books…</p>
	{:else if error}
		<p class="error">{error}</p>
	{:else if books.length === 0}
		<p class="empty">No books found.</p>
	{:else}
		<h2 class="section-title">Recommended for you</h2>

		{#if choosing && recommended.length === 0}
			<p class="muted">Choosing books…</p>
		{:else}
			<BookList
				books={recommended}
				empty="No books match your year level and subjects yet. Try browsing the whole library."
			/>
		{/if}

		{#if rest.length > 0}
			<h2 class="section-title">More in the library</h2>
			<BookList books={rest} />
		{/if}
	{/if}
</div>

<style>
	.search {
		display: flex;
		gap: 8px;
		margin-bottom: 16px;
	}
</style>
