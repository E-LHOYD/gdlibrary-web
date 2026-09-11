<script>
	import Icon from '$lib/components/Icon.svelte';
	import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
	import { auth } from '$lib/firebase';
	import { getKeepLoggedIn, setKeepLoggedIn } from '$lib/services/persistence.js';

	const MIN_PASSWORD = 6;

	// ---------- keep me logged in ----------
	let keepLoggedIn = getKeepLoggedIn();
	let savingKeep = false;
	let keepMessage = '';
	let keepError = '';

	async function changeKeepLoggedIn() {
		const wanted = keepLoggedIn;
		savingKeep = true;
		keepMessage = '';
		keepError = '';

		try {
			await setKeepLoggedIn(wanted);
			keepMessage = wanted
				? 'You will stay logged in after closing the site.'
				: 'You will need to log in again after closing the site.';
		} catch (err) {
			console.error('Could not change how long you stay logged in:', err);
			keepLoggedIn = !wanted;
			keepError = 'Could not change this setting. Please try again.';
		} finally {
			savingKeep = false;
		}
	}

	// ---------- change password ----------
	let changing = false;
	let currentPassword = '';
	let newPassword = '';
	let confirmPassword = '';
	let showPasswords = false;
	let savingPassword = false;
	let passwordMessage = '';
	let passwordError = '';

	function openPasswordForm() {
		changing = true;
		passwordMessage = '';
		passwordError = '';
	}

	function cancelPassword() {
		currentPassword = '';
		newPassword = '';
		confirmPassword = '';
		showPasswords = false;
		passwordError = '';
		changing = false;
	}

	function validatePassword() {
		if (!currentPassword || !newPassword || !confirmPassword) return 'Please fill in all three fields.';
		if (newPassword.length < MIN_PASSWORD) return `The new password must be at least ${MIN_PASSWORD} characters.`;
		if (newPassword !== confirmPassword) return 'The new passwords do not match.';
		if (newPassword === currentPassword) return 'The new password must be different from the current one.';
		return '';
	}

	async function confirmPasswordChange() {
		passwordMessage = '';
		passwordError = validatePassword();
		if (passwordError) return;

		const user = auth.currentUser;
		if (!user?.email) {
			passwordError = 'You need to be logged in to change your password.';
			return;
		}

		savingPassword = true;

		try {
			// Firebase only lets a password change through after a recent sign-in,
			// and checking the current password here is that sign-in.
			await reauthenticateWithCredential(
				user,
				EmailAuthProvider.credential(user.email, currentPassword)
			);
			await updatePassword(user, newPassword);

			cancelPassword();
			passwordMessage = 'Your password has been changed.';
		} catch (err) {
			const code = err?.code;
			if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
				passwordError = 'Your current password is incorrect.';
			} else if (code === 'auth/weak-password') {
				passwordError = 'That new password is too weak. Try a longer one.';
			} else if (code === 'auth/too-many-requests') {
				passwordError = 'Too many attempts. Please wait a while and try again.';
			} else {
				console.error('Could not change the password:', err);
				passwordError = 'Could not change your password. Please try again.';
			}
		} finally {
			savingPassword = false;
		}
	}
</script>

<svelte:head><title>Settings · GD-Library</title></svelte:head>

<div class="page narrow">
	<h1 class="page-title">Settings</h1>

	<h2 class="section-title">Staying logged in</h2>
	<label class="check">
		<input
			type="checkbox"
			bind:checked={keepLoggedIn}
			on:change={changeKeepLoggedIn}
			disabled={savingKeep}
		/>
		Keep me logged in
	</label>
	<p class="muted hint">
		When this is off, closing the site logs you out and you will need to log in again.
	</p>
	{#if keepMessage}<p class="notice">{keepMessage}</p>{/if}
	{#if keepError}<p class="error">{keepError}</p>{/if}

	<h2 class="section-title">Password</h2>
	{#if passwordMessage}<p class="notice">{passwordMessage}</p>{/if}

	{#if changing}
		<form on:submit|preventDefault={confirmPasswordChange}>
			{#if passwordError}<p class="error">{passwordError}</p>{/if}

			<label class="field">
				<span>Current password</span>
				<input
					type={showPasswords ? 'text' : 'password'}
					bind:value={currentPassword}
					autocomplete="current-password"
					disabled={savingPassword}
				/>
			</label>

			<label class="field">
				<span>New password</span>
				<input
					type={showPasswords ? 'text' : 'password'}
					bind:value={newPassword}
					autocomplete="new-password"
					disabled={savingPassword}
				/>
			</label>

			<label class="field">
				<span>Confirm new password</span>
				<input
					type={showPasswords ? 'text' : 'password'}
					bind:value={confirmPassword}
					autocomplete="new-password"
					disabled={savingPassword}
				/>
			</label>

			<label class="check show">
				<input type="checkbox" bind:checked={showPasswords} disabled={savingPassword} />
				Show passwords
			</label>

			<div class="row">
				<button type="button" class="btn secondary" on:click={cancelPassword} disabled={savingPassword}>
					<Icon name="x" />Cancel
				</button>
				<button type="submit" class="btn" disabled={savingPassword}>
					<Icon name="check" />{savingPassword ? 'Changing…' : 'Confirm'}
				</button>
			</div>
		</form>
	{:else}
		<button type="button" class="btn secondary" on:click={openPasswordForm}>
			<Icon name="lock" />Change password
		</button>
	{/if}
</div>

<style>
	.narrow {
		max-width: 480px;
	}

	.check {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.95rem;
		cursor: pointer;
	}

	.check input {
		width: 20px;
		height: 20px;
		accent-color: var(--brand);
	}

	.check.show {
		margin: -4px 0 20px 0;
		font-size: 0.875rem;
	}

	.hint {
		margin: 8px 0 12px 0;
	}
</style>
