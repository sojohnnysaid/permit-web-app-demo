<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth.svelte';
	import { permits } from '$lib/stores/permits.svelte';
	import NavHeader from '$lib/components/NavHeader.svelte';

	// Auth guard - must be authenticated, admin role for demo
	$effect(() => {
		if (!auth.isAuthenticated) {
			goto('/login');
		}
	});

	// ---- Types ----
	interface Inspection {
		id: string;
		permitId: string;
		permitRef: string;
		title: string;
		type: string;
		location: string;
		ward: string;
		scheduledDate: string;
		status: 'pending' | 'in_progress' | 'completed';
		priority: 'routine' | 'urgent';
		result?: 'pass' | 'fail' | 'follow_up';
		notes?: string;
		stopWorkIssued?: boolean;
		noiIssued?: boolean;
		checklist?: Record<string, boolean>;
	}

	interface ExtensionForm {
		permitId: string;
		reason: string;
		duration: string;
		submitted: boolean;
	}

	// ---- Seed Data ----
	let inspections = $state<Inspection[]>([
		{
			id: 'INS-001',
			permitId: 'P-2026-001',
			permitRef: 'TOPS-CV-2026-001',
			title: 'Concrete Delivery Route — Capitol Hill',
			type: 'Route Compliance',
			location: '300 3rd St SE',
			ward: 'Ward 6',
			scheduledDate: '2026-03-31',
			status: 'pending',
			priority: 'routine',
			checklist: {
				permitDisplayed: false,
				withinBoundaries: false,
				trafficControl: false,
				safetyEquipment: false,
				environmentalCompliance: false
			}
		},
		{
			id: 'INS-002',
			permitId: 'P-2026-004',
			permitRef: 'TOPS-TR-2026-004',
			title: 'Fallen Oak Tree — After Storm',
			type: 'Site Restoration',
			location: '3800 Brandywine St NW',
			ward: 'Ward 3',
			scheduledDate: '2026-04-02',
			status: 'pending',
			priority: 'urgent',
			checklist: {
				permitDisplayed: false,
				withinBoundaries: false,
				trafficControl: false,
				safetyEquipment: false,
				environmentalCompliance: false
			}
		},
		{
			id: 'INS-003',
			permitId: 'P-2026-002',
			permitRef: 'TOPS-PS-2026-002',
			title: 'Wedding Reception — Street Parking',
			type: 'Pre-Event Setup',
			location: '1400 O St NW',
			ward: 'Ward 2',
			scheduledDate: '2026-04-01',
			status: 'completed',
			priority: 'routine',
			result: 'pass',
			checklist: {
				permitDisplayed: true,
				withinBoundaries: true,
				trafficControl: true,
				safetyEquipment: true,
				environmentalCompliance: true
			}
		}
	]);

	// ---- Expiring Permits ----
	const EXPIRING_PERMITS = [
		{
			id: 'P-2026-001',
			ref: 'TOPS-CV-2026-001',
			title: 'Concrete Delivery - Capitol Hill Project',
			expiresAt: '2026-04-15',
			daysLeft: 16
		},
		{
			id: 'P-2026-004',
			ref: 'TOPS-TR-2026-004',
			title: 'Fallen Oak Tree - After Storm',
			expiresAt: '2026-04-02',
			daysLeft: 3
		}
	];

	// ---- State ----
	let activeTab = $state<'assigned' | 'completed'>('assigned');
	let expandedId = $state<string | null>(null);
	let toastMessage = $state('');
	let toastVisible = $state(false);
	let toastType = $state<'success' | 'error' | 'warning'>('success');
	let confirmModalOpen = $state(false);
	let confirmAction = $state<{ inspectionId: string; action: 'stop_work' | 'noi' } | null>(null);
	let extensionForms = $state<Record<string, ExtensionForm>>({});

	// ---- Derived ----
	let assignedInspections = $derived(inspections.filter((i) => i.status !== 'completed'));
	let completedInspections = $derived(inspections.filter((i) => i.status === 'completed'));
	let pendingCount = $derived(inspections.filter((i) => i.status === 'pending' || i.status === 'in_progress').length);

	let displayedInspections = $derived(
		activeTab === 'assigned' ? assignedInspections : completedInspections
	);

	// ---- Today's date ----
	const today = new Date().toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});

	// ---- Checklist labels ----
	const CHECKLIST_LABELS: Record<string, string> = {
		permitDisplayed: 'Permit displayed on site',
		withinBoundaries: 'Work within approved boundaries',
		trafficControl: 'Traffic control plan in place',
		safetyEquipment: 'Safety equipment visible',
		environmentalCompliance: 'Environmental compliance maintained'
	};

	// ---- Helpers ----
	function formatDate(dateStr: string): string {
		return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	}

	function showToast(message: string, type: 'success' | 'error' | 'warning' = 'success') {
		toastMessage = message;
		toastType = type;
		toastVisible = true;
		setTimeout(() => {
			toastVisible = false;
		}, 3000);
	}

	function toggleExpand(id: string) {
		expandedId = expandedId === id ? null : id;
	}

	// ---- Actions ----
	function handlePass(inspectionId: string) {
		const inspection = inspections.find((i) => i.id === inspectionId);
		if (inspection) {
			inspection.status = 'completed';
			inspection.result = 'pass';
			expandedId = null;
			showToast(`Inspection ${inspectionId} marked as PASSED`, 'success');
		}
	}

	function handleFail(inspectionId: string) {
		const inspection = inspections.find((i) => i.id === inspectionId);
		if (inspection) {
			inspection.status = 'completed';
			inspection.result = 'fail';
			expandedId = null;
			showToast(`Inspection ${inspectionId} marked as FAILED`, 'error');
		}
	}

	function handleFollowUp(inspectionId: string) {
		const inspection = inspections.find((i) => i.id === inspectionId);
		if (inspection) {
			inspection.status = 'completed';
			inspection.result = 'follow_up';
			expandedId = null;
			showToast(`Inspection ${inspectionId} marked as NEEDS FOLLOW-UP`, 'warning');
		}
	}

	function requestConfirmation(inspectionId: string, action: 'stop_work' | 'noi') {
		confirmAction = { inspectionId, action };
		confirmModalOpen = true;
	}

	function executeConfirmedAction() {
		if (!confirmAction) return;
		const inspection = inspections.find((i) => i.id === confirmAction!.inspectionId);
		if (!inspection) return;

		if (confirmAction.action === 'stop_work') {
			inspection.stopWorkIssued = true;
			permits.updateStatus(inspection.permitId, 'stop_work');
			showToast(`Stop Work Order issued for ${inspection.permitRef}`, 'error');
		} else {
			inspection.noiIssued = true;
			showToast(`Notice of Infraction issued for ${inspection.permitRef}`, 'warning');
		}

		confirmModalOpen = false;
		confirmAction = null;
	}

	function cancelConfirmation() {
		confirmModalOpen = false;
		confirmAction = null;
	}

	function toggleExtensionForm(permitId: string) {
		if (extensionForms[permitId]) {
			const updated = { ...extensionForms };
			delete updated[permitId];
			extensionForms = updated;
		} else {
			extensionForms = {
				...extensionForms,
				[permitId]: { permitId, reason: '', duration: '30', submitted: false }
			};
		}
	}

	function submitExtension(permitId: string) {
		const form = extensionForms[permitId];
		if (form && form.reason.trim()) {
			extensionForms = {
				...extensionForms,
				[permitId]: { ...form, submitted: true }
			};
			showToast(`Extension request submitted for ${permitId}`, 'success');
		}
	}
</script>

<svelte:head>
	<title>Field Inspections - TOPS</title>
	<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
</svelte:head>

{#if auth.isAuthenticated}
	<NavHeader />

	<div class="min-h-screen bg-surface-alt">
		<main class="max-w-2xl mx-auto px-4 py-6 pb-24" id="main-content">
			<!-- Header -->
			<div class="mb-6">
				<div class="flex items-center gap-3 mb-2">
					<h2 class="text-2xl font-display font-bold text-gov-900">Field Inspections</h2>
					<span
						class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gov-100 text-gov-700"
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
							/>
						</svg>
						Inspector
					</span>
				</div>
				<div class="flex items-center justify-between">
					<p class="text-sm text-gov-400">{today}</p>
					<span
						class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-permit-pending/10 text-amber-700"
					>
						<span class="w-2 h-2 rounded-full bg-permit-pending"></span>
						{pendingCount} pending
					</span>
				</div>
			</div>

			<!-- Tab Bar -->
			<div
				class="flex bg-white rounded-xl shadow-card border border-gov-100 p-1 mb-6"
			>
				<button
					onclick={() => (activeTab = 'assigned')}
					class="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200
						{activeTab === 'assigned'
						? 'bg-gov-900 text-white shadow-md'
						: 'text-gov-400 hover:text-gov-700'}"
					style="min-height: 44px"
				>
					Assigned
					<span
						class="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-bold
							{activeTab === 'assigned' ? 'bg-white/20 text-white' : 'bg-gov-100 text-gov-500'}"
					>
						{assignedInspections.length}
					</span>
				</button>
				<button
					onclick={() => (activeTab = 'completed')}
					class="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200
						{activeTab === 'completed'
						? 'bg-gov-900 text-white shadow-md'
						: 'text-gov-400 hover:text-gov-700'}"
					style="min-height: 44px"
				>
					Completed
					<span
						class="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-bold
							{activeTab === 'completed' ? 'bg-white/20 text-white' : 'bg-gov-100 text-gov-500'}"
					>
						{completedInspections.length}
					</span>
				</button>
			</div>

			<!-- Inspection Cards -->
			<div class="space-y-4">
				{#if displayedInspections.length === 0}
					<div
						class="bg-white rounded-xl shadow-card border border-gov-100 p-12 text-center"
					>
						<div class="w-16 h-16 rounded-full bg-gov-50 flex items-center justify-center mx-auto mb-4">
							<svg class="w-8 h-8 text-gov-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
							</svg>
						</div>
						<h3 class="text-lg font-display font-semibold text-gov-900 mb-1">
							{activeTab === 'assigned' ? 'No assigned inspections' : 'No completed inspections'}
						</h3>
						<p class="text-gov-400 text-sm">
							{activeTab === 'assigned'
								? 'All inspections have been completed.'
								: 'No inspections have been completed yet.'}
						</p>
					</div>
				{:else}
					{#each displayedInspections as inspection, i (inspection.id)}
						{@const isExpanded = expandedId === inspection.id}
						<div
							class="bg-white rounded-xl shadow-card border transition-all duration-200 overflow-hidden
								{inspection.stopWorkIssued
								? 'border-permit-denied/40 ring-1 ring-permit-denied/20'
								: inspection.noiIssued
									? 'border-permit-pending/40 ring-1 ring-permit-pending/20'
									: 'border-gov-100 hover:border-gov-200'}"
						>
							<!-- Card Header (clickable for pending) -->
							<button
								onclick={() => {
									if (inspection.status !== 'completed') toggleExpand(inspection.id);
								}}
								class="w-full text-left p-4 sm:p-5 {inspection.status !== 'completed' ? 'cursor-pointer' : 'cursor-default'}"
								style="min-height: 44px"
							>
								<div class="flex items-start gap-3">
									<!-- Priority + Status badges -->
									<div class="flex flex-col gap-1.5 shrink-0 pt-0.5">
										<span
											class="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
												{inspection.priority === 'urgent'
												? 'bg-red-100 text-permit-denied'
												: 'bg-blue-50 text-gov-500'}"
										>
											{inspection.priority}
										</span>
										{#if inspection.stopWorkIssued}
											<span class="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-permit-denied">
												STOP WORK
											</span>
										{/if}
										{#if inspection.noiIssued}
											<span class="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
												NOI
											</span>
										{/if}
									</div>

									<!-- Content -->
									<div class="flex-1 min-w-0">
										<!-- Permit ref -->
										<p class="text-xs font-mono text-gov-400 mb-0.5">{inspection.permitRef}</p>
										<!-- Title -->
										<h3 class="text-sm font-display font-semibold text-gov-900 leading-snug mb-1.5">
											{inspection.title}
										</h3>
										<!-- Inspection type -->
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-civic-50 text-civic-600 mb-2">
											{inspection.type}
										</span>
										<!-- Location -->
										<div class="flex items-center gap-1.5 text-xs text-gov-400 mb-1">
											<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
											</svg>
											<span>{inspection.location}, {inspection.ward}</span>
										</div>
										<!-- Scheduled date -->
										<div class="flex items-center gap-1.5 text-xs text-gov-400">
											<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
											</svg>
											<span>{formatDate(inspection.scheduledDate)}</span>
										</div>
									</div>

									<!-- Status / Expand indicator -->
									<div class="shrink-0 flex flex-col items-end gap-2">
										{#if inspection.status === 'completed'}
											<span
												class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
													{inspection.result === 'pass'
													? 'bg-green-50 text-permit-approved'
													: inspection.result === 'fail'
														? 'bg-red-50 text-permit-denied'
														: 'bg-amber-50 text-amber-700'}"
											>
												{inspection.result === 'pass' ? 'Passed' : inspection.result === 'fail' ? 'Failed' : 'Follow-up'}
											</span>
										{:else}
											<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-permit-pending/10 text-amber-700">
												Pending
											</span>
											<svg
												class="w-5 h-5 text-gov-300 transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
											</svg>
										{/if}
									</div>
								</div>
							</button>

							<!-- Expanded Content -->
							{#if isExpanded && inspection.status !== 'completed'}
								<div class="border-t border-gov-100 p-4 sm:p-5 space-y-5">
									<!-- Compliance Checklist -->
									<div>
										<h4 class="text-sm font-display font-semibold text-gov-900 mb-3 flex items-center gap-2">
											<svg class="w-4 h-4 text-gov-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
											</svg>
											Compliance Checklist
										</h4>
										<div class="space-y-2">
											{#each Object.entries(CHECKLIST_LABELS) as [key, label]}
												<label
													class="flex items-center gap-3 p-3 rounded-lg bg-surface-alt border border-gov-100 cursor-pointer hover:bg-gov-50 transition-colors"
													style="min-height: 44px"
												>
													<input
														type="checkbox"
														bind:checked={inspection.checklist![key]}
														class="w-5 h-5 rounded border-gov-300 text-civic-500 focus:ring-civic-400 shrink-0"
													/>
													<span class="text-sm text-gov-700">{label}</span>
												</label>
											{/each}
										</div>
									</div>

									<!-- Status Update Buttons -->
									<div>
										<h4 class="text-sm font-display font-semibold text-gov-900 mb-3">
											Status Update
										</h4>
										<div class="flex flex-col gap-2">
											<button
												onclick={() => handlePass(inspection.id)}
												class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-permit-approved text-white font-semibold rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200"
												style="min-height: 48px"
											>
												<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
												</svg>
												Pass
											</button>
											<button
												onclick={() => handleFail(inspection.id)}
												class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-permit-denied text-white font-semibold rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200"
												style="min-height: 48px"
											>
												<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
												</svg>
												Fail
											</button>
											<button
												onclick={() => handleFollowUp(inspection.id)}
												class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-permit-pending text-white font-semibold rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200"
												style="min-height: 48px"
											>
												<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
												</svg>
												Needs Follow-up
											</button>
										</div>
									</div>

									<!-- Enforcement Actions -->
									<div>
										<h4 class="text-sm font-display font-semibold text-gov-900 mb-3">
											Enforcement Actions
										</h4>
										<div class="flex flex-col gap-2">
											<button
												onclick={() => requestConfirmation(inspection.id, 'stop_work')}
												class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-permit-denied text-permit-denied font-semibold rounded-xl hover:bg-red-50 active:scale-[0.98] transition-all duration-200 {inspection.stopWorkIssued ? 'opacity-50 cursor-not-allowed' : ''}"
												style="min-height: 48px"
												disabled={inspection.stopWorkIssued}
											>
												<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
												</svg>
												{inspection.stopWorkIssued ? 'Stop Work Order Issued' : 'Issue Stop Work Order'}
											</button>
											<button
												onclick={() => requestConfirmation(inspection.id, 'noi')}
												class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-permit-pending text-amber-700 font-semibold rounded-xl hover:bg-amber-50 active:scale-[0.98] transition-all duration-200 {inspection.noiIssued ? 'opacity-50 cursor-not-allowed' : ''}"
												style="min-height: 48px"
												disabled={inspection.noiIssued}
											>
												<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
												</svg>
												{inspection.noiIssued ? 'Notice of Infraction Issued' : 'Issue Notice of Infraction'}
											</button>
										</div>
									</div>

									<!-- Notes -->
									<div>
										<h4 class="text-sm font-display font-semibold text-gov-900 mb-3">
											Inspector Notes
										</h4>
										<textarea
											bind:value={inspection.notes}
											placeholder="Add field notes, observations, or conditions..."
											rows="3"
											class="w-full p-3 bg-surface-alt border border-gov-100 rounded-xl text-sm text-gov-900 placeholder:text-gov-300 focus:outline-none focus:ring-2 focus:ring-civic-400 focus:border-transparent transition-all resize-none"
										></textarea>
									</div>
								</div>
							{/if}

							<!-- Bottom accent bar -->
							<div
								class="h-1 w-full {inspection.status === 'completed' && inspection.result === 'pass'
									? 'bg-gradient-to-r from-permit-approved to-emerald-400'
									: inspection.status === 'completed' && inspection.result === 'fail'
										? 'bg-gradient-to-r from-permit-denied to-red-400'
										: inspection.status === 'completed' && inspection.result === 'follow_up'
											? 'bg-gradient-to-r from-permit-pending to-amber-400'
											: inspection.priority === 'urgent'
												? 'bg-gradient-to-r from-permit-denied to-red-400'
												: 'bg-gradient-to-r from-gov-500 to-civic-400'}"
							></div>
						</div>
					{/each}
				{/if}
			</div>

			<!-- Renewal / Extension Section -->
			<div class="mt-8">
				<h3 class="text-lg font-display font-bold text-gov-900 mb-4 flex items-center gap-2">
					<svg class="w-5 h-5 text-permit-pending" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					Expiring Permits
				</h3>

				<div class="space-y-4">
					{#each EXPIRING_PERMITS as permit (permit.id)}
						<div class="bg-white rounded-xl shadow-card border border-gov-100 overflow-hidden">
							<div class="p-4 sm:p-5">
								<div class="flex items-start justify-between gap-3 mb-2">
									<div class="min-w-0">
										<p class="text-xs font-mono text-gov-400 mb-0.5">{permit.ref}</p>
										<h4 class="text-sm font-display font-semibold text-gov-900 leading-snug">
											{permit.title}
										</h4>
									</div>
									<span
										class="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold
											{permit.daysLeft <= 7
											? 'bg-red-100 text-permit-denied'
											: 'bg-amber-100 text-amber-700'}"
									>
										{permit.daysLeft}d left
									</span>
								</div>

								<div class="flex items-center gap-1.5 text-xs text-gov-400 mb-3">
									<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
									</svg>
									<span>Expires {formatDate(permit.expiresAt)}</span>
								</div>

								{#if extensionForms[permit.id]?.submitted}
									<div class="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-100">
										<svg class="w-5 h-5 text-permit-approved shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										<span class="text-sm font-medium text-permit-approved">Extension request submitted</span>
									</div>
								{:else if extensionForms[permit.id]}
									<!-- Extension Form -->
									<div class="space-y-3 p-3 bg-surface-alt rounded-lg border border-gov-100">
										<div>
											<label for="reason-{permit.id}" class="block text-xs font-semibold text-gov-700 mb-1">
												Reason for Extension
											</label>
											<textarea
												id="reason-{permit.id}"
												bind:value={extensionForms[permit.id].reason}
												placeholder="Explain why an extension is needed..."
												rows="2"
												class="w-full p-2.5 bg-white border border-gov-100 rounded-lg text-sm text-gov-900 placeholder:text-gov-300 focus:outline-none focus:ring-2 focus:ring-civic-400 focus:border-transparent transition-all resize-none"
											></textarea>
										</div>
										<div>
											<label for="duration-{permit.id}" class="block text-xs font-semibold text-gov-700 mb-1">
												Requested Duration
											</label>
											<select
												id="duration-{permit.id}"
												bind:value={extensionForms[permit.id].duration}
												class="w-full p-2.5 bg-white border border-gov-100 rounded-lg text-sm text-gov-900 focus:outline-none focus:ring-2 focus:ring-civic-400 focus:border-transparent transition-all"
												style="min-height: 44px"
											>
												<option value="7">7 days</option>
												<option value="14">14 days</option>
												<option value="30">30 days</option>
												<option value="60">60 days</option>
												<option value="90">90 days</option>
											</select>
										</div>
										<div class="flex gap-2">
											<button
												onclick={() => submitExtension(permit.id)}
												class="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gov-600 text-white font-semibold rounded-xl hover:bg-gov-700 active:scale-[0.98] transition-all duration-200"
												style="min-height: 44px"
											>
												Submit Request
											</button>
											<button
												onclick={() => toggleExtensionForm(permit.id)}
												class="px-4 py-3 bg-white border border-gov-200 text-gov-500 font-semibold rounded-xl hover:bg-gov-50 active:scale-[0.98] transition-all duration-200"
												style="min-height: 44px"
											>
												Cancel
											</button>
										</div>
									</div>
								{:else}
									<button
										onclick={() => toggleExtensionForm(permit.id)}
										class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gov-200 text-gov-700 font-semibold rounded-xl hover:bg-gov-50 active:scale-[0.98] transition-all duration-200"
										style="min-height: 44px"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
										</svg>
										Request Extension
									</button>
								{/if}
							</div>

							<div
								class="h-1 w-full {permit.daysLeft <= 7
									? 'bg-gradient-to-r from-permit-denied to-red-400'
									: 'bg-gradient-to-r from-permit-pending to-amber-400'}"
							></div>
						</div>
					{/each}
				</div>
			</div>
		</main>
	</div>

	<!-- Confirmation Modal -->
	{#if confirmModalOpen && confirmAction}
		<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
			<!-- Backdrop -->
			<button
				onclick={cancelConfirmation}
				class="absolute inset-0 bg-surface-overlay backdrop-blur-sm"
				aria-label="Close modal"
			></button>

			<!-- Modal -->
			<div class="relative w-full max-w-md bg-white rounded-2xl shadow-modal overflow-hidden">
				<div class="p-6">
					<div
						class="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center
							{confirmAction.action === 'stop_work' ? 'bg-red-100' : 'bg-amber-100'}"
					>
						{#if confirmAction.action === 'stop_work'}
							<svg class="w-7 h-7 text-permit-denied" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
							</svg>
						{:else}
							<svg class="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
						{/if}
					</div>

					<h3 class="text-lg font-display font-bold text-gov-900 text-center mb-2">
						{confirmAction.action === 'stop_work' ? 'Issue Stop Work Order?' : 'Issue Notice of Infraction?'}
					</h3>
					<p class="text-sm text-gov-400 text-center mb-6">
						{#if confirmAction.action === 'stop_work'}
							This will immediately halt all work under this permit. The permit holder will be notified and the permit status will change to "Stop Work."
						{:else}
							A Notice of Infraction will be recorded against this permit. The permit holder will receive an official notice.
						{/if}
					</p>

					<div class="flex flex-col gap-2">
						<button
							onclick={executeConfirmedAction}
							class="w-full flex items-center justify-center gap-2 px-4 py-3 font-semibold rounded-xl shadow-md active:scale-[0.98] transition-all duration-200
								{confirmAction.action === 'stop_work'
								? 'bg-permit-denied text-white hover:bg-red-700'
								: 'bg-permit-pending text-white hover:bg-amber-600'}"
							style="min-height: 48px"
						>
							{confirmAction.action === 'stop_work' ? 'Confirm Stop Work Order' : 'Confirm Notice of Infraction'}
						</button>
						<button
							onclick={cancelConfirmation}
							class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gov-200 text-gov-500 font-semibold rounded-xl hover:bg-gov-50 active:scale-[0.98] transition-all duration-200"
							style="min-height: 48px"
						>
							Cancel
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Toast -->
	{#if toastVisible}
		<div class="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50">
			<div
				class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-modal border
					{toastType === 'success'
					? 'bg-green-50 border-green-200 text-permit-approved'
					: toastType === 'error'
						? 'bg-red-50 border-red-200 text-permit-denied'
						: 'bg-amber-50 border-amber-200 text-amber-700'}"
			>
				{#if toastType === 'success'}
					<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				{:else if toastType === 'error'}
					<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				{:else}
					<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
				{/if}
				<span class="text-sm font-semibold">{toastMessage}</span>
			</div>
		</div>
	{/if}
{/if}
