<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import ChatPanel from '$lib/components/ChatPanel.svelte';
	import { auth } from '$lib/stores/auth.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet" />
	<title>TOPS - Transportation Online Permitting System</title>
</svelte:head>

{@render children()}

{#if auth.isAuthenticated}
	<ChatPanel />
{/if}
