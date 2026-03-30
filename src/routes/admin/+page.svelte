<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth.svelte';
	import NavHeader from '$lib/components/NavHeader.svelte';
	import {
		analytics,
		REVIEWER_WORKLOAD,
		AI_INSIGHTS,
		AUDIT_LOG,
		type MetricCard,
		type AIInsight
	} from '$lib/stores/analytics.svelte';

	// Auth guard: admin only
	$effect(() => {
		if (!auth.isAuthenticated) {
			goto('/login');
		} else if (auth.role !== 'admin') {
			goto('/dashboard');
		}
	});

	// Audit trail collapsed state
	let auditExpanded = $state(false);

	// Export modal state
	let exportModalOpen = $state(false);
	let exportFormat = $state<'pdf' | 'csv' | 'excel'>('pdf');
	let exportDateFrom = $state('2026-03-01');
	let exportDateTo = $state('2026-03-30');
	let exportLoading = $state(false);
	let exportSuccess = $state(false);

	// Toast state
	let toastVisible = $state(false);
	let toastTimeout: ReturnType<typeof setTimeout> | null = null;

	function getTrendArrow(trend?: 'up' | 'down' | 'flat'): string {
		if (trend === 'up') return '\u2191';
		if (trend === 'down') return '\u2193';
		return '\u2192';
	}

	function getTrendColor(metric: MetricCard): string {
		if (metric.label === 'Avg Review Time') {
			return metric.trend === 'down' ? 'text-permit-approved' : 'text-permit-denied';
		}
		return metric.trend === 'up' ? 'text-permit-approved' : metric.trend === 'down' ? 'text-permit-denied' : 'text-gov-400';
	}

	function getMetricBorderColor(color: string): string {
		switch (color) {
			case 'gov': return 'border-gov-500';
			case 'civic': return 'border-civic-500';
			case 'permit-approved': return 'border-permit-approved';
			case 'permit-denied': return 'border-permit-denied';
			default: return 'border-gov-300';
		}
	}

	function getMetricIconBg(color: string): string {
		switch (color) {
			case 'gov': return 'bg-gov-100 text-gov-600';
			case 'civic': return 'bg-civic-100 text-civic-600';
			case 'permit-approved': return 'bg-green-100 text-permit-approved';
			case 'permit-denied': return 'bg-red-100 text-permit-denied';
			default: return 'bg-gov-100 text-gov-500';
		}
	}

	function getSeverityConfig(severity: AIInsight['severity']): { badge: string; border: string; bg: string } {
		switch (severity) {
			case 'info': return { badge: 'bg-gov-100 text-gov-600', border: 'border-gov-200', bg: 'bg-gov-50' };
			case 'warning': return { badge: 'bg-amber-100 text-amber-700', border: 'border-amber-200', bg: 'bg-amber-50' };
			case 'alert': return { badge: 'bg-red-100 text-permit-denied', border: 'border-red-200', bg: 'bg-red-50' };
		}
	}

	function getCategoryBadge(category: string): { bg: string; text: string } {
		switch (category) {
			case 'approval': return { bg: 'bg-green-100', text: 'text-permit-approved' };
			case 'review': return { bg: 'bg-purple-100', text: 'text-permit-review' };
			case 'routing': return { bg: 'bg-civic-100', text: 'text-civic-600' };
			case 'sla': return { bg: 'bg-amber-100', text: 'text-amber-700' };
			case 'submission': return { bg: 'bg-gov-100', text: 'text-gov-600' };
			case 'report': return { bg: 'bg-gray-100', text: 'text-gov-400' };
			default: return { bg: 'bg-gray-100', text: 'text-gov-400' };
		}
	}

	function formatTimestamp(ts: string): string {
		const d = new Date(ts);
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
			' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	}

	function maxActive(): number {
		return Math.max(...REVIEWER_WORKLOAD.map(r => r.active));
	}

	async function handleExport() {
		exportLoading = true;
		await new Promise(r => setTimeout(r, 2000));
		exportLoading = false;
		exportSuccess = true;
		await new Promise(r => setTimeout(r, 800));
		exportModalOpen = false;
		exportSuccess = false;
		// Show toast
		toastVisible = true;
		if (toastTimeout) clearTimeout(toastTimeout);
		toastTimeout = setTimeout(() => { toastVisible = false; }, 4000);
	}
</script>

<svelte:head>
	<title>Operations Dashboard - TOPS Admin</title>
</svelte:head>

{#if auth.isAuthenticated && auth.role === 'admin'}
	<div class="min-h-screen bg-surface-alt">
		<NavHeader />

		<main id="main-content" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<!-- Page Header -->
			<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-in">
				<div>
					<h1 class="text-2xl font-display font-bold text-gov-900">Operations Dashboard</h1>
					<p class="text-sm text-gov-400 mt-1">Real-time permit operations overview</p>
				</div>
				<div class="flex items-center gap-3">
					<a
						href="/admin/executive"
						class="inline-flex items-center gap-2 px-4 py-2 bg-gov-700 text-white rounded-lg text-sm font-semibold hover:bg-gov-800 transition-colors duration-200 shadow-sm"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
						</svg>
						Executive View
					</a>
					<button
						onclick={() => { exportModalOpen = true; exportSuccess = false; }}
						class="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gov-200 text-gov-700 rounded-lg text-sm font-semibold hover:bg-gov-50 transition-colors duration-200 shadow-sm cursor-pointer"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
						Export Report
					</button>
				</div>
			</div>

			<!-- 1. Metrics Row -->
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				{#each analytics.operationsMetrics as metric, i}
					<div
						class="bg-white rounded-xl shadow-card border-l-4 {getMetricBorderColor(metric.color)} p-5 animate-slide-up"
						style="animation-delay: {i * 80}ms"
					>
						<div class="flex items-start justify-between">
							<div>
								<p class="text-xs font-semibold text-gov-400 uppercase tracking-wider">{metric.label}</p>
								<p class="text-2xl font-display font-bold text-gov-900 mt-1">{metric.value}</p>
							</div>
							<div class="w-10 h-10 rounded-lg {getMetricIconBg(metric.color)} flex items-center justify-center">
								{#if metric.label === 'Pending Applications'}
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
								{:else if metric.label === 'SLA Compliance'}
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
								{:else if metric.label === 'Avg Review Time'}
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
								{:else}
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
								{/if}
							</div>
						</div>
						<div class="mt-3 flex items-center gap-1.5">
							<span class="text-sm font-bold {getTrendColor(metric)}">{getTrendArrow(metric.trend)}</span>
							<span class="text-xs text-gov-400">{metric.trendValue}</span>
						</div>
					</div>
				{/each}
			</div>

			<!-- 2. Review Bottleneck Panel -->
			<div class="bg-white rounded-xl shadow-card p-6 mb-8 animate-slide-up" style="animation-delay: 320ms">
				<div class="flex items-center gap-3 mb-5">
					<div class="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
						<svg class="w-4 h-4 text-permit-review" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
						</svg>
					</div>
					<div>
						<h2 class="text-lg font-display font-bold text-gov-900">Review Bottleneck</h2>
						<p class="text-xs text-gov-400">Reviewer workload distribution</p>
					</div>
				</div>

				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-gov-100">
								<th class="text-left py-3 px-3 text-xs font-semibold text-gov-400 uppercase tracking-wider">Reviewer</th>
								<th class="text-left py-3 px-3 text-xs font-semibold text-gov-400 uppercase tracking-wider">Ward</th>
								<th class="text-left py-3 px-3 text-xs font-semibold text-gov-400 uppercase tracking-wider min-w-[180px]">Active Reviews</th>
								<th class="text-center py-3 px-3 text-xs font-semibold text-gov-400 uppercase tracking-wider">Completed (Month)</th>
								<th class="text-center py-3 px-3 text-xs font-semibold text-gov-400 uppercase tracking-wider">Avg Days</th>
							</tr>
						</thead>
						<tbody>
							{#each REVIEWER_WORKLOAD as reviewer}
								{@const isOverloaded = reviewer.active >= 5}
								<tr class="border-b border-gov-50 last:border-0 {isOverloaded ? 'bg-red-50/50' : 'hover:bg-gov-50/50'} transition-colors">
									<td class="py-3 px-3">
										<div class="flex items-center gap-2">
											<span class="font-semibold text-gov-800">{reviewer.name}</span>
											{#if isOverloaded}
												<span class="px-2 py-0.5 rounded-full bg-red-100 text-permit-denied text-[10px] font-bold uppercase">Overloaded</span>
											{/if}
										</div>
									</td>
									<td class="py-3 px-3 text-gov-500">{reviewer.ward}</td>
									<td class="py-3 px-3">
										<div class="flex items-center gap-2">
											<div class="flex-1 h-2.5 bg-gov-100 rounded-full overflow-hidden">
												<div
													class="h-full rounded-full transition-all duration-500 {isOverloaded ? 'bg-permit-denied' : 'bg-civic-500'}"
													style="width: {(reviewer.active / maxActive()) * 100}%"
												></div>
											</div>
											<span class="text-xs font-bold {isOverloaded ? 'text-permit-denied' : 'text-gov-600'} w-4 text-right">{reviewer.active}</span>
										</div>
									</td>
									<td class="py-3 px-3 text-center font-semibold text-gov-700">{reviewer.completed}</td>
									<td class="py-3 px-3 text-center">
										<span class="px-2 py-1 rounded-md {reviewer.avgDays <= 3 ? 'bg-green-100 text-permit-approved' : reviewer.avgDays <= 4 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-permit-denied'} text-xs font-bold">
											{reviewer.avgDays}d
										</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<!-- 3. AI Insight Panel -->
			<div class="bg-white rounded-xl shadow-card p-6 mb-8 animate-slide-up" style="animation-delay: 400ms">
				<div class="flex items-center gap-3 mb-5">
					<div class="w-8 h-8 rounded-lg bg-gradient-to-br from-civic-400 to-gov-500 flex items-center justify-center">
						<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
						</svg>
					</div>
					<div>
						<h2 class="text-lg font-display font-bold text-gov-900">AI-Powered Insights</h2>
						<p class="text-xs text-gov-400">Automated pattern detection and recommendations</p>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					{#each AI_INSIGHTS as insight}
						{@const config = getSeverityConfig(insight.severity)}
						<div class="rounded-lg border {config.border} {config.bg} p-4">
							<div class="flex items-start gap-3">
								<span class="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider {config.badge} shrink-0 mt-0.5">
									{insight.severity}
								</span>
								<div>
									<h3 class="text-sm font-bold text-gov-800">{insight.title}</h3>
									<p class="text-xs text-gov-500 mt-1 leading-relaxed">{insight.description}</p>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- 4. Audit Trail (Collapsible) -->
			<div class="bg-white rounded-xl shadow-card mb-8 animate-slide-up" style="animation-delay: 480ms">
				<button
					onclick={() => auditExpanded = !auditExpanded}
					class="w-full flex items-center justify-between p-6 cursor-pointer group"
				>
					<div class="flex items-center gap-3">
						<div class="w-8 h-8 rounded-lg bg-gov-100 flex items-center justify-center">
							<svg class="w-4 h-4 text-gov-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
							</svg>
						</div>
						<div class="text-left">
							<h2 class="text-lg font-display font-bold text-gov-900">Audit Trail</h2>
							<p class="text-xs text-gov-400">{AUDIT_LOG.length} recent entries</p>
						</div>
					</div>
					<div class="flex items-center gap-2 text-sm font-semibold text-gov-400 group-hover:text-gov-600 transition-colors">
						<span>{auditExpanded ? 'Hide' : 'Show'} Audit Trail</span>
						<svg
							class="w-5 h-5 transition-transform duration-300 {auditExpanded ? 'rotate-180' : ''}"
							fill="none" stroke="currentColor" viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</div>
				</button>

				{#if auditExpanded}
					<div class="px-6 pb-6 border-t border-gov-100 animate-slide-up">
						<div class="space-y-0 mt-4">
							{#each AUDIT_LOG as entry}
								{@const badge = getCategoryBadge(entry.category)}
								<div class="flex items-start gap-4 py-3 border-b border-gov-50 last:border-0">
									<div class="shrink-0 w-2 h-2 rounded-full bg-gov-300 mt-2"></div>
									<div class="flex-1 min-w-0">
										<div class="flex flex-wrap items-center gap-2">
											<span class="text-sm font-semibold text-gov-800">{entry.actor}</span>
											<span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase {badge.bg} {badge.text}">{entry.category}</span>
										</div>
										<p class="text-sm text-gov-500 mt-0.5">{entry.action}</p>
									</div>
									<span class="text-xs text-gov-400 shrink-0 tabular-nums">{formatTimestamp(entry.timestamp)}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</main>
	</div>

	<!-- Export Modal -->
	{#if exportModalOpen}
		<div class="fixed inset-0 z-50 flex items-center justify-center">
			<!-- Backdrop -->
			<button
				class="absolute inset-0 bg-surface-overlay cursor-default"
				onclick={() => { exportModalOpen = false; }}
				tabindex="-1"
				aria-label="Close modal"
			></button>

			<!-- Modal -->
			<div class="relative bg-white rounded-2xl shadow-modal w-full max-w-md mx-4 animate-scale-in">
				<div class="p-6">
					<div class="flex items-center justify-between mb-6">
						<h3 class="text-lg font-display font-bold text-gov-900">Export Report</h3>
						<button
							onclick={() => { exportModalOpen = false; }}
							class="p-1.5 rounded-lg text-gov-400 hover:text-gov-700 hover:bg-gov-50 transition-colors cursor-pointer"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>

					<!-- Format Selector -->
					<div class="mb-5">
						<label class="block text-sm font-semibold text-gov-700 mb-2">Format</label>
						<div class="grid grid-cols-3 gap-2">
							{#each ['pdf', 'csv', 'excel'] as fmt}
								<button
									onclick={() => { exportFormat = fmt as 'pdf' | 'csv' | 'excel'; }}
									class="px-3 py-2.5 rounded-lg text-sm font-semibold border transition-all cursor-pointer
										{exportFormat === fmt
											? 'bg-gov-700 text-white border-gov-700 shadow-sm'
											: 'bg-white text-gov-500 border-gov-200 hover:border-gov-300 hover:bg-gov-50'}"
								>
									{fmt.toUpperCase()}
								</button>
							{/each}
						</div>
					</div>

					<!-- Date Range -->
					<div class="grid grid-cols-2 gap-3 mb-6">
						<div>
							<label for="export-from" class="block text-sm font-semibold text-gov-700 mb-1.5">From</label>
							<input
								id="export-from"
								type="date"
								bind:value={exportDateFrom}
								class="w-full px-3 py-2 rounded-lg border border-gov-200 text-sm text-gov-700 focus:outline-none focus:ring-2 focus:ring-civic-400 focus:border-transparent"
							/>
						</div>
						<div>
							<label for="export-to" class="block text-sm font-semibold text-gov-700 mb-1.5">To</label>
							<input
								id="export-to"
								type="date"
								bind:value={exportDateTo}
								class="w-full px-3 py-2 rounded-lg border border-gov-200 text-sm text-gov-700 focus:outline-none focus:ring-2 focus:ring-civic-400 focus:border-transparent"
							/>
						</div>
					</div>

					<!-- Generate Button -->
					<button
						onclick={handleExport}
						disabled={exportLoading || exportSuccess}
						class="w-full py-3 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer
							{exportSuccess
								? 'bg-permit-approved text-white'
								: 'bg-gov-700 text-white hover:bg-gov-800 disabled:opacity-60'}"
					>
						{#if exportLoading}
							<span class="inline-flex items-center gap-2">
								<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								Generating...
							</span>
						{:else if exportSuccess}
							<span class="inline-flex items-center gap-2">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
								Report Ready
							</span>
						{:else}
							Generate Report
						{/if}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Success Toast -->
	{#if toastVisible}
		<div class="fixed bottom-6 right-6 z-50 animate-slide-up">
			<div class="flex items-center gap-3 bg-gov-900 text-white px-5 py-3 rounded-xl shadow-modal">
				<svg class="w-5 h-5 text-permit-approved" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
				<span class="text-sm font-semibold">Report exported successfully</span>
				<button
					onclick={() => { toastVisible = false; }}
					class="p-1 rounded-lg hover:bg-white/10 transition-colors ml-2 cursor-pointer"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>
	{/if}
{/if}
