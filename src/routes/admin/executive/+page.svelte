<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth.svelte';
	import NavHeader from '$lib/components/NavHeader.svelte';
	import { MONTHLY_DATA, WARD_DATA } from '$lib/stores/analytics.svelte';

	// Auth guard
	$effect(() => {
		if (!auth.isAuthenticated) {
			goto('/login');
		}
	});

	// Chart calculations
	const maxSubmitted = Math.max(...MONTHLY_DATA.map(d => d.submitted));
	const chartHeight = 200;
	const barGroupWidth = 60;
	const barWidth = 20;
	const barGap = 4;
	const chartPadding = 40;
	const chartWidth = MONTHLY_DATA.length * barGroupWidth + chartPadding * 2;

	function barHeight(value: number): number {
		return (value / maxSubmitted) * (chartHeight - 30);
	}

	// Donut chart calculations
	const totalApproved = MONTHLY_DATA.reduce((sum, d) => sum + d.approved, 0);
	const totalDenied = MONTHLY_DATA.reduce((sum, d) => sum + d.denied, 0);
	const totalDecisions = totalApproved + totalDenied;
	const approvalRate = Math.round((totalApproved / totalDecisions) * 100);
	const donutRadius = 70;
	const donutStroke = 16;
	const donutCircumference = 2 * Math.PI * donutRadius;
	const approvedDash = (totalApproved / totalDecisions) * donutCircumference;
	const deniedDash = (totalDenied / totalDecisions) * donutCircumference;

	// Ward data calculations
	const maxWardPermits = Math.max(...WARD_DATA.map(w => w.permits));

	// Quarter totals
	const quarterPermits = MONTHLY_DATA.reduce((sum, d) => sum + d.submitted, 0);
	const busiestWard = WARD_DATA.reduce((prev, curr) => curr.permits > prev.permits ? curr : prev);

	function complianceColor(pct: number): { text: string; bg: string; bar: string } {
		if (pct >= 90) return { text: 'text-permit-approved', bg: 'bg-green-100', bar: 'bg-permit-approved' };
		if (pct >= 80) return { text: 'text-amber-700', bg: 'bg-amber-100', bar: 'bg-permit-pending' };
		return { text: 'text-permit-denied', bg: 'bg-red-100', bar: 'bg-permit-denied' };
	}

	// SVG grid lines
	const gridLines = [0, 0.25, 0.5, 0.75, 1];
</script>

<svelte:head>
	<title>Executive View - TOPS Admin</title>
</svelte:head>

{#if auth.isAuthenticated && auth.role === 'admin'}
	<div class="min-h-screen bg-surface-alt">
		<NavHeader />

		<main id="main-content" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<!-- Page Header -->
			<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
				<div>
					<div class="flex items-center gap-3 mb-1">
						<a
							href="/admin"
							class="inline-flex items-center gap-1 text-sm text-gov-400 hover:text-gov-600 transition-colors"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
							</svg>
							Operations
						</a>
					</div>
					<h1 class="text-2xl font-display font-bold text-gov-900">Executive View</h1>
					<p class="text-sm text-gov-400 mt-1">Strategic overview and trend analysis</p>
				</div>
				<div class="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gov-100 shadow-sm">
					<div class="w-2 h-2 rounded-full bg-permit-approved"></div>
					<span class="text-xs font-semibold text-gov-500">Live Data</span>
					<span class="text-xs text-gov-400">|</span>
					<span class="text-xs text-gov-400">Q1 FY2026</span>
				</div>
			</div>

			<!-- Top row: Permit Trends + Donut -->
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
				<!-- 1. Permit Trends Chart -->
				<div class="lg:col-span-2 bg-white rounded-xl shadow-card p-6">
					<h2 class="text-lg font-display font-bold text-gov-900 mb-1">Permit Trends</h2>
					<p class="text-xs text-gov-400 mb-5">Monthly submitted vs. approved applications</p>

					<div class="overflow-x-auto">
						<svg viewBox="0 0 {chartWidth} {chartHeight + 40}" class="w-full" style="min-width: 360px;">
							<!-- Grid lines -->
							{#each gridLines as pct}
								{@const y = chartHeight - (pct * (chartHeight - 30))}
								<line
									x1={chartPadding}
									y1={y}
									x2={chartWidth - chartPadding}
									y2={y}
									stroke="var(--color-gov-100)"
									stroke-width="1"
									stroke-dasharray={pct > 0 ? '4,4' : '0'}
								/>
								<text
									x={chartPadding - 6}
									y={y + 4}
									text-anchor="end"
									fill="var(--color-gov-400)"
									font-size="10"
									font-family="var(--font-sans)"
								>
									{Math.round(pct * maxSubmitted)}
								</text>
							{/each}

							<!-- Bars -->
							{#each MONTHLY_DATA as data, i}
								{@const x = chartPadding + i * barGroupWidth + (barGroupWidth - (barWidth * 2 + barGap)) / 2}
								{@const submittedH = barHeight(data.submitted)}
								{@const approvedH = barHeight(data.approved)}

								<!-- Submitted bar (blue) -->
								<rect
									x={x}
									y={chartHeight - submittedH}
									width={barWidth}
									height={submittedH}
									rx="3"
									fill="var(--color-gov-400)"
									opacity="0.85"
								>
									<title>Submitted: {data.submitted}</title>
								</rect>

								<!-- Approved bar (green) -->
								<rect
									x={x + barWidth + barGap}
									y={chartHeight - approvedH}
									width={barWidth}
									height={approvedH}
									rx="3"
									fill="var(--color-permit-approved)"
									opacity="0.85"
								>
									<title>Approved: {data.approved}</title>
								</rect>

								<!-- Value labels -->
								<text
									x={x + barWidth / 2}
									y={chartHeight - submittedH - 6}
									text-anchor="middle"
									fill="var(--color-gov-600)"
									font-size="10"
									font-weight="600"
									font-family="var(--font-sans)"
								>
									{data.submitted}
								</text>
								<text
									x={x + barWidth + barGap + barWidth / 2}
									y={chartHeight - approvedH - 6}
									text-anchor="middle"
									fill="var(--color-permit-approved)"
									font-size="10"
									font-weight="600"
									font-family="var(--font-sans)"
								>
									{data.approved}
								</text>

								<!-- Month label -->
								<text
									x={x + barWidth + barGap / 2}
									y={chartHeight + 16}
									text-anchor="middle"
									fill="var(--color-gov-500)"
									font-size="11"
									font-weight="600"
									font-family="var(--font-sans)"
								>
									{data.month}
								</text>
							{/each}
						</svg>
					</div>

					<!-- Legend -->
					<div class="flex items-center gap-5 mt-4 pt-4 border-t border-gov-50">
						<div class="flex items-center gap-2">
							<div class="w-3 h-3 rounded-sm bg-gov-400 opacity-85"></div>
							<span class="text-xs font-semibold text-gov-500">Submitted</span>
						</div>
						<div class="flex items-center gap-2">
							<div class="w-3 h-3 rounded-sm bg-permit-approved opacity-85"></div>
							<span class="text-xs font-semibold text-gov-500">Approved</span>
						</div>
					</div>
				</div>

				<!-- 2. Approval/Denial Ratio Donut -->
				<div class="bg-white rounded-xl shadow-card p-6 flex flex-col items-center justify-center">
					<h2 class="text-lg font-display font-bold text-gov-900 mb-1 self-start">Approval Rate</h2>
					<p class="text-xs text-gov-400 mb-5 self-start">Approved vs. denied decisions</p>

					<div class="relative flex items-center justify-center my-4">
						<svg width="180" height="180" viewBox="0 0 180 180">
							<!-- Background circle -->
							<circle
								cx="90"
								cy="90"
								r={donutRadius}
								fill="none"
								stroke="var(--color-gov-100)"
								stroke-width={donutStroke}
							/>
							<!-- Approved arc -->
							<circle
								cx="90"
								cy="90"
								r={donutRadius}
								fill="none"
								stroke="var(--color-permit-approved)"
								stroke-width={donutStroke}
								stroke-dasharray="{approvedDash} {donutCircumference}"
								stroke-dashoffset="0"
								stroke-linecap="round"
								transform="rotate(-90 90 90)"
								class="transition-all duration-1000"
							/>
							<!-- Denied arc -->
							<circle
								cx="90"
								cy="90"
								r={donutRadius}
								fill="none"
								stroke="var(--color-permit-denied)"
								stroke-width={donutStroke}
								stroke-dasharray="{deniedDash} {donutCircumference}"
								stroke-dashoffset="-{approvedDash}"
								stroke-linecap="round"
								transform="rotate(-90 90 90)"
								class="transition-all duration-1000"
							/>
						</svg>
						<!-- Center text -->
						<div class="absolute inset-0 flex flex-col items-center justify-center">
							<span class="text-3xl font-display font-bold text-gov-900">{approvalRate}%</span>
							<span class="text-xs text-gov-400 font-semibold">approval rate</span>
						</div>
					</div>

					<!-- Stats -->
					<div class="flex items-center gap-6 mt-4 pt-4 border-t border-gov-50 w-full">
						<div class="flex-1 text-center">
							<p class="text-xl font-display font-bold text-permit-approved">{totalApproved}</p>
							<p class="text-xs text-gov-400 font-semibold">Approved</p>
						</div>
						<div class="w-px h-8 bg-gov-100"></div>
						<div class="flex-1 text-center">
							<p class="text-xl font-display font-bold text-permit-denied">{totalDenied}</p>
							<p class="text-xs text-gov-400 font-semibold">Denied</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Middle row: Enforcement Summary -->
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
				<!-- SWOs Issued -->
				<div class="bg-white rounded-xl shadow-card p-6">
					<div class="flex items-center gap-3 mb-3">
						<div class="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
							<svg class="w-5 h-5 text-permit-denied" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
							</svg>
						</div>
						<p class="text-xs font-semibold text-gov-400 uppercase tracking-wider">SWOs Issued</p>
					</div>
					<p class="text-4xl font-display font-bold text-gov-900">2</p>
					<p class="text-xs text-gov-400 mt-1">Stop Work Orders this quarter</p>
				</div>

				<!-- NOIs Issued -->
				<div class="bg-white rounded-xl shadow-card p-6">
					<div class="flex items-center gap-3 mb-3">
						<div class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
							<svg class="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
						</div>
						<p class="text-xs font-semibold text-gov-400 uppercase tracking-wider">NOIs Issued</p>
					</div>
					<p class="text-4xl font-display font-bold text-gov-900">5</p>
					<p class="text-xs text-gov-400 mt-1">Notices of Infraction this quarter</p>
				</div>

				<!-- Compliance Rate -->
				<div class="bg-white rounded-xl shadow-card p-6">
					<div class="flex items-center gap-3 mb-3">
						<div class="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
							<svg class="w-5 h-5 text-permit-approved" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
							</svg>
						</div>
						<p class="text-xs font-semibold text-gov-400 uppercase tracking-wider">Compliance Rate</p>
					</div>
					<p class="text-4xl font-display font-bold text-permit-approved">94%</p>
					<p class="text-xs text-gov-400 mt-1">Overall regulatory compliance</p>
				</div>
			</div>

			<!-- Bottom row: Ward Permit Density + AI Pattern Analysis -->
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
				<!-- 4. Ward Permit Density -->
				<div class="lg:col-span-2 bg-white rounded-xl shadow-card p-6">
					<h2 class="text-lg font-display font-bold text-gov-900 mb-1">Ward Permit Density</h2>
					<p class="text-xs text-gov-400 mb-5">Permit volume and SLA compliance by ward</p>

					<div class="space-y-3">
						{#each WARD_DATA as ward}
							{@const colors = complianceColor(ward.slaCompliance)}
							<div class="flex items-center gap-4 py-2">
								<!-- Ward label -->
								<div class="w-16 shrink-0">
									<span class="text-sm font-bold text-gov-800">{ward.ward.replace('Ward ', 'W')}</span>
								</div>

								<!-- Permit count bar -->
								<div class="flex-1">
									<div class="flex items-center gap-3">
										<div class="flex-1 h-3 bg-gov-50 rounded-full overflow-hidden">
											<div
												class="h-full rounded-full bg-gov-400 transition-all duration-700"
												style="width: {(ward.permits / maxWardPermits) * 100}%"
											></div>
										</div>
										<span class="text-sm font-bold text-gov-700 w-8 text-right tabular-nums">{ward.permits}</span>
									</div>
								</div>

								<!-- SLA compliance -->
								<div class="shrink-0 w-24 text-right">
									<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold {colors.bg} {colors.text}">
										{#if ward.slaCompliance >= 90}
											<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
										{:else if ward.slaCompliance >= 80}
											<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01" /></svg>
										{:else}
											<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
										{/if}
										{ward.slaCompliance}%
									</span>
								</div>
							</div>
						{/each}
					</div>

					<!-- Legend -->
					<div class="flex items-center gap-5 mt-5 pt-4 border-t border-gov-50">
						<span class="text-xs text-gov-400 font-semibold">SLA Compliance:</span>
						<div class="flex items-center gap-1.5">
							<div class="w-2.5 h-2.5 rounded-full bg-permit-approved"></div>
							<span class="text-xs text-gov-400">&ge; 90%</span>
						</div>
						<div class="flex items-center gap-1.5">
							<div class="w-2.5 h-2.5 rounded-full bg-permit-pending"></div>
							<span class="text-xs text-gov-400">80-89%</span>
						</div>
						<div class="flex items-center gap-1.5">
							<div class="w-2.5 h-2.5 rounded-full bg-permit-denied"></div>
							<span class="text-xs text-gov-400">&lt; 80%</span>
						</div>
					</div>
				</div>

				<!-- 5. AI Pattern Analysis -->
				<div class="bg-white rounded-xl shadow-card p-6">
					<div class="flex items-center gap-3 mb-5">
						<div class="w-8 h-8 rounded-lg bg-gradient-to-br from-civic-400 to-gov-500 flex items-center justify-center">
							<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
							</svg>
						</div>
						<div>
							<h2 class="text-lg font-display font-bold text-gov-900">AI Pattern Analysis</h2>
							<p class="text-xs text-gov-400">Automated quarterly summary</p>
						</div>
					</div>

					<div class="space-y-5">
						<!-- Total permits -->
						<div class="p-4 rounded-lg bg-gov-50 border border-gov-100">
							<p class="text-xs font-semibold text-gov-400 uppercase tracking-wider mb-1">Total Permits This Quarter</p>
							<p class="text-3xl font-display font-bold text-gov-900">{quarterPermits}</p>
						</div>

						<!-- Avg processing time -->
						<div class="p-4 rounded-lg bg-civic-50 border border-civic-100">
							<p class="text-xs font-semibold text-gov-400 uppercase tracking-wider mb-1">Avg Processing Time</p>
							<p class="text-3xl font-display font-bold text-civic-600">3.4 <span class="text-base font-semibold text-gov-400">days</span></p>
						</div>

						<!-- Busiest ward -->
						<div class="p-4 rounded-lg bg-amber-50 border border-amber-100">
							<p class="text-xs font-semibold text-gov-400 uppercase tracking-wider mb-1">Busiest Ward</p>
							<p class="text-xl font-display font-bold text-gov-900">{busiestWard.ward}</p>
							<p class="text-sm text-gov-500 mt-0.5">{busiestWard.permits} permits this quarter</p>
						</div>
					</div>

					<!-- Summary text -->
					<div class="mt-5 pt-4 border-t border-gov-50">
						<p class="text-xs text-gov-400 leading-relaxed">
							Permit volume is trending upward with a {approvalRate}% approval rate.
							{busiestWard.ward} continues to lead in volume. Processing efficiency has improved
							12% month-over-month driven by AI-assisted triage.
						</p>
					</div>
				</div>
			</div>

			<!-- Back link -->
			<div class="text-center pb-8">
				<a
					href="/admin"
					class="inline-flex items-center gap-2 text-sm font-semibold text-gov-400 hover:text-gov-700 transition-colors"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					Back to Operations Dashboard
				</a>
			</div>
		</main>
	</div>
{/if}
