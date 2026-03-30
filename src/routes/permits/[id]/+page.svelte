<script lang="ts">
	import { page } from '$app/state';
	import { auth } from '$lib/stores/auth.svelte';
	import { permits, PERMIT_TYPE_META, type PermitStatus } from '$lib/stores/permits.svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';

	// Auth guard
	$effect(() => {
		if (!auth.isAuthenticated) {
			goto('/login');
		}
	});

	const permit = $derived(permits.getById(page.params.id ?? ''));
	const typeMeta = $derived(permit ? PERMIT_TYPE_META[permit.type] : null);

	// ─── Status Config ──────────────────────────────────────────────
	const STATUS_CONFIG: Record<PermitStatus, { label: string; color: string; bg: string; textColor: string; borderColor: string; icon: string }> = {
		draft: { label: 'Draft', color: 'permit-draft', bg: 'bg-gray-100', textColor: 'text-permit-draft', borderColor: 'border-gray-300', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
		submitted: { label: 'Submitted', color: 'gov-500', bg: 'bg-gov-50', textColor: 'text-gov-600', borderColor: 'border-gov-200', icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8' },
		under_review: { label: 'Under Review', color: 'permit-review', bg: 'bg-purple-50', textColor: 'text-permit-review', borderColor: 'border-purple-200', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
		approved: { label: 'Approved', color: 'permit-approved', bg: 'bg-green-50', textColor: 'text-permit-approved', borderColor: 'border-green-200', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
		denied: { label: 'Denied', color: 'permit-denied', bg: 'bg-red-50', textColor: 'text-permit-denied', borderColor: 'border-red-200', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
		expired: { label: 'Expired', color: 'gray-400', bg: 'bg-gray-50', textColor: 'text-gray-400', borderColor: 'border-gray-200', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
		returned: { label: 'Returned', color: 'amber-600', bg: 'bg-amber-50', textColor: 'text-amber-600', borderColor: 'border-amber-200', icon: 'M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3' },
		paid: { label: 'Paid', color: 'green-600', bg: 'bg-green-50', textColor: 'text-green-600', borderColor: 'border-green-200', icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
		issued: { label: 'Issued', color: 'permit-approved', bg: 'bg-green-100', textColor: 'text-permit-approved', borderColor: 'border-green-300', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
		inspection_scheduled: { label: 'Inspection Scheduled', color: 'blue-600', bg: 'bg-blue-50', textColor: 'text-blue-600', borderColor: 'border-blue-200', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
		inspection_passed: { label: 'Inspection Passed', color: 'permit-approved', bg: 'bg-green-50', textColor: 'text-permit-approved', borderColor: 'border-green-200', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
		inspection_failed: { label: 'Inspection Failed', color: 'permit-denied', bg: 'bg-red-50', textColor: 'text-permit-denied', borderColor: 'border-red-200', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
		stop_work: { label: 'Stop Work Order', color: 'permit-denied', bg: 'bg-red-100', textColor: 'text-permit-denied', borderColor: 'border-red-200', icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' }
	};

	// ─── Type Icons (SVG paths) ─────────────────────────────────────
	const TYPE_ICONS: Record<string, string> = {
		truck: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/></svg>`,
		calendar: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`,
		alert: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
		tree: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19h14M12 3l-7 8h4l-3 5h12l-3-5h4L12 3z"/></svg>`
	};

	// Stop type colors for route badges
	const STOP_COLORS: Record<string, string> = {
		start: '#16a34a',
		pickup: '#2563eb',
		delivery: '#7c3aed',
		stop: '#f59e0b',
		end: '#dc2626'
	};

	// ─── Helpers ─────────────────────────────────────────────────────
	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
		});
	}

	function formatShortDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short', day: 'numeric'
		});
	}

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

	function slaCountdown(deadline: string): { text: string; urgent: boolean; expired: boolean } {
		const now = new Date();
		const sla = new Date(deadline);
		const diffMs = sla.getTime() - now.getTime();

		if (diffMs <= 0) return { text: 'SLA Overdue', urgent: true, expired: true };

		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffHours / 24);
		const remainingHours = diffHours % 24;

		if (diffDays > 0) {
			return { text: `${diffDays}d ${remainingHours}h remaining`, urgent: diffDays < 2, expired: false };
		}
		return { text: `${diffHours}h remaining`, urgent: diffHours < 12, expired: false };
	}

	// ─── Status Timeline ────────────────────────────────────────────
	const TIMELINE_STAGES = ['submitted', 'under_review', 'approved'] as const;
	const TIMELINE_LABELS: Record<string, string> = {
		submitted: 'Submitted',
		under_review: 'Under Review',
		approved: 'Decision'
	};

	function getStageState(stage: string, status: string): 'completed' | 'current' | 'upcoming' {
		const order = ['draft', 'submitted', 'under_review', 'approved', 'denied'];
		const currentIdx = order.indexOf(status);
		const stageIdx = order.indexOf(stage);

		if (status === 'denied' && stage === 'approved') return 'current'; // show decision stage
		if (status === 'expired') return 'completed'; // all completed for expired
		if (stageIdx < currentIdx) return 'completed';
		if (stageIdx === currentIdx) return 'current';
		return 'upcoming';
	}

	function getStageDate(stage: string): string | null {
		if (!permit) return null;
		if (stage === 'submitted' && permit.submittedAt) return formatShortDate(permit.submittedAt);
		if (stage === 'under_review' && (permit.status === 'under_review' || permit.status === 'approved' || permit.status === 'denied')) {
			return formatShortDate(permit.updatedAt);
		}
		if ((stage === 'approved') && (permit.status === 'approved' || permit.status === 'denied')) {
			return formatShortDate(permit.updatedAt);
		}
		return null;
	}

	// ─── Activity Feed ──────────────────────────────────────────────
	interface ActivityItem {
		icon: string;
		iconBg: string;
		title: string;
		time: string;
	}

	const activityFeed = $derived.by((): ActivityItem[] => {
		if (!permit) return [];
		const items: ActivityItem[] = [];

		items.push({
			icon: 'M12 4v16m8-8H4',
			iconBg: 'bg-gov-100 text-gov-600',
			title: 'Application created',
			time: timeAgo(permit.submittedAt)
		});

		if (permit.status !== 'draft') {
			items.push({
				icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8',
				iconBg: 'bg-gov-100 text-gov-600',
				title: 'Application submitted for review',
				time: timeAgo(permit.submittedAt)
			});
		}

		if (permit.assignedReviewer) {
			items.push({
				icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
				iconBg: 'bg-purple-100 text-permit-review',
				title: `Assigned to reviewer ${permit.assignedReviewer}`,
				time: timeAgo(permit.updatedAt)
			});
		}

		if (permit.status === 'under_review' || permit.status === 'approved' || permit.status === 'denied') {
			items.push({
				icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
				iconBg: 'bg-purple-100 text-permit-review',
				title: 'Review started',
				time: timeAgo(permit.updatedAt)
			});
		}

		if (permit.status === 'approved') {
			items.push({
				icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
				iconBg: 'bg-green-100 text-permit-approved',
				title: 'Application approved',
				time: timeAgo(permit.updatedAt)
			});
		}

		if (permit.status === 'denied') {
			items.push({
				icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
				iconBg: 'bg-red-100 text-permit-denied',
				title: 'Application denied',
				time: timeAgo(permit.updatedAt)
			});
		}

		return items.reverse();
	});

	// ─── Leaflet Map ────────────────────────────────────────────────
	let mapContainer: HTMLDivElement | undefined = $state();
	let map: any = $state(null);
	let L: any = $state(null);
	let mapMarkers: any[] = $state([]);

	async function initMap() {
		if (!browser || !mapContainer || !permit?.addresses?.length) return;
		const leaflet = await import('leaflet');
		L = leaflet.default || leaflet;

		map = L.map(mapContainer, {
			zoomControl: true,
			scrollWheelZoom: true
		}).setView([38.9072, -77.0369], 13);

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
			maxZoom: 19
		}).addTo(map);

		addMarkers();
	}

	function addMarkers() {
		if (!map || !L || !permit?.addresses) return;

		mapMarkers.forEach((m: any) => m.remove());
		mapMarkers = [];

		const validAddresses = permit.addresses.filter(a => a.lat && a.lng);

		validAddresses.forEach((addr, i) => {
			const color = STOP_COLORS[addr.stopType] || '#6b7280';
			const icon = L.divIcon({
				className: 'custom-marker',
				html: `<div style="
					width: 32px; height: 32px; border-radius: 50%;
					background: ${color}; border: 3px solid white;
					box-shadow: 0 2px 8px rgba(0,0,0,0.3);
					display: flex; align-items: center; justify-content: center;
					color: white; font-weight: 700; font-size: 13px;
					font-family: system-ui, sans-serif;
				">${i + 1}</div>`,
				iconSize: [32, 32],
				iconAnchor: [16, 16]
			});

			const marker = L.marker([addr.lat, addr.lng], { icon })
				.addTo(map)
				.bindPopup(`<b>${addr.stopType.charAt(0).toUpperCase() + addr.stopType.slice(1)}</b><br/>${addr.address}`);
			mapMarkers.push(marker);
		});

		// Draw polyline if multiple stops
		if (validAddresses.length >= 2) {
			const latlngs = validAddresses.map(a => [a.lat, a.lng]);
			L.polyline(latlngs, {
				color: '#233d78',
				weight: 4,
				opacity: 0.8,
				dashArray: '8, 8',
				lineCap: 'round'
			}).addTo(map);

			const bounds = L.latLngBounds(latlngs);
			map.fitBounds(bounds, { padding: [40, 40] });
		} else if (validAddresses.length === 1) {
			map.setView([validAddresses[0].lat, validAddresses[0].lng], 15);
		}
	}

	onMount(() => {
		if (permit?.addresses?.length) {
			// Small delay so the container is rendered
			setTimeout(initMap, 100);
		}
	});

	onDestroy(() => {
		if (map) {
			map.remove();
			map = null;
		}
	});

	// ─── Actions ────────────────────────────────────────────────────
	function handleSubmit() {
		if (!permit) return;
		permits.updateStatus(permit.id, 'submitted');
	}

	const severity = $derived(
		permit?.damageType === 'Gas Leak' || permit?.damageType === 'Water Main' ? 'high' : 'medium'
	);

	function handleCancel() {
		if (!permit) return;
		permits.updateStatus(permit.id, 'draft');
		goto('/dashboard');
	}
</script>

<svelte:head>
	<title>{permit ? `${permit.title} - TOPS` : 'Permit Not Found - TOPS'}</title>
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

{#if auth.isAuthenticated}
	{#if !permit}
		<!-- ─── Permit Not Found ────────────────────────────────────── -->
		<div class="min-h-screen bg-surface-alt flex items-center justify-center animate-fade-in">
			<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-12 text-center max-w-md mx-4">
				<div class="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
					<svg class="w-10 h-10 text-permit-denied" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
				</div>
				<h2 class="text-2xl font-display font-bold text-gov-900 mb-2">Permit Not Found</h2>
				<p class="text-gov-400 mb-8">
					The permit you're looking for doesn't exist or may have been removed.
				</p>
				<a
					href="/dashboard"
					class="inline-flex items-center gap-2 px-6 py-3 bg-gov-600 text-white font-semibold rounded-xl hover:bg-gov-700 transition-colors"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
					</svg>
					Back to Dashboard
				</a>
			</div>
		</div>
	{:else}
		{@const statusCfg = STATUS_CONFIG[permit.status]}
		{@const sla = permit.slaDeadline ? slaCountdown(permit.slaDeadline) : null}

		<div class="min-h-screen bg-surface-alt animate-fade-in">
			<!-- ─── Header ──────────────────────────────────────────── -->
			<header class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gov-100 shadow-sm">
				<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<div class="flex items-center gap-4 h-16">
						<a
							href="/dashboard"
							class="flex items-center gap-2 text-gov-400 hover:text-gov-700 transition-colors group"
						>
							<div class="w-9 h-9 rounded-lg flex items-center justify-center group-hover:bg-gov-50 transition-colors">
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
								</svg>
							</div>
							<span class="text-sm font-medium hidden sm:inline">Dashboard</span>
						</a>

						<div class="h-6 w-px bg-gov-200"></div>

						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-3">
								<h1 class="text-lg font-display font-bold text-gov-900 truncate">
									{permit.title}
								</h1>
							</div>
						</div>

						<div class="flex items-center gap-2 shrink-0">
							<span class="hidden sm:inline-flex px-3 py-1 rounded-lg bg-gov-50 text-gov-500 text-xs font-mono font-semibold">
								{permit.referenceNumber}
							</span>
							<!-- Type Badge -->
							{#if typeMeta}
								<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
									{typeMeta.color === 'gov' ? 'bg-gov-100 text-gov-700' :
									 typeMeta.color === 'civic' ? 'bg-civic-100 text-civic-600' :
									 typeMeta.color === 'permit-pending' ? 'bg-amber-100 text-amber-700' :
									 'bg-green-100 text-green-700'}">
									{@html TYPE_ICONS[typeMeta.icon]}
									<span class="hidden sm:inline">{typeMeta.label}</span>
								</span>
							{/if}
							<!-- Status Badge -->
							<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold {statusCfg.bg} {statusCfg.textColor}">
								<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={statusCfg.icon} />
								</svg>
								{statusCfg.label}
							</span>
						</div>
					</div>
				</div>
			</header>

			<main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<!-- ─── Mobile Reference Number ─────────────────────── -->
				<div class="sm:hidden mb-4">
					<span class="inline-flex px-3 py-1 rounded-lg bg-gov-50 text-gov-500 text-xs font-mono font-semibold">
						{permit.referenceNumber}
					</span>
				</div>

				<!-- ─── Status Timeline ──────────────────────────────── -->
				<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6 sm:p-8 mb-8 animate-slide-up">
					<h3 class="text-sm font-semibold text-gov-400 uppercase tracking-wider mb-6">Application Progress</h3>

					{#if permit.status === 'draft'}
						<div class="flex items-center gap-3 text-gov-400">
							<div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
								<svg class="w-5 h-5 text-permit-draft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={STATUS_CONFIG.draft.icon} />
								</svg>
							</div>
							<div>
								<p class="text-base font-semibold text-gov-900">Draft</p>
								<p class="text-sm text-gov-400">This application has not been submitted yet.</p>
							</div>
						</div>
					{:else}
						{@const progressPercent = permit.status === 'submitted' ? 0 : permit.status === 'under_review' ? 50 : 100}
						<div class="relative">
							<!-- Progress line background -->
							<div class="hidden sm:block absolute top-5 left-0 right-0 h-1 bg-gov-100 rounded-full"></div>
							<!-- Progress line filled -->
							<div class="hidden sm:block absolute top-5 left-0 h-1 rounded-full transition-all duration-700 ease-out
								{permit.status === 'approved' ? 'bg-gradient-to-r from-gov-500 to-permit-approved' :
								 permit.status === 'denied' ? 'bg-gradient-to-r from-gov-500 to-permit-denied' :
								 'bg-gradient-to-r from-gov-500 to-civic-400'}"
								style="width: {progressPercent}%"
							></div>

							<!-- Timeline stages -->
							<div class="flex flex-col sm:flex-row sm:justify-between gap-6 sm:gap-0 relative">
								{#each TIMELINE_STAGES as stage, i}
									{@const stageState = getStageState(stage, permit.status)}
									{@const stageDate = getStageDate(stage)}
									{@const isDecisionDenied = stage === 'approved' && permit.status === 'denied'}

									<div class="flex sm:flex-col items-center sm:items-center gap-3 sm:gap-2 relative z-10
										{i === 0 ? 'sm:items-start' : i === TIMELINE_STAGES.length - 1 ? 'sm:items-end' : 'sm:items-center'}">

										<!-- Circle -->
										<div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300
											{stageState === 'completed' ? 'bg-gov-600 text-white shadow-md' :
											 stageState === 'current' && isDecisionDenied ? 'bg-permit-denied text-white shadow-md ring-4 ring-red-100' :
											 stageState === 'current' ? 'bg-white border-3 shadow-md ring-4' + (permit.status === 'approved' ? ' border-permit-approved ring-green-100' : ' border-civic-400 ring-civic-100') :
											 'bg-white border-2 border-gov-200 text-gov-300'}">

											{#if stageState === 'completed'}
												<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
												</svg>
											{:else if stageState === 'current' && isDecisionDenied}
												<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
												</svg>
											{:else if stageState === 'current'}
												<div class="w-3 h-3 rounded-full {permit.status === 'approved' ? 'bg-permit-approved' : 'bg-civic-400'} animate-pulse"></div>
											{:else}
												<span class="text-sm font-bold">{i + 1}</span>
											{/if}
										</div>

										<!-- Label and date -->
										<div class="sm:text-center {i === 0 ? 'sm:text-left' : i === TIMELINE_STAGES.length - 1 ? 'sm:text-right' : ''}">
											<p class="text-sm font-semibold
												{stageState === 'completed' ? 'text-gov-700' :
												 stageState === 'current' ? (isDecisionDenied ? 'text-permit-denied' : 'text-gov-900') :
												 'text-gov-300'}">
												{isDecisionDenied ? 'Denied' : TIMELINE_LABELS[stage]}
											</p>
											{#if stageDate}
												<p class="text-xs text-gov-400 mt-0.5">{stageDate}</p>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<!-- ─── Details Grid ─────────────────────────────────── -->
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
					<!-- Left Column: General Info -->
					<div class="space-y-6">
						<!-- Description Card -->
						<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6 animate-slide-up" style="animation-delay: 100ms">
							<h3 class="text-sm font-semibold text-gov-400 uppercase tracking-wider mb-4">Description</h3>
							<p class="text-gov-700 leading-relaxed">{permit.description}</p>
						</div>

						<!-- Applicant & Location Card -->
						<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6 animate-slide-up" style="animation-delay: 150ms">
							<h3 class="text-sm font-semibold text-gov-400 uppercase tracking-wider mb-4">Application Details</h3>
							<div class="space-y-4">
								<!-- Applicant -->
								<div class="flex items-start gap-3">
									<div class="w-9 h-9 rounded-lg bg-gov-50 flex items-center justify-center shrink-0">
										<svg class="w-4.5 h-4.5 text-gov-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
										</svg>
									</div>
									<div>
										<p class="text-xs font-medium text-gov-400">Applicant</p>
										<p class="text-sm font-semibold text-gov-900">{permit.applicant}</p>
									</div>
								</div>

								<!-- Ward & Quadrant -->
								{#if permit.ward}
									<div class="flex items-start gap-3">
										<div class="w-9 h-9 rounded-lg bg-gov-50 flex items-center justify-center shrink-0">
											<svg class="w-4.5 h-4.5 text-gov-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
											</svg>
										</div>
										<div>
											<p class="text-xs font-medium text-gov-400">Location</p>
											<p class="text-sm font-semibold text-gov-900">{permit.ward}{permit.quadrant ? `, ${permit.quadrant}` : ''}</p>
										</div>
									</div>
								{/if}

								<!-- Submitted Date -->
								<div class="flex items-start gap-3">
									<div class="w-9 h-9 rounded-lg bg-gov-50 flex items-center justify-center shrink-0">
										<svg class="w-4.5 h-4.5 text-gov-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
									</div>
									<div>
										<p class="text-xs font-medium text-gov-400">Submitted</p>
										<p class="text-sm font-semibold text-gov-900">{formatDate(permit.submittedAt)}</p>
									</div>
								</div>

								<!-- Last Updated -->
								<div class="flex items-start gap-3">
									<div class="w-9 h-9 rounded-lg bg-gov-50 flex items-center justify-center shrink-0">
										<svg class="w-4.5 h-4.5 text-gov-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
									</div>
									<div>
										<p class="text-xs font-medium text-gov-400">Last Updated</p>
										<p class="text-sm font-semibold text-gov-900">{formatDate(permit.updatedAt)}</p>
									</div>
								</div>

								<!-- SLA Deadline -->
								{#if sla && permit.status !== 'approved' && permit.status !== 'denied' && permit.status !== 'draft'}
									<div class="flex items-start gap-3">
										<div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0
											{sla.expired ? 'bg-red-50' : sla.urgent ? 'bg-amber-50' : 'bg-gov-50'}">
											<svg class="w-4.5 h-4.5 {sla.expired ? 'text-permit-denied' : sla.urgent ? 'text-amber-500' : 'text-gov-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
										</div>
										<div>
											<p class="text-xs font-medium text-gov-400">SLA Deadline</p>
											<p class="text-sm font-semibold {sla.expired ? 'text-permit-denied' : sla.urgent ? 'text-amber-600' : 'text-gov-900'}">
												{sla.text}
											</p>
											<p class="text-xs text-gov-400 mt-0.5">{formatDate(permit.slaDeadline!)}</p>
										</div>
									</div>
								{/if}

								<!-- Assigned Reviewer -->
								{#if permit.assignedReviewer}
									<div class="flex items-start gap-3">
										<div class="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
											<svg class="w-4.5 h-4.5 text-permit-review" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
											</svg>
										</div>
										<div>
											<p class="text-xs font-medium text-gov-400">Assigned Reviewer</p>
											<p class="text-sm font-semibold text-gov-900">{permit.assignedReviewer}</p>
										</div>
									</div>
								{/if}
							</div>
						</div>
					</div>

					<!-- Right Column: Type-Specific Info -->
					<div class="space-y-6">
						<!-- Truck Route: Vehicle Info -->
						{#if permit.type === 'commercial_vehicle' && permit.truckInfo}
							<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6 animate-slide-up" style="animation-delay: 200ms">
								<h3 class="text-sm font-semibold text-gov-400 uppercase tracking-wider mb-4">Vehicle Information</h3>
								<div class="space-y-4">
									<div class="flex items-center gap-3 mb-4">
										<div class="w-12 h-12 rounded-xl bg-gov-50 flex items-center justify-center">
											{@html TYPE_ICONS.truck}
										</div>
										<div>
											<p class="text-lg font-display font-bold text-gov-900">{permit.truckInfo.type}</p>
											<p class="text-sm font-mono text-gov-400">{permit.truckInfo.plateNumber}</p>
										</div>
									</div>

									<div class="grid grid-cols-2 gap-3">
										<div class="bg-surface-alt rounded-xl p-3 border border-gov-50">
											<p class="text-xs text-gov-400 mb-1">Weight</p>
											<p class="text-base font-bold text-gov-900">{permit.truckInfo.weight.toLocaleString()} <span class="text-xs font-normal text-gov-400">lbs</span></p>
										</div>
										<div class="bg-surface-alt rounded-xl p-3 border border-gov-50">
											<p class="text-xs text-gov-400 mb-1">Axles</p>
											<p class="text-base font-bold text-gov-900">{permit.truckInfo.axles}</p>
										</div>
										<div class="bg-surface-alt rounded-xl p-3 border border-gov-50">
											<p class="text-xs text-gov-400 mb-1">Height</p>
											<p class="text-base font-bold text-gov-900">{permit.truckInfo.height} <span class="text-xs font-normal text-gov-400">ft</span></p>
										</div>
										<div class="bg-surface-alt rounded-xl p-3 border border-gov-50">
											<p class="text-xs text-gov-400 mb-1">Width</p>
											<p class="text-base font-bold text-gov-900">{permit.truckInfo.width} <span class="text-xs font-normal text-gov-400">ft</span></p>
										</div>
										<div class="bg-surface-alt rounded-xl p-3 border border-gov-50 col-span-2">
											<p class="text-xs text-gov-400 mb-1">Length</p>
											<p class="text-base font-bold text-gov-900">{permit.truckInfo.length} <span class="text-xs font-normal text-gov-400">ft</span></p>
										</div>
									</div>
								</div>
							</div>

							<!-- Route Stops -->
							{#if permit.addresses?.length}
								<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6 animate-slide-up" style="animation-delay: 250ms">
									<h3 class="text-sm font-semibold text-gov-400 uppercase tracking-wider mb-4">Route Stops</h3>
									<div class="space-y-3">
										{#each permit.addresses as addr, i}
											<div class="flex items-start gap-3">
												<div class="flex flex-col items-center">
													<div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
														style="background: {STOP_COLORS[addr.stopType] || '#6b7280'}">
														{i + 1}
													</div>
													{#if i < permit.addresses!.length - 1}
														<div class="w-0.5 h-8 bg-gov-200 mt-1"></div>
													{/if}
												</div>
												<div class="pt-1 pb-2">
													<p class="text-xs font-semibold uppercase tracking-wide" style="color: {STOP_COLORS[addr.stopType] || '#6b7280'}">
														{addr.stopType}
													</p>
													<p class="text-sm text-gov-900">{addr.address}</p>
													{#if addr.notes}
														<p class="text-xs text-gov-400 mt-0.5">{addr.notes}</p>
													{/if}
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						{/if}

						<!-- Public Space: Event Info -->
						{#if permit.type === 'public_space_rental'}
							<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6 animate-slide-up" style="animation-delay: 200ms">
								<h3 class="text-sm font-semibold text-gov-400 uppercase tracking-wider mb-4">Event Details</h3>
								<div class="flex items-center gap-3 mb-4">
									<div class="w-12 h-12 rounded-xl bg-civic-50 flex items-center justify-center">
										{@html TYPE_ICONS.calendar}
									</div>
									<div>
										<p class="text-lg font-display font-bold text-gov-900">{permit.eventType || 'Event'}</p>
										<p class="text-sm text-gov-400">Public space reservation</p>
									</div>
								</div>
								{#if permit.addresses?.length}
									<div class="bg-surface-alt rounded-xl p-4 border border-gov-50">
										<p class="text-xs text-gov-400 mb-1">Location</p>
										<p class="text-sm font-semibold text-gov-900">{permit.addresses[0].address}</p>
									</div>
								{/if}
							</div>
						{/if}

						<!-- Infrastructure: Damage Info -->
						{#if permit.type === 'construction_excavation'}
							<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6 animate-slide-up" style="animation-delay: 200ms">
								<h3 class="text-sm font-semibold text-gov-400 uppercase tracking-wider mb-4">Infrastructure Report</h3>
								<div class="flex items-center gap-3 mb-4">
									<div class="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
										{@html TYPE_ICONS.alert}
									</div>
									<div>
										<p class="text-lg font-display font-bold text-gov-900">{permit.damageType || 'Damage'}</p>
										<p class="text-sm text-gov-400">Infrastructure issue reported</p>
									</div>
								</div>
								<!-- Severity indicator -->
								<div class="bg-surface-alt rounded-xl p-4 border border-gov-50">
									<p class="text-xs text-gov-400 mb-2">Severity Assessment</p>
									<div class="flex items-center gap-2">
										<div class="flex gap-1">
											<div class="w-3 h-3 rounded-full {severity === 'high' ? 'bg-permit-denied' : 'bg-amber-400'}"></div>
											<div class="w-3 h-3 rounded-full {severity === 'high' ? 'bg-permit-denied' : 'bg-amber-400'}"></div>
											<div class="w-3 h-3 rounded-full {severity === 'high' ? 'bg-permit-denied' : 'bg-gray-200'}"></div>
										</div>
										<span class="text-sm font-semibold {severity === 'high' ? 'text-permit-denied' : 'text-amber-600'}">
											{severity === 'high' ? 'High Priority' : 'Medium Priority'}
										</span>
									</div>
								</div>
								{#if permit.addresses?.length}
									<div class="bg-surface-alt rounded-xl p-4 border border-gov-50 mt-3">
										<p class="text-xs text-gov-400 mb-1">Reported Location</p>
										<p class="text-sm font-semibold text-gov-900">{permit.addresses[0].address}</p>
									</div>
								{/if}
							</div>
						{/if}

						<!-- Tree Removal: Species Info -->
						{#if permit.type === 'special_heritage_tree'}
							<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6 animate-slide-up" style="animation-delay: 200ms">
								<h3 class="text-sm font-semibold text-gov-400 uppercase tracking-wider mb-4">Tree Details</h3>
								<div class="flex items-center gap-3 mb-4">
									<div class="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
										{@html TYPE_ICONS.tree}
									</div>
									<div>
										<p class="text-lg font-display font-bold text-gov-900">{permit.treeSpecies || 'Unknown Species'}</p>
										<p class="text-sm text-gov-400">Tree removal request</p>
									</div>
								</div>
								<div class="bg-surface-alt rounded-xl p-4 border border-gov-50">
									<p class="text-xs text-gov-400 mb-1">Situation</p>
									<p class="text-sm text-gov-700">{permit.description}</p>
								</div>
								{#if permit.addresses?.length}
									<div class="bg-surface-alt rounded-xl p-4 border border-gov-50 mt-3">
										<p class="text-xs text-gov-400 mb-1">Location</p>
										<p class="text-sm font-semibold text-gov-900">{permit.addresses[0].address}</p>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				</div>

				<!-- ─── Map Section ──────────────────────────────────── -->
				{#if permit.addresses?.length}
					<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6 mb-8 animate-slide-up" style="animation-delay: 300ms">
						<h3 class="text-sm font-semibold text-gov-400 uppercase tracking-wider mb-4">Location Map</h3>
						<div
							bind:this={mapContainer}
							class="w-full h-80 sm:h-96 rounded-xl overflow-hidden border border-gov-100"
						></div>
					</div>
				{/if}

				<!-- ─── Actions Section ──────────────────────────────── -->
				<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6 mb-8 animate-slide-up" style="animation-delay: 350ms">
					{#if permit.status === 'draft'}
						<div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
							<div class="flex-1">
								<h3 class="text-base font-display font-semibold text-gov-900">Draft Application</h3>
								<p class="text-sm text-gov-400 mt-1">This application is still a draft. Continue editing or submit for review.</p>
							</div>
							<div class="flex gap-3">
								<button
									onclick={() => goto(`/permits/new/${permit!.type.replace('_', '-')}`)}
									class="px-5 py-2.5 rounded-xl border border-gov-200 text-gov-700 font-semibold text-sm hover:bg-gov-50 transition-colors"
								>
									Continue Editing
								</button>
								<button
									onclick={handleSubmit}
									class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-gov-600 to-gov-500 text-white font-semibold text-sm shadow-md hover:shadow-lg hover:from-gov-700 hover:to-gov-600 transition-all"
								>
									Submit Application
								</button>
							</div>
						</div>

					{:else if permit.status === 'submitted' || permit.status === 'under_review'}
						<div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
							<div class="flex-1">
								<h3 class="text-base font-display font-semibold text-gov-900">Application In Progress</h3>
								<p class="text-sm text-gov-400 mt-1">Your application is being processed. You can cancel it if needed.</p>
							</div>
							<button
								onclick={handleCancel}
								class="px-5 py-2.5 rounded-xl border border-red-200 text-permit-denied font-semibold text-sm hover:bg-red-50 transition-colors"
							>
								Cancel Application
							</button>
						</div>

					{:else if permit.status === 'approved'}
						<!-- Approved Permit Card -->
						<div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
							<div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
								<div class="w-14 h-14 rounded-xl bg-white shadow-md flex items-center justify-center shrink-0">
									<svg class="w-8 h-8 text-permit-approved" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								</div>
								<div class="flex-1">
									<h3 class="text-lg font-display font-bold text-green-900">Permit Approved</h3>
									<p class="text-sm text-green-700 mt-1">
										Your permit has been approved and is active.
										{#if permit.expiresAt}
											Expires on {formatDate(permit.expiresAt)}.
										{/if}
									</p>
									<div class="mt-3 flex items-center gap-2">
										<span class="px-3 py-1 rounded-lg bg-white text-green-700 text-xs font-mono font-semibold shadow-sm">
											{permit.referenceNumber}
										</span>
									</div>
								</div>
								<button
									onclick={() => window.print()}
									class="px-5 py-2.5 rounded-xl bg-white border border-green-200 text-green-700 font-semibold text-sm hover:bg-green-50 transition-colors shadow-sm flex items-center gap-2"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
									</svg>
									Print Permit
								</button>
							</div>
						</div>

					{:else if permit.status === 'denied'}
						<div class="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border border-red-200 p-6">
							<div class="flex items-start gap-4">
								<div class="w-14 h-14 rounded-xl bg-white shadow-md flex items-center justify-center shrink-0">
									<svg class="w-8 h-8 text-permit-denied" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								</div>
								<div class="flex-1">
									<h3 class="text-lg font-display font-bold text-red-900">Application Denied</h3>
									<p class="text-sm text-red-700 mt-1">
										Unfortunately, your application has been denied.
										{#if permit.reviewerNotes}
											Reviewer notes: {permit.reviewerNotes}
										{:else}
											Please contact the reviewer for more information.
										{/if}
									</p>
								</div>
							</div>
						</div>
					{/if}
				</div>

				<!-- ─── Activity Feed ────────────────────────────────── -->
				<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6 animate-slide-up" style="animation-delay: 400ms">
					<h3 class="text-sm font-semibold text-gov-400 uppercase tracking-wider mb-6">Activity</h3>
					<div class="space-y-0">
						{#each activityFeed as activity, i}
							<div class="flex gap-4 {i < activityFeed.length - 1 ? 'pb-6' : ''}">
								<!-- Icon with connector line -->
								<div class="flex flex-col items-center">
									<div class="w-9 h-9 rounded-full {activity.iconBg} flex items-center justify-center shrink-0">
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={activity.icon} />
										</svg>
									</div>
									{#if i < activityFeed.length - 1}
										<div class="w-0.5 flex-1 bg-gov-100 mt-2"></div>
									{/if}
								</div>

								<!-- Content -->
								<div class="pt-1.5 pb-1">
									<p class="text-sm font-medium text-gov-900">{activity.title}</p>
									<p class="text-xs text-gov-400 mt-0.5">{activity.time}</p>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</main>
		</div>
	{/if}
{/if}

<style>
	:global(.leaflet-container) {
		border-radius: 0.75rem;
		z-index: 1;
	}

	:global(.custom-marker) {
		background: none !important;
		border: none !important;
	}
</style>
