<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth.svelte';
	import { permits, PERMIT_TYPE_META, type PermitStatus } from '$lib/stores/permits.svelte';

	// Redirect if not authenticated
	$effect(() => {
		if (!auth.isAuthenticated) {
			goto('/login');
		}
	});

	// Filter state using Svelte 5 runes
	let activeFilter = $state<'all' | PermitStatus>('all');
	let searchQuery = $state('');

	// Filtered permits
	let filteredPermits = $derived.by(() => {
		let result = permits.permits;

		// Apply status filter
		if (activeFilter !== 'all') {
			result = result.filter((p) => p.status === activeFilter);
		}

		// Apply search
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			result = result.filter(
				(p) =>
					p.title.toLowerCase().includes(q) ||
					p.referenceNumber.toLowerCase().includes(q) ||
					p.description.toLowerCase().includes(q)
			);
		}

		return result;
	});

	// Relative time helper
	function timeAgo(dateStr: string): string {
		const now = new Date();
		const date = new Date(dateStr);
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 30) return `${diffDays}d ago`;
		return date.toLocaleDateString();
	}

	// SLA countdown helper
	function slaCountdown(deadline: string): { text: string; urgent: boolean; expired: boolean } {
		const now = new Date();
		const sla = new Date(deadline);
		const diffMs = sla.getTime() - now.getTime();

		if (diffMs <= 0) return { text: 'SLA Overdue', urgent: true, expired: true };

		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffHours / 24);
		const remainingHours = diffHours % 24;

		if (diffDays > 0) {
			return {
				text: `${diffDays}d ${remainingHours}h remaining`,
				urgent: diffDays < 2,
				expired: false
			};
		}

		return { text: `${diffHours}h remaining`, urgent: diffHours < 12, expired: false };
	}

	// Status config
	const STATUS_CONFIG: Record<
		PermitStatus,
		{ label: string; color: string; bg: string; icon: string }
	> = {
		draft: { label: 'Draft', color: 'text-permit-draft', bg: 'bg-gray-100', icon: '📝' },
		submitted: { label: 'Submitted', color: 'text-gov-500', bg: 'bg-gov-50', icon: '📤' },
		under_review: {
			label: 'Under Review',
			color: 'text-permit-review',
			bg: 'bg-purple-50',
			icon: '🔍'
		},
		approved: {
			label: 'Approved',
			color: 'text-permit-approved',
			bg: 'bg-green-50',
			icon: '✅'
		},
		denied: { label: 'Denied', color: 'text-permit-denied', bg: 'bg-red-50', icon: '❌' },
		expired: { label: 'Expired', color: 'text-gray-400', bg: 'bg-gray-50', icon: '⏰' },
		returned: { label: 'Returned', color: 'text-amber-600', bg: 'bg-amber-50', icon: '↩️' },
		paid: { label: 'Paid', color: 'text-green-600', bg: 'bg-green-50', icon: '💳' },
		issued: { label: 'Issued', color: 'text-permit-approved', bg: 'bg-green-100', icon: '✅' },
		inspection_scheduled: { label: 'Inspection Scheduled', color: 'text-blue-600', bg: 'bg-blue-50', icon: '📋' },
		inspection_passed: { label: 'Inspection Passed', color: 'text-permit-approved', bg: 'bg-green-50', icon: '✓' },
		inspection_failed: { label: 'Inspection Failed', color: 'text-permit-denied', bg: 'bg-red-50', icon: '✗' },
		stop_work: { label: 'Stop Work Order', color: 'text-permit-denied', bg: 'bg-red-100', icon: '🚫' }
	};

	// Type icon SVGs
	const TYPE_ICONS: Record<string, string> = {
		truck: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/></svg>`,
		calendar: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`,
		alert: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
		tree: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19h14M12 3l-7 8h4l-3 5h12l-3-5h4L12 3z"/></svg>`
	};

	// Filter tabs config
	const FILTER_TABS = [
		{ key: 'all' as const, label: 'All', count: () => permits.totalCount },
		{ key: 'draft' as const, label: 'Draft', count: () => permits.draftCount },
		{ key: 'submitted' as const, label: 'Submitted', count: () => permits.submittedCount },
		{
			key: 'under_review' as const,
			label: 'Under Review',
			count: () => permits.reviewCount
		},
		{ key: 'approved' as const, label: 'Approved', count: () => permits.approvedCount }
	];

	// AI status explanation helper
	function getAIStatusExplanation(permit: typeof filteredPermits[number]): string {
		const typeName = PERMIT_TYPE_META[permit.type].label;
		const reviewer = permit.assignedReviewer ?? 'a city examiner';
		const department = permit.type === 'construction_excavation'
			? 'Public Works'
			: permit.type === 'commercial_vehicle'
				? 'Commercial Routing'
				: permit.type === 'special_heritage_tree'
					? 'Urban Forestry'
					: 'Transportation Operations';
		const slaDate = permit.slaDeadline
			? new Date(permit.slaDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
			: 'TBD';
		const expiryDate = permit.expiresAt
			? new Date(permit.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
			: 'the end of the permit term';

		switch (permit.status) {
			case 'submitted':
				return `Your ${typeName} permit has been received and queued for review. Estimated assignment within 1-2 business days.`;
			case 'under_review':
				return `Your ${typeName} permit is being reviewed by ${reviewer} in the ${department} division. Expected decision by ${slaDate}.`;
			case 'approved':
				return `Your ${typeName} permit has been approved. Next step: complete payment to receive your issued permit.`;
			case 'denied':
				return `Your ${typeName} permit was not approved. Review the examiner's notes and consider resubmission.`;
			case 'returned':
				return `Additional information has been requested for your ${typeName} permit. Please review and respond.`;
			case 'paid':
			case 'issued':
				return `Your ${typeName} permit is active and issued. Valid through ${expiryDate}.`;
			case 'expired':
				return `Your ${typeName} permit has expired. Submit a renewal application to continue operations.`;
			case 'inspection_scheduled':
				return `An inspection has been scheduled for your ${typeName} permit. Check the details for date and time.`;
			case 'inspection_passed':
				return `Your ${typeName} permit inspection has passed. Your permit remains in good standing.`;
			case 'inspection_failed':
				return `Your ${typeName} permit inspection did not pass. Review the inspector's notes for required corrections.`;
			case 'stop_work':
				return `A stop work order has been issued for your ${typeName} permit. All work must cease until resolved.`;
			default:
				return '';
		}
	}

	function handleLogout() {
		auth.logout();
		goto('/login');
	}
</script>

<svelte:head>
	<title>Dashboard - TOPS</title>
</svelte:head>

{#if auth.isAuthenticated}
	<div class="min-h-screen bg-surface-alt">
		<!-- Top Bar -->
		<header
			class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gov-100 shadow-sm"
		>
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div class="flex items-center justify-between h-16">
					<!-- Logo / Brand -->
					<div class="flex items-center gap-3">
						<div
							class="w-9 h-9 rounded-lg bg-gradient-to-br from-gov-700 to-civic-500 flex items-center justify-center"
						>
							<svg
								class="w-5 h-5 text-white"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
								/>
							</svg>
						</div>
						<div>
							<h1 class="text-lg font-display font-bold text-gov-900 leading-tight">TOPS</h1>
							<p class="text-xs text-gov-400 -mt-0.5">Transportation & Permits</p>
						</div>
					</div>

					<!-- User Section -->
					<div class="flex items-center gap-4">
						<!-- Notifications placeholder -->
						<button
							class="relative p-2 rounded-lg text-gov-400 hover:text-gov-700 hover:bg-gov-50 transition-colors"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
								/>
							</svg>
							<span
								class="absolute top-1.5 right-1.5 w-2 h-2 bg-permit-denied rounded-full"
							></span>
						</button>

						<!-- Avatar & Name -->
						<div class="flex items-center gap-3">
							<div class="hidden sm:block text-right">
								<p class="text-sm font-semibold text-gov-900">{auth.user?.name}</p>
								<p class="text-xs text-gov-400">{auth.user?.email}</p>
							</div>
							<div
								class="w-10 h-10 rounded-full bg-gradient-to-br from-gov-600 to-civic-500 flex items-center justify-center text-white font-bold text-sm shadow-md"
							>
								{auth.user?.avatar}
							</div>
						</div>

						<!-- Logout -->
						<button
							onclick={handleLogout}
							class="p-2 rounded-lg text-gov-400 hover:text-permit-denied hover:bg-red-50 transition-colors"
							title="Logout"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
								/>
							</svg>
						</button>
					</div>
				</div>
			</div>
		</header>

		<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<!-- Page Header -->
			<div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
				<div>
					<h2 class="text-2xl sm:text-3xl font-display font-bold text-gov-900">My Permits</h2>
					<p class="text-gov-400 mt-1">Track and manage your transportation permit applications</p>
				</div>
				<a
					href="/permits/new"
					class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gov-600 to-gov-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-gov-700 hover:to-gov-600 transition-all duration-200 active:scale-[0.98]"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/>
					</svg>
					New Permit
				</a>
			</div>

			<!-- Stats Row -->
			<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
				<!-- Draft -->
				<div
					class="bg-white rounded-xl p-4 shadow-card hover:shadow-card-hover transition-shadow duration-200 border border-gray-100"
				>
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
							<svg
								class="w-5 h-5 text-permit-draft"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
								/>
							</svg>
						</div>
						<div>
							<p class="text-2xl font-bold text-gov-900">{permits.draftCount}</p>
							<p class="text-xs font-medium text-gov-400">Draft</p>
						</div>
					</div>
				</div>

				<!-- Submitted -->
				<div
					class="bg-white rounded-xl p-4 shadow-card hover:shadow-card-hover transition-shadow duration-200 border border-gov-100"
				>
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-lg bg-gov-50 flex items-center justify-center">
							<svg
								class="w-5 h-5 text-gov-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
								/>
							</svg>
						</div>
						<div>
							<p class="text-2xl font-bold text-gov-900">{permits.submittedCount}</p>
							<p class="text-xs font-medium text-gov-400">Submitted</p>
						</div>
					</div>
				</div>

				<!-- Under Review -->
				<div
					class="bg-white rounded-xl p-4 shadow-card hover:shadow-card-hover transition-shadow duration-200 border border-purple-100"
				>
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
							<svg
								class="w-5 h-5 text-permit-review"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
								/>
							</svg>
						</div>
						<div>
							<p class="text-2xl font-bold text-gov-900">{permits.reviewCount}</p>
							<p class="text-xs font-medium text-gov-400">Under Review</p>
						</div>
					</div>
				</div>

				<!-- Approved -->
				<div
					class="bg-white rounded-xl p-4 shadow-card hover:shadow-card-hover transition-shadow duration-200 border border-green-100"
				>
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
							<svg
								class="w-5 h-5 text-permit-approved"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
						<div>
							<p class="text-2xl font-bold text-gov-900">{permits.approvedCount}</p>
							<p class="text-xs font-medium text-gov-400">Approved</p>
						</div>
					</div>
				</div>

				<!-- Denied -->
				<div
					class="bg-white rounded-xl p-4 shadow-card hover:shadow-card-hover transition-shadow duration-200 border border-red-100"
				>
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
							<svg
								class="w-5 h-5 text-permit-denied"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
						<div>
							<p class="text-2xl font-bold text-gov-900">{permits.deniedCount}</p>
							<p class="text-xs font-medium text-gov-400">Denied</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Search & Filter Bar -->
			<div
				class="bg-white rounded-xl shadow-card border border-gov-100 p-4 mb-6"
			>
				<div class="flex flex-col sm:flex-row gap-4">
					<!-- Search -->
					<div class="relative flex-1">
						<svg
							class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gov-300"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
						<input
							type="text"
							bind:value={searchQuery}
							placeholder="Search permits by title or reference number..."
							class="w-full pl-10 pr-4 py-2.5 bg-surface-alt border border-gov-100 rounded-lg text-sm text-gov-900 placeholder:text-gov-300 focus:outline-none focus:ring-2 focus:ring-civic-400 focus:border-transparent transition-all"
						/>
						{#if searchQuery}
							<button
								onclick={() => (searchQuery = '')}
								class="absolute right-3 top-1/2 -translate-y-1/2 text-gov-300 hover:text-gov-600 transition-colors"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						{/if}
					</div>

					<!-- Filter Tabs -->
					<div class="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
						{#each FILTER_TABS as tab}
							<button
								onclick={() => (activeFilter = tab.key)}
								class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-150
                  {activeFilter === tab.key
									? 'bg-gov-900 text-white shadow-md'
									: 'text-gov-400 hover:text-gov-700 hover:bg-gov-50'}"
							>
								{tab.label}
								<span
									class="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-bold
                    {activeFilter === tab.key ? 'bg-white/20 text-white' : 'bg-gov-100 text-gov-500'}"
								>
									{tab.count()}
								</span>
							</button>
						{/each}
					</div>
				</div>
			</div>

			<!-- Permit List -->
			<div class="space-y-4">
				{#if filteredPermits.length === 0}
					<div
						class="bg-white rounded-xl shadow-card border border-gov-100 p-12 text-center"
					>
						<div class="w-16 h-16 rounded-full bg-gov-50 flex items-center justify-center mx-auto mb-4">
							<svg
								class="w-8 h-8 text-gov-300"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
						</div>
						<h3 class="text-lg font-display font-semibold text-gov-900 mb-1">No permits found</h3>
						<p class="text-gov-400 text-sm mb-6">
							{#if searchQuery}
								No permits match your search. Try a different term.
							{:else}
								You haven't created any permits with this status yet.
							{/if}
						</p>
						<a
							href="/permits/new"
							class="inline-flex items-center gap-2 px-5 py-2.5 bg-gov-600 text-white font-medium rounded-lg hover:bg-gov-700 transition-colors"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 4v16m8-8H4"
								/>
							</svg>
							Create New Permit
						</a>
					</div>
				{:else}
					{#each filteredPermits as permit, i}
						{@const typeMeta = PERMIT_TYPE_META[permit.type]}
						{@const statusCfg = STATUS_CONFIG[permit.status]}
						{@const sla = permit.slaDeadline ? slaCountdown(permit.slaDeadline) : null}
						<a
							href="/permits/{permit.id}"
							class="block group bg-white rounded-xl shadow-card hover:shadow-card-hover border border-gov-100 hover:border-gov-200 transition-all duration-200 overflow-hidden cursor-pointer"
						>
							<div class="p-5 sm:p-6">
								<div class="flex flex-col sm:flex-row sm:items-start gap-4">
									<!-- Type Icon -->
									<div
										class="w-11 h-11 rounded-xl bg-{typeMeta.color === 'gov'
											? 'gov-50'
											: typeMeta.color === 'civic'
												? 'civic-50'
												: typeMeta.color === 'permit-pending'
													? 'amber-50'
													: 'green-50'} flex items-center justify-center shrink-0"
									>
										<span class="text-{typeMeta.color === 'gov' ? 'gov-600' : typeMeta.color === 'civic' ? 'civic-600' : typeMeta.color}">
											{@html TYPE_ICONS[typeMeta.icon]}
										</span>
									</div>

									<!-- Content -->
									<div class="flex-1 min-w-0">
										<div class="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
											<!-- Type Badge -->
											<span
												class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-{typeMeta.color === 'gov'
													? 'gov-100 text-gov-700'
													: typeMeta.color === 'civic'
														? 'civic-100 text-civic-600'
														: typeMeta.color === 'permit-pending'
															? 'amber-100 text-amber-700'
															: 'green-100 text-green-700'} w-fit"
											>
												{typeMeta.label}
											</span>

											<!-- Status Badge -->
											<span
												class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold {statusCfg.bg} {statusCfg.color} w-fit"
											>
												<span class="text-[10px]">{statusCfg.icon}</span>
												{statusCfg.label}
											</span>

											<!-- SLA Badge -->
											{#if sla && permit.status !== 'approved' && permit.status !== 'denied' && permit.status !== 'draft'}
												<span
													class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit
                            {sla.expired
														? 'bg-red-100 text-permit-denied'
														: sla.urgent
															? 'bg-amber-100 text-amber-700'
															: 'bg-blue-50 text-gov-500'}"
												>
													<svg
														class="w-3 h-3"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
														/>
													</svg>
													{sla.text}
												</span>
											{/if}
										</div>

										<!-- Title -->
										<h3
											class="text-base font-display font-semibold text-gov-900 group-hover:text-gov-700 transition-colors truncate"
										>
											{permit.title}
										</h3>

										<!-- Meta row -->
										<div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gov-400">
											<!-- Reference Number -->
											<span class="inline-flex items-center gap-1 font-mono">
												<svg
													class="w-3.5 h-3.5"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
													/>
												</svg>
												{permit.referenceNumber}
											</span>

											<!-- Submitted date -->
											<span class="inline-flex items-center gap-1">
												<svg
													class="w-3.5 h-3.5"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
													/>
												</svg>
												{timeAgo(permit.submittedAt)}
											</span>

											<!-- Ward -->
											{#if permit.ward}
												<span class="inline-flex items-center gap-1">
													<svg
														class="w-3.5 h-3.5"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
														/>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
														/>
													</svg>
													{permit.ward}{permit.quadrant ? ` (${permit.quadrant})` : ''}
												</span>
											{/if}

											<!-- Reviewer -->
											{#if permit.assignedReviewer}
												<span class="inline-flex items-center gap-1">
													<svg
														class="w-3.5 h-3.5"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
														/>
													</svg>
													Reviewer: {permit.assignedReviewer}
												</span>
											{/if}
										</div>
									</div>

									<!-- Arrow / Action -->
									<div class="hidden sm:flex items-center self-center">
										<div
											class="w-9 h-9 rounded-lg flex items-center justify-center text-gov-300 group-hover:text-gov-600 group-hover:bg-gov-50 transition-all"
										>
											<svg
												class="w-5 h-5"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M9 5l7 7-7 7"
												/>
											</svg>
										</div>
									</div>
								</div>
							</div>

							<!-- Bottom accent bar based on status -->
							<div
								class="h-1 w-full {permit.status === 'approved'
									? 'bg-gradient-to-r from-permit-approved to-emerald-400'
									: permit.status === 'denied'
										? 'bg-gradient-to-r from-permit-denied to-red-400'
										: permit.status === 'under_review'
											? 'bg-gradient-to-r from-permit-review to-purple-400'
											: permit.status === 'submitted'
												? 'bg-gradient-to-r from-gov-500 to-civic-400'
												: 'bg-gradient-to-r from-gray-300 to-gray-200'}"
							></div>
						</a>
						{#if permit.status !== 'draft'}
							<div class="flex items-start gap-1.5 mt-1 px-4 pb-2">
								<svg class="w-3.5 h-3.5 text-gov-300 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
									<path d="M12 2l2.09 6.26L20.18 9.27l-5.09 3.9L16.18 19.27 12 15.77l-4.18 3.5 1.09-6.1-5.09-3.9 6.09-1.01L12 2z"/>
								</svg>
								<span class="text-xs italic text-gov-400 leading-snug">{getAIStatusExplanation(permit)}</span>
							</div>
						{/if}
					{/each}
				{/if}
			</div>

			<!-- Results count -->
			{#if filteredPermits.length > 0}
				<div class="mt-6 text-center">
					<p class="text-sm text-gov-400">
						Showing {filteredPermits.length} of {permits.totalCount} permits
					</p>
				</div>
			{/if}
		</main>
	</div>
{/if}
