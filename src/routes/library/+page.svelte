<script>
	import Icon from '$lib/components/Icon.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores/session.js';
	import { loadBooks } from '$lib/services/books.js';
	import { rankOrRecommend } from '$lib/services/order.js';
	import BookList from '$lib/components/BookList.svelte';

	let books = [];
	let displayed = [];
	let searchQuery = '';
	let loading = true;
	let error = '';

	onMount(async () => {
		try {
			books = await loadBooks();
			displayed = await rankOrRecommend(books, $session.profile);
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
		<a class="chip" href="/recommendations"><Icon name="star" />For you</a>
	</div>

	{#if loading}
		<p class="muted">Loading books…</p>
	{:else if error}
		<p class="error">{error}</p>
	{:else}
		<BookList books={displayed} empty="No books found." />
	{/if}
</div>

<style>
	.search {
		display: flex;
		gap: 8px;
		margin-bottom: 16px;
	}
</style>
