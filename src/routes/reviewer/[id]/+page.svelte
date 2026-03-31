<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import NavHeader from '$lib/components/NavHeader.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { permits, PERMIT_TYPE_META, type PermitType } from '$lib/stores/permits.svelte';
	import { reviewerStore } from '$lib/stores/reviewer.svelte';
	import { gisStore, type ConflictAlert, type AssetCondition } from '$lib/stores/gis.svelte';

	// ─── Auth Guard ─────────────────────────────────────────────────
	$effect(() => {
		if (!auth.isAuthenticated) {
			goto('/login');
		} else if (auth.role !== 'reviewer' && auth.role !== 'admin') {
			goto('/dashboard');
		}
	});

	// ─── Data ───────────────────────────────────────────────────────
	const permit = $derived(permits.getById(page.params.id ?? ''));
	const typeMeta = $derived(permit ? PERMIT_TYPE_META[permit.type] : null);
	const aiSummary = $derived(permit ? reviewerStore.getAISummary(permit.id) : '');
	const comments = $derived(permit ? reviewerStore.getComments(permit.id) : []);

	// GIS data derived from permit location
	const permitLat = $derived(permit?.addresses?.[0]?.lat ?? 38.9072);
	const permitLng = $derived(permit?.addresses?.[0]?.lng ?? -77.0369);
	const nearbyPermits = $derived(gisStore.getNearbyPermits(permitLat, permitLng));
	const nearbyProjects = $derived(gisStore.getNearbyProjects(permitLat, permitLng));
	const nearbyAssets = $derived(gisStore.getNearbyAssets(permitLat, permitLng));
	const conflicts = $derived(
		permit
			? gisStore.detectConflicts(
					permitLat,
					permitLng,
					permit.submittedAt.split('T')[0],
					permit.expiresAt?.split('T')[0] ?? '2026-12-31'
				)
			: []
	);

	// ─── Reviewer Actions ───────────────────────────────────────────
	let reviewNotes = $state('');
	let actionInProgress = $state(false);

	const reviewerName = $derived(auth.user?.name ?? 'Unknown Reviewer');

	async function handleApprove() {
		if (!permit || actionInProgress) return;
		actionInProgress = true;
		reviewerStore.approve(permit.id, reviewNotes, reviewerName);
		goto('/reviewer');
	}

	async function handleReturn() {
		if (!permit || actionInProgress || !reviewNotes.trim()) return;
		actionInProgress = true;
		reviewerStore.returnForInfo(permit.id, reviewNotes, reviewerName);
		goto('/reviewer');
	}

	async function handleDeny() {
		if (!permit || actionInProgress) return;
		actionInProgress = true;
		reviewerStore.deny(permit.id, reviewNotes, reviewerName);
		goto('/reviewer');
	}

	// ─── Helpers ────────────────────────────────────────────────────
	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatShortDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
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
			return {
				text: `${diffDays}d ${remainingHours}h remaining`,
				urgent: diffDays < 2,
				expired: false
			};
		}
		return { text: `${diffHours}h remaining`, urgent: diffHours < 12, expired: false };
	}

	const COMMENT_ICONS: Record<string, { icon: string; bg: string }> = {
		comment: {
			icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
			bg: 'bg-gov-100 text-gov-600'
		},
		request_info: {
			icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
			bg: 'bg-amber-100 text-amber-600'
		},
		approval: {
			icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
			bg: 'bg-green-100 text-green-600'
		},
		denial: {
			icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
			bg: 'bg-red-100 text-red-600'
		}
	};

	const CONDITION_STYLES: Record<string, { label: string; bg: string; text: string }> = {
		good: { label: 'Good', bg: 'bg-green-100', text: 'text-green-700' },
		fair: { label: 'Fair', bg: 'bg-amber-100', text: 'text-amber-700' },
		poor: { label: 'Poor', bg: 'bg-red-100', text: 'text-red-700' },
		scheduled_repair: { label: 'Scheduled Repair', bg: 'bg-blue-100', text: 'text-blue-700' }
	};

	const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
		high: {
			bg: 'bg-red-50',
			text: 'text-red-700',
			border: 'border-red-200',
			dot: 'bg-red-500'
		},
		medium: {
			bg: 'bg-amber-50',
			text: 'text-amber-700',
			border: 'border-amber-200',
			dot: 'bg-amber-500'
		},
		low: {
			bg: 'bg-blue-50',
			text: 'text-blue-700',
			border: 'border-blue-200',
			dot: 'bg-blue-500'
		}
	};

	const ASSET_ICONS: Record<string, string> = {
		sidewalk: 'M4 6h16M4 12h16M4 18h16',
		street: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
		ada_ramp: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z',
		traffic_signal: 'M13 10V3L4 14h7v7l9-11h-7z',
		street_light: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
	};

	// Mock documents
	const mockDocuments = [
		{
			name: 'Site Plan',
			type: 'PDF',
			pages: 3,
			thumbnail: 'site-plan',
			uploaded: '2026-03-15'
		},
		{
			name: 'Traffic Control Plan',
			type: 'PDF',
			pages: 2,
			thumbnail: 'tcp',
			uploaded: '2026-03-16'
		},
		{
			name: 'Insurance Certificate',
			type: 'PDF',
			pages: 1,
			thumbnail: 'insurance',
			uploaded: '2026-03-15'
		}
	];

	// Type-specific field display
	function getTypeSpecificFields(): { label: string; value: string }[] {
		if (!permit) return [];
		const fields: { label: string; value: string }[] = [];

		if (permit.ward) fields.push({ label: 'Ward', value: permit.ward });
		if (permit.quadrant) fields.push({ label: 'Quadrant', value: permit.quadrant });

		if (permit.truckInfo) {
			fields.push({ label: 'Vehicle Type', value: permit.truckInfo.type });
			fields.push({
				label: 'Weight',
				value: `${permit.truckInfo.weight.toLocaleString()} lbs`
			});
			fields.push({ label: 'Height', value: `${permit.truckInfo.height} ft` });
			fields.push({ label: 'Width', value: `${permit.truckInfo.width} ft` });
			fields.push({ label: 'Length', value: `${permit.truckInfo.length} ft` });
			fields.push({ label: 'Axles', value: String(permit.truckInfo.axles) });
			fields.push({ label: 'Plate Number', value: permit.truckInfo.plateNumber });
		}

		if (permit.eventType) fields.push({ label: 'Event Type', value: permit.eventType });
		if (permit.damageType) fields.push({ label: 'Damage Type', value: permit.damageType });
		if (permit.treeSpecies) fields.push({ label: 'Tree Species', value: permit.treeSpecies });

		if (permit.addresses?.length) {
			permit.addresses.forEach((addr, i) => {
				const label =
					addr.stopType.charAt(0).toUpperCase() + addr.stopType.slice(1) + ' Location';
				fields.push({ label, value: addr.address });
				if (addr.notes) fields.push({ label: `Stop ${i + 1} Notes`, value: addr.notes });
			});
		}

		return fields;
	}

	const typeFields = $derived(getTypeSpecificFields());

	// ─── Leaflet Map ────────────────────────────────────────────────
	let mapContainer: HTMLDivElement | undefined = $state();
	let map: any = $state(null);
	let leafletLib: any = $state(null);

	async function initMap() {
		if (!browser || !mapContainer) return;
		const leaflet = await import('leaflet');
		leafletLib = leaflet.default || leaflet;
		const L = leafletLib;

		map = L.map(mapContainer, {
			zoomControl: true,
			scrollWheelZoom: true
		}).setView([permitLat, permitLng], 15);

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
			maxZoom: 19
		}).addTo(map);

		addMapLayers(L);
	}

	function addMapLayers(L: any) {
		if (!map) return;

		// Primary permit marker (large, blue)
		const primaryIcon = L.divIcon({
			className: 'custom-marker',
			html: `<div style="
				width: 40px; height: 40px; border-radius: 50%;
				background: #2563eb; border: 4px solid white;
				box-shadow: 0 3px 12px rgba(37,99,235,0.5);
				display: flex; align-items: center; justify-content: center;
				color: white; font-weight: 800; font-size: 16px;
				font-family: system-ui, sans-serif;
				animation: pulse-marker 2s infinite;
			">P</div>
			<style>
				@keyframes pulse-marker {
					0%, 100% { box-shadow: 0 3px 12px rgba(37,99,235,0.5); }
					50% { box-shadow: 0 3px 24px rgba(37,99,235,0.8); }
				}
			</style>`,
			iconSize: [40, 40],
			iconAnchor: [20, 20]
		});
		L.marker([permitLat, permitLng], { icon: primaryIcon })
			.addTo(map)
			.bindPopup(
				`<b>${permit?.title ?? 'Permit Location'}</b><br/>${permit?.addresses?.[0]?.address ?? 'Washington, DC'}`
			);

		// Nearby active permits (smaller, orange)
		nearbyPermits.forEach((np) => {
			const npIcon = L.divIcon({
				className: 'custom-marker',
				html: `<div style="
					width: 26px; height: 26px; border-radius: 50%;
					background: #f97316; border: 3px solid white;
					box-shadow: 0 2px 6px rgba(249,115,22,0.4);
					display: flex; align-items: center; justify-content: center;
					color: white; font-weight: 700; font-size: 10px;
					font-family: system-ui, sans-serif;
				">NP</div>`,
				iconSize: [26, 26],
				iconAnchor: [13, 13]
			});
			L.marker([np.lat, np.lng], { icon: npIcon })
				.addTo(map)
				.bindPopup(
					`<b>${np.title}</b><br/>Status: ${np.status}<br/>${np.startDate} - ${np.endDate}`
				);
		});

		// DDOT projects (diamond, purple)
		nearbyProjects.forEach((dp) => {
			const dpIcon = L.divIcon({
				className: 'custom-marker',
				html: `<div style="
					width: 26px; height: 26px;
					background: #7c3aed; border: 3px solid white;
					box-shadow: 0 2px 6px rgba(124,58,237,0.4);
					transform: rotate(45deg);
					display: flex; align-items: center; justify-content: center;
				"><span style="transform: rotate(-45deg); color: white; font-weight: 700; font-size: 9px; font-family: system-ui, sans-serif;">DP</span></div>`,
				iconSize: [26, 26],
				iconAnchor: [13, 13]
			});
			L.marker([dp.lat, dp.lng], { icon: dpIcon })
				.addTo(map)
				.bindPopup(
					`<b>${dp.title}</b><br/>${dp.agency}<br/>${dp.description}<br/>Scheduled: ${dp.scheduledDate}`
				);
		});

		// Asset management labels (small labeled circles)
		nearbyAssets.forEach((asset) => {
			const condColor =
				asset.condition === 'good'
					? '#16a34a'
					: asset.condition === 'fair'
						? '#f59e0b'
						: asset.condition === 'poor'
							? '#dc2626'
							: '#2563eb';
			const assetIcon = L.divIcon({
				className: 'custom-marker',
				html: `<div style="
					display: flex; align-items: center; gap: 4px;
					background: white; border: 2px solid ${condColor};
					border-radius: 12px; padding: 2px 8px;
					box-shadow: 0 1px 4px rgba(0,0,0,0.15);
					white-space: nowrap;
				"><div style="width: 8px; height: 8px; border-radius: 50%; background: ${condColor};"></div>
				<span style="font-size: 10px; font-weight: 600; color: #374151; font-family: system-ui, sans-serif;">${asset.type.replace('_', ' ')}</span></div>`,
				iconSize: [100, 24],
				iconAnchor: [50, 12]
			});
			L.marker([asset.lat, asset.lng], { icon: assetIcon })
				.addTo(map)
				.bindPopup(`<b>${asset.label}</b><br/>Last inspected: ${asset.lastInspected}`);
		});

		// Fit bounds to show all markers
		const allLats = [
			permitLat,
			...nearbyPermits.map((p) => p.lat),
			...nearbyProjects.map((p) => p.lat),
			...nearbyAssets.map((a) => a.lat)
		];
		const allLngs = [
			permitLng,
			...nearbyPermits.map((p) => p.lng),
			...nearbyProjects.map((p) => p.lng),
			...nearbyAssets.map((a) => a.lng)
		];

		if (allLats.length > 1) {
			const bounds = L.latLngBounds(
				[Math.min(...allLats), Math.min(...allLngs)],
				[Math.max(...allLats), Math.max(...allLngs)]
			);
			map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
		}
	}

	onMount(() => {
		setTimeout(initMap, 100);
	});

	onDestroy(() => {
		if (map) {
			map.remove();
			map = null;
		}
	});
</script>

<svelte:head>
	<title>{permit ? `Review: ${permit.title} - TOPS` : 'Review Not Found - TOPS'}</title>
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

{#if auth.isAuthenticated && (auth.role === 'reviewer' || auth.role === 'admin')}
	<NavHeader />

	{#if !permit}
		<!-- ─── Permit Not Found ────────────────────────────────────── -->
		<div class="min-h-screen bg-surface-alt flex items-center justify-center">
			<div
				class="bg-white rounded-2xl shadow-card border border-gov-100 p-12 text-center max-w-md mx-4"
			>
				<div class="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
					<svg
						class="w-10 h-10 text-permit-denied"
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
				<h2 class="text-2xl font-display font-bold text-gov-900 mb-2">Permit Not Found</h2>
				<p class="text-gov-400 mb-8">
					The permit you're looking for doesn't exist or may have been removed from the queue.
				</p>
				<a
					href="/reviewer"
					class="inline-flex items-center gap-2 px-6 py-3 bg-gov-600 text-white font-semibold rounded-xl hover:bg-gov-700 transition-colors"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 19l-7-7m0 0l7-7m-7 7h18"
						/>
					</svg>
					Back to Work Queue
				</a>
			</div>
		</div>
	{:else}
		{@const sla = permit.slaDeadline ? slaCountdown(permit.slaDeadline) : null}

		<div class="min-h-screen bg-surface-alt">
			<!-- ─── Sticky Review Header ──────────────────────────────── -->
			<header class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gov-100 shadow-sm">
				<div class="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
					<div class="flex items-center gap-4 h-16">
						<a
							href="/reviewer"
							class="flex items-center gap-2 text-gov-400 hover:text-gov-700 transition-colors group"
						>
							<div
								class="w-9 h-9 rounded-lg flex items-center justify-center group-hover:bg-gov-50 transition-colors"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M10 19l-7-7m0 0l7-7m-7 7h18"
									/>
								</svg>
							</div>
							<span class="text-sm font-medium hidden sm:inline">Work Queue</span>
						</a>

						<div class="h-6 w-px bg-gov-200"></div>

						<div class="flex-1 min-w-0">
							<h1 class="text-lg font-display font-bold text-gov-900 truncate">
								Review: {permit.title}
							</h1>
						</div>

						<div class="flex items-center gap-2 shrink-0">
							<span
								class="hidden sm:inline-flex px-3 py-1 rounded-lg bg-gov-50 text-gov-500 text-xs font-mono font-semibold"
							>
								{permit.referenceNumber}
							</span>

							<!-- Type Badge -->
							{#if typeMeta}
								<span
									class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
									{typeMeta.color === 'gov'
										? 'bg-gov-100 text-gov-700'
										: typeMeta.color === 'civic'
											? 'bg-civic-100 text-civic-600'
											: typeMeta.color === 'permit-pending'
												? 'bg-amber-100 text-amber-700'
												: typeMeta.color === 'permit-review'
													? 'bg-purple-100 text-purple-700'
													: 'bg-green-100 text-green-700'}"
								>
									{typeMeta.label}
								</span>
							{/if}

							<!-- SLA Badge -->
							{#if sla}
								<span
									class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
									{sla.expired
										? 'bg-red-100 text-red-700'
										: sla.urgent
											? 'bg-amber-100 text-amber-700'
											: 'bg-green-100 text-green-700'}"
								>
									<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
					</div>
				</div>
			</header>

			<!-- ─── Two-Column Layout ─────────────────────────────────── -->
			<main class="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div class="flex flex-col lg:flex-row gap-8">
					<!-- ═══════════════════════════════════════════════════ -->
					<!-- LEFT COLUMN (60%) ════════════════════════════════ -->
					<!-- ═══════════════════════════════════════════════════ -->
					<div class="w-full lg:w-[60%] space-y-6">
						<!-- 1. Permit Header Card ────────────────────────── -->
						<div
							class="bg-white rounded-2xl shadow-card border border-gov-100 p-6"
						>
							<div class="flex items-start gap-4">
								<div
									class="w-14 h-14 rounded-xl flex items-center justify-center shrink-0
									{typeMeta?.color === 'gov'
										? 'bg-gov-100 text-gov-600'
										: typeMeta?.color === 'civic'
											? 'bg-civic-100 text-civic-600'
											: typeMeta?.color === 'permit-pending'
												? 'bg-amber-100 text-amber-600'
												: typeMeta?.color === 'permit-review'
													? 'bg-purple-100 text-purple-600'
													: 'bg-green-100 text-green-600'}"
								>
									<svg
										class="w-7 h-7"
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
								<div class="flex-1 min-w-0">
									<h2 class="text-xl font-display font-bold text-gov-900 mb-1">
										{permit.title}
									</h2>
									<p class="text-sm text-gov-400 mb-3">{permit.description}</p>
									<div class="flex flex-wrap gap-x-6 gap-y-2 text-sm">
										<div class="flex items-center gap-1.5 text-gov-500">
											<svg
												class="w-4 h-4 text-gov-300"
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
											<span class="font-medium">{permit.applicant}</span>
										</div>
										<div class="flex items-center gap-1.5 text-gov-500">
											<svg
												class="w-4 h-4 text-gov-300"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
												/>
											</svg>
											<span>Submitted {formatShortDate(permit.submittedAt)}</span>
										</div>
										<div class="flex items-center gap-1.5 text-gov-500">
											<svg
												class="w-4 h-4 text-gov-300"
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
											<span class="font-mono text-xs">{permit.referenceNumber}</span>
										</div>
									</div>
								</div>
							</div>
						</div>

						<!-- 2. AI-Generated Application Brief ────────────── -->
						<div
							class="bg-gradient-to-br from-civic-50 via-gov-50 to-purple-50 rounded-2xl shadow-card border border-civic-200 p-6"
						>
							<div class="flex items-start gap-3">
								<div
									class="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center shrink-0 shadow-sm"
								>
									<svg
										class="w-5 h-5 text-civic-500"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
										/>
									</svg>
								</div>
								<div class="flex-1">
									<h3 class="text-sm font-semibold text-civic-700 uppercase tracking-wider mb-2">
										AI-Generated Application Brief
									</h3>
									<p class="text-gov-700 leading-relaxed">{aiSummary}</p>
								</div>
							</div>
						</div>

						<!-- 3. Application Details ───────────────────────── -->
						<div
							class="bg-white rounded-2xl shadow-card border border-gov-100 p-6"
						>
							<h3 class="text-sm font-semibold text-gov-400 uppercase tracking-wider mb-4">
								Application Details
							</h3>
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div class="p-3 bg-surface-alt rounded-xl">
									<p class="text-xs font-medium text-gov-400 mb-1">Permit Type</p>
									<p class="text-sm font-semibold text-gov-900">
										{typeMeta?.label ?? permit.type}
									</p>
								</div>
								<div class="p-3 bg-surface-alt rounded-xl">
									<p class="text-xs font-medium text-gov-400 mb-1">Status</p>
									<p class="text-sm font-semibold text-gov-900 capitalize">
										{permit.status.replace('_', ' ')}
									</p>
								</div>
								<div class="p-3 bg-surface-alt rounded-xl">
									<p class="text-xs font-medium text-gov-400 mb-1">Submitted</p>
									<p class="text-sm font-semibold text-gov-900">
										{formatDate(permit.submittedAt)}
									</p>
								</div>
								<div class="p-3 bg-surface-alt rounded-xl">
									<p class="text-xs font-medium text-gov-400 mb-1">Last Updated</p>
									<p class="text-sm font-semibold text-gov-900">
										{formatDate(permit.updatedAt)}
									</p>
								</div>
								{#if permit.expiresAt}
									<div class="p-3 bg-surface-alt rounded-xl">
										<p class="text-xs font-medium text-gov-400 mb-1">Expires</p>
										<p class="text-sm font-semibold text-gov-900">
											{formatDate(permit.expiresAt)}
										</p>
									</div>
								{/if}
								{#if permit.assignedReviewer}
									<div class="p-3 bg-surface-alt rounded-xl">
										<p class="text-xs font-medium text-gov-400 mb-1">Assigned Reviewer</p>
										<p class="text-sm font-semibold text-gov-900">{permit.assignedReviewer}</p>
									</div>
								{/if}

								<!-- Type-specific fields -->
								{#each typeFields as field}
									<div class="p-3 bg-surface-alt rounded-xl">
										<p class="text-xs font-medium text-gov-400 mb-1">{field.label}</p>
										<p class="text-sm font-semibold text-gov-900">{field.value}</p>
									</div>
								{/each}
							</div>
						</div>

						<!-- 4. Documents Section ─────────────────────────── -->
						<div
							class="bg-white rounded-2xl shadow-card border border-gov-100 p-6"
						>
							<h3 class="text-sm font-semibold text-gov-400 uppercase tracking-wider mb-4">
								Documents
							</h3>
							<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
								{#each mockDocuments as doc}
									<div class="border border-gov-100 rounded-xl overflow-hidden group">
										<!-- Mock thumbnail -->
										<div
											class="h-28 bg-gradient-to-br from-gov-50 to-gov-100 flex items-center justify-center relative"
										>
											<div class="text-center">
												<svg
													class="w-10 h-10 text-gov-300 mx-auto mb-1"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="1.5"
														d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
													/>
												</svg>
												<span class="text-xs text-gov-400"
													>{doc.type} - {doc.pages} page{doc.pages > 1 ? 's' : ''}</span
												>
											</div>
											<div
												class="absolute top-2 right-2 px-2 py-0.5 rounded bg-white/80 text-xs font-semibold text-gov-500"
											>
												{doc.type}
											</div>
										</div>
										<div class="p-3">
											<p class="text-sm font-semibold text-gov-900 mb-1">{doc.name}</p>
											<p class="text-xs text-gov-400 mb-3">
												Uploaded {formatShortDate(doc.uploaded)}
											</p>
											<div class="flex gap-2">
												<button
													class="flex-1 px-3 py-1.5 text-xs font-semibold bg-gov-50 text-gov-600 rounded-lg hover:bg-gov-100 transition-colors"
												>
													View
												</button>
												<button
													class="flex-1 px-3 py-1.5 text-xs font-semibold bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
												>
													Redline & Comment
												</button>
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>

						<!-- 5. Review Comments History ────────────────────── -->
						<div
							class="bg-white rounded-2xl shadow-card border border-gov-100 p-6"
						>
							<h3 class="text-sm font-semibold text-gov-400 uppercase tracking-wider mb-4">
								Review Comments
							</h3>
							{#if comments.length === 0}
								<div class="text-center py-8 text-gov-300">
									<svg
										class="w-10 h-10 mx-auto mb-2 text-gov-200"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="1.5"
											d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
										/>
									</svg>
									<p class="text-sm">No comments yet. Be the first to add a review note.</p>
								</div>
							{:else}
								<div class="space-y-4">
									{#each comments as comment}
										{@const commentStyle = COMMENT_ICONS[comment.type] ?? COMMENT_ICONS.comment}
										<div class="flex gap-3">
											<div
												class="w-9 h-9 rounded-full flex items-center justify-center shrink-0 {commentStyle.bg}"
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
														d={commentStyle.icon}
													/>
												</svg>
											</div>
											<div class="flex-1 min-w-0">
												<div class="flex items-center gap-2 mb-1">
													<span class="text-sm font-semibold text-gov-900"
														>{comment.author}</span
													>
													<span
														class="text-xs px-2 py-0.5 rounded-full bg-gov-50 text-gov-400 font-medium"
														>{comment.role}</span
													>
													<span class="text-xs text-gov-300"
														>{timeAgo(comment.timestamp)}</span
													>
												</div>
												<p class="text-sm text-gov-600 leading-relaxed">{comment.content}</p>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>

						<!-- 6. Reviewer Action Panel ──────────────────────── -->
						<div
							class="bg-white rounded-2xl shadow-card border border-gov-100 p-6"
						>
							<h3 class="text-sm font-semibold text-gov-400 uppercase tracking-wider mb-4">
								Reviewer Action
							</h3>

							<!-- Comment Input -->
							<div class="mb-4">
								<label for="review-notes" class="block text-sm font-medium text-gov-700 mb-2">
									Review Notes / Comments
								</label>
								<textarea
									id="review-notes"
									bind:value={reviewNotes}
									rows={4}
									placeholder="Enter your review comments, conditions, or reasons for decision..."
									class="w-full px-4 py-3 border border-gov-200 rounded-xl text-sm text-gov-900 placeholder-gov-300 focus:outline-none focus:ring-2 focus:ring-civic-400 focus:border-transparent resize-none transition-all"
								></textarea>
							</div>

							<!-- Action Buttons -->
							<div class="flex flex-wrap gap-3 mb-6">
								<button
									onclick={handleApprove}
									disabled={actionInProgress}
									class="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm
									bg-green-600 text-white hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed
									shadow-sm hover:shadow-md transition-all"
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
											d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
									Approve
								</button>
								<button
									onclick={handleReturn}
									disabled={actionInProgress || !reviewNotes.trim()}
									class="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm
									bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed
									shadow-sm hover:shadow-md transition-all"
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
											d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
										/>
									</svg>
									Return for More Info
								</button>
								<button
									onclick={handleDeny}
									disabled={actionInProgress}
									class="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm
									bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed
									shadow-sm hover:shadow-md transition-all"
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
											d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
									Deny
								</button>
							</div>

							<!-- AI Routing Recommendation -->
							<div
								class="flex items-center gap-3 p-4 bg-gradient-to-r from-civic-50 to-purple-50 rounded-xl border border-civic-200"
							>
								<div
									class="w-9 h-9 rounded-lg bg-white/80 flex items-center justify-center shrink-0 shadow-sm"
								>
									<svg
										class="w-5 h-5 text-civic-500"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
										/>
									</svg>
								</div>
								<div class="flex-1 min-w-0">
									<p class="text-xs font-semibold text-civic-600 uppercase tracking-wider mb-0.5">
										AI Routing Recommendation
									</p>
									<p class="text-sm text-gov-700">
										Suggested reviewer: <span class="font-semibold">M. Thompson</span> — Ward 6
										expertise, 4 active reviews
									</p>
								</div>
								<span
									class="shrink-0 px-2.5 py-1 rounded-full bg-civic-100 text-civic-600 text-xs font-semibold"
									>AI Suggested</span
								>
							</div>
						</div>
					</div>

					<!-- ═══════════════════════════════════════════════════ -->
					<!-- RIGHT COLUMN (40%) — GIS Conflict View ═══════════ -->
					<!-- ═══════════════════════════════════════════════════ -->
					<div class="w-full lg:w-[40%] space-y-6">
						<!-- Map ──────────────────────────────────────────── -->
						<div
							class="bg-white rounded-2xl shadow-card border border-gov-100 overflow-hidden"
						>
							<div class="p-4 border-b border-gov-100">
								<div class="flex items-center justify-between">
									<h3 class="text-sm font-semibold text-gov-400 uppercase tracking-wider">
										GIS Conflict & Coordination View
									</h3>
									<div class="flex items-center gap-3 text-xs text-gov-400">
										<span class="flex items-center gap-1">
											<span
												class="inline-block w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow"
											></span>
											Permit
										</span>
										<span class="flex items-center gap-1">
											<span
												class="inline-block w-3 h-3 rounded-full bg-orange-500 border-2 border-white shadow"
											></span>
											Nearby
										</span>
										<span class="flex items-center gap-1">
											<span
												class="inline-block w-3 h-3 bg-purple-600 border-2 border-white shadow"
												style="transform: rotate(45deg); width: 10px; height: 10px;"
											></span>
											DDOT
										</span>
									</div>
								</div>
							</div>
							<div bind:this={mapContainer} class="w-full" style="height: 420px;"></div>
						</div>

						<!-- Asset Management ─────────────────────────────── -->
						<div
							class="bg-white rounded-2xl shadow-card border border-gov-100 p-6"
						>
							<h3 class="text-sm font-semibold text-gov-400 uppercase tracking-wider mb-4">
								Asset Management
							</h3>

							{#if nearbyAssets.length === 0}
								<p class="text-sm text-gov-300 text-center py-4">
									No assets found near this location.
								</p>
							{:else}
								<div class="space-y-3">
									{#each nearbyAssets as asset}
										{@const condStyle = CONDITION_STYLES[asset.condition]}
										<div
											class="flex items-center gap-3 p-3 rounded-xl bg-surface-alt border border-gov-50"
										>
											<div
												class="w-9 h-9 rounded-lg bg-gov-100 flex items-center justify-center shrink-0"
											>
												<svg
													class="w-4 h-4 text-gov-500"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d={ASSET_ICONS[asset.type] ?? ASSET_ICONS.street}
													/>
												</svg>
											</div>
											<div class="flex-1 min-w-0">
												<p class="text-sm font-medium text-gov-900 truncate">
													{asset.label}
												</p>
												<p class="text-xs text-gov-400">
													Last inspected: {formatShortDate(asset.lastInspected)}
												</p>
											</div>
											<span
												class="shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold {condStyle.bg} {condStyle.text}"
											>
												{condStyle.label}
											</span>
										</div>
									{/each}
								</div>
							{/if}
						</div>

						<!-- Conflict Alerts ───────────────────────────────── -->
						<div
							class="bg-white rounded-2xl shadow-card border border-gov-100 p-6"
						>
							<div class="flex items-center justify-between mb-4">
								<h3 class="text-sm font-semibold text-gov-400 uppercase tracking-wider">
									Conflict Alerts
								</h3>
								{#if conflicts.length > 0}
									<span
										class="px-2.5 py-1 rounded-full text-xs font-bold
										{conflicts.some((c) => c.severity === 'high')
											? 'bg-red-100 text-red-700'
											: 'bg-amber-100 text-amber-700'}"
									>
										{conflicts.length} alert{conflicts.length !== 1 ? 's' : ''}
									</span>
								{/if}
							</div>

							{#if conflicts.length === 0}
								<div class="text-center py-8">
									<div
										class="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3"
									>
										<svg
											class="w-6 h-6 text-green-500"
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
									<p class="text-sm font-medium text-green-700">No Conflicts Detected</p>
									<p class="text-xs text-gov-400 mt-1">
										No spatial or temporal conflicts found near this permit location.
									</p>
								</div>
							{:else}
								<div class="space-y-3">
									{#each conflicts as conflict}
										{@const sevStyle = SEVERITY_STYLES[conflict.severity]}
										<div class="p-4 rounded-xl border {sevStyle.border} {sevStyle.bg}">
											<div class="flex items-start gap-3">
												<div class="mt-0.5 shrink-0">
													<div
														class="w-3 h-3 rounded-full {sevStyle.dot}"
														title={conflict.severity}
													></div>
												</div>
												<div class="flex-1 min-w-0">
													<div class="flex items-center gap-2 mb-1">
														<span class="text-sm font-semibold {sevStyle.text}">
															{conflict.title}
														</span>
														<span
															class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider {sevStyle.bg} {sevStyle.text} border {sevStyle.border}"
														>
															{conflict.severity}
														</span>
													</div>
													<p class="text-xs text-gov-600 mb-2">
														{conflict.description}
													</p>
													<div
														class="flex items-start gap-1.5 p-2 bg-white/60 rounded-lg"
													>
														<svg
															class="w-3.5 h-3.5 text-gov-400 mt-0.5 shrink-0"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
															/>
														</svg>
														<p class="text-xs text-gov-500">
															{conflict.recommendation}
														</p>
													</div>
												</div>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>

						<!-- Nearby Permits Summary ────────────────────────── -->
						{#if nearbyPermits.length > 0}
							<div
								class="bg-white rounded-2xl shadow-card border border-gov-100 p-6"
							>
								<h3 class="text-sm font-semibold text-gov-400 uppercase tracking-wider mb-4">
									Nearby Active Permits
								</h3>
								<div class="space-y-3">
									{#each nearbyPermits as np}
										<div
											class="flex items-center gap-3 p-3 rounded-xl bg-surface-alt border border-gov-50"
										>
											<div
												class="w-3 h-3 rounded-full shrink-0
												{np.status === 'active'
													? 'bg-orange-500'
													: np.status === 'pending'
														? 'bg-amber-400'
														: 'bg-gray-300'}"
											></div>
											<div class="flex-1 min-w-0">
												<p class="text-sm font-medium text-gov-900 truncate">{np.title}</p>
												<p class="text-xs text-gov-400">
													{np.ward} | {np.startDate} - {np.endDate}
												</p>
											</div>
											<span
												class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase
												{np.status === 'active'
													? 'bg-orange-100 text-orange-700'
													: np.status === 'pending'
														? 'bg-amber-100 text-amber-700'
														: 'bg-gray-100 text-gray-500'}"
											>
												{np.status}
											</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Nearby DDOT Projects Summary ──────────────────── -->
						{#if nearbyProjects.length > 0}
							<div
								class="bg-white rounded-2xl shadow-card border border-gov-100 p-6"
							>
								<h3 class="text-sm font-semibold text-gov-400 uppercase tracking-wider mb-4">
									DDOT / Utility Projects
								</h3>
								<div class="space-y-3">
									{#each nearbyProjects as dp}
										<div
											class="flex items-center gap-3 p-3 rounded-xl bg-surface-alt border border-gov-50"
										>
											<div
												class="w-4 h-4 shrink-0 bg-purple-600 border-2 border-white shadow"
												style="transform: rotate(45deg);"
											></div>
											<div class="flex-1 min-w-0">
												<p class="text-sm font-medium text-gov-900 truncate">{dp.title}</p>
												<p class="text-xs text-gov-400">
													{dp.agency} | {dp.scheduledDate}
												</p>
												<p class="text-xs text-gov-500 mt-0.5">{dp.description}</p>
											</div>
											<span
												class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase
												{dp.status === 'active'
													? 'bg-purple-100 text-purple-700'
													: dp.status === 'planned'
														? 'bg-indigo-100 text-indigo-600'
														: 'bg-gray-100 text-gray-500'}"
											>
												{dp.status}
											</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</div>
			</main>
		</div>
	{/if}
{/if}
