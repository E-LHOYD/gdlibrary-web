<script>
	import { onMount } from 'svelte';
	import { loadBooks } from '$lib/services/books.js';
	import { DEFAULT_SUBJECTS, hasSubject } from '$lib/services/subjects.js';

	let books = [];
	let loading = true;

	onMount(async () => {
		try {
			books = await loadBooks();
		} catch (error) {
			console.error('Could not load books:', error);
		} finally {
			loading = false;
		}
	});

	function countFor(subject) {
		return books.filter((book) => hasSubject(book, subject)).length;
	}
</script>

<svelte:head><title>Subjects · GD-Library</title></svelte:head>

<div class="page">
	<h1 class="page-title">Subjects</h1>

	{#if loading}
		<p class="muted">Loading…</p>
	{:else}
		<div class="grid">
			{#each DEFAULT_SUBJECTS as subject}
				<a class="tile" href="/subjects/{encodeURIComponent(subject)}">
					<span class="name">{subject}</span>
					<span class="muted">{countFor(subject)} books</span>
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 2px;
		border: 2px solid var(--ink);
		background: var(--ink);
	}

	.tile {
		display: block;
		padding: 18px;
		background: #fff;
		text-decoration: none;
		color: inherit;
	}

	.tile:hover {
		background: var(--tint);
	}

	.name {
		display: block;
		font-weight: 700;
		color: var(--brand);
		margin-bottom: 4px;
	}
</style>
