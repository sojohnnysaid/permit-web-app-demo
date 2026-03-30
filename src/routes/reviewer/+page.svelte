<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth.svelte';
	import { PERMIT_TYPE_META, type PermitStatus } from '$lib/stores/permits.svelte';
	import { reviewerStore } from '$lib/stores/reviewer.svelte';
	import NavHeader from '$lib/components/NavHeader.svelte';

	// Auth guard: redirect if not authenticated or if applicant role
	$effect(() => {
		if (!auth.isAuthenticated) {
			goto('/login');
		} else if (auth.role === 'applicant') {
			goto('/dashboard');
		}
	});

	// Filter / search state
	type FilterTab = 'all' | 'overdue' | 'under_review' | 'submitted';
	let activeFilter = $state<FilterTab>('all');
	let searchQuery = $state('');

	// SLA countdown helper (reused from dashboard pattern)
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

	// Derived: overdue count
	let overdueCount = $derived(
		reviewerStore.queue.filter(
			(p) => p.slaDeadline && new Date(p.slaDeadline).getTime() < Date.now()
		).length
	);

	// Derived: average review time (mock calculation based on submission-to-now for under_review)
	let avgReviewTime = $derived.by(() => {
		const underReview = reviewerStore.queue.filter((p) => p.status === 'under_review');
		if (underReview.length === 0) return '0h';
		const totalHours = underReview.reduce((sum, p) => {
			const diffMs = Date.now() - new Date(p.submittedAt).getTime();
			return sum + diffMs / 3600000;
		}, 0);
		const avg = totalHours / underReview.length;
		if (avg < 24) return `${Math.round(avg)}h`;
		return `${Math.round(avg / 24)}d`;
	});

	// Derived: filtered queue
	let filteredQueue = $derived.by(() => {
		let result = reviewerStore.queue;

		// Apply filter tab
		if (activeFilter === 'overdue') {
			result = result.filter(
				(p) => p.slaDeadline && new Date(p.slaDeadline).getTime() < Date.now()
			);
		} else if (activeFilter === 'under_review') {
			result = result.filter((p) => p.status === 'under_review');
		} else if (activeFilter === 'submitted') {
			result = result.filter((p) => p.status === 'submitted');
		}

		// Apply search
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			result = result.filter(
				(p) =>
					p.title.toLowerCase().includes(q) ||
					p.referenceNumber.toLowerCase().includes(q)
			);
		}

		return result;
	});

	// Filter tabs config
	let underReviewCount = $derived(
		reviewerStore.queue.filter((p) => p.status === 'under_review').length
	);
	let newSubmissionsCount = $derived(
		reviewerStore.queue.filter((p) => p.status === 'submitted').length
	);

	const FILTER_TABS: { key: FilterTab; label: string }[] = [
		{ key: 'all', label: 'All' },
		{ key: 'overdue', label: 'Overdue' },
		{ key: 'under_review', label: 'Under Review' },
		{ key: 'submitted', label: 'New Submissions' }
	];

	function getFilterCount(key: FilterTab): number {
		switch (key) {
			case 'all':
				return reviewerStore.queueCount;
			case 'overdue':
				return overdueCount;
			case 'under_review':
				return underReviewCount;
			case 'submitted':
				return newSubmissionsCount;
		}
	}

	// Status config
	const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> =
		{
			submitted: { label: 'New', color: 'text-gov-500', bg: 'bg-gov-50', icon: '📤' },
			under_review: {
				label: 'Under Review',
				color: 'text-permit-review',
				bg: 'bg-purple-50',
				icon: '🔍'
			}
		};

	// Permit type color mapping (matching dashboard pattern)
	function getTypeBadgeClasses(color: string): string {
		switch (color) {
			case 'gov':
				return 'bg-gov-100 text-gov-700';
			case 'civic':
				return 'bg-civic-100 text-civic-600';
			case 'permit-pending':
				return 'bg-amber-100 text-amber-700';
			case 'permit-review':
				return 'bg-purple-100 text-purple-700';
			case 'permit-approved':
				return 'bg-green-100 text-green-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}

	// Type icon SVGs
	const TYPE_ICONS: Record<string, string> = {
		truck: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/></svg>`,
		calendar: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`,
		construction: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>`,
		parking: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h4a2 2 0 010 4H9V7zm0 4v6m-4-10h12a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"/></svg>`,
		tree: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19h14M12 3l-7 8h4l-3 5h12l-3-5h4L12 3z"/></svg>`
	};
</script>

<svelte:head>
	<title>Reviewer Work Queue - TOPS</title>
</svelte:head>

{#if auth.isAuthenticated && auth.role !== 'applicant'}
	<div class="min-h-screen bg-surface-alt animate-fade-in">
		<NavHeader />

		<main id="main-content" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<!-- Page Header -->
			<div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
				<div>
					<h2 class="text-2xl sm:text-3xl font-display font-bold text-gov-900">
						Reviewer Work Queue
					</h2>
					<p class="text-gov-400 mt-1">
						Review and process permit applications assigned to your queue
					</p>
				</div>
			</div>

			<!-- AI Routing Recommendation Panel -->
			<div
				class="bg-gradient-to-r from-civic-50 to-gov-50 rounded-xl border border-civic-200 p-4 mb-6 animate-slide-up flex items-start gap-3"
			>
				<div
					class="w-9 h-9 rounded-lg bg-gradient-to-br from-civic-500 to-gov-500 flex items-center justify-center shrink-0"
				>
					<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
						/>
					</svg>
				</div>
				<div>
					<p class="text-sm font-semibold text-gov-800">AI Routing</p>
					<p class="text-xs text-gov-500 mt-0.5">
						3 applications auto-assigned based on reviewer expertise and workload balance
					</p>
				</div>
			</div>

			<!-- Stats Row -->
			<div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
				<!-- Total in Queue -->
				<div
					class="bg-white rounded-xl p-4 shadow-card hover:shadow-card-hover transition-shadow duration-200 border border-gov-100 animate-slide-up"
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
									d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
								/>
							</svg>
						</div>
						<div>
							<p class="text-2xl font-bold text-gov-900">{reviewerStore.queueCount}</p>
							<p class="text-xs font-medium text-gov-400">In Queue</p>
						</div>
					</div>
				</div>

				<!-- Overdue -->
				<div
					class="bg-white rounded-xl p-4 shadow-card hover:shadow-card-hover transition-shadow duration-200 border border-red-100 animate-slide-up"
					style="animation-delay: 50ms"
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
									d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
						<div>
							<p class="text-2xl font-bold text-permit-denied">{overdueCount}</p>
							<p class="text-xs font-medium text-gov-400">Overdue</p>
						</div>
					</div>
				</div>

				<!-- Average Review Time -->
				<div
					class="bg-white rounded-xl p-4 shadow-card hover:shadow-card-hover transition-shadow duration-200 border border-purple-100 animate-slide-up"
					style="animation-delay: 100ms"
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
									d="M13 10V3L4 14h7v7l9-11h-7z"
								/>
							</svg>
						</div>
						<div>
							<p class="text-2xl font-bold text-gov-900">{avgReviewTime}</p>
							<p class="text-xs font-medium text-gov-400">Avg Review Time</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Search & Filter Bar -->
			<div
				class="bg-white rounded-xl shadow-card border border-gov-100 p-4 mb-6 animate-slide-up"
				style="animation-delay: 150ms"
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
							placeholder="Search by title or reference number..."
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
									{getFilterCount(tab.key)}
								</span>
							</button>
						{/each}
					</div>
				</div>
			</div>

			<!-- Queue List -->
			<div class="space-y-4">
				{#if filteredQueue.length === 0}
					<div
						class="bg-white rounded-xl shadow-card border border-gov-100 p-12 text-center animate-fade-in"
					>
						<div
							class="w-16 h-16 rounded-full bg-gov-50 flex items-center justify-center mx-auto mb-4"
						>
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
						<h3 class="text-lg font-display font-semibold text-gov-900 mb-1">
							No permits found
						</h3>
						<p class="text-gov-400 text-sm">
							{#if searchQuery}
								No permits match your search. Try a different term.
							{:else}
								No permits match the selected filter.
							{/if}
						</p>
					</div>
				{:else}
					{#each filteredQueue as permit, i}
						{@const typeMeta = PERMIT_TYPE_META[permit.type]}
						{@const statusCfg = STATUS_CONFIG[permit.status] ?? {
							label: permit.status,
							color: 'text-gov-500',
							bg: 'bg-gov-50',
							icon: '📋'
						}}
						{@const sla = permit.slaDeadline ? slaCountdown(permit.slaDeadline) : null}
						{@const aiSummary = reviewerStore.getAISummary(permit.id)}
						<div
							class="group bg-white rounded-xl shadow-card hover:shadow-card-hover border border-gov-100 hover:border-gov-200 transition-all duration-200 overflow-hidden animate-slide-up"
							style="animation-delay: {200 + i * 60}ms"
						>
							<div class="p-5 sm:p-6">
								<div class="flex flex-col sm:flex-row sm:items-start gap-4">
									<!-- Type Icon -->
									<div
										class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0
											{typeMeta.color === 'gov'
											? 'bg-gov-50'
											: typeMeta.color === 'civic'
												? 'bg-civic-50'
												: typeMeta.color === 'permit-pending'
													? 'bg-amber-50'
													: typeMeta.color === 'permit-review'
														? 'bg-purple-50'
														: 'bg-green-50'}"
									>
										<span
											class="{typeMeta.color === 'gov'
												? 'text-gov-600'
												: typeMeta.color === 'civic'
													? 'text-civic-600'
													: typeMeta.color === 'permit-pending'
														? 'text-amber-600'
														: typeMeta.color === 'permit-review'
															? 'text-permit-review'
															: 'text-permit-approved'}"
										>
											{@html TYPE_ICONS[typeMeta.icon] ?? ''}
										</span>
									</div>

									<!-- Content -->
									<div class="flex-1 min-w-0">
										<!-- Badges Row -->
										<div class="flex flex-wrap items-center gap-2 mb-2">
											<!-- Type Badge -->
											<span
												class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold {getTypeBadgeClasses(
													typeMeta.color
												)} w-fit"
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
											{#if sla}
												<span
													class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit
														{sla.expired
														? 'bg-red-100 text-permit-denied'
														: sla.urgent
															? 'bg-amber-100 text-amber-700'
															: 'bg-green-50 text-green-700'}"
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
										<div
											class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gov-400"
										>
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

											<!-- Applicant -->
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
												{permit.applicant}
											</span>

											<!-- Submitted time -->
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

											<!-- Ward / Quadrant -->
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
													{permit.ward}{permit.quadrant
														? ` (${permit.quadrant})`
														: ''}
												</span>
											{/if}
										</div>

										<!-- AI Summary -->
										<div class="flex items-start gap-1.5 mt-3">
											<svg
												class="w-3.5 h-3.5 text-civic-500 shrink-0 mt-0.5"
												fill="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													d="M12 2l2.09 6.26L20.18 9.27l-5.09 3.9L16.18 19.27 12 15.77l-4.18 3.5 1.09-6.1-5.09-3.9 6.09-1.01L12 2z"
												/>
											</svg>
											<span class="text-xs italic text-gov-400 leading-snug">
												{aiSummary.length > 100
													? aiSummary.slice(0, 100) + '...'
													: aiSummary}
											</span>
										</div>
									</div>

									<!-- Review Button -->
									<div class="flex items-center self-center shrink-0">
										<a
											href="/reviewer/{permit.id}"
											class="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gov-600 to-gov-500 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-gov-700 hover:to-gov-600 transition-all duration-200 active:scale-[0.98]"
										>
											<svg
												class="w-4 h-4"
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
											Review
										</a>
									</div>
								</div>
							</div>

							<!-- Bottom accent bar based on status -->
							<div
								class="h-1 w-full {permit.status === 'under_review'
									? 'bg-gradient-to-r from-permit-review to-purple-400'
									: 'bg-gradient-to-r from-gov-500 to-civic-400'}"
							></div>
						</div>
					{/each}
				{/if}
			</div>

			<!-- Results count -->
			{#if filteredQueue.length > 0}
				<div class="mt-6 text-center">
					<p class="text-sm text-gov-400">
						Showing {filteredQueue.length} of {reviewerStore.queueCount} permits in queue
					</p>
				</div>
			{/if}
		</main>
	</div>
{/if}
