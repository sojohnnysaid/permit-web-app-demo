<script lang="ts">
	import { page } from '$app/state';
	import { auth } from '$lib/stores/auth.svelte';
	import { permits, PERMIT_TYPE_META } from '$lib/stores/permits.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import NavHeader from '$lib/components/NavHeader.svelte';
	import { formatCurrency } from '$lib/utils/fees';

	// Auth guard
	$effect(() => {
		if (!auth.isAuthenticated) {
			goto('/login');
		}
	});

	const permit = $derived(permits.getById(page.params.id ?? ''));
	const typeMeta = $derived(permit ? PERMIT_TYPE_META[permit.type] : null);

	// Redirect if not paid/issued
	$effect(() => {
		if (permit && permit.status !== 'paid' && permit.status !== 'issued') {
			goto(`/permits/${permit.id}`);
		}
	});

	// Update status to issued on mount
	onMount(() => {
		if (permit && permit.status === 'paid') {
			permits.updateStatus(permit.id, 'issued');
		}
	});

	// Date helpers
	const today = new Date();
	const todayFormatted = today.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});

	function formatDateLong(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function getExpiresDate(): string {
		if (permit?.expiresAt) {
			return formatDateLong(permit.expiresAt);
		}
		const future = new Date(today);
		future.setDate(future.getDate() + 30);
		return future.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	// Toast state
	let showToast = $state(false);

	function handleDownloadPdf() {
		showToast = true;
		setTimeout(() => {
			showToast = false;
		}, 3000);
	}
</script>

<svelte:head>
	<title>{permit ? `Permit Issued - ${permit.referenceNumber}` : 'Permit Issued'} - TOPS</title>
</svelte:head>

<NavHeader />

{#if auth.isAuthenticated}
	<div class="min-h-screen bg-surface-alt pt-6">
		<div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
			{#if !permit}
				<!-- Permit not found -->
				<div class="flex items-center justify-center py-20">
					<div class="bg-surface rounded-2xl shadow-card border border-gov-100 p-12 text-center max-w-md">
						<h2 class="text-xl font-display font-bold text-gov-900 mb-2">Permit Not Found</h2>
						<a href="/dashboard" class="text-gov-500 hover:text-gov-700 underline text-sm">Back to Dashboard</a>
					</div>
				</div>
			{:else}
				<!-- Breadcrumb -->
				<nav class="flex items-center gap-2 text-sm text-gov-400 mb-6">
					<a href="/dashboard" class="hover:text-gov-700 transition-colors">Dashboard</a>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
					<a href="/permits/{permit.id}" class="hover:text-gov-700 transition-colors">{permit.referenceNumber}</a>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
					<span class="text-gov-700 font-medium">Issued</span>
				</nav>

				<!-- Official permit document -->
				<div class="bg-surface rounded-xl shadow-card border-2 border-gov-200 overflow-hidden">
					<!-- Document header -->
					<div class="bg-gov-900 px-8 py-6 text-center">
						<p class="text-gov-300 text-xs tracking-[0.25em] uppercase mb-1">Government of the</p>
						<h1 class="font-display text-xl font-bold text-white tracking-wide">DISTRICT OF COLUMBIA</h1>
						<div class="w-16 h-px bg-civic-400 mx-auto my-3"></div>
						<p class="text-gov-200 text-sm tracking-[0.15em] uppercase">Department of Transportation</p>
						<p class="text-gov-400 text-xs mt-1">Transportation Online Permit System (TOPS)</p>
					</div>

					<!-- Issued badge -->
					<div class="flex justify-center -mb-5 relative z-10" style="margin-top: -1px;">
						<div class="bg-permit-approved text-white px-8 py-2.5 rounded-b-xl shadow-card flex items-center gap-2">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
							</svg>
							<span class="font-display font-bold text-sm tracking-wide uppercase">Permit Issued</span>
						</div>
					</div>

					<!-- Permit details -->
					<div class="px-8 pt-10 pb-8">
						<!-- Permit info grid -->
						<div class="border border-gov-200 rounded-lg overflow-hidden mb-8">
							<table class="w-full">
								<tbody>
									<tr class="border-b border-gov-100">
										<td class="px-4 py-3 bg-gov-50 text-sm font-semibold text-gov-700 w-2/5 border-r border-gov-100">Permit Number</td>
										<td class="px-4 py-3 text-sm font-mono font-bold text-gov-900">{permit.referenceNumber}</td>
									</tr>
									<tr class="border-b border-gov-100">
										<td class="px-4 py-3 bg-gov-50 text-sm font-semibold text-gov-700 border-r border-gov-100">Permit Type</td>
										<td class="px-4 py-3 text-sm text-gov-800">{typeMeta?.label}</td>
									</tr>
									<tr class="border-b border-gov-100">
										<td class="px-4 py-3 bg-gov-50 text-sm font-semibold text-gov-700 border-r border-gov-100">Issued Date</td>
										<td class="px-4 py-3 text-sm text-gov-800">{todayFormatted}</td>
									</tr>
									<tr class="border-b border-gov-100">
										<td class="px-4 py-3 bg-gov-50 text-sm font-semibold text-gov-700 border-r border-gov-100">Effective Dates</td>
										<td class="px-4 py-3 text-sm text-gov-800">
											{formatDateLong(permit.submittedAt)} — {getExpiresDate()}
										</td>
									</tr>
									<tr class="border-b border-gov-100">
										<td class="px-4 py-3 bg-gov-50 text-sm font-semibold text-gov-700 border-r border-gov-100">Permit Holder</td>
										<td class="px-4 py-3 text-sm text-gov-800">{permit.applicant}</td>
									</tr>
									<tr>
										<td class="px-4 py-3 bg-gov-50 text-sm font-semibold text-gov-700 border-r border-gov-100">Location</td>
										<td class="px-4 py-3 text-sm text-gov-800">
											{#if permit.addresses?.[0]}
												{permit.addresses[0].address}
											{:else if permit.ward}
												{permit.ward}{permit.quadrant ? `, ${permit.quadrant}` : ''}
											{:else}
												District of Columbia
											{/if}
										</td>
									</tr>
								</tbody>
							</table>
						</div>

						<!-- Permit description -->
						<div class="mb-8">
							<h3 class="font-display font-bold text-sm text-gov-800 uppercase tracking-wide mb-2">Description of Work</h3>
							<p class="text-sm text-gov-600 leading-relaxed">{permit.description}</p>
						</div>

						<!-- Conditions of approval -->
						<div class="border border-gov-200 rounded-lg p-5 mb-8 bg-gov-50">
							<h3 class="font-display font-bold text-sm text-gov-800 uppercase tracking-wide mb-4">Conditions of Approval</h3>
							<ol class="space-y-3 text-sm text-gov-700 list-decimal list-inside">
								<li class="leading-relaxed">Work must be completed within the approved timeframe.</li>
								<li class="leading-relaxed">Contractor must display permit on-site during all work hours.</li>
								<li class="leading-relaxed">Compliance with DCMR Title 24 and all applicable regulations required.</li>
								<li class="leading-relaxed">DDOT reserves the right to inspect at any time.</li>
							</ol>
						</div>

						<!-- Signature line -->
						<div class="flex items-end justify-between mb-8 pt-4">
							<div class="text-center">
								<div class="w-48 border-b border-gov-300 mb-1"></div>
								<p class="text-xs text-gov-400">Authorized by DDOT Permit Office</p>
							</div>
							<div class="text-center">
								<p class="text-sm font-mono text-gov-600 mb-1">{todayFormatted}</p>
								<div class="w-32 border-b border-gov-300 mb-1"></div>
								<p class="text-xs text-gov-400">Date</p>
							</div>
						</div>

						<!-- Actions -->
						<div class="flex flex-col sm:flex-row gap-3">
							<button
								onclick={handleDownloadPdf}
								class="flex-1 px-5 py-3 bg-gov-600 text-white font-semibold rounded-xl hover:bg-gov-700 transition-colors text-sm flex items-center justify-center gap-2"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
								</svg>
								Download PDF
							</button>
							<a
								href="/permits/{permit.id}"
								class="flex-1 px-5 py-3 bg-surface border border-gov-200 text-gov-700 font-semibold rounded-xl hover:bg-gov-50 transition-colors text-sm flex items-center justify-center gap-2"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
								</svg>
								View Permit Details
							</a>
						</div>
					</div>

					<!-- Public notice footer -->
					<div class="border-t border-gov-200 bg-gov-50 px-8 py-4">
						<div class="flex items-center gap-3">
							<div class="w-8 h-8 rounded-full bg-civic-100 flex items-center justify-center shrink-0">
								<svg class="w-4 h-4 text-civic-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
								</svg>
							</div>
							<div>
								<p class="text-xs font-semibold text-gov-700">Public Notice</p>
								<p class="text-xs text-gov-500">This permit issuance has been posted to the public notification system.</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Back to dashboard link -->
				<div class="mt-6 text-center">
					<a href="/dashboard" class="text-sm text-gov-400 hover:text-gov-700 transition-colors inline-flex items-center gap-1.5">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
						</svg>
						Back to Dashboard
					</a>
				</div>
			{/if}
		</div>
	</div>

	<!-- Toast notification -->
	{#if showToast}
		<div class="fixed bottom-6 right-6 z-50">
			<div class="bg-gov-800 text-white px-5 py-3 rounded-xl shadow-modal flex items-center gap-3">
				<svg class="w-5 h-5 animate-spin text-civic-400" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
				</svg>
				<span class="text-sm font-medium">PDF generation in progress...</span>
			</div>
		</div>
	{/if}
{/if}
