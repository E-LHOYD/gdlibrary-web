<script>
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

<div class="container">
	<header class="header">
		<div class="logo">
			<div class="bar bar-1"></div>
			<div class="bar bar-2"></div>
			<div class="bar bar-3"></div>
		</div>
		<h1 class="brand">GD-Library</h1>
	</header>

	<main class="main">
		<div class="hero">
			<h2>Welcome to GD-Library</h2>
			<p>Your personal digital library at your fingertips</p>
			<div class="actions">
				<a href="/login" class="btn btn-primary">Login</a>
				<a href="/register" class="btn btn-secondary">Register</a>
			</div>
		</div>
	</main>

	<footer class="footer">
		<p>&copy; 2024 GD-Library. All rights reserved.</p>
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: 'Archivo', sans-serif;
		background-color: #f5f5f5;
	}

	.container {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.header {
		background-color: #033047;
		color: white;
		padding: 1rem 2rem;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.logo {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.bar {
		width: 30px;
		height: 4px;
		background-color: white;
		border-radius: 2px;
	}

	.bar-2 {
		width: 20px;
	}

	.bar-3 {
		width: 25px;
		transform: rotate(8deg);
	}

	.brand {
		margin: 0;
		font-size: 1.5rem;
		font-weight: bold;
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
		color: #201e1d;
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

	.btn {
		padding: 0.75rem 2rem;
		border-radius: 4px;
		text-decoration: none;
		font-weight: bold;
		transition: all 0.2s;
	}

	.btn-primary {
		background-color: #033047;
		color: white;
	}

	.btn-primary:hover {
		background-color: #044066;
	}

	.btn-secondary {
		background-color: white;
		color: #033047;
		border: 2px solid #033047;
	}

	.btn-secondary:hover {
		background-color: #f0f0f0;
	}

	.footer {
		background-color: #201e1d;
		color: white;
		text-align: center;
		padding: 1rem;
		margin-top: auto;
	}
</style>
