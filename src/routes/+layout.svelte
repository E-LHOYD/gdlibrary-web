<script>
	import Icon from '$lib/components/Icon.svelte';
	import InterestsPrompt from '$lib/components/InterestsPrompt.svelte';
	import Tutorial from '$lib/components/Tutorial.svelte';
	import '$lib/styles.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { session, startSession, signOut } from '$lib/stores/session.js';
	import { recordActivity } from '$lib/services/presence.js';
	import { isFirebaseConfigured } from '$lib/firebase';

	// Pages a signed-out visitor is allowed to see.
	const PUBLIC = ['/', '/login'];

	$: isPublic = PUBLIC.includes($page.url.pathname);
	$: needsSignIn = !$session.loading && !$session.user && !isPublic;

	onMount(() => {
		startSession();
	});

	// Sending someone to the login page is navigation, not rendering, so it
	// belongs in an effect rather than in the markup.
	$: if (needsSignIn) goto('/login');

	$: if ($session.user) recordActivity();

	async function handleSignOut() {
		await signOut();
		goto('/login');
	}
</script>

{#if !isFirebaseConfigured}
	<div class="page">
		<p class="error">
			Firebase is not configured. Set the VITE_FIREBASE_* variables (see .env.example) in your
			environment, and in the Vercel project settings for the deployed site.
		</p>
	</div>
{:else if $session.loading}
	<div class="page"><p class="muted">Loading…</p></div>
{:else}
	{#if $session.user}
		<header class="bar">
			<a class="brand" href="/library">GD-Library</a>
			<nav>
				<a href="/library" class:active={$page.url.pathname === '/library'}>Library</a>
				<a href="/subjects" class:active={$page.url.pathname.startsWith('/subjects')}>Subjects</a>
				<a href="/shelf" class:active={$page.url.pathname.startsWith('/shelf')}>My shelf</a>
				<a href="/profile" class:active={$page.url.pathname === '/profile'}>Profile</a>
			</nav>
			<div class="account">
				<a href="/settings" class="link-btn" class:active={$page.url.pathname === '/settings'}>
					<Icon name="settings" />Settings
				</a>
				<button class="link-btn" on:click={handleSignOut}><Icon name="log-out" />Sign out</button>
			</div>
		</header>
	{/if}

	<slot />

	<InterestsPrompt />
	<Tutorial />
{/if}

<style>
	.bar {
		display: flex;
		align-items: center;
		gap: 20px;
		flex-wrap: wrap;
		padding: 14px 20px;
		background: #fff;
		border-bottom: 2px solid var(--ink);
	}

	.brand {
		font-weight: 700;
		font-size: 1.05rem;
		color: var(--ink);
		text-decoration: none;
	}

	nav {
		display: flex;
		gap: 16px;
		flex-wrap: wrap;
		flex: 1;
	}

	nav a {
		color: var(--muted);
		text-decoration: none;
		font-size: 0.9rem;
	}

	nav a:hover {
		color: var(--brand);
	}

	nav a.active {
		color: var(--brand);
		font-weight: 700;
	}

	.account {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.account a.active {
		font-weight: 700;
	}
</style>
