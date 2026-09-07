<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { loadBooks } from '$lib/services/books.js';
	import BookList from '$lib/components/BookList.svelte';

	let books = [];
	let searchQuery = '';
	let loading = true;
	let error = '';

	onMount(async () => {
		try {
			books = await loadBooks();
			// Browse is the unfiltered library, in title order so it can be scanned.
			books.sort((a, b) => String(a.title).localeCompare(String(b.title)));
		} catch (err) {
			console.error('Could not load books:', err);
			error = 'Failed to load books. Please try again.';
		} finally {
			loading = false;
		}
	});

	function submitSearch() {
		if (searchQuery.trim()) goto('/search?q=' + encodeURIComponent(searchQuery.trim()));
	}
</script>

<svelte:head><title>Browse all · GD-Library</title></svelte:head>

<div class="page">
	<h1 class="page-title">Browse all</h1>

	<form class="search" on:submit|preventDefault={submitSearch}>
		<input type="search" placeholder="Search title or author" bind:value={searchQuery} />
		{#if searchQuery}
			<button type="button" class="btn secondary" on:click={() => (searchQuery = '')}>Clear</button>
			<button type="submit" class="btn">Search</button>
		{/if}
	</form>

	{#if loading}
		<p class="muted">Loading books…</p>
	{:else if error}
		<p class="error">{error}</p>
	{:else}
		<p class="muted count">{books.length} books</p>
		<BookList {books} />
	{/if}
</div>

<style>
	.search {
		display: flex;
		gap: 8px;
		margin-bottom: 16px;
	}

	.count {
		margin: 0 0 12px 0;
	}
</style>
