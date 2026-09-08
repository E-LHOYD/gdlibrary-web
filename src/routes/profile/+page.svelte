<script>
	import Icon from '$lib/components/Icon.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { doc, updateDoc } from 'firebase/firestore';
	import { sendPasswordResetEmail } from 'firebase/auth';
	import { auth, db } from '$lib/firebase';
	import { session, signOut } from '$lib/stores/session.js';
	import { DEFAULT_SUBJECTS } from '$lib/services/subjects.js';
	import { fullName, roleLabel, studentTypeLabel, idNumberOf, isTeacher } from '$lib/services/users.js';
	import { studentLevel } from '$lib/services/yearLevels.js';
	import { getAllReadingProgress } from '$lib/services/readingProgress.js';

	// Signup asks for exactly three, and the recommendation weighting assumes a
	// small deliberate set rather than a checklist, so editing keeps the rule.
	const REQUIRED_INTERESTS = 3;

	/** @type {string[]} */
	let interests = [];
	let editing = false;
	let saving = false;
	let message = '';
	let error = '';

	let readCount = 0;
	let viewedCount = 0;

	$: profile = $session.profile;
	$: level = studentLevel(profile);
	$: idNumber = idNumberOf(profile);
	$: idLabel = isTeacher(profile) ? 'Employee number' : 'ID number';

	// Seeded from the profile whenever it arrives rather than at mount, because
	// straight after login the session has the user but not yet the profile, and
	// reading it then showed the reader no interests at all. Never re-seeded once
	// taken, so the store settling cannot wipe ticks made in the meantime.
	let interestsTaken = false;

	$: if (!interestsTaken && profile) {
		interests = Array.isArray(profile.interests) ? [...profile.interests] : [];
		interestsTaken = true;
	}

	onMount(async () => {
		const progress = await getAllReadingProgress();
		readCount = progress.filter((entry) => entry.status === 'read').length;
		viewedCount = progress.filter((entry) => entry.status === 'viewed').length;
	});

	/** @param {string} subject */
	function toggle(subject) {
		if (interests.includes(subject)) {
			interests = interests.filter((s) => s !== subject);
		} else if (interests.length < REQUIRED_INTERESTS) {
			interests = [...interests, subject];
		}
	}

	function cancel() {
		interests = Array.isArray(profile?.interests) ? [...profile.interests] : [];
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

		saving = true;

		try {
			await updateDoc(doc(db, 'users', $session.user.uid), { interests: [...interests] });

			// The session store holds the profile every page reads, so it is updated
			// here rather than left to go stale until the next sign-in.
			session.update((s) => ({ ...s, profile: { ...s.profile, interests: [...interests] } }));

			editing = false;
			message = 'Interests saved. Your recommendations will use them from now on.';
		} catch (err) {
			console.error('Could not save interests:', err);
			error = 'Could not save your interests. Please try again.';
		} finally {
			saving = false;
		}
	}

	async function resetPassword() {
		message = '';
		error = '';

		try {
			await sendPasswordResetEmail(auth, $session.user.email);
			message = 'A password reset link is on its way to your email.';
		} catch (err) {
			console.error('Could not send the reset email:', err);
			error = 'Could not send the reset email. Please try again.';
		}
	}

	async function handleSignOut() {
		await signOut();
		goto('/login');
	}
</script>

<svelte:head><title>Profile · GD-Library</title></svelte:head>

<div class="page">
	<h1 class="page-title">Profile</h1>

	{#if message}<p class="notice">{message}</p>{/if}
	{#if error}<p class="error">{error}</p>{/if}

	<dl class="facts">
		<div><dt>Name</dt><dd>{fullName(profile) || '—'}</dd></div>
		<div><dt>Email</dt><dd>{$session.user?.email ?? '—'}</dd></div>
		<div><dt>Role</dt><dd>{roleLabel(profile) || '—'}</dd></div>
		{#if isTeacher(profile)}
			<div><dt>Department</dt><dd>{profile?.department || '—'}</dd></div>
		{:else}
			<div><dt>Level</dt><dd>{studentTypeLabel(profile) || '—'}</dd></div>
			<div><dt>Year</dt><dd>{level || '—'}</dd></div>
			<div><dt>Strand or course</dt><dd>{profile?.strand || profile?.course || '—'}</dd></div>
		{/if}
		{#if idNumber}
			<div><dt>{idLabel}</dt><dd>{idNumber}</dd></div>
		{/if}
	</dl>

	<h2 class="section-title">Reading</h2>
	<dl class="facts">
		<div><dt>Books read</dt><dd>{readCount}</dd></div>
		<div><dt>Books opened</dt><dd>{viewedCount}</dd></div>
	</dl>
	<p class="muted"><a href="/shelf/history">See your reading history</a></p>

	<h2 class="section-title">Interests</h2>
	<p class="muted spaced">
		These lead your recommendations, counting for twice as much as the subjects your
		strand or course implies.
	</p>

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

	<h2 class="section-title">Account</h2>
	<div class="row">
		<button class="btn secondary" on:click={resetPassword}>
			<Icon name="mail" />Send password reset email
		</button>
		<button class="btn secondary" on:click={handleSignOut}>
			<Icon name="log-out" />Sign out
		</button>
	</div>
</div>

<style>
	.facts {
		display: grid;
		gap: 2px;
		border: 2px solid var(--ink);
		background: var(--ink);
		margin: 0 0 12px 0;
	}

	.facts > div {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		padding: 12px 14px;
		background: #fff;
	}

	dt {
		color: var(--muted);
		font-size: 0.875rem;
	}

	dd {
		margin: 0;
		font-weight: 700;
		text-align: right;
	}

	.spaced {
		margin-bottom: 12px;
	}
</style>
