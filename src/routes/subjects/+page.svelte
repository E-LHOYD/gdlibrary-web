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
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 10px;
	}

	/* Cards, like the Library's book cards. */
	.tile {
		display: block;
		padding: 18px 20px;
		background: #fff;
		border-radius: var(--radius);
		box-shadow: var(--shadow);
		text-decoration: none;
		color: inherit;
	}

	.tile:hover {
		background: #f8f8f8;
	}

	.name {
		display: block;
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--brand);
		margin-bottom: 4px;
	}
</style>
