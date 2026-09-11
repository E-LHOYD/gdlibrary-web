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

	// Which bottom tab a page belongs to. The Library tab covers everything
	// reached from it (subjects, browsing, search, a book), as in the app.
	$: path = $page.url.pathname;
	$: section = path.startsWith('/shelf')
		? 'shelf'
		: path.startsWith('/profile') || path.startsWith('/settings')
			? 'profile'
			: 'library';
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
	{#if $page.url.pathname !== '/'}
		<!-- The same top as the mobile app: the logo bars and name, then a rule.
		     The welcome page has its own. -->
		<header class="top">
			<div class="top-inner">
				<a class="brand" href="/library">
					<span class="logo" aria-hidden="true"><i></i><i></i><i></i></span>GD-Library
				</a>
				{#if $session.user}
					<div class="account">
						<a href="/settings" class="link-btn" class:active={$page.url.pathname === '/settings'}>
							<Icon name="settings" />Settings
						</a>
						<button class="link-btn" on:click={handleSignOut}><Icon name="log-out" />Sign out</button>
					</div>
				{/if}
			</div>
			<div class="rule"></div>
		</header>
	{/if}

	<slot />

	{#if $session.user && !path.startsWith('/read/')}
		<!-- The mobile app's Library / My Shelf / Profile bar, fixed to the
		     bottom, with the section the page belongs to highlighted. Left off
		     the reader, which needs the whole screen, as in the app. -->
		<nav class="tabs" aria-label="Main">
			<div class="tabs-inner">
				<a href="/library" class:on={section === 'library'} aria-current={section === 'library' ? 'page' : undefined}>
					<span class="tab-icon" aria-hidden="true">📚</span>Library
				</a>
				<a href="/shelf" class:on={section === 'shelf'} aria-current={section === 'shelf' ? 'page' : undefined}>
					<span class="tab-icon" aria-hidden="true">📖</span>My Shelf
				</a>
				<a href="/profile" class:on={section === 'profile'} aria-current={section === 'profile' ? 'page' : undefined}>
					<span class="tab-icon" aria-hidden="true">👤</span>Profile
				</a>
			</div>
		</nav>
	{/if}

	<InterestsPrompt />
	<Tutorial />
{/if}

<style>
	/* ---------- top ---------- */

	.top {
		background: var(--ground);
	}

	.top-inner {
		max-width: 960px;
		margin: 0 auto;
		padding: 20px 20px 16px 20px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.rule {
		width: calc(100% - 40px);
		max-width: 920px;
		margin: 0 auto;
		height: 2px;
		background: var(--ink);
	}

	.brand {
		display: inline-flex;
		align-items: flex-end;
		gap: 10px;
		font-weight: 700;
		font-size: 0.95rem;
		color: var(--ink);
		text-decoration: none;
	}

	/* The three shelf bars, as drawn in the app's header. */
	.logo {
		display: inline-flex;
		align-items: flex-end;
		gap: 2px;
	}

	.logo i {
		display: block;
		width: 5px;
		background: var(--ink);
	}

	.logo i:nth-child(1) { height: 22px; }
	.logo i:nth-child(2) { height: 17px; }
	.logo i:nth-child(3) {
		height: 19px;
		background: var(--brand);
		transform: rotate(8deg);
		transform-origin: bottom;
	}

	.account {
		display: flex;
		align-items: center;
		gap: 16px;
		font-size: 0.9rem;
	}

	.account a.active {
		font-weight: 700;
	}

	/* ---------- bottom tabs ---------- */

	.tabs {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 50;
		padding: 0 20px 20px 20px;
		pointer-events: none;
	}

	.tabs-inner {
		max-width: 560px;
		margin: 0 auto;
		display: flex;
		gap: 4px;
		padding: 4px;
		background: var(--brand);
		border-radius: 8px;
		box-shadow: 0 6px 18px rgba(3, 48, 71, 0.25);
		pointer-events: auto;
	}

	.tabs a {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		min-height: 60px;
		background: #fff;
		color: var(--brand);
		border-radius: 4px;
		font-size: 0.8rem;
		font-weight: 700;
		text-decoration: none;
	}

	.tabs a:hover {
		background: var(--tint);
	}

	.tabs a.on {
		background: var(--brand);
		color: #fff;
	}

	.tab-icon {
		font-size: 1.25rem;
		line-height: 1;
	}
</style>
