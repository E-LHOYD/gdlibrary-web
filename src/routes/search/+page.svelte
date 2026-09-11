<script>
	import Icon from '$lib/components/Icon.svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { loadBooks, matchesSearch, searchTerms } from '$lib/services/books.js';
	import BookList from '$lib/components/BookList.svelte';

	let books = [];
	let loading = true;
	let queryInput = '';

	$: query = $page.url.searchParams.get('q') ?? '';
	$: terms = searchTerms(query);
	$: results = terms.length ? books.filter((book) => matchesSearch(book, terms)) : books;

	onMount(async () => {
		queryInput = $page.url.searchParams.get('q') ?? '';
		try {
			books = await loadBooks();
		} catch (error) {
			console.error('Could not load books:', error);
		} finally {
			loading = false;
		}
	});

	function submitSearch() {
		goto('/search?q=' + encodeURIComponent(queryInput.trim()), { replaceState: true });
	}
</script>

<svelte:head><title>Search · GD-Library</title></svelte:head>

<div class="page">
	<h1 class="page-title">Search</h1>

	<form class="search" on:submit|preventDefault={submitSearch}>
		<input type="search" placeholder="Search title, author or book number" bind:value={queryInput} />
		{#if queryInput}
			<button type="button" class="btn secondary" on:click={() => (queryInput = '')}>
				<Icon name="x" />Clear
			</button>
			<button type="submit" class="btn"><Icon name="search" />Search</button>
		{/if}
	</form>

	{#if loading}
		<p class="muted">Loading…</p>
	{:else}
		<p class="muted count">
			{results.length} book{results.length === 1 ? '' : 's'}{query ? ` for “${query}”` : ''}
		</p>
		<BookList books={results} empty="Nothing matched that search." />
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
