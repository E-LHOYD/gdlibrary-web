<script>
	import Icon from '$lib/components/Icon.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores/session.js';
	import { loadBooks } from '$lib/services/books.js';
	import { recommendBooks, recommendationReason } from '$lib/services/recommendations.js';
	import BookList from '$lib/components/BookList.svelte';

	// How many recommendations lead the page before the rest of the library.
	const RECOMMENDED_COUNT = 12;

	let books = [];
	let recommended = [];
	let rest = [];
	let reason = '';
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
			const [ranked, why] = await Promise.all([
				recommendBooks(list, profile, Number.MAX_SAFE_INTEGER),
				recommendationReason(profile)
			]);

			// A choice begun without the profile must not land on top of one begun
			// after it arrived.
			if (mine !== run) return;

			const top = ranked.slice(0, RECOMMENDED_COUNT);
			const shown = new Set(top.map((b) => b.id));

			recommended = top;
			rest = [...ranked.slice(RECOMMENDED_COUNT), ...list.filter((b) => !ranked.includes(b))].filter(
				(b) => b?.title && !shown.has(b.id)
			);
			reason = why;
		} catch (err) {
			console.error('Could not build recommendations:', err);
			if (mine === run) {
				recommended = [];
				rest = list;
				reason = '';
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
		<input type="search" placeholder="Search title or author" bind:value={searchQuery} />
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
		<div class="section-head">
			<h2 class="section-title">Recommended for you</h2>
			<div class="chips tight">
				<button
					class="chip"
					on:click={() => choose(books, $session.profile)}
					disabled={choosing}
				>
					<Icon name="refresh" />Show me others
				</button>
				<a class="chip" href="/profile"><Icon name="edit" />Edit interests</a>
			</div>
		</div>

		{#if choosing && recommended.length === 0}
			<p class="muted">Choosing books…</p>
		{:else}
			{#if reason}<p class="reason">{reason}</p>{/if}
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

	.section-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.tight {
		margin-bottom: 0;
	}

	.reason {
		border-left: 4px solid var(--brand);
		padding-left: 12px;
		margin: 0 0 16px 0;
		color: var(--muted);
		font-size: 0.9rem;
	}
</style>
