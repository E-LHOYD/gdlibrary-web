<script>
	import Icon from '$lib/components/Icon.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { doc, getDoc } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { session } from '$lib/stores/session.js';
	import {
		saveReadingProgress,
		getReadingProgress,
		bookmarksOf,
		addBookmark,
		removeBookmark
	} from '$lib/services/readingProgress.js';
	import { loadPdfjs } from '$lib/services/pdf.js';
	import { addBookToShelf } from '$lib/services/shelf.js';
	import { recordActivity } from '$lib/services/presence.js';

	let book = null;
	let loading = true;
	let error = '';

	/** @type {HTMLDivElement} */
	let pagesEl;
	let currentPage = 1;
	let totalPages = 0;
	let furthestPage = 1;

	let saveTimer = null;
	let destroyed = false;

	// ---------- bookmarks ----------
	/** @type {number[]} */
	let bookmarks = [];
	/** The page the mobile app's single bookmark points at, kept in step. */
	let appBookmark = null;
	let showBookmarks = false;
	let bookmarkBusy = false;
	let bookmarkError = '';
	/** A bookmark pressed before its page had been drawn; jumped to once it is. */
	let pendingPage = null;

	$: currentMarked = bookmarks.includes(currentPage);

	$: bookId = $page.params.id;
	$: percentage = totalPages > 0 ? Math.min(100, (furthestPage / totalPages) * 100) : 0;

	onMount(async () => {
		try {
			const snapshot = await getDoc(doc(db, 'books', bookId));

			if (!snapshot.exists()) {
				error = 'That book no longer exists.';
				return;
			}

			book = { id: snapshot.id, ...snapshot.data() };

			if (!book.fileUrl) {
				error = 'This book has no file, so there is nothing to read yet.';
				return;
			}

			const existing = await getReadingProgress(bookId);
			const startAt = existing?.currentPage > 1 ? existing.currentPage : 1;
			bookmarks = bookmarksOf(existing);
			appBookmark = Number.isInteger(existing?.bookmark) ? existing.bookmark : null;
			furthestPage = startAt;

			await renderPdf(book.fileUrl, startAt);
			recordActivity(true);
		} catch (err) {
			console.error('Could not open the book:', err);
			error = 'Could not open this book.';
		} finally {
			loading = false;
		}
	});

	onDestroy(() => {
		destroyed = true;
		if (saveTimer) clearTimeout(saveTimer);
		// One last write on the way out, so closing the tab does not lose the
		// last page turn.
		persist();
	});

	async function renderPdf(url, startAt) {
		// Loaded on demand: pdf.js is large and only the reader needs all of it.
		const pdfjs = await loadPdfjs();

		const pdf = await pdfjs.getDocument({ url }).promise;
		totalPages = pdf.numPages;

		for (let number = 1; number <= pdf.numPages; number++) {
			if (destroyed) return;

			const pdfPage = await pdf.getPage(number);
			const viewport = pdfPage.getViewport({ scale: 1.4 });

			const canvas = document.createElement('canvas');
			canvas.width = viewport.width;
			canvas.height = viewport.height;
			canvas.className = 'pdf-page';
			canvas.dataset.page = String(number);
			pagesEl.appendChild(canvas);

			await pdfPage.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

			if (pendingPage === number) {
				pendingPage = null;
				canvas.scrollIntoView({ block: 'start' });
			}
		}

		watchScroll();

		if (startAt > 1 && pendingPage === null) {
			const target = pagesEl.querySelector(`[data-page="${startAt}"]`);
			if (target) target.scrollIntoView();
		}
	}

	/**
	 * The page you are on is the topmost one still on screen. Reading the
	 * canvases' positions is cheaper and steadier than an IntersectionObserver
	 * per page, and it never reports a page you scrolled straight past.
	 */
	function watchScroll() {
		const onScroll = () => {
			const canvases = pagesEl.querySelectorAll('canvas');
			for (const canvas of canvases) {
				const box = canvas.getBoundingClientRect();
				if (box.bottom > 120) {
					currentPage = Number(canvas.dataset.page) || 1;
					break;
				}
			}

			if (currentPage > furthestPage) furthestPage = currentPage;
			scheduleSave();
		};

		window.addEventListener('scroll', onScroll, { passive: true });
		onScroll();

		return () => window.removeEventListener('scroll', onScroll);
	}

	/** Saves are debounced: scrolling fires constantly, Firestore should not. */
	function scheduleSave() {
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(persist, 1500);
	}

	/** @param {number} number */
	function goToPage(number) {
		showBookmarks = false;
		const target = pagesEl?.querySelector(`[data-page="${number}"]`);

		if (target) {
			target.scrollIntoView({ block: 'start' });
		} else {
			// Pages are drawn in order, so a far bookmark may not exist yet.
			pendingPage = number;
		}
	}

	async function toggleBookmark() {
		if (!totalPages || bookmarkBusy) return;

		const number = currentPage;
		const before = bookmarks;
		bookmarkBusy = true;
		bookmarkError = '';

		try {
			if (before.includes(number)) {
				const remaining = before.filter((n) => n !== number);
				bookmarks = remaining;
				await removeBookmark(bookId, number, remaining, appBookmark);
				if (appBookmark === number) appBookmark = remaining.length ? remaining[remaining.length - 1] : null;
			} else {
				bookmarks = [...before, number].sort((a, b) => a - b);
				await addBookmark(bookId, number);
				appBookmark = number;
			}
		} catch (err) {
			console.error('Could not change the bookmark:', err);
			bookmarks = before;
			bookmarkError = 'Could not save the bookmark. Please try again.';
		} finally {
			bookmarkBusy = false;
		}
	}

	/** @param {number} number */
	async function deleteBookmark(number) {
		const before = bookmarks;
		const remaining = before.filter((n) => n !== number);
		bookmarks = remaining;
		bookmarkError = '';

		try {
			await removeBookmark(bookId, number, remaining, appBookmark);
			if (appBookmark === number) appBookmark = remaining.length ? remaining[remaining.length - 1] : null;
		} catch (err) {
			console.error('Could not remove the bookmark:', err);
			bookmarks = before;
			bookmarkError = 'Could not remove the bookmark. Please try again.';
		}
	}

	/** @param {KeyboardEvent} event */
	function onKey(event) {
		if (event.key === 'Escape') showBookmarks = false;
	}

	async function persist() {
		if (!bookId || totalPages === 0) return;

		await saveReadingProgress(bookId, furthestPage, totalPages, percentage);

		// The shelves mirror the status the same way the app does, so a book read
		// on the web lands on the same shelf.
		const userId = $session.user?.uid;
		if (!userId) return;

		await addBookToShelf(userId, furthestPage > 1 ? 'read' : 'viewed', bookId);
		recordActivity();
	}
</script>

<svelte:head><title>{book?.title ?? 'Reading'} · GD-Library</title></svelte:head>
<svelte:window on:keydown={onKey} />

<div class="reader">
	<div class="bar">
		<a class="link-btn" href="/books/{bookId}"><Icon name="arrow-left" />Back</a>
		<span class="title">{book?.title ?? ''}</span>
		<span class="progress">
			{#if totalPages}
				Page {currentPage} of {totalPages} · {Math.round(percentage)}%
			{/if}
		</span>
		{#if totalPages}
			<button
				type="button"
				class="btn secondary small"
				class:marked={currentMarked}
				on:click={toggleBookmark}
				disabled={bookmarkBusy}
				aria-pressed={currentMarked}
				title={currentMarked ? `Remove the bookmark on page ${currentPage}` : `Bookmark page ${currentPage}`}
			>
				<Icon name="bookmark" />{currentMarked ? 'Bookmarked' : 'Bookmark'}
			</button>
			<div class="marks">
				<button
					type="button"
					class="btn secondary small"
					on:click={() => (showBookmarks = !showBookmarks)}
					aria-expanded={showBookmarks}
					aria-controls="bookmark-list"
				>
					<Icon name="list" />Bookmarks ({bookmarks.length})
				</button>
				{#if showBookmarks}
					<div class="panel" id="bookmark-list">
						{#if bookmarks.length === 0}
							<p class="muted">No bookmarks yet. Press "Bookmark" to mark the page you are on.</p>
						{:else}
							<ul>
								{#each bookmarks as number (number)}
									<li class:here={number === currentPage}>
										<button type="button" class="jump" on:click={() => goToPage(number)}>
											Page {number}
										</button>
										<button
											type="button"
											class="remove"
											on:click={() => deleteBookmark(number)}
											aria-label="Remove the bookmark on page {number}"
										>
											<Icon name="x" />
										</button>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	{#if bookmarkError}<p class="page error">{bookmarkError}</p>{/if}
	{#if pendingPage}<p class="page muted">Opening page {pendingPage}… it is still loading.</p>{/if}

	{#if loading}
		<p class="page muted">Opening the book…</p>
	{:else if error}
		<p class="page error">{error}</p>
	{/if}

	<div class="pages" bind:this={pagesEl}></div>
</div>

<style>
	.reader {
		padding-bottom: 40px;
	}

	.bar {
		position: sticky;
		top: 0;
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 12px 20px;
		background: #fff;
		border-bottom: 2px solid var(--ink);
	}

	.title {
		flex: 1;
		font-weight: 700;
		text-transform: capitalize;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.progress {
		font-size: 0.8125rem;
		color: var(--muted);
		white-space: nowrap;
	}

	.small {
		min-height: 36px;
		padding: 6px 12px;
		font-size: 0.875rem;
	}

	.marked {
		background: var(--brand);
		color: #fff;
	}

	.marks {
		position: relative;
	}

	.panel {
		position: absolute;
		right: 0;
		top: calc(100% + 8px);
		width: 240px;
		max-height: 60vh;
		overflow-y: auto;
		padding: 8px;
		background: #fff;
		border-radius: var(--radius);
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
	}

	.panel .muted {
		margin: 4px;
	}

	.panel ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.panel li {
		display: flex;
		align-items: center;
	}

	.panel li.here .jump {
		font-weight: 700;
		color: var(--brand);
	}

	.jump {
		flex: 1;
		text-align: left;
		padding: 10px 8px;
		background: none;
		border: none;
		font: inherit;
		color: var(--ink);
		cursor: pointer;
	}

	.jump:hover,
	.jump:focus-visible {
		background: var(--tint);
	}

	.remove {
		display: flex;
		align-items: center;
		padding: 8px;
		background: none;
		border: none;
		color: var(--danger);
		cursor: pointer;
	}

	.pages {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		padding: 20px;
	}

	.pages :global(canvas) {
		/* Clears the sticky bar when a bookmark scrolls a page to the top. */
		scroll-margin-top: 72px;
		max-width: 100%;
		height: auto;
		border: 1px solid var(--border);
		background: #fff;
	}
</style>
