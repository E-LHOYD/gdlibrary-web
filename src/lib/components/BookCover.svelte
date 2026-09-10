<script>
	// A book's cover: the uploaded cover image when there is one, otherwise the
	// first page of the book itself, drawn with pdf.js.
	//
	// Only the first page is fetched: auto-fetch and streaming are off, so pdf.js
	// asks storage for just the byte ranges it needs rather than the whole book.

	import { onDestroy, onMount } from 'svelte';
	import { loadPdfjs } from '$lib/services/pdf.js';

	/** @type {any} */
	export let book;
	/** Display width in CSS pixels. */
	export let width = 180;

	/** @type {HTMLCanvasElement} */
	let canvas;
	let state = 'idle'; // idle | loading | ready | failed
	let task = null;
	let destroyed = false;

	$: useImage = Boolean(book?.coverUrl);

	onMount(() => {
		if (!useImage && book?.fileUrl) drawFirstPage();
	});

	onDestroy(() => {
		destroyed = true;
		task?.destroy?.();
	});

	async function drawFirstPage() {
		state = 'loading';

		try {
			const pdfjs = await loadPdfjs();
			task = pdfjs.getDocument({ url: book.fileUrl, disableAutoFetch: true, disableStream: true });
			const pdf = await task.promise;
			if (destroyed) return;

			const page = await pdf.getPage(1);
			const base = page.getViewport({ scale: 1 });
			// Drawn at twice the display size so it stays sharp on high-density screens.
			const viewport = page.getViewport({ scale: (width * 2) / base.width });

			canvas.width = viewport.width;
			canvas.height = viewport.height;
			await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
			if (!destroyed) state = 'ready';
		} catch (err) {
			console.error('Could not draw the first page:', err);
			if (!destroyed) state = 'failed';
		}
	}
</script>

{#if useImage}
	<img class="cover" style="width:{width}px" src={book.coverUrl} alt="Cover of {book.title}" />
{:else if book?.fileUrl && state !== 'failed'}
	<div
		class="cover frame"
		style="width:{width}px"
		class:placeholder={state !== 'ready'}
		role="img"
		aria-label="First page of {book.title}"
	>
		<canvas bind:this={canvas} class:hidden={state !== 'ready'}></canvas>
		{#if state !== 'ready'}<span class="muted">Loading preview…</span>{/if}
	</div>
{/if}

<style>
	.cover {
		display: block;
		border: 2px solid var(--ink);
		flex-shrink: 0;
		background: #fff;
	}

	.frame canvas {
		display: block;
		width: 100%;
		height: auto;
	}

	.placeholder {
		aspect-ratio: 3 / 4;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--tint);
	}

	.hidden {
		position: absolute;
		visibility: hidden;
		width: 0;
		height: 0;
	}
</style>
