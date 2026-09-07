<script>
	import { goto } from '$app/navigation';
	import {
		signInWithEmailAndPassword,
		sendPasswordResetEmail,
		setPersistence,
		browserLocalPersistence,
		browserSessionPersistence
	} from 'firebase/auth';
	import { collection, getDocs, query, where, limit } from 'firebase/firestore';
	import { auth, db } from '$lib/firebase';

	let loginInput = '';
	let password = '';
	let keepLoggedIn = true;
	let showPassword = false;
	let errorMessage = '';
	let noticeMessage = '';
	let busy = false;
	let sendingReset = false;

	function isEmail(value) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
	}

	/** Resolve a username to the email Firebase Auth knows, as the app does. */
	async function resolveEmail(input) {
		if (isEmail(input)) return input;

		const snapshot = await getDocs(
			query(collection(db, 'users'), where('username', '==', input.trim()), limit(1))
		);

		if (snapshot.empty) return '';
		return snapshot.docs[0].data().email || '';
	}

	async function handleLogin() {
		errorMessage = '';
		noticeMessage = '';

		if (!loginInput || !password) {
			errorMessage = 'Please fill in all fields';
			return;
		}

		busy = true;

		try {
			// "Keep me logged in" is the difference between surviving a browser
			// restart and lasting only for this tab.
			await setPersistence(
				auth,
				keepLoggedIn ? browserLocalPersistence : browserSessionPersistence
			);

			const email = await resolveEmail(loginInput);

			if (!email) {
				errorMessage = 'Username not found. Please try with your email instead.';
				return;
			}

			await signInWithEmailAndPassword(auth, email, password);
			goto('/library');
		} catch (error) {
			if (error?.code === 'auth/user-not-found') {
				errorMessage = 'User not found. Please check your username or email.';
			} else if (error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') {
				errorMessage = 'Incorrect password. Please try again.';
			} else {
				errorMessage = 'Login failed: ' + (error?.message ?? 'unknown error');
			}
		} finally {
			busy = false;
		}
	}

	async function handleForgotPassword() {
		if (sendingReset) return;

		errorMessage = '';
		noticeMessage = '';

		if (!loginInput) {
			errorMessage = 'Enter your email or username first, then choose Forgot password.';
			return;
		}

		sendingReset = true;

		try {
			const email = await resolveEmail(loginInput);
			if (email) await sendPasswordResetEmail(auth, email);
		} catch (error) {
			// An unknown account lands here. Saying so would let anyone test which
			// addresses exist, so it is treated the same as a send.
			console.log('Password reset lookup failed:', error?.code);
		} finally {
			sendingReset = false;
		}

		noticeMessage =
			'If that account exists, a reset link is on its way. Check the inbox and the spam folder.';
	}
</script>

<svelte:head><title>Log in · GD-Library</title></svelte:head>

<div class="page narrow">
	<h1 class="page-title">Log in</h1>

	{#if errorMessage}<p class="error">{errorMessage}</p>{/if}
	{#if noticeMessage}<p class="notice">{noticeMessage}</p>{/if}

	<form on:submit|preventDefault={handleLogin}>
		<label class="field">
			<span>Email / Username</span>
			<input type="text" bind:value={loginInput} autocomplete="username" />
		</label>

		<label class="field">
			<span>Password</span>
			<span class="pw">
				<input
					type={showPassword ? 'text' : 'password'}
					bind:value={password}
					autocomplete="current-password"
				/>
				<button type="button" class="btn secondary toggle" on:click={() => (showPassword = !showPassword)}>
					{showPassword ? 'Hide' : 'Show'}
				</button>
			</span>
		</label>

		<div class="options">
			<label class="check">
				<input type="checkbox" bind:checked={keepLoggedIn} />
				Keep me logged in
			</label>
			<button type="button" class="link-btn" on:click={handleForgotPassword} disabled={sendingReset}>
				{sendingReset ? 'Sending…' : 'Forgot password?'}
			</button>
		</div>

		<button class="btn block" type="submit" disabled={busy}>
			{busy ? 'Signing in…' : 'Log in'}
		</button>
	</form>

	<p class="muted foot">No account yet? <a href="/register">Register</a></p>
</div>

<style>
	.narrow {
		max-width: 420px;
	}

	.pw {
		display: flex;
		gap: 8px;
	}

	.toggle {
		width: 84px;
		flex-shrink: 0;
	}

	.options {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		margin: 4px 0 24px 0;
		flex-wrap: wrap;
	}

	.check {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.875rem;
	}

	.check input {
		width: 20px;
		height: 20px;
		accent-color: var(--brand);
	}

	.foot {
		margin-top: 24px;
	}
</style>
