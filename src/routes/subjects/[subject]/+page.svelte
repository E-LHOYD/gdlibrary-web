<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { loadBooks } from '$lib/services/books.js';
	import { hasSubject } from '$lib/services/subjects.js';
	import BookList from '$lib/components/BookList.svelte';

	let books = [];
	let loading = true;

	$: subject = decodeURIComponent($page.params.subject);
	$: matching = books.filter((book) => hasSubject(book, subject));

	onMount(async () => {
		try {
			books = await loadBooks();
		} catch (error) {
			console.error('Could not load books:', error);
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head><title>{subject} · GD-Library</title></svelte:head>

<div class="page">
	<p class="muted"><a href="/subjects">← Subjects</a></p>
	<h1 class="page-title">{subject}</h1>

	{#if loading}
		<p class="muted">Loading…</p>
	{:else}
		<BookList books={matching} empty="No books carry this subject yet." />
	{/if}
</div>
