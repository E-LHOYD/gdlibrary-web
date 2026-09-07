<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { loadBooks } from '$lib/services/books.js';
	import { recommendBooks, recommendationReason } from '$lib/services/recommendations.js';
	import BookList from '$lib/components/BookList.svelte';

	let books = [];
	let reason = '';
	let loading = true;
	let error = '';

	onMount(load);

	async function load() {
		loading = true;
		error = '';

		try {
			const all = await loadBooks();
			// recommendBooks and recommendationReason both await the Firestore
			// subject mappings, so both have to be awaited here: assigning the
			// promise itself is what left the app's home screen empty.
			[books, reason] = await Promise.all([
				recommendBooks(all, $session.profile, 30),
				recommendationReason($session.profile)
			]);
		} catch (err) {
			console.error('Could not build recommendations:', err);
			error = 'Could not work out what to recommend. Try the library instead.';
		} finally {
			loading = false;
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
			<button class="chip" on:click={load}>Show me others</button>
			<a class="chip" href="/browse">Browse all</a>
			<a class="chip" href="/profile">Edit interests</a>
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
