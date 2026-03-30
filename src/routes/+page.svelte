<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';

	onMount(() => {
		if (auth.isAuthenticated) {
			goto('/dashboard');
		} else {
			goto('/login');
		}
	});
</script>

<div class="min-h-screen bg-gradient-to-br from-gov-900 via-gov-700 to-civic-600 flex items-center justify-center">
	<div class="animate-pulse text-white text-lg font-display">Loading TOPS...</div>
</div>
