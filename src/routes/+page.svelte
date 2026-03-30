<script lang="ts">
	// Svelte 5 Runes - state test
	let count = $state(0);
	let greeting = $state('Hello from TOPS!');

	const increment = () => count++;

	// Derived state
	let message = $derived(`Clicked ${count} time${count !== 1 ? 's' : ''}`);
</script>

<div class="min-h-screen bg-gradient-to-br from-gov-900 via-gov-700 to-civic-600 flex items-center justify-center p-4">
	<div class="bg-surface rounded-2xl shadow-modal p-10 max-w-lg w-full animate-scale-in text-center space-y-6">
		<!-- Logo / Header -->
		<div class="space-y-2">
			<div class="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-gov-600 to-civic-500 flex items-center justify-center shadow-card">
				<svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
				</svg>
			</div>
			<h1 class="text-3xl font-display font-bold text-gov-900">{greeting}</h1>
			<p class="text-gov-400 text-sm">Transportation Online Permitting System</p>
		</div>

		<!-- Runes state test -->
		<div class="space-y-4">
			<button
				onclick={increment}
				class="px-6 py-3 bg-gradient-to-r from-gov-600 to-civic-500 text-white font-semibold rounded-xl
					   shadow-card hover:shadow-card-hover hover:scale-[1.02] active:scale-[0.98]
					   transition-all duration-200 cursor-pointer"
			>
				{message}
			</button>

			<p class="text-xs text-gov-300">
				SvelteKit + Tailwind v4 + Runes = working
			</p>
		</div>

		<!-- Tech stack badges -->
		<div class="flex flex-wrap justify-center gap-2 pt-4 border-t border-gov-100">
			{#each ['SvelteKit', 'Tailwind v4', 'Runes', 'TypeScript', 'ArcGIS'] as tech}
				<span class="px-3 py-1 bg-gov-50 text-gov-600 text-xs font-medium rounded-full border border-gov-100">
					{tech}
				</span>
			{/each}
		</div>
	</div>
</div>
