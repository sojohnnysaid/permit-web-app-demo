<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { PERMIT_TYPE_META } from '$lib/stores/permits.svelte';
	import type { PermitType } from '$lib/stores/permits.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	// Auth guard
	$effect(() => {
		if (!auth.isAuthenticated) {
			goto('/login');
		}
	});

	// Staggered animation state
	let visibleCards = $state<number[]>([]);

	onMount(() => {
		const types = Object.keys(PERMIT_TYPE_META);
		types.forEach((_, i) => {
			setTimeout(() => {
				visibleCards = [...visibleCards, i];
			}, 100 + i * 120);
		});
	});

	const ROUTE_MAP: Record<PermitType, string> = {
		truck_route: '/permits/new/truck-route',
		public_space: '/permits/new/public-space',
		infrastructure: '/permits/new/infrastructure',
		tree_removal: '/permits/new/tree-removal'
	};

	const COLOR_MAP: Record<string, { border: string; bg: string; iconBg: string; text: string }> = {
		gov: {
			border: 'border-l-gov-500',
			bg: 'hover:bg-gov-50',
			iconBg: 'bg-gov-100 text-gov-700',
			text: 'text-gov-700'
		},
		civic: {
			border: 'border-l-civic-500',
			bg: 'hover:bg-civic-50',
			iconBg: 'bg-civic-100 text-civic-600',
			text: 'text-civic-600'
		},
		'permit-pending': {
			border: 'border-l-permit-pending',
			bg: 'hover:bg-amber-50',
			iconBg: 'bg-amber-100 text-amber-700',
			text: 'text-amber-700'
		},
		'permit-approved': {
			border: 'border-l-permit-approved',
			bg: 'hover:bg-green-50',
			iconBg: 'bg-green-100 text-green-700',
			text: 'text-green-700'
		}
	};

	function handleCardClick(type: PermitType) {
		goto(ROUTE_MAP[type]);
	}
</script>

<div class="min-h-screen bg-surface-alt">
	<!-- Header -->
	<div class="bg-surface border-b border-gov-100">
		<div class="mx-auto max-w-5xl px-6 py-6">
			<a
				href="/dashboard"
				class="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gov-500 transition-colors hover:text-gov-700"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
				</svg>
				Back to Dashboard
			</a>
			<h1 class="font-display text-3xl font-bold text-gov-900">Apply for a Permit</h1>
		</div>
	</div>

	<!-- Content -->
	<div class="mx-auto max-w-5xl px-6 py-10">
		<p class="mb-8 text-lg text-gov-600">
			What do you need help with? Select a permit type to get started.
		</p>

		<!-- 2x2 Grid of Permit Cards -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
			{#each Object.entries(PERMIT_TYPE_META) as [type, meta], i}
				{@const colors = COLOR_MAP[meta.color]}
				<button
					onclick={() => handleCardClick(type as PermitType)}
					class="group relative cursor-pointer overflow-hidden rounded-xl border border-gov-100 border-l-4 {colors.border} bg-surface p-6 text-left shadow-card transition-all duration-300 ease-out hover:shadow-card-hover hover:scale-[1.02] {colors.bg} {visibleCards.includes(i) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}"
					style="transition: opacity 0.4s ease-out, transform 0.4s ease-out, box-shadow 0.3s ease, background-color 0.3s ease;"
				>
					<!-- Gradient accent top-right corner -->
					<div
						class="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10 transition-opacity duration-300 group-hover:opacity-20 {colors.iconBg}"
					></div>

					<!-- Icon -->
					<div class="mb-4 flex h-14 w-14 items-center justify-center rounded-lg {colors.iconBg} transition-transform duration-300 group-hover:scale-110">
						{#if meta.icon === 'truck'}
							<svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
								<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 0-.879-2.121l-2.37-2.37A3 3 0 0 0 16.5 8.626H15M2.25 14.25V5.625A1.125 1.125 0 0 1 3.375 4.5h8.25a1.125 1.125 0 0 1 1.125 1.125v8.625m0 0H2.25" />
							</svg>
						{:else if meta.icon === 'calendar'}
							<svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
								<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
								<path stroke-linecap="round" stroke-linejoin="round" d="M18 8.25l2.25 2.25L18 12.75" />
								<circle cx="19" cy="4" r="2.5" fill="currentColor" opacity="0.4" />
							</svg>
						{:else if meta.icon === 'alert'}
							<svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
								<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
							</svg>
						{:else if meta.icon === 'tree'}
							<svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
								<path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-5m0 0l-3-3m3 3l3-3" />
								<path stroke-linecap="round" stroke-linejoin="round" d="M12 3C9.5 3 7 5.5 7 8.5c0 .5.07 1 .2 1.5C5.34 10.5 4 12.1 4 14c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4 0-1.9-1.34-3.5-3.2-3.95.13-.52.2-1.03.2-1.55C17 5.5 14.5 3 12 3Z" />
							</svg>
						{/if}
					</div>

					<!-- Label -->
					<h3 class="mb-2 font-display text-xl font-bold text-gov-900 transition-colors duration-300 group-hover:{colors.text}">
						{meta.label}
					</h3>

					<!-- Description -->
					<p class="text-sm leading-relaxed text-gov-500">
						{meta.description}
					</p>

					<!-- Arrow indicator -->
					<div class="mt-4 flex items-center gap-1 text-sm font-medium {colors.text} opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1">
						Get started
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
						</svg>
					</div>
				</button>
			{/each}
		</div>

		<!-- Bottom hint -->
		<div class="mt-10 flex items-center justify-center gap-2 rounded-lg border border-civic-200 bg-civic-50 px-5 py-3 text-sm text-civic-600">
			<svg class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
			</svg>
			Not sure which permit you need? Ask our AI assistant!
		</div>
	</div>
</div>
