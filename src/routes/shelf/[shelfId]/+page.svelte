<script>
	import Icon from '$lib/components/Icon.svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { session } from '$lib/stores/session.js';
	import { loadBooks } from '$lib/services/books.js';
	import { getUserShelves, removeBooksFromShelf } from '$lib/services/shelf.js';
	import { getAllReadingProgress, deleteReadingProgress } from '$lib/services/readingProgress.js';
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

	let selecting = false;
	/** @type {string[]} */
	let selectedIds = [];
	let removing = false;
	/**
	 * One box for both the confirmation and the result. With `confirm` set it
	 * asks; without it, it only reports.
	 * @type {{title: string, text: string, confirm?: () => void, confirmLabel?: string} | null}
	 */
	let box = null;

	// Reading history, Read and Viewed are not stored lists: they are worked out
	// from reading progress. Taking a book off one therefore means deleting that
	// progress record, not unfiling the book, which is a different enough thing
	// to be worth saying out loud before doing it.
	$: derived = shelfId === 'history' || shelfId === 'read' || shelfId === 'viewed';
	$: removeLabel = derived ? 'Remove from history' : 'Remove from shelf';
	// Reading history is a record of what was opened, so it is read-only here:
	// no selecting, and nothing to remove.
	$: canSelect = shelfId !== 'history';

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
	function toggleSelected(id) {
		selectedIds = selectedIds.includes(id)
			? selectedIds.filter((existing) => existing !== id)
			: [...selectedIds, id];
	}

	function stopSelecting() {
		selecting = false;
		selectedIds = [];
	}

	function askToRemove() {
		const count = selectedIds.length;
		if (count === 0) return;

		const many = `${count} book${count === 1 ? '' : 's'}`;

		box = {
			title: removeLabel,
			text: derived
				? `Clear the reading record for ${many}? They stay in the library, but their progress and the date you last opened them are forgotten.`
				: `Take ${many} off ${shelfName}? They stay in the library and keep their reading progress.`,
			confirm: removeSelected,
			confirmLabel: `Remove ${many}`
		};
	}

	async function removeSelected() {
		const ids = [...selectedIds];
		box = null;
		removing = true;

		try {
			let ok;

			if (derived) {
				// A progress record per book, each its own document, so these are
				// independent and can go at once.
				const results = await Promise.all(ids.map((id) => deleteReadingProgress(id)));
				ok = results.every(Boolean);
			} else {
				ok = await removeBooksFromShelf($session.user.uid, shelfId, ids);
			}

			if (!ok) {
				box = {
					title: 'Could not remove everything',
					text: 'Some of those books are still there. Please try again.'
				};
				await load(shelfId);
				return;
			}

			const gone = new Set(ids);
			books = books.filter((book) => !gone.has(book.id));
			stopSelecting();

			box = {
				title: 'Removed',
				text: derived
					? `${ids.length} book${ids.length === 1 ? '' : 's'} cleared from your reading history.`
					: `${ids.length} book${ids.length === 1 ? '' : 's'} removed from ${shelfName}.`
			};
		} catch (err) {
			console.error('Could not remove the books:', err);
			box = {
				title: 'Could not remove everything',
				text: err?.message ?? 'Something went wrong. Please try again.'
			};
		} finally {
			removing = false;
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

		// A shelf change must not carry a selection over to a different list.
		selecting = false;
		selectedIds = [];

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
	<p class="muted"><a class="link-btn" href="/shelf"><Icon name="arrow-left" />My shelf</a></p>
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
					{sort.label}
					{#if sort.key === sortKey}
						<Icon name={direction === 'asc' ? 'arrow-up' : 'arrow-down'} size="0.9em" />
					{/if}
				</button>
			{/each}
		</div>

		<div class="bar">
			<p class="muted count">
				{books.length} book{books.length === 1 ? '' : 's'}
				{#if selecting}· {selectedIds.length} selected{/if}
			</p>

			{#if books.length > 0 && canSelect}
				<div class="row bar-actions">
					{#if selecting}
						<button
							class="chip"
							on:click={() =>
								(selectedIds =
									selectedIds.length === books.length ? [] : books.map((b) => b.id))}
						>
							<Icon name={selectedIds.length === books.length ? 'x' : 'check-square'} />
							{selectedIds.length === books.length ? 'Select none' : 'Select all'}
						</button>
						<button
							class="chip danger"
							on:click={askToRemove}
							disabled={selectedIds.length === 0 || removing}
						>
							<Icon name="trash" />{removing ? 'Removing…' : removeLabel}
						</button>
						<button class="chip" on:click={stopSelecting} disabled={removing}>
							<Icon name="x" />Cancel
						</button>
					{:else}
						<button class="chip" on:click={() => (selecting = true)}>
							<Icon name="check-square" />Select books
						</button>
					{/if}
				</div>
			{/if}
		</div>

		<BookList
			books={sorted}
			showProgress
			empty="Nothing on this shelf yet."
			selectable={selecting && canSelect}
			{selectedIds}
			onToggle={toggleSelected}
		/>
	{/if}

	{#if box}
		<div class="scrim" role="presentation" on:click={() => (box = null)}></div>
		<div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="box-title">
			<h2 class="section-title top" id="box-title">{box.title}</h2>
			<p class="box-text">{box.text}</p>
			<div class="row">
				{#if box.confirm}
					<button class="btn danger" on:click={box.confirm}>
						<Icon name="trash" />{box.confirmLabel}
					</button>
					<button class="btn secondary" on:click={() => (box = null)}>
						<Icon name="x" />Cancel
					</button>
				{:else}
					<button class="btn" on:click={() => (box = null)}><Icon name="check" />OK</button>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		margin-bottom: 12px;
	}

	.count {
		margin: 0;
	}

	.bar-actions {
		gap: 8px;
	}

	.top {
		margin-top: 0;
	}

	.box-text {
		margin: 0 0 20px 0;
		line-height: 1.5;
	}
</style>
