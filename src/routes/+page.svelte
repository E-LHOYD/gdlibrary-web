<script>
	import Icon from '$lib/components/Icon.svelte';
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores/session.js';

	// Someone already signed in has no use for the welcome page; the layout has
	// their session by the time this runs.
	$: if (!$session.loading && $session.user) goto('/library');
</script>

<svelte:head>
	<title>GD-Library</title>
	<meta name="description" content="GD-Library - Your Digital Book Collection" />
</svelte:head>

<!-- The site header (logo bars, name and rule) comes from the layout, the
     same as on every other page. -->
<div class="container">
	<main class="main">
		<div class="hero">
			<h2>Welcome to GD-Library</h2>
			<p>Your personal digital library at your fingertips</p>
			<div class="actions">
				<a href="/login" class="btn"><Icon name="log-in" />Log in</a>
			</div>
		</div>
	</main>

	<footer class="footer">
		<p>&copy; 2024 GD-Library. All rights reserved.</p>
	</footer>
</div>

<style>
	.container {
		min-height: calc(100vh - 80px);
		display: flex;
		flex-direction: column;
	}

	.main {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.hero {
		text-align: center;
		max-width: 600px;
	}

	.hero h2 {
		font-size: 2.5rem;
		color: var(--ink);
		margin-bottom: 1rem;
	}

	.hero p {
		font-size: 1.2rem;
		color: #666;
		margin-bottom: 2rem;
	}

	.actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	.footer {
		text-align: center;
		padding: 1rem;
		color: var(--muted);
		font-size: 0.875rem;
		margin-top: auto;
	}
</style>
