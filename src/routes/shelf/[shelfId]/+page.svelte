<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { session } from '$lib/stores/session.js';
	import { loadBooks } from '$lib/services/books.js';
	import { getUserShelves } from '$lib/services/shelf.js';
	import { getAllReadingProgress } from '$lib/services/readingProgress.js';
	import { sortBooks, toTimestamp } from '$lib/services/sortBooks.js';
	import BookList from '$lib/components/BookList.svelte';

	// The five things a shelf can be ordered by. Each names the field it reads
	// and the direction that is useful first: titles read A to Z, but the book
	// you opened most recently is the one you want at the top.
	const SORTS = [
		{ key: 'title', label: 'Title', accessor: (b) => b.title, initial: 'asc' },
		{ key: 'author', label: 'Author', accessor: (b) => b.author, initial: 'asc' },
		{
			key: 'progress',
			label: 'Progress',
			accessor: (b) => (typeof b.percentage === 'number' ? b.percentage : null),
			initial: 'desc'
		},
		{
			key: 'published',
			label: 'Published',
			accessor: (b) => toTimestamp(b.publishedDate || b.releaseDate),
			initial: 'desc'
		},
		{
			key: 'opened',
			label: 'Last opened',
			accessor: (b) => b.lastReadAtMs,
			initial: 'desc'
		}
	];

	$: shelfId = $page.params.shelfId;

	/** @type {any[]} */
	let books = [];
	let shelfName = '';
	let loading = true;
	let error = '';

	let sortKey = 'title';
	/** @type {'asc'|'desc'} */
	let direction = 'asc';

	$: activeSort = SORTS.find((s) => s.key === sortKey) ?? SORTS[0];
	$: sorted = sortBooks(books, activeSort.accessor, direction);

	// Re-runs when the route changes, so moving between shelves reloads.
	$: if (shelfId) load(shelfId);

	function choose(sort) {
		// Tapping the field already in use turns it around; a new field starts in
		// whichever direction is useful for it.
		if (sort.key === sortKey) {
			direction = direction === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = sort.key;
			direction = sort.initial;
		}
	}

	/** @param {string} id */
	async function load(id) {
		loading = true;
		error = '';

		// Reading history is about when, so it opens newest first; a shelf is a
		// list of books, so it opens alphabetically. Set on load rather than
		// reactively, or choosing Title on the history page would snap straight
		// back to Last opened.
		sortKey = id === 'history' ? 'opened' : 'title';
		direction = id === 'history' ? 'desc' : 'asc';

		try {
			const userId = $session.user.uid;
			const [allBooks, progress, shelves] = await Promise.all([
				loadBooks(),
				getAllReadingProgress(),
				getUserShelves(userId)
			]);

			// Progress is keyed by book so title, author and percentage can be shown
			// on one row without a second lookup per book.
			const byBook = new Map(progress.map((entry) => [entry.bookId, entry]));

			/** @type {string[]} */
			let ids;

			if (id === 'history') {
				shelfName = 'Reading history';
				ids = [...new Set(progress.map((entry) => entry.bookId))];
			} else {
				const shelf = shelves.find((s) => s.id === id);

				if (!shelf) {
					error = 'That shelf no longer exists.';
					books = [];
					return;
				}

				shelfName = shelf.name;

				// Read and Viewed are derived from progress rather than stored, so
				// they are the same on the web as in the app without being written.
				if (shelf.isReadShelf) {
					ids = progress.filter((e) => e.status === 'read').map((e) => e.bookId);
				} else if (shelf.isViewedShelf) {
					ids = progress.filter((e) => e.status === 'viewed').map((e) => e.bookId);
				} else {
					ids = shelf.bookIds || [];
				}
			}

			const wanted = new Set(ids);

			books = allBooks
				.filter((book) => wanted.has(book.id))
				.map((book) => {
					const entry = byBook.get(book.id);
					return {
						...book,
						percentage: typeof entry?.percentage === 'number' ? entry.percentage : null,
						lastReadAtMs: toTimestamp(entry?.lastReadAt)
					};
				});
		} catch (err) {
			console.error('Could not load the shelf:', err);
			error = 'Could not load this shelf.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head><title>{shelfName || 'Shelf'} · GD-Library</title></svelte:head>

<div class="page">
	<p class="muted"><a href="/shelf">My shelf</a></p>
	<h1 class="page-title">{shelfName || 'Shelf'}</h1>

	{#if error}<p class="error">{error}</p>{/if}

	{#if loading}
		<p class="muted">Loading…</p>
	{:else}
		<div class="chips">
			{#each SORTS as sort}
				<button
					class="chip"
					class:active={sort.key === sortKey}
					on:click={() => choose(sort)}
					aria-pressed={sort.key === sortKey}
				>
					{sort.label}{sort.key === sortKey ? (direction === 'asc' ? ' ↑' : ' ↓') : ''}
				</button>
			{/each}
		</div>

		<p class="muted count">{books.length} book{books.length === 1 ? '' : 's'}</p>

		<BookList books={sorted} showProgress empty="Nothing on this shelf yet." />
	{/if}
</div>

<style>
	.count {
		margin: 0 0 12px 0;
	}
</style>
