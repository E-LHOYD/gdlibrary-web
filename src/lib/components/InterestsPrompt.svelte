<script>
	// Asks a signed-in reader for their three interests when their profile has
	// none. Accounts are now created from the dashboard without interests, and
	// recommendations lean on them, so the reader is asked the first time they
	// open the library rather than left with a list ranked on their strand alone.
	//
	// There is no way to dismiss it: three interests are required, and the box
	// stays until they are saved.
	//
	// It is asked once per account. Saving also writes interestsPrompted: true to
	// the user document, and an account carrying that flag is never asked again,
	// on the web or in the app, whatever happens to its interests afterwards.

	import Icon from '$lib/components/Icon.svelte';
	import { updateDoc } from 'firebase/firestore';
	import { session, findProfileRef } from '$lib/stores/session.js';
	import { DEFAULT_SUBJECTS } from '$lib/services/subjects.js';

	const REQUIRED_INTERESTS = 3;

	/** @type {string[]} */
	let picked = [];
	let saving = false;
	let error = '';
	// Closes the box for the rest of the visit the moment the save lands, before
	// the session has even been updated.
	let done = false;
	/** @type {string | null} */
	let doneFor = null;

	// A different account signing in on the same tab gets its own chance.
	$: if ($session.user?.uid !== doneFor) done = false;

	$: profile = $session.profile;
	$: current = Array.isArray(profile?.interests)
		? profile.interests.filter((i) => typeof i === 'string' && i.trim())
		: [];

	// Only once the profile has actually been read, and only for an account that
	// has one: a missing profile is something to tell the administrator, not a
	// reason to write interests into a document that does not exist.
	$: open = Boolean(
		!done &&
			$session.user &&
			$session.profileReady &&
			profile &&
			!profile.interestsPrompted &&
			current.length < REQUIRED_INTERESTS
	);

	// Starts from whatever the reader already has, so an account holding one or
	// two keeps them.
	let seeded = false;
	$: if (open && !seeded) {
		picked = current.filter((s) => DEFAULT_SUBJECTS.includes(s)).slice(0, REQUIRED_INTERESTS);
		seeded = true;
	}
	$: if (!open) seeded = false;

	/** @param {string} subject */
	function toggle(subject) {
		error = '';
		if (picked.includes(subject)) {
			picked = picked.filter((s) => s !== subject);
		} else if (picked.length < REQUIRED_INTERESTS) {
			picked = [...picked, subject];
		}
	}

	async function save() {
		if (picked.length !== REQUIRED_INTERESTS) {
			error = `Choose exactly ${REQUIRED_INTERESTS} interests.`;
			return;
		}

		saving = true;
		error = '';

		try {
			const ref = await findProfileRef($session.user);
			if (!ref) throw new Error('No profile document for this account');

			const interests = [...picked];
			await updateDoc(ref, { interests, interestsPrompted: true });
			done = true;
			doneFor = $session.user.uid;

			// Every page reads the session's copy, and the library re-chooses its
			// recommendations whenever that copy changes, so this is what updates
			// "Recommended for you" straight away.
			session.update((s) => ({
				...s,
				profile: { ...s.profile, interests, interestsPrompted: true }
			}));
		} catch (err) {
			console.error('Could not save interests:', err);
			error = 'Could not save your interests. Please try again.';
		} finally {
			saving = false;
		}
	}
</script>

{#if open}
	<div class="overlay">
		<div class="box" role="dialog" aria-modal="true" aria-labelledby="interests-title" aria-describedby="interests-hint">
			<h2 id="interests-title">Choose your interests</h2>
			<p id="interests-hint" class="muted">
				Pick {REQUIRED_INTERESTS} subjects you like. The library uses them to recommend books to
				you, and you can change them later from your profile.
			</p>

			<div class="chips">
				{#each DEFAULT_SUBJECTS as subject}
					<button
						type="button"
						class="chip"
						class:active={picked.includes(subject)}
						disabled={saving || (picked.length >= REQUIRED_INTERESTS && !picked.includes(subject))}
						aria-pressed={picked.includes(subject)}
						on:click={() => toggle(subject)}
					>
						{#if picked.includes(subject)}<Icon name="check" />{/if}{subject}
					</button>
				{/each}
			</div>

			<p class="muted count">{picked.length}/{REQUIRED_INTERESTS} selected</p>
			{#if error}<p class="error">{error}</p>{/if}

			<button
				type="button"
				class="btn block"
				on:click={save}
				disabled={saving || picked.length !== REQUIRED_INTERESTS}
			>
				<Icon name="check" />{saving ? 'Saving…' : 'Save interests'}
			</button>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
		background: rgba(32, 30, 29, 0.6);
	}

	.box {
		width: 100%;
		max-width: 480px;
		max-height: calc(100vh - 32px);
		overflow-y: auto;
		padding: 24px;
		background: #fff;
		border-radius: 12px;
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
	}

	h2 {
		margin: 0 0 8px 0;
		font-size: 1.3rem;
	}

	.muted {
		margin: 0 0 16px 0;
	}

	.count {
		margin: 4px 0 16px 0;
	}
</style>
