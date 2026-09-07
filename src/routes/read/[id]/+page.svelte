<script>
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { doc, getDoc } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { session } from '$lib/stores/session.js';
	import { saveReadingProgress, getReadingProgress } from '$lib/services/readingProgress.js';
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
		// pdf.js is imported here rather than at the top so it never runs during
		// SSR or the initial bundle: it is large and only this page needs it.
		const pdfjs = await import('pdfjs-dist');
		const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
		pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

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
		}

		watchScroll();

		if (startAt > 1) {
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

<div class="reader">
	<div class="bar">
		<a class="link-btn" href="/books/{bookId}">← Back</a>
		<span class="title">{book?.title ?? ''}</span>
		<span class="progress">
			{#if totalPages}
				Page {currentPage} of {totalPages} · {Math.round(percentage)}%
			{/if}
		</span>
	</div>

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

	.pages {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		padding: 20px;
	}

	.pages :global(canvas) {
		max-width: 100%;
		height: auto;
		border: 1px solid var(--border);
		background: #fff;
	}
</style>
