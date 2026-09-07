<script>
	import { goto } from '$app/navigation';
	import { createUserWithEmailAndPassword } from 'firebase/auth';
	import { doc, setDoc } from 'firebase/firestore';
	import { auth, db } from '$lib/firebase';
	import { DEFAULT_SUBJECTS } from '$lib/services/subjects.js';
	import { SENIOR_HIGH_LEVELS, COLLEGE_LEVELS } from '$lib/services/yearLevels.js';
	import { DEPARTMENTS } from '$lib/services/users.js';

	// The same options the app's signup and the dashboard's register offer, so a
	// web signup produces a user document the other two can already read.
	const STRANDS = ['STEM', 'ABM', 'HUMSS', 'GAS', 'TVL', 'ARTS & DESIGN'];
	const COURSES = ['BSCS', 'BSBA', 'BSIT', 'BSIS'];
	const REQUIRED_INTERESTS = 3;

	let role = 'student';
	let studentType = 'senior-high';

	let firstName = '';
	let middleName = '';
	let lastName = '';

	let lrn = '';
	let strand = '';
	let grade = '';

	let studentNumber = '';
	let course = '';
	let year = '';

	let employeeNumber = '';
	let department = '';

	let email = '';
	let username = '';
	let password = '';
	let confirmPassword = '';

	/** @type {string[]} */
	let interests = [];

	let errorMessage = '';
	let busy = false;

	$: isSeniorHigh = role === 'student' && studentType === 'senior-high';
	$: isCollege = role === 'student' && studentType === 'college';

	function toggleInterest(subject) {
		if (interests.includes(subject)) {
			interests = interests.filter((s) => s !== subject);
		} else if (interests.length < REQUIRED_INTERESTS) {
			interests = [...interests, subject];
		}
	}

	function validate() {
		if (!firstName || !lastName) return 'Please fill in your name';

		if (role === 'student') {
			if (isSeniorHigh && (!lrn || !strand || !grade)) {
				return 'Please fill in all senior high information';
			}
			if (isCollege && (!studentNumber || !course || !year)) {
				return 'Please fill in all college information';
			}
		}

		if (role === 'teacher' && (!employeeNumber || !department)) {
			return 'Please fill in all teacher information';
		}

		if (!email || !username) return 'Please fill in account information';
		if (interests.length !== REQUIRED_INTERESTS) {
			return `Please select exactly ${REQUIRED_INTERESTS} interests`;
		}
		if (!password || !confirmPassword) return 'Please fill in password fields';
		if (password !== confirmPassword) return 'Passwords do not match';
		if (password.length < 6) return 'Password must be at least 6 characters';

		return '';
	}

	async function handleRegister() {
		errorMessage = validate();
		if (errorMessage) return;

		busy = true;

		try {
			const credential = await createUserWithEmailAndPassword(auth, email, password);
			const uid = credential.user.uid;

			// Written in the shape the app and the dashboard both read. The password
			// is deliberately not stored: Firebase Auth holds it, and a copy here
			// would be readable by anyone who can read the users collection.
			const profile = {
				uid,
				email,
				username,
				role,
				firstName,
				middleName,
				lastName,
				// The app writes both; the dashboard's student list sorts on surname.
				surname: lastName,
				interests: [...interests],
				createdAt: new Date(),
				...(role === 'student' && {
					studentType,
					// The older field the dashboard's student list still filters on.
					type: studentType === 'senior-high' ? 'shs' : 'college',
					...(isSeniorHigh && { lrn, strand, grade }),
					...(isCollege && { studentNumber, course, year })
				}),
				...(role === 'teacher' && { employeeNumber, department })
			};

			await setDoc(doc(db, 'users', uid), profile);
			goto('/library');
		} catch (error) {
			if (error?.code === 'auth/email-already-in-use') {
				errorMessage = 'That email is already registered.';
			} else if (error?.code === 'auth/invalid-email') {
				errorMessage = 'That email address is not valid.';
			} else if (error?.code === 'auth/weak-password') {
				errorMessage = 'That password is too weak.';
			} else {
				errorMessage = 'Registration failed: ' + (error?.message ?? 'unknown error');
			}
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>Register · GD-Library</title></svelte:head>

<div class="page narrow">
	<h1 class="page-title">Register</h1>

	{#if errorMessage}<p class="error">{errorMessage}</p>{/if}

	<form on:submit|preventDefault={handleRegister}>
		<h2 class="section-title">Role</h2>
		<div class="chips">
			<button type="button" class="chip" class:active={role === 'student'} on:click={() => (role = 'student')}>
				Student
			</button>
			<button type="button" class="chip" class:active={role === 'teacher'} on:click={() => (role = 'teacher')}>
				Teacher
			</button>
		</div>

		<h2 class="section-title">Personal information</h2>
		<label class="field"><span>First name *</span><input type="text" bind:value={firstName} /></label>
		<label class="field"><span>Middle name</span><input type="text" bind:value={middleName} /></label>
		<label class="field"><span>Last name *</span><input type="text" bind:value={lastName} /></label>

		{#if role === 'student'}
			<h2 class="section-title">Student information</h2>
			<div class="chips">
				<button
					type="button"
					class="chip"
					class:active={studentType === 'senior-high'}
					on:click={() => (studentType = 'senior-high')}
				>
					Senior High
				</button>
				<button
					type="button"
					class="chip"
					class:active={studentType === 'college'}
					on:click={() => (studentType = 'college')}
				>
					College
				</button>
			</div>

			{#if isSeniorHigh}
				<label class="field"><span>Learner's reference number *</span><input type="text" bind:value={lrn} /></label>
				<label class="field">
					<span>Strand *</span>
					<select bind:value={strand}>
						<option value="">Select strand</option>
						{#each STRANDS as option}<option value={option}>{option}</option>{/each}
					</select>
				</label>
				<label class="field">
					<span>Grade *</span>
					<select bind:value={grade}>
						<option value="">Select grade</option>
						{#each SENIOR_HIGH_LEVELS as option}<option value={option}>{option}</option>{/each}
					</select>
				</label>
			{:else}
				<label class="field"><span>Student number *</span><input type="text" bind:value={studentNumber} /></label>
				<label class="field">
					<span>Course *</span>
					<select bind:value={course}>
						<option value="">Select course</option>
						{#each COURSES as option}<option value={option}>{option}</option>{/each}
					</select>
				</label>
				<label class="field">
					<span>Year *</span>
					<select bind:value={year}>
						<option value="">Select year</option>
						{#each COLLEGE_LEVELS as option}<option value={option}>{option}</option>{/each}
					</select>
				</label>
			{/if}
		{:else}
			<h2 class="section-title">Teacher information</h2>
			<label class="field"><span>Employee number *</span><input type="text" bind:value={employeeNumber} /></label>
			<label class="field">
				<span>Department *</span>
				<select bind:value={department}>
					<option value="">Select department</option>
					{#each DEPARTMENTS as option}<option value={option}>{option}</option>{/each}
				</select>
			</label>
		{/if}

		<h2 class="section-title">Account information</h2>
		<label class="field"><span>Email *</span><input type="email" bind:value={email} /></label>
		<label class="field"><span>Username *</span><input type="text" bind:value={username} /></label>

		<h2 class="section-title">Interests</h2>
		<p class="muted spaced">
			Pick exactly {REQUIRED_INTERESTS}. These are the subjects books carry, and they shape what is
			recommended to you.
		</p>
		<div class="chips">
			{#each DEFAULT_SUBJECTS as subject}
				<button
					type="button"
					class="chip"
					class:active={interests.includes(subject)}
					disabled={interests.length >= REQUIRED_INTERESTS && !interests.includes(subject)}
					on:click={() => toggleInterest(subject)}
				>
					{subject}
				</button>
			{/each}
		</div>
		<p class="muted spaced">{interests.length}/{REQUIRED_INTERESTS} selected</p>

		<h2 class="section-title">Security</h2>
		<label class="field"><span>Password *</span><input type="password" bind:value={password} /></label>
		<label class="field">
			<span>Confirm password *</span>
			<input type="password" bind:value={confirmPassword} />
		</label>

		<button class="btn block" type="submit" disabled={busy}>
			{busy ? 'Creating account…' : 'Create account'}
		</button>
	</form>

	<p class="muted foot">Already have an account? <a href="/login">Log in</a></p>
</div>

<style>
	.narrow {
		max-width: 520px;
	}

	.spaced {
		margin: 0 0 12px 0;
	}

	.chip:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.foot {
		margin-top: 24px;
	}
</style>
