<script>
	import Icon from '$lib/components/Icon.svelte';
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import {
		getUserShelves,
		createCustomShelf,
		deleteCustomShelf,
		MAX_CUSTOM_SHELVES
	} from '$lib/services/shelf.js';
	import { getAllReadingProgress } from '$lib/services/readingProgress.js';

	let shelves = [];
	let historyCount = 0;
	let loading = true;
	let message = '';
	let newShelfName = '';
	/** @type {any} */
	let pendingDelete = null;

	$: custom = shelves.filter((s) => !s.isReadShelf && !s.isViewedShelf);

	onMount(load);

	async function load() {
		loading = true;

		try {
			const userId = $session.user.uid;
			shelves = await getUserShelves(userId);

			const progress = await getAllReadingProgress();
			// Reading history is every book with progress, however far it got.
			historyCount = new Set(progress.map((entry) => entry.bookId)).size;
		} catch (error) {
			console.error('Could not load shelves:', error);
			message = 'Could not load your shelves.';
		} finally {
			loading = false;
		}
	}

	async function create() {
		message = '';

		try {
			await createCustomShelf($session.user.uid, newShelfName);
			newShelfName = '';
			await load();
		} catch (error) {
			message = error?.message ?? 'Could not create the shelf.';
		}
	}

	async function confirmDelete() {
		const shelf = pendingDelete;
		pendingDelete = null;
		if (!shelf) return;

		await deleteCustomShelf($session.user.uid, shelf.id);
		await load();
	}
</script>

<svelte:head><title>My shelf · GD-Library</title></svelte:head>

<div class="page">
	<h1 class="page-title">My shelf</h1>

	{#if message}<p class="error">{message}</p>{/if}

	{#if loading}
		<p class="muted">Loading…</p>
	{:else}
		<div class="shelf-list">
			<a class="shelf" href="/shelf/history">
				<span class="name">Reading history</span>
				<span class="muted">{historyCount} book{historyCount === 1 ? '' : 's'}</span>
			</a>

			{#each custom as shelf}
				<div class="shelf row-shelf">
					<a class="shelf inner" href="/shelf/{shelf.id}">
						<span class="name">{shelf.name}</span>
						<span class="muted">{shelf.bookIds?.length || 0} books</span>
					</a>
					<button class="link-btn danger delete" on:click={() => (pendingDelete = shelf)}>
						<Icon name="trash" />Delete
					</button>
				</div>
			{/each}
		</div>

		<h2 class="section-title">Create a shelf</h2>
		{#if custom.length >= MAX_CUSTOM_SHELVES}
			<p class="muted">You have the maximum of {MAX_CUSTOM_SHELVES} shelves.</p>
		{:else}
			<div class="row">
				<input type="text" placeholder="Shelf name" bind:value={newShelfName} class="grow" />
				<button class="btn" on:click={create} disabled={!newShelfName.trim()}>
					<Icon name="plus" />Create
				</button>
			</div>
		{/if}
	{/if}

	{#if pendingDelete}
		<div class="scrim" role="presentation" on:click={() => (pendingDelete = null)}></div>
		<div class="modal" role="dialog" aria-modal="true" aria-label="Delete shelf">
			<h2 class="section-title top">Delete “{pendingDelete.name}”?</h2>
			<p class="muted">
				The shelf is removed. The books stay in the library and keep their reading progress.
			</p>
			<div class="row">
				<button class="btn danger" on:click={confirmDelete}><Icon name="trash" />Delete shelf</button>
				<button class="btn secondary" on:click={() => (pendingDelete = null)}>
					<Icon name="x" />Cancel
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.shelf-list {
		display: grid;
		gap: 2px;
		border: 2px solid var(--ink);
		background: var(--ink);
	}

	.shelf {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		padding: 16px;
		background: #fff;
		text-decoration: none;
		color: inherit;
	}

	.shelf:hover {
		background: var(--tint);
	}

	.row-shelf {
		padding: 0;
	}

	.inner {
		flex: 1;
	}

	.delete {
		color: var(--danger);
		padding: 0 16px;
	}

	.name {
		font-weight: 700;
		color: var(--brand);
	}

	.grow {
		flex: 1;
		min-width: 200px;
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
		background: #fff;
		border: 2px solid var(--ink);
		padding: 20px;
	}

	.top {
		margin-top: 0;
	}
</style>
