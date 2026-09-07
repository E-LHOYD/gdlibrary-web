<script>
	import { bookSubjects } from '$lib/services/subjects.js';
	import { yearLevelsLabel } from '$lib/services/yearLevels.js';

	/** @type {any[]} */
	export let books = [];
	/** Shown when the list is empty. */
	export let empty = 'No books found.';
	/** Show the reading percentage where a book has one. */
	export let showProgress = false;
</script>

{#if books.length === 0}
	<p class="empty">{empty}</p>
{:else}
	<div class="book-list">
		{#each books as book}
			<a class="book-item" href="/books/{book.id}">
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
			</a>
		{/each}
	</div>
{/if}

<style>
	.book-meta {
		display: block;
	}
</style>
