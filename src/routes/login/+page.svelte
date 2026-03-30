<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';

	let username = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let shakeError = $state(false);
	let mounted = $state(false);

	onMount(() => {
		if (auth.isAuthenticated) {
			goto('/dashboard');
			return;
		}
		// Trigger entrance animations after mount
		mounted = true;
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		shakeError = false;

		const success = await auth.login(username, password);
		if (success) {
			goto('/dashboard');
		} else {
			// Trigger shake animation on error
			shakeError = true;
			setTimeout(() => (shakeError = false), 600);
		}
	}
</script>

<svelte:head>
	<title>Sign In - TOPS</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gov-900 via-gov-700 to-civic-600 flex items-center justify-center p-4 relative overflow-hidden">
	<!-- Animated background elements -->
	<div class="absolute inset-0 overflow-hidden pointer-events-none">
		<div class="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-civic-500/10 blur-3xl animate-pulse"></div>
		<div class="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-gov-400/10 blur-3xl animate-pulse" style="animation-delay: 1s;"></div>
		<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-civic-600/5 blur-3xl"></div>
		<!-- Subtle grid overlay -->
		<div class="absolute inset-0 opacity-[0.03]" style="background-image: linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px); background-size: 60px 60px;"></div>
	</div>

	<!-- Login card -->
	<div
		class="relative w-full max-w-md transition-all duration-700 {mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}"
	>
		<!-- Card glow effect -->
		<div class="absolute -inset-1 bg-gradient-to-r from-civic-500/20 via-gov-400/20 to-civic-500/20 rounded-2xl blur-lg opacity-60"></div>

		<div class="relative bg-white/[0.97] backdrop-blur-xl rounded-2xl shadow-modal p-8 sm:p-10">
			<!-- Logo & Branding -->
			<div class="text-center mb-8">
				<!-- Shield Icon -->
				<div class="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-gov-700 to-civic-600 shadow-lg mb-4 transition-transform duration-300 hover:scale-110 hover:rotate-3">
					<svg class="w-9 h-9 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
						<path d="M9 12l2 2 4-4" />
					</svg>
				</div>

				<h1 class="font-display text-2xl font-bold text-gov-900 tracking-tight">
					TOPS
				</h1>
				<p class="text-sm text-gov-500 mt-1 font-medium tracking-wide uppercase">
					Transportation Online Permitting System
				</p>
				<div class="flex items-center justify-center gap-2 mt-2">
					<div class="h-px w-8 bg-gradient-to-r from-transparent to-gov-200"></div>
					<span class="text-xs text-gov-400 font-medium">District of Columbia</span>
					<div class="h-px w-8 bg-gradient-to-l from-transparent to-gov-200"></div>
				</div>
			</div>

			<!-- Login Form -->
			<form onsubmit={handleSubmit} class="space-y-5">
				<!-- Error Message -->
				{#if auth.error}
					<div
						class="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm animate-fade-in {shakeError ? 'animate-shake' : ''}"
					>
						<svg class="w-5 h-5 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
						</svg>
						<span>{auth.error}</span>
					</div>
				{/if}

				<!-- Username Field -->
				<div class="space-y-1.5">
					<label for="username" class="block text-sm font-semibold text-gov-700">
						Username
					</label>
					<div class="relative group">
						<div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gov-400 group-focus-within:text-civic-500 transition-colors">
							<svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
							</svg>
						</div>
						<input
							id="username"
							type="text"
							bind:value={username}
							placeholder="Enter your username"
							required
							disabled={auth.isLoading}
							class="w-full pl-10 pr-4 py-3 rounded-lg border border-gov-200 bg-gov-50/50 text-gov-900 placeholder:text-gov-400 focus:outline-none focus:ring-2 focus:ring-civic-500/40 focus:border-civic-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
						/>
					</div>
				</div>

				<!-- Password Field -->
				<div class="space-y-1.5">
					<label for="password" class="block text-sm font-semibold text-gov-700">
						Password
					</label>
					<div class="relative group">
						<div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gov-400 group-focus-within:text-civic-500 transition-colors">
							<svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
							</svg>
						</div>
						<input
							id="password"
							type={showPassword ? 'text' : 'password'}
							bind:value={password}
							placeholder="Enter your password"
							required
							disabled={auth.isLoading}
							class="w-full pl-10 pr-12 py-3 rounded-lg border border-gov-200 bg-gov-50/50 text-gov-900 placeholder:text-gov-400 focus:outline-none focus:ring-2 focus:ring-civic-500/40 focus:border-civic-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
						/>
						<button
							type="button"
							onclick={() => (showPassword = !showPassword)}
							class="absolute inset-y-0 right-0 flex items-center pr-3 text-gov-400 hover:text-gov-600 transition-colors"
							tabindex={-1}
						>
							{#if showPassword}
								<svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd" />
									<path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
								</svg>
							{:else}
								<svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
									<path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
									<path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
								</svg>
							{/if}
						</button>
					</div>
				</div>

				<!-- Submit Button -->
				<button
					type="submit"
					disabled={auth.isLoading || !username || !password}
					class="relative w-full py-3 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-gov-700 to-civic-600 shadow-lg hover:shadow-xl hover:from-gov-600 hover:to-civic-500 focus:outline-none focus:ring-2 focus:ring-civic-500/50 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg overflow-hidden group"
				>
					<!-- Button shine effect -->
					<div class="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

					<span class="relative flex items-center justify-center gap-2">
						{#if auth.isLoading}
							<svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							<span>Authenticating...</span>
						{:else}
							<span>Sign In</span>
							<svg class="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
							</svg>
						{/if}
					</span>
				</button>
			</form>

			<!-- Footer hint -->
			<div class="mt-6 pt-5 border-t border-gov-100 text-center">
				<p class="text-xs text-gov-400">
					Demo credentials: <code class="px-1.5 py-0.5 bg-gov-50 rounded text-gov-600 font-mono text-xs">admin</code> / <code class="px-1.5 py-0.5 bg-gov-50 rounded text-gov-600 font-mono text-xs">password</code>
				</p>
			</div>
		</div>

		<!-- Bottom branding -->
		<p class="text-center mt-6 text-sm text-white/50 transition-all duration-500 {mounted ? 'opacity-100' : 'opacity-0'}">
			&copy; {new Date().getFullYear()} District of Columbia &middot; All rights reserved
		</p>
	</div>
</div>

<style>
	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
		20%, 40%, 60%, 80% { transform: translateX(4px); }
	}

	:global(.animate-shake) {
		animation: shake 0.6s ease-in-out;
	}
</style>
