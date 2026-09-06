<script>
	let email = '';
	let password = '';

	function handleLogin() {
		// Firebase login will be implemented here
		console.log('Login:', email, password);
	}
</script>

<svelte:head>
	<title>Login - GD-Library</title>
</svelte:head>

<div class="container">
	<header class="header">
		<a href="/" class="back-link">← Back</a>
		<h1 class="brand">GD-Library</h1>
	</header>

	<main class="main">
		<div class="form-container">
			<h2>Login</h2>
			<form on:submit|preventDefault={handleLogin}>
				<div class="form-group">
					<label for="email">Email</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						placeholder="Enter your email"
						required
					/>
				</div>

				<div class="form-group">
					<label for="password">Password</label>
					<input
						id="password"
						type="password"
						bind:value={password}
						placeholder="Enter your password"
						required
					/>
				</div>

				<button type="submit" class="btn btn-primary">Login</button>
			</form>

			<p class="register-link">
				Don't have an account? <a href="/register">Register here</a>
			</p>
		</div>
	</main>
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
		justify-content: space-between;
	}

	.back-link {
		color: white;
		text-decoration: none;
		font-weight: bold;
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

	.form-container {
		background: white;
		padding: 2rem;
		border-radius: 8px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
		max-width: 400px;
		width: 100%;
	}

	.form-container h2 {
		margin-top: 0;
		margin-bottom: 1.5rem;
		color: #201e1d;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		color: #201e1d;
		font-weight: bold;
	}

	.form-group input {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid #ddd;
		border-radius: 4px;
		font-size: 1rem;
		box-sizing: border-box;
	}

	.form-group input:focus {
		outline: none;
		border-color: #033047;
	}

	.btn {
		width: 100%;
		padding: 0.75rem;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		font-weight: bold;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.btn-primary {
		background-color: #033047;
		color: white;
	}

	.btn-primary:hover {
		background-color: #044066;
	}

	.register-link {
		text-align: center;
		margin-top: 1rem;
		color: #666;
	}

	.register-link a {
		color: #033047;
		text-decoration: none;
		font-weight: bold;
	}

	.register-link a:hover {
		text-decoration: underline;
	}
</style>
