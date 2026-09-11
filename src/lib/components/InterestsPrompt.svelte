<script>
	// Asks a signed-in reader for their three interests when their profile has
	// none. Accounts are now created from the dashboard without interests, and
	// recommendations lean on them, so the reader is asked the first time they
	// open the library rather than left with a list ranked on their strand alone.
	//
	// There is no way to dismiss it: three interests are required, and the box
	// stays until they are saved. It is shown only to an account with no
	// interests at all; an account that has any never sees it, on any device,
	// here or in the app, and changes them from the profile instead.

	import Icon from '$lib/components/Icon.svelte';
	import { getDocFromServer, updateDoc } from 'firebase/firestore';
	import { session, findProfileRef } from '$lib/stores/session.js';
	import { DEFAULT_SUBJECTS } from '$lib/services/subjects.js';
	import { userInterests } from '$lib/services/users.js';

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
	$: current = userInterests(profile);

	// Only once the profile has actually been read, and only for an account that
	// has one: a missing profile is something to tell the administrator, not a
	// reason to write interests into a document that does not exist.
	// What the session says. Not enough on its own to open the box: it is only
	// the reason to go and check.
	$: looksEmpty = Boolean(
		!done &&
			$session.user &&
			$session.profileReady &&
			profile &&
			current.length === 0
	);

	// Checked with the server before the box appears, so it never flashes up
	// for an account whose interests simply had not arrived yet. Opens only if
	// the account's document, read fresh, really has none.
	/** @type {string | null} */
	let confirmedEmptyFor = null;
	// One check per time the session looks empty, so a failing check is not
	// retried in a loop.
	/** @type {string | null} */
	let checkedFor = null;

	$: if (looksEmpty && checkedFor !== $session.user.uid) {
		checkedFor = $session.user.uid;
		confirmEmpty($session.user);
	}
	$: if (!looksEmpty) {
		confirmedEmptyFor = null;
		checkedFor = null;
	}

	/** @param {any} user */
	async function confirmEmpty(user) {
		try {
			const ref = await findProfileRef(user);
			const snapshot = ref ? await getDocFromServer(ref) : null;
			const onServer = snapshot?.exists() ? userInterests(snapshot.data()) : null;

			if (onServer && onServer.length === 0 && $session.user?.uid === user.uid) {
				confirmedEmptyFor = user.uid;
			} else if (onServer && onServer.length > 0) {
				// The session copy was behind; bring it up to date.
				session.update((s) =>
					s.user?.uid === user.uid ? { ...s, profile: { ...s.profile, interests: onServer } } : s
				);
			}
		} catch (err) {
			// Offline or refused: no box rather than a wrong one.
			console.error('Could not check the interests:', err);
		}
	}

	$: open = looksEmpty && confirmedEmptyFor === $session.user?.uid;

	// Starts empty each time it opens.
	$: if (!open) picked = [];

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
			await updateDoc(ref, { interests });
			done = true;
			doneFor = $session.user.uid;

			// Every page reads the session's copy, and the library re-chooses its
			// recommendations whenever that copy changes, so this is what updates
			// "Recommended for you" straight away.
			session.update((s) => ({
				...s,
				profile: { ...s.profile, interests }
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
