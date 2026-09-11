<script>
	import Icon from '$lib/components/Icon.svelte';
	import { onDestroy } from 'svelte';
	import { onSnapshot, updateDoc } from 'firebase/firestore';
	import { session, findProfileRef } from '$lib/stores/session.js';
	import { DEFAULT_SUBJECTS } from '$lib/services/subjects.js';
	import { isTeacher, userInterests } from '$lib/services/users.js';
	import { studentLevel } from '$lib/services/yearLevels.js';
	import { openTutorial } from '$lib/stores/tutorial.js';

	// Signup asks for exactly three, and the recommendation weighting assumes a
	// small deliberate set rather than a checklist, so editing keeps the rule.
	const REQUIRED_INTERESTS = 3;

	/** @type {string[]} */
	let interests = [];
	let editing = false;
	let saving = false;
	let message = '';
	let error = '';

	// Read straight from Firestore while the page is open, rather than from the
	// copy the session took at sign-in, so a change made in the dashboard or the
	// app shows here without signing out and back in.
	/** @type {any} */
	let profile = null;
	/** @type {import('firebase/firestore').DocumentReference | null} */
	let profileRef = null;
	let loadingProfile = true;
	let loadError = '';
	/** @type {(() => void) | null} */
	let unsubscribe = null;
	/** @type {string | null} */
	let watchingUid = null;

	$: if ($session.user && $session.user.uid !== watchingUid) watch($session.user);

	/** @param {any} user */
	async function watch(user) {
		watchingUid = user.uid;
		unsubscribe?.();
		unsubscribe = null;
		loadingProfile = true;
		loadError = '';

		try {
			const ref = await findProfileRef(user);
			if (watchingUid !== user.uid) return;

			if (!ref) {
				profile = null;
				loadingProfile = false;
				loadError = 'No profile was found for this account. Ask your library administrator to check it.';
				return;
			}

			profileRef = ref;
			unsubscribe = onSnapshot(
				ref,
				(snapshot) => {
					profile = snapshot.exists() ? snapshot.data() : null;
					loadingProfile = false;
					if (!profile) loadError = 'No profile was found for this account.';

					// Every other page reads the session's copy, so it follows along.
					session.update((s) => (s.user?.uid === user.uid ? { ...s, profile } : s));
				},
				(err) => {
					console.error('Could not read the profile:', err);
					loadingProfile = false;
					loadError = 'Could not load your profile. Please try again.';
				}
			);
		} catch (err) {
			console.error('Could not find the profile:', err);
			loadingProfile = false;
			loadError = 'Could not load your profile. Please try again.';
		}
	}

	onDestroy(() => unsubscribe?.());

	$: teacher = isTeacher(profile);
	// A student's program is their strand (senior high) or course (college); a
	// teacher has neither, so their department stands in its place.
	$: program = teacher ? profile?.department : profile?.strand || profile?.course;
	$: level = studentLevel(profile);

	// Follows the live profile whenever the reader is not mid-edit, so a change
	// saved elsewhere shows at once, but ticks being made are never overwritten.
	$: if (profile && !editing) {
		interests = userInterests(profile);
	}

	/** @param {string} subject */
	function toggle(subject) {
		if (interests.includes(subject)) {
			interests = interests.filter((s) => s !== subject);
		} else if (interests.length < REQUIRED_INTERESTS) {
			interests = [...interests, subject];
		}
	}

	function cancel() {
		interests = userInterests(profile);
		editing = false;
		error = '';
	}

	async function save() {
		error = '';
		message = '';

		if (interests.length !== REQUIRED_INTERESTS) {
			error = `Choose exactly ${REQUIRED_INTERESTS} interests.`;
			return;
		}

		if (!profileRef) {
			error = 'Your profile has not loaded yet.';
			return;
		}

		saving = true;

		try {
			// The live listener above brings the saved interests back into the page
			// and the session, so nothing else needs updating here.
			await updateDoc(profileRef, { interests: [...interests] });

			editing = false;
			message = 'Interests saved. Your recommendations will use them from now on.';
		} catch (err) {
			console.error('Could not save interests:', err);
			error = 'Could not save your interests. Please try again.';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head><title>Profile · GD-Library</title></svelte:head>

<div class="page">
	<div class="title-row">
		<h1 class="page-title">Profile</h1>
		<button
			type="button"
			class="help-btn"
			on:click={openTutorial}
			aria-label="Show the tour of how to use GD-Library"
			title="How to use GD-Library"
		>
			?
		</button>
	</div>

	{#if message}<p class="notice">{message}</p>{/if}
	{#if error}<p class="error">{error}</p>{/if}

	{#if loadingProfile}
		<p class="muted">Loading your details…</p>
	{:else if loadError}
		<p class="error">{loadError}</p>
	{:else if profile}
		<dl class="facts">
			<div><dt>Username</dt><dd>{profile.username || '—'}</dd></div>
			<div><dt>{teacher ? 'Department' : 'Program'}</dt><dd>{program || '—'}</dd></div>
			{#if !teacher}
				<div><dt>Year level</dt><dd>{level || '—'}</dd></div>
			{/if}
		</dl>

		<h2 class="section-title">Interests</h2>

		{#if editing}
			<div class="chips">
				{#each DEFAULT_SUBJECTS as subject}
					<button
						class="chip"
						class:active={interests.includes(subject)}
						disabled={interests.length >= REQUIRED_INTERESTS && !interests.includes(subject)}
						on:click={() => toggle(subject)}
						aria-pressed={interests.includes(subject)}
					>
						{#if interests.includes(subject)}<Icon name="check" />{/if}{subject}
					</button>
				{/each}
			</div>
			<p class="muted spaced">{interests.length}/{REQUIRED_INTERESTS} selected</p>
			<div class="row">
				<button class="btn" on:click={save} disabled={saving}>
					<Icon name="check" />{saving ? 'Saving…' : 'Save interests'}
				</button>
				<button class="btn secondary" on:click={cancel} disabled={saving}>
					<Icon name="x" />Cancel
				</button>
			</div>
		{:else}
			<div class="chips">
				{#each interests as subject}
					<span class="chip active"><Icon name="check" />{subject}</span>
				{/each}
				{#if interests.length === 0}
					<span class="muted">None chosen yet.</span>
				{/if}
			</div>
			<button class="btn secondary" on:click={() => (editing = true)}>
				<Icon name="edit" />Change interests
			</button>
		{/if}
	{/if}
</div>

<style>
	/* Each detail its own card, label over value, as in the mobile app. */
	.facts {
		display: grid;
		gap: 10px;
		margin: 0 0 12px 0;
	}

	.facts > div {
		padding: 16px 20px;
		background: #fff;
		border-radius: var(--radius);
		box-shadow: var(--shadow);
	}

	dt {
		color: #666;
		font-size: 0.8125rem;
		margin-bottom: 2px;
	}

	dd {
		margin: 0;
		font-weight: 700;
	}

	.spaced {
		margin-bottom: 12px;
	}

	.title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 24px;
	}

	.title-row .page-title {
		margin: 0;
	}

	.help-btn {
		width: 40px;
		height: 40px;
		flex-shrink: 0;
		border: 2px solid var(--brand);
		border-radius: 50%;
		background: #fff;
		color: var(--brand);
		font: inherit;
		font-size: 1.2rem;
		font-weight: 700;
		cursor: pointer;
	}

	.help-btn:hover,
	.help-btn:focus-visible {
		background: var(--brand);
		color: #fff;
	}
</style>
