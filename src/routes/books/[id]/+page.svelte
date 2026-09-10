<script>
	import Icon from '$lib/components/Icon.svelte';
	import BookCover from '$lib/components/BookCover.svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { doc, getDoc } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { session } from '$lib/stores/session.js';
	import { bookSubjects } from '$lib/services/subjects.js';
	import { yearLevelsLabel } from '$lib/services/yearLevels.js';
	import { getReadingProgress } from '$lib/services/readingProgress.js';
	import { getUserShelves, addBookToShelf, createCustomShelf } from '$lib/services/shelf.js';

	let book = null;
	let loading = true;
	let error = '';

	let progress = null;
	let shelves = [];
	let showShelfPicker = false;
	let shelfMessage = '';
	let newShelfName = '';
	// The shelf a write is in flight for, so its row cannot be pressed twice.
	let pending = '';
	/**
	 * The box shown after pressing a shelf: what happened, and nothing to decide.
	 * @type {{title: string, text: string} | null}
	 */
	let resultBox = null;

	$: bookId = $page.params.id;

	onMount(async () => {
		try {
			const snapshot = await getDoc(doc(db, 'books', bookId));

			if (!snapshot.exists()) {
				error = 'That book no longer exists.';
				return;
			}

			book = { id: snapshot.id, ...snapshot.data() };
			progress = await getReadingProgress(bookId);
		} catch (err) {
			console.error('Could not load the book:', err);
			error = 'Could not load this book.';
		} finally {
			loading = false;
		}
	});

	async function openShelfPicker() {
		shelfMessage = '';
		showShelfPicker = true;

		try {
			const all = await getUserShelves($session.user.uid);
			// Read and Viewed are kept by the reader itself, so only the shelves the
			// reader made by hand are offered here.
			shelves = all.filter((s) => !s.isReadShelf && !s.isViewedShelf);
		} catch (err) {
			console.error('Could not load shelves:', err);
			shelfMessage = 'Could not load your shelves.';
		}
	}

	/**
	 * The shelf with this book on it. The count on screen is rendered from this
	 * array, so a write that only reaches Firestore leaves the number where it
	 * was until the picker is reopened.
	 * @param {any} shelf
	 */
	function withBook(shelf) {
		const bookIds = shelf.bookIds || [];
		return bookIds.includes(bookId) ? shelf : { ...shelf, bookIds: [...bookIds, bookId] };
	}

	/** @param {any} shelf */
	function holdsThisBook(shelf) {
		return (shelf.bookIds || []).includes(bookId);
	}

	/**
	 * Put the book on the shelf, and say what happened.
	 *
	 * A shelf that already holds the book is answered rather than written to:
	 * addBookToShelf reports success either way, so without this check pressing
	 * an already-filed shelf would claim a second copy had been added.
	 *
	 * @param {any} shelf
	 */
	async function addTo(shelf) {
		if (holdsThisBook(shelf)) {
			resultBox = {
				title: 'Already on that shelf',
				text: `This book is already on ${shelf.name}.`
			};
			return;
		}

		pending = shelf.id;

		try {
			const added = await addBookToShelf($session.user.uid, shelf.id, bookId);

			if (!added) {
				resultBox = {
					title: 'Could not add the book',
					text: `${shelf.name} could not be updated. Please try again.`
				};
				return;
			}

			shelves = shelves.map((s) => (s.id === shelf.id ? withBook(s) : s));
			resultBox = { title: 'Added to the shelf', text: `This book is now on ${shelf.name}.` };
		} catch (err) {
			resultBox = {
				title: 'Could not add the book',
				text: err?.message ?? 'Something went wrong. Please try again.'
			};
		} finally {
			pending = '';
		}
	}

	async function createAndAdd() {
		const name = newShelfName.trim();

		try {
			const shelf = await createCustomShelf($session.user.uid, name);
			await addBookToShelf($session.user.uid, shelf.id, bookId);
			newShelfName = '';
			// createCustomShelf returns the shelf as it was created, which is empty;
			// the book has just gone onto it, so it is listed with the book on it.
			shelves = [...shelves, withBook(shelf)];
			resultBox = { title: 'Shelf created', text: `This book is now on ${shelf.name}.` };
		} catch (err) {
			// A duplicate name or the shelf limit lands here, and both are
			// worth reading, so they go in the box rather than being swallowed.
			resultBox = {
				title: 'Could not create the shelf',
				text: err?.message ?? 'Something went wrong. Please try again.'
			};
		}
	}
</script>

<svelte:head><title>{book?.title ?? 'Book'} · GD-Library</title></svelte:head>

<div class="page">
	<p class="muted"><a class="link-btn" href="/library"><Icon name="arrow-left" />Library</a></p>

	{#if loading}
		<p class="muted">Loading…</p>
	{:else if error}
		<p class="error">{error}</p>
	{:else}
		<div class="head">
			<!-- The uploaded cover, or the book's first page when it has none. -->
			<BookCover {book} width={180} />
			<div class="meta">
				<h1 class="page-title title">{book.title}</h1>
				<p class="author">{book.author}</p>

				{#if bookSubjects(book).length}
					<p class="muted"><strong>Subjects:</strong> {bookSubjects(book).join(', ')}</p>
				{/if}
				{#if yearLevelsLabel(book)}
					<p class="muted"><strong>Year level:</strong> {yearLevelsLabel(book)}</p>
				{/if}
				{#if book.publishedDate || book.releaseDate}
					<p class="muted">
						<strong>Published:</strong> {book.publishedDate || book.releaseDate}
					</p>
				{/if}
				{#if progress && typeof progress.percentage === 'number'}
					<p class="muted">
						<strong>Progress:</strong> {Math.round(progress.percentage)}% · {progress.status}
					</p>
				{/if}

				<div class="row actions">
					{#if book.fileUrl}
						<a class="btn" href="/read/{book.id}"><Icon name="book-open" />Read book</a>
					{:else}
						<span class="muted">No file uploaded, so this book cannot be opened yet.</span>
					{/if}
					<button class="btn secondary" on:click={openShelfPicker}>
						<Icon name="bookmark" />Add to shelf
					</button>
				</div>
			</div>
		</div>

		{#if book.detail}
			<h2 class="section-title">About this book</h2>
			<p class="detail">{book.detail}</p>
		{/if}

		{#if showShelfPicker}
			<div class="scrim" role="presentation" on:click={() => (showShelfPicker = false)}></div>
			<div class="modal" role="dialog" aria-modal="true" aria-label="Add to shelf">
				<h2 class="section-title top">Add to a shelf</h2>

				{#if shelfMessage}<p class="notice">{shelfMessage}</p>{/if}

				{#if shelves.length === 0}
					<p class="muted">You have no shelves yet. Create one below.</p>
				{:else}
					<div class="shelf-list">
						{#each shelves as shelf}
							{@const count = shelf.bookIds?.length || 0}
							<button
								class="shelf"
								on:click={() => addTo(shelf)}
								disabled={pending === shelf.id}
							>
								<Icon name="plus" />
								<span class="shelf-name">{shelf.name}</span>
								<span class="muted">{count} book{count === 1 ? '' : 's'}</span>
							</button>
						{/each}
					</div>
				{/if}

				<label class="field new">
					<span>New shelf</span>
					<input type="text" bind:value={newShelfName} placeholder="Shelf name" />
				</label>

				<div class="row">
					<button class="btn" on:click={createAndAdd} disabled={!newShelfName.trim()}>
						<Icon name="plus" />Create and add
					</button>
					<button class="btn secondary" on:click={() => (showShelfPicker = false)}>
						<Icon name="x" />Close
					</button>
				</div>
			</div>
		{/if}

		{#if resultBox}
			<!-- After the picker in the markup, so it paints over it. -->
			<div class="scrim" role="presentation" on:click={() => (resultBox = null)}></div>
			<div class="modal box" role="alertdialog" aria-modal="true" aria-labelledby="result-title">
				<h2 class="section-title top" id="result-title">{resultBox.title}</h2>
				<p class="box-text">{resultBox.text}</p>
				<div class="row">
					<button class="btn" on:click={() => (resultBox = null)}><Icon name="check" />OK</button>
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.head {
		display: flex;
		gap: 24px;
		flex-wrap: wrap;
		align-items: flex-start;
	}

	.meta {
		flex: 1;
		min-width: 260px;
	}

	.title {
		text-transform: capitalize;
		margin-bottom: 4px;
	}

	.author {
		color: var(--muted);
		margin: 0 0 16px 0;
	}

	.actions {
		margin-top: 20px;
	}

	.detail {
		line-height: 1.6;
		max-width: 65ch;
	}

	.scrim {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
	}

	.modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: min(420px, calc(100vw - 40px));
		max-height: 80vh;
		overflow-y: auto;
		background: #fff;
		border: 2px solid var(--ink);
		padding: 20px;
	}

	.top {
		margin-top: 0;
	}

	.shelf-list {
		display: grid;
		gap: 2px;
		background: var(--ink);
		border: 2px solid var(--ink);
		margin-bottom: 16px;
	}

	.shelf {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 12px;
		background: #fff;
		border: none;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.shelf:hover:not(:disabled) {
		background: var(--tint);
	}

	.shelf:disabled {
		opacity: 0.55;
		cursor: progress;
	}

	.shelf-name {
		flex: 1;
	}

	.box {
		width: min(380px, calc(100vw - 40px));
	}

	.box-text {
		margin: 0 0 20px 0;
		line-height: 1.5;
	}

	.new {
		margin-top: 8px;
	}
</style>
