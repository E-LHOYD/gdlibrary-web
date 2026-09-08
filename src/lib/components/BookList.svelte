<script>
	import { bookSubjects } from '$lib/services/subjects.js';
	import { yearLevelsLabel } from '$lib/services/yearLevels.js';

	/** @type {any[]} */
	export let books = [];
	/** Shown when the list is empty. */
	export let empty = 'No books found.';
	/** Show the reading percentage where a book has one. */
	export let showProgress = false;
	/**
	 * Turn the rows into checkboxes rather than links. A selecting row must not
	 * also navigate, so the element itself changes: a label wrapping a checkbox
	 * instead of an anchor, which is why the row markup below is rendered
	 * through svelte:element rather than written out twice.
	 */
	export let selectable = false;
	/** @type {string[]} */
	export let selectedIds = [];
	/** @type {((id: string) => void) | null} */
	export let onToggle = null;
</script>

{#if books.length === 0}
	<p class="empty">{empty}</p>
{:else}
	<div class="book-list">
		{#each books as book}
			<svelte:element
				this={selectable ? 'label' : 'a'}
				class="book-item"
				class:picked={selectable && selectedIds.includes(book.id)}
				href={selectable ? undefined : `/books/${book.id}`}
			>
				{#if selectable}
					<input
						class="pick"
						type="checkbox"
						checked={selectedIds.includes(book.id)}
						on:change={() => onToggle?.(book.id)}
					/>
				{/if}
				{#if book.coverUrl}
					<img class="book-cover" src={book.coverUrl} alt="" />
				{/if}
				<span class="book-main">
					<span class="book-title">{book.title}</span><br />
					<span class="book-author">{book.author}</span>
					{#if bookSubjects(book).length || yearLevelsLabel(book)}
						<span class="book-meta">
							{[bookSubjects(book).join(', '), yearLevelsLabel(book)].filter(Boolean).join(' · ')}
						</span>
					{/if}
				</span>
				{#if showProgress && typeof book.percentage === 'number'}
					<span class="book-percent">{Math.round(book.percentage)}%</span>
				{/if}
			</svelte:element>
		{/each}
	</div>
{/if}

<style>
	.book-meta {
		display: block;
	}

	.pick {
		width: 20px;
		height: 20px;
		margin: 2px 0 0 0;
		flex-shrink: 0;
		accent-color: var(--brand);
	}

	.book-item.picked {
		background: var(--tint);
	}
</style>
