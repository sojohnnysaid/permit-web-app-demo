<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { permits } from '$lib/stores/permits.svelte';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	// Auth guard
	$effect(() => {
		if (!auth.isAuthenticated) {
			goto('/login');
		}
	});

	// ─── Wizard State ───────────────────────────────────────────────
	let currentStep = $state(1);
	let slideDirection = $state<'left' | 'right'>('left');
	let isSubmitting = $state(false);
	let isSubmitted = $state(false);
	let submittedRef = $state('');

	// ─── Step 1: Vehicle Info ───────────────────────────────────────
	const TRUCK_TYPES = ['Cement Mixer', 'Tractor-Trailer', 'Dump Truck', 'Trash Truck', 'Mobile Crane', 'Concrete Pump'];

	let truckType = $state('Cement Mixer');
	let weight = $state(66000);
	let height = $state(13.2);
	let width = $state(8.5);
	let length = $state(35);
	let axles = $state(6);
	let plateNumber = $state('');

	const THRESHOLDS = { height: 13.5, width: 8.5, length: 40, weight: 80000 };

	let isOverHeight = $derived(height > THRESHOLDS.height);
	let isOverWidth = $derived(width > THRESHOLDS.width);
	let isOverLength = $derived(length > THRESHOLDS.length);
	let isOverWeight = $derived(weight > THRESHOLDS.weight);
	let isOversize = $derived(isOverHeight || isOverWidth || isOverLength || isOverWeight);

	// ─── Step 2: Route Builder ──────────────────────────────────────
	interface RouteStop {
		id: string;
		address: string;
		stopType: 'Start' | 'Pickup' | 'Delivery' | 'Rest Stop' | 'Fuel' | 'End';
		lat: number | null;
		lng: number | null;
	}

	const STOP_TYPES: RouteStop['stopType'][] = ['Start', 'Pickup', 'Delivery', 'Rest Stop', 'Fuel', 'End'];

	const STOP_COLORS: Record<string, string> = {
		Start: '#16a34a',
		Pickup: '#2563eb',
		Delivery: '#7c3aed',
		'Rest Stop': '#f59e0b',
		Fuel: '#ea580c',
		End: '#dc2626'
	};

	let stops = $state<RouteStop[]>([
		{ id: crypto.randomUUID(), address: '', stopType: 'Start', lat: null, lng: null },
		{ id: crypto.randomUUID(), address: '', stopType: 'End', lat: null, lng: null }
	]);

	function addStop() {
		const newStop: RouteStop = {
			id: crypto.randomUUID(),
			address: '',
			stopType: 'Delivery',
			lat: null,
			lng: null
		};
		stops.splice(stops.length - 1, 0, newStop);
		stops = [...stops];
	}

	function removeStop(idx: number) {
		if (stops.length <= 2) return;
		stops.splice(idx, 1);
		stops = [...stops];
		updateMapMarkers();
	}

	function moveStop(idx: number, direction: -1 | 1) {
		const newIdx = idx + direction;
		if (newIdx < 0 || newIdx >= stops.length) return;
		const temp = stops[idx];
		stops[idx] = stops[newIdx];
		stops[newIdx] = temp;
		stops = [...stops];
		updateMapMarkers();
	}

	// Fake geocoding: randomize near DC
	function fakeGeocode(address: string): { lat: number; lng: number } {
		let hash = 0;
		for (let i = 0; i < address.length; i++) {
			hash = ((hash << 5) - hash) + address.charCodeAt(i);
			hash |= 0;
		}
		const latOff = ((hash % 100) / 100) * 0.06 - 0.03;
		const lngOff = (((hash >> 8) % 100) / 100) * 0.06 - 0.03;
		return { lat: 38.9072 + latOff, lng: -77.0369 + lngOff };
	}

	function handleAddressBlur(idx: number) {
		const stop = stops[idx];
		if (stop.address.trim().length > 3) {
			const coords = fakeGeocode(stop.address);
			stops[idx] = { ...stop, lat: coords.lat, lng: coords.lng };
			stops = [...stops];
			updateMapMarkers();
		}
	}

	function handleAddressKeydown(e: KeyboardEvent, idx: number) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleAddressBlur(idx);
		}
	}

	// ─── Leaflet Map ────────────────────────────────────────────────
	let mapContainer: HTMLDivElement | undefined = $state();
	let map: any = $state(null);
	let L: any = $state(null);
	let markers: any[] = $state([]);
	let polyline: any = $state(null);

	// Restriction overlay lines for step 3
	let restrictionLines: any[] = $state([]);

	async function initMap() {
		if (!browser || !mapContainer) return;
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

		updateMapMarkers();
	}

	function updateMapMarkers() {
		if (!map || !L) return;

		// Clear old
		markers.forEach((m: any) => m.remove());
		markers = [];
		if (polyline) polyline.remove();
		polyline = null;
		restrictionLines.forEach((l: any) => l.remove());
		restrictionLines = [];

		const validStops = stops.filter(s => s.lat !== null && s.lng !== null);

		validStops.forEach((stop, i) => {
			const color = STOP_COLORS[stop.stopType] || '#6b7280';

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

			const marker = L.marker([stop.lat, stop.lng], { icon })
				.addTo(map)
				.bindPopup(`<b>Stop ${i + 1}: ${stop.stopType}</b><br/>${stop.address}`);
			markers.push(marker);
		});

		// Polyline
		if (validStops.length >= 2) {
			const latlngs = validStops.map(s => [s.lat, s.lng]);
			polyline = L.polyline(latlngs, {
				color: '#233d78',
				weight: 4,
				opacity: 0.8,
				dashArray: '8, 8',
				lineCap: 'round'
			}).addTo(map);

			// Fit bounds
			const group = L.featureGroup([...markers]);
			map.fitBounds(group.getBounds().pad(0.15));
		}

		// If step 3, add restriction overlays
		if (currentStep === 3) {
			addRestrictionOverlays();
		}
	}

	function addRestrictionOverlays() {
		if (!map || !L) return;
		restrictionLines.forEach((l: any) => l.remove());
		restrictionLines = [];

		// Fake restricted segments near the route
		const restricted = [
			{ from: [38.9050, -77.0350], to: [38.9080, -77.0280], color: '#dc2626', name: 'M St NW' },
			{ from: [38.9020, -77.0400], to: [38.9020, -77.0320], color: '#f59e0b', name: 'K St NW' },
			{ from: [38.9100, -77.0290], to: [38.9120, -77.0250], color: '#dc2626', name: 'Connecticut Ave' }
		];

		restricted.forEach(seg => {
			const line = L.polyline([seg.from, seg.to] as [number, number][], {
				color: seg.color,
				weight: 6,
				opacity: 0.7,
				dashArray: seg.color === '#dc2626' ? undefined : '6, 6'
			}).addTo(map).bindPopup(`<b>${seg.name}</b><br/>Restricted for your vehicle`);
			restrictionLines.push(line);
		});
	}

	onDestroy(() => {
		if (map) {
			map.remove();
			map = null;
		}
	});

	// Init map when step 2 or 3 becomes visible and mapContainer is in the DOM
	$effect(() => {
		const _step = currentStep;
		if ((_step === 2 || _step === 3) && mapContainer && !map) {
			initMap();
		}
		if (map && L) {
			// Small delay to let DOM settle
			setTimeout(() => {
				map?.invalidateSize();
				updateMapMarkers();
			}, 100);
		}
	});

	// ─── Step 3: Street Restrictions ────────────────────────────────
	interface Restriction {
		street: string;
		restriction: string;
		status: 'blocked' | 'conditional' | 'clear';
		detail: string;
	}

	let restrictions = $derived.by<Restriction[]>(() => {
		const result: Restriction[] = [
			{ street: 'M St NW (1400-1800 block)', restriction: `No vehicles over 13ft height`, status: isOverHeight ? 'blocked' : 'clear', detail: isOverHeight ? `Your vehicle is ${height}ft tall` : 'Within limit' },
			{ street: 'K St NW (900-1400 block)', restriction: 'No vehicles over 26ft length', status: length > 26 ? 'conditional' : 'clear', detail: length > 26 ? `Your vehicle is ${length}ft long - requires escort` : 'Within limit' },
			{ street: 'Connecticut Ave NW (Dupont Circle)', restriction: 'No vehicles over 80,000 lbs', status: isOverWeight ? 'blocked' : 'clear', detail: isOverWeight ? `Your vehicle weighs ${weight.toLocaleString()} lbs` : 'Within limit' },
			{ street: 'Pennsylvania Ave NW (Capitol area)', restriction: 'Security zone - special permit required', status: 'conditional', detail: 'Federal security zone requires 48hr advance notice' },
			{ street: '14th St Bridge Approach', restriction: `Max width 8.5ft`, status: isOverWidth ? 'blocked' : 'clear', detail: isOverWidth ? `Your vehicle is ${width}ft wide` : 'Within limit' },
			{ street: 'Rock Creek Parkway', restriction: 'Commercial vehicles prohibited', status: 'blocked', detail: 'National Park Service road - no commercial vehicles' },
			{ street: 'Wisconsin Ave NW (Georgetown)', restriction: 'Oversize vehicles 9PM-6AM only', status: isOversize ? 'conditional' : 'clear', detail: isOversize ? 'Time-restricted access for oversize vehicles' : 'No restrictions' },
			{ street: 'Constitution Ave NW', restriction: 'No vehicles over 40ft length', status: isOverLength ? 'blocked' : 'clear', detail: isOverLength ? `Your vehicle is ${length}ft long` : 'Within limit' }
		];
		return result;
	});

	let blockedCount = $derived(restrictions.filter(r => r.status === 'blocked').length);
	let conditionalCount = $derived(restrictions.filter(r => r.status === 'conditional').length);

	// ─── Validation ─────────────────────────────────────────────────
	let step1Valid = $derived(truckType !== '' && weight > 0 && height > 0 && width > 0 && length > 0 && axles > 0 && plateNumber.trim().length >= 3);
	let step2Valid = $derived(stops.length >= 2 && stops.filter(s => s.address.trim().length > 3 && s.lat !== null).length >= 2);

	// ─── Navigation ─────────────────────────────────────────────────
	const STEPS = [
		{ num: 1, label: 'Vehicle Info', icon: 'truck' },
		{ num: 2, label: 'Route Builder', icon: 'map' },
		{ num: 3, label: 'Restrictions', icon: 'alert' },
		{ num: 4, label: 'Review & Submit', icon: 'check' }
	];

	function nextStep() {
		if (currentStep === 1 && !step1Valid) return;
		if (currentStep === 2 && !step2Valid) return;
		if (currentStep < 4) {
			slideDirection = 'left';
			currentStep++;
		}
	}

	function prevStep() {
		if (currentStep > 1) {
			slideDirection = 'right';
			currentStep--;
		}
	}

	async function handleSubmit() {
		isSubmitting = true;
		await new Promise(r => setTimeout(r, 1500));

		const validStops = stops.filter(s => s.lat !== null && s.lng !== null);

		const newPermit = permits.addPermit({
			type: 'truck_route',
			title: `${truckType} Route Permit - ${validStops[0]?.address || 'DC Area'}`,
			description: `${truckType} route permit with ${validStops.length} stops. Vehicle: ${weight.toLocaleString()} lbs, ${height}ft H x ${width}ft W x ${length}ft L.`,
			status: 'submitted',
			ward: 'Ward 6',
			quadrant: 'NW',
			slaDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
			addresses: validStops.map(s => ({
				address: s.address,
				lat: s.lat!,
				lng: s.lng!,
				stopType: s.stopType.toLowerCase() as any
			})),
			truckInfo: {
				type: truckType,
				weight,
				height,
				width,
				length,
				axles,
				plateNumber
			}
		});

		submittedRef = newPermit.referenceNumber;
		isSubmitting = false;
		isSubmitted = true;

		setTimeout(() => {
			goto('/dashboard');
		}, 3000);
	}
</script>

<svelte:head>
	<title>New Truck Route Permit - TOPS</title>
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

{#if auth.isAuthenticated}
<div class="min-h-screen bg-surface-alt">
	<!-- Header -->
	<header class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gov-100 shadow-sm">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between h-16">
				<div class="flex items-center gap-3">
					<a href="/permits/new" class="flex items-center gap-2 text-gov-400 hover:text-gov-700 transition-colors">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
						<span class="text-sm font-medium">Back</span>
					</a>
					<div class="w-px h-8 bg-gov-100"></div>
					<div class="w-9 h-9 rounded-lg bg-gradient-to-br from-gov-700 to-civic-500 flex items-center justify-center">
						<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/></svg>
					</div>
					<div>
						<h1 class="text-lg font-display font-bold text-gov-900">Commercial Vehicle Route Permit</h1>
						<p class="text-xs text-gov-400">Oversize/Overweight Single Haul</p>
					</div>
				</div>
			</div>
		</div>
	</header>

	<!-- Success Overlay -->
	{#if isSubmitted}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-gov-900/60 backdrop-blur-sm animate-fade-in">
		<div class="bg-white rounded-2xl shadow-modal p-10 text-center max-w-md mx-4 animate-scale-in">
			<div class="w-20 h-20 rounded-full bg-gradient-to-br from-permit-approved to-emerald-400 flex items-center justify-center mx-auto mb-6 animate-scale-in" style="animation-delay: 200ms">
				<svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
			</div>
			<h2 class="text-2xl font-display font-bold text-gov-900 mb-2">Permit Submitted!</h2>
			<p class="text-gov-400 mb-4">Your application has been received and is being processed.</p>
			<div class="bg-gov-50 rounded-xl p-4 mb-6">
				<p class="text-xs text-gov-400 mb-1">Reference Number</p>
				<p class="text-lg font-mono font-bold text-gov-700">{submittedRef}</p>
			</div>
			<p class="text-sm text-gov-400">Estimated processing time: <span class="font-semibold text-gov-700">7 business days</span></p>
			<p class="text-xs text-gov-300 mt-3">Redirecting to dashboard...</p>
		</div>
	</div>
	{/if}

	<main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Step Indicator -->
		<div class="mb-8 animate-slide-up">
			<div class="flex items-center justify-between max-w-2xl mx-auto">
				{#each STEPS as step, i}
					{@const isActive = currentStep === step.num}
					{@const isCompleted = currentStep > step.num}
					<div class="flex items-center {i < STEPS.length - 1 ? 'flex-1' : ''}">
						<!-- Step Circle -->
						<div class="flex flex-col items-center gap-1.5 relative z-10">
							<button
								onclick={() => { if (isCompleted) { slideDirection = step.num < currentStep ? 'right' : 'left'; currentStep = step.num; } }}
								class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
									{isCompleted ? 'bg-gradient-to-br from-permit-approved to-emerald-400 text-white shadow-lg cursor-pointer hover:scale-110' :
									 isActive ? 'bg-gradient-to-br from-gov-600 to-gov-500 text-white shadow-lg ring-4 ring-gov-100' :
									 'bg-gov-100 text-gov-400 cursor-default'}"
							>
								{#if isCompleted}
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
								{:else}
									{step.num}
								{/if}
							</button>
							<span class="text-xs font-medium whitespace-nowrap {isActive ? 'text-gov-700' : isCompleted ? 'text-permit-approved' : 'text-gov-300'}">
								{step.label}
							</span>
						</div>

						<!-- Connector Line -->
						{#if i < STEPS.length - 1}
							<div class="flex-1 h-0.5 mx-2 mt-[-20px] rounded-full transition-all duration-500 {isCompleted ? 'bg-gradient-to-r from-permit-approved to-emerald-400' : 'bg-gov-100'}"></div>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- Step Content Container -->
		<div class="relative overflow-hidden">
			<!-- ═══════════════════════════════════════════════════════════ -->
			<!-- STEP 1: Vehicle Info -->
			<!-- ═══════════════════════════════════════════════════════════ -->
			{#if currentStep === 1}
			<div class="animate-slide-in-right">
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<!-- Main Form -->
					<div class="lg:col-span-2 space-y-6">
						<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6 sm:p-8">
							<h2 class="text-xl font-display font-bold text-gov-900 mb-1">Vehicle Information</h2>
							<p class="text-sm text-gov-400 mb-6">Enter the details of the commercial vehicle requiring a route permit.</p>

							<!-- Truck Type -->
							<div class="mb-6">
								<label for="truckType" class="block text-sm font-semibold text-gov-700 mb-2">Truck Type</label>
								<select
									id="truckType"
									bind:value={truckType}
									class="w-full px-4 py-3 bg-surface-alt border border-gov-200 rounded-xl text-gov-900 font-medium focus:outline-none focus:ring-2 focus:ring-civic-400 focus:border-transparent transition-all appearance-none"
								>
									{#each TRUCK_TYPES as type}
										<option value={type}>{type}</option>
									{/each}
								</select>
							</div>

							<!-- License Plate -->
							<div class="mb-6">
								<label for="plate" class="block text-sm font-semibold text-gov-700 mb-2">License Plate Number</label>
								<input
									id="plate"
									type="text"
									bind:value={plateNumber}
									placeholder="e.g., DC-CMX-4421"
									class="w-full px-4 py-3 bg-surface-alt border border-gov-200 rounded-xl text-gov-900 font-mono placeholder:text-gov-300 focus:outline-none focus:ring-2 focus:ring-civic-400 focus:border-transparent transition-all uppercase"
								/>
							</div>

							<!-- Dimensions Grid -->
							<div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
								<!-- Weight -->
								<div>
									<label for="weight" class="block text-xs font-semibold text-gov-700 mb-1.5">
										Weight (lbs)
										{#if isOverWeight}
											<span class="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-permit-denied">OVER</span>
										{/if}
									</label>
									<input
										id="weight"
										type="number"
										bind:value={weight}
										class="w-full px-3 py-2.5 bg-surface-alt border rounded-xl text-gov-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-civic-400 transition-all
											{isOverWeight ? 'border-permit-denied ring-1 ring-red-200' : 'border-gov-200'}"
									/>
									<p class="text-[10px] text-gov-300 mt-1">Max: {THRESHOLDS.weight.toLocaleString()} lbs</p>
								</div>

								<!-- Height -->
								<div>
									<label for="height" class="block text-xs font-semibold text-gov-700 mb-1.5">
										Height (ft)
										{#if isOverHeight}
											<span class="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-permit-denied">OVER</span>
										{/if}
									</label>
									<input
										id="height"
										type="number"
										step="0.1"
										bind:value={height}
										class="w-full px-3 py-2.5 bg-surface-alt border rounded-xl text-gov-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-civic-400 transition-all
											{isOverHeight ? 'border-permit-denied ring-1 ring-red-200' : 'border-gov-200'}"
									/>
									<p class="text-[10px] text-gov-300 mt-1">Max: {THRESHOLDS.height} ft</p>
								</div>

								<!-- Width -->
								<div>
									<label for="width" class="block text-xs font-semibold text-gov-700 mb-1.5">
										Width (ft)
										{#if isOverWidth}
											<span class="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-permit-denied">OVER</span>
										{/if}
									</label>
									<input
										id="width"
										type="number"
										step="0.1"
										bind:value={width}
										class="w-full px-3 py-2.5 bg-surface-alt border rounded-xl text-gov-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-civic-400 transition-all
											{isOverWidth ? 'border-permit-denied ring-1 ring-red-200' : 'border-gov-200'}"
									/>
									<p class="text-[10px] text-gov-300 mt-1">Max: {THRESHOLDS.width} ft</p>
								</div>

								<!-- Length -->
								<div>
									<label for="length" class="block text-xs font-semibold text-gov-700 mb-1.5">
										Length (ft)
										{#if isOverLength}
											<span class="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-permit-denied">OVER</span>
										{/if}
									</label>
									<input
										id="length"
										type="number"
										step="0.1"
										bind:value={length}
										class="w-full px-3 py-2.5 bg-surface-alt border rounded-xl text-gov-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-civic-400 transition-all
											{isOverLength ? 'border-permit-denied ring-1 ring-red-200' : 'border-gov-200'}"
									/>
									<p class="text-[10px] text-gov-300 mt-1">Max: {THRESHOLDS.length} ft</p>
								</div>
							</div>

							<!-- Axles -->
							<div class="max-w-xs">
								<label for="axles" class="block text-sm font-semibold text-gov-700 mb-2">Number of Axles</label>
								<input
									id="axles"
									type="number"
									min="2"
									max="12"
									bind:value={axles}
									class="w-full px-4 py-3 bg-surface-alt border border-gov-200 rounded-xl text-gov-900 font-mono focus:outline-none focus:ring-2 focus:ring-civic-400 focus:border-transparent transition-all"
								/>
							</div>
						</div>
					</div>

					<!-- Side Panel: Truck Size Indicator -->
					<div class="space-y-6">
						<!-- Visual Size Card -->
						<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6">
							<h3 class="text-sm font-display font-bold text-gov-700 mb-4">Vehicle Size Assessment</h3>

							<!-- Truck silhouette area -->
							<div class="relative bg-gradient-to-b from-gov-50 to-surface-alt rounded-xl p-6 mb-4 overflow-hidden">
								<!-- Simple truck icon -->
								<div class="flex justify-center mb-4">
									<div class="relative">
										<svg class="w-32 h-20 {isOversize ? 'text-permit-denied' : 'text-gov-500'} transition-colors duration-300" viewBox="0 0 120 70" fill="currentColor">
											<!-- Truck body -->
											<rect x="0" y="15" width="70" height="35" rx="4" opacity="0.2"/>
											<rect x="70" y="5" width="45" height="45" rx="4" opacity="0.3"/>
											<!-- Cab -->
											<rect x="75" y="10" width="35" height="30" rx="3" opacity="0.4"/>
											<!-- Wheels -->
											<circle cx="20" cy="52" r="8" opacity="0.5"/>
											<circle cx="55" cy="52" r="8" opacity="0.5"/>
											<circle cx="100" cy="52" r="8" opacity="0.5"/>
										</svg>
										{#if isOversize}
											<div class="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-permit-denied flex items-center justify-center animate-scale-in">
												<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
											</div>
										{/if}
									</div>
								</div>

								<!-- Size Status -->
								<div class="text-center">
									{#if isOversize}
										<span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 text-permit-denied text-sm font-bold">
											<span class="w-2 h-2 rounded-full bg-permit-denied animate-pulse"></span>
											OVERSIZE / OVERWEIGHT
										</span>
									{:else}
										<span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-permit-approved text-sm font-bold">
											<span class="w-2 h-2 rounded-full bg-permit-approved"></span>
											WITHIN STANDARD LIMITS
										</span>
									{/if}
								</div>
							</div>

							<!-- Dimension breakdown -->
							<div class="space-y-3">
								<div class="flex items-center justify-between text-sm">
									<span class="text-gov-500">Weight</span>
									<div class="flex items-center gap-2">
										<span class="font-mono font-bold {isOverWeight ? 'text-permit-denied' : 'text-gov-900'}">{weight.toLocaleString()} lbs</span>
										<div class="w-2 h-2 rounded-full {isOverWeight ? 'bg-permit-denied' : 'bg-permit-approved'}"></div>
									</div>
								</div>
								<div class="flex items-center justify-between text-sm">
									<span class="text-gov-500">Height</span>
									<div class="flex items-center gap-2">
										<span class="font-mono font-bold {isOverHeight ? 'text-permit-denied' : 'text-gov-900'}">{height} ft</span>
										<div class="w-2 h-2 rounded-full {isOverHeight ? 'bg-permit-denied' : 'bg-permit-approved'}"></div>
									</div>
								</div>
								<div class="flex items-center justify-between text-sm">
									<span class="text-gov-500">Width</span>
									<div class="flex items-center gap-2">
										<span class="font-mono font-bold {isOverWidth ? 'text-permit-denied' : 'text-gov-900'}">{width} ft</span>
										<div class="w-2 h-2 rounded-full {isOverWidth ? 'bg-permit-denied' : 'bg-permit-approved'}"></div>
									</div>
								</div>
								<div class="flex items-center justify-between text-sm">
									<span class="text-gov-500">Length</span>
									<div class="flex items-center gap-2">
										<span class="font-mono font-bold {isOverLength ? 'text-permit-denied' : 'text-gov-900'}">{length} ft</span>
										<div class="w-2 h-2 rounded-full {isOverLength ? 'bg-permit-denied' : 'bg-permit-approved'}"></div>
									</div>
								</div>
							</div>
						</div>

						<!-- Info Card -->
						<div class="bg-gradient-to-br from-civic-50 to-civic-100 rounded-2xl border border-civic-200 p-5">
							<div class="flex gap-3">
								<div class="w-8 h-8 rounded-lg bg-civic-500 flex items-center justify-center flex-shrink-0">
									<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
								</div>
								<div>
									<h4 class="text-sm font-bold text-civic-600 mb-1">Permit Requirements</h4>
									<p class="text-xs text-gov-500 leading-relaxed">Vehicles exceeding standard dimensions require a Commercial Vehicle Route Permit. Processing takes approximately 7 business days.</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			{/if}

			<!-- ═══════════════════════════════════════════════════════════ -->
			<!-- STEP 2: Route Builder -->
			<!-- ═══════════════════════════════════════════════════════════ -->
			{#if currentStep === 2}
			<div class="animate-slide-in-right">
				<div class="grid grid-cols-1 lg:grid-cols-5 gap-6" style="min-height: 600px;">
					<!-- Left: Stop List -->
					<div class="lg:col-span-2">
						<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6 h-full flex flex-col">
							<div class="flex items-center justify-between mb-4">
								<div>
									<h2 class="text-xl font-display font-bold text-gov-900">Route Stops</h2>
									<p class="text-sm text-gov-400">{stops.length} stops planned</p>
								</div>
								<button
									onclick={addStop}
									class="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-civic-500 to-civic-400 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-civic-600 hover:to-civic-500 transition-all active:scale-95"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
									Add Stop
								</button>
							</div>

							<!-- Stops -->
							<div class="flex-1 overflow-y-auto space-y-3 pr-1">
								{#each stops as stop, idx}
									<div class="group relative bg-surface-alt rounded-xl border border-gov-100 p-4 transition-all hover:border-gov-200 hover:shadow-sm animate-fade-in">
										<!-- Stop number badge -->
										<div class="flex items-start gap-3">
											<div class="flex flex-col items-center gap-1">
												<div
													class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md flex-shrink-0"
													style="background: {STOP_COLORS[stop.stopType]}"
												>
													{idx + 1}
												</div>
												{#if idx < stops.length - 1}
													<div class="w-0.5 h-6 bg-gov-200 rounded-full"></div>
												{/if}
											</div>

											<div class="flex-1 min-w-0 space-y-2">
												<!-- Stop Type -->
												<select
													bind:value={stop.stopType}
													class="w-full px-2.5 py-1.5 bg-white border border-gov-200 rounded-lg text-xs font-semibold text-gov-700 focus:outline-none focus:ring-2 focus:ring-civic-400 transition-all"
												>
													{#each STOP_TYPES as stype}
														<option value={stype}>{stype}</option>
													{/each}
												</select>

												<!-- Address -->
												<input
													type="text"
													bind:value={stop.address}
													onblur={() => handleAddressBlur(idx)}
													onkeydown={(e) => handleAddressKeydown(e, idx)}
													placeholder="Enter address..."
													class="w-full px-3 py-2 bg-white border border-gov-200 rounded-lg text-sm text-gov-900 placeholder:text-gov-300 focus:outline-none focus:ring-2 focus:ring-civic-400 transition-all"
												/>

												<!-- Geocoded indicator -->
												{#if stop.lat !== null}
													<div class="flex items-center gap-1 text-[10px] text-permit-approved font-medium">
														<span class="w-1.5 h-1.5 rounded-full bg-permit-approved"></span>
														Located: {stop.lat?.toFixed(4)}, {stop.lng?.toFixed(4)}
													</div>
												{/if}
											</div>

											<!-- Controls -->
											<div class="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
												<button
													onclick={() => moveStop(idx, -1)}
													disabled={idx === 0}
													class="w-6 h-6 rounded flex items-center justify-center text-gov-400 hover:text-gov-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
												>
													<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
												</button>
												<button
													onclick={() => moveStop(idx, 1)}
													disabled={idx === stops.length - 1}
													class="w-6 h-6 rounded flex items-center justify-center text-gov-400 hover:text-gov-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
												>
													<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
												</button>
												{#if stops.length > 2}
													<button
														onclick={() => removeStop(idx)}
														class="w-6 h-6 rounded flex items-center justify-center text-gov-300 hover:text-permit-denied hover:bg-red-50 transition-colors"
													>
														<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
													</button>
												{/if}
											</div>
										</div>
									</div>
								{/each}
							</div>

							<!-- Legend -->
							<div class="mt-4 pt-4 border-t border-gov-100">
								<p class="text-xs font-semibold text-gov-500 mb-2">Stop Types</p>
								<div class="flex flex-wrap gap-2">
									{#each Object.entries(STOP_COLORS) as [label, color]}
										<span class="inline-flex items-center gap-1 text-[10px] text-gov-500">
											<span class="w-2.5 h-2.5 rounded-full" style="background: {color}"></span>
											{label}
										</span>
									{/each}
								</div>
							</div>
						</div>
					</div>

					<!-- Right: Map -->
					<div class="lg:col-span-3">
						<div class="bg-white rounded-2xl shadow-card border border-gov-100 overflow-hidden h-full flex flex-col">
							<div class="px-6 py-4 border-b border-gov-100 bg-gradient-to-r from-gov-50 to-surface-alt">
								<h3 class="text-sm font-display font-bold text-gov-700">Route Map</h3>
								<p class="text-xs text-gov-400">Markers update automatically as you enter addresses</p>
							</div>
							<div class="flex-1 min-h-[500px]" bind:this={mapContainer}></div>
						</div>
					</div>
				</div>
			</div>
			{/if}

			<!-- ═══════════════════════════════════════════════════════════ -->
			<!-- STEP 3: Street Restrictions -->
			<!-- ═══════════════════════════════════════════════════════════ -->
			{#if currentStep === 3}
			<div class="animate-slide-in-right">
				<div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
					<!-- Left: Restrictions Table -->
					<div class="lg:col-span-3">
						<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6">
							<div class="flex items-center justify-between mb-6">
								<div>
									<h2 class="text-xl font-display font-bold text-gov-900">Street Restrictions</h2>
									<p class="text-sm text-gov-400">Known restrictions along your route for this vehicle</p>
								</div>
								<div class="flex items-center gap-2">
									{#if blockedCount > 0}
										<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-permit-denied text-xs font-bold">
											{blockedCount} Blocked
										</span>
									{/if}
									{#if conditionalCount > 0}
										<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
											{conditionalCount} Conditional
										</span>
									{/if}
								</div>
							</div>

							<!-- Restriction Items -->
							<div class="space-y-3">
								{#each restrictions as restriction, i}
									{@const statusColor = restriction.status === 'blocked' ? 'permit-denied' : restriction.status === 'conditional' ? 'amber-500' : 'permit-approved'}
									{@const statusBg = restriction.status === 'blocked' ? 'bg-red-50 border-red-200' : restriction.status === 'conditional' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}
									<div
										class="rounded-xl border p-4 transition-all hover:shadow-sm animate-slide-up {statusBg}"
										style="animation-delay: {i * 50}ms"
									>
										<div class="flex items-start gap-3">
											<!-- Status indicator -->
											<div class="mt-0.5">
												{#if restriction.status === 'blocked'}
													<div class="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
														<svg class="w-4 h-4 text-permit-denied" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
													</div>
												{:else if restriction.status === 'conditional'}
													<div class="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
														<svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
													</div>
												{:else}
													<div class="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
														<svg class="w-4 h-4 text-permit-approved" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
													</div>
												{/if}
											</div>

											<div class="flex-1 min-w-0">
												<div class="flex items-center gap-2 mb-1">
													<h4 class="text-sm font-display font-bold text-gov-900">{restriction.street}</h4>
													<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
														{restriction.status === 'blocked' ? 'bg-red-200 text-permit-denied' :
														 restriction.status === 'conditional' ? 'bg-amber-200 text-amber-700' :
														 'bg-green-200 text-green-700'}">
														{restriction.status}
													</span>
												</div>
												<p class="text-xs text-gov-500 mb-1">{restriction.restriction}</p>
												<p class="text-xs text-gov-400 italic">{restriction.detail}</p>
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>

					<!-- Right: Summary & Map -->
					<div class="lg:col-span-2 space-y-6">
						<!-- Route Alert -->
						{#if blockedCount > 0}
						<div class="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border border-red-200 p-5 animate-scale-in">
							<div class="flex gap-3">
								<div class="w-10 h-10 rounded-xl bg-permit-denied flex items-center justify-center flex-shrink-0">
									<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
								</div>
								<div>
									<h4 class="text-sm font-bold text-permit-denied mb-1">Route Restrictions Detected</h4>
									<p class="text-xs text-gov-600 leading-relaxed">Your route passes through {blockedCount} restricted area{blockedCount > 1 ? 's' : ''}. An alternate route suggestion is available. Restrictions will be reviewed as part of your permit application.</p>
								</div>
							</div>
						</div>
						{/if}

						<!-- Mini Map with restrictions -->
						<div class="bg-white rounded-2xl shadow-card border border-gov-100 overflow-hidden">
							<div class="px-5 py-3 border-b border-gov-100 bg-gradient-to-r from-gov-50 to-surface-alt">
								<h3 class="text-sm font-display font-bold text-gov-700">Route with Restrictions</h3>
								<p class="text-xs text-gov-400">Red = blocked, Yellow = conditional</p>
							</div>
							<div class="h-64" bind:this={mapContainer}></div>
						</div>

						<!-- Legend -->
						<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-5">
							<h3 class="text-sm font-display font-bold text-gov-700 mb-3">Legend</h3>
							<div class="space-y-2.5">
								<div class="flex items-center gap-2.5">
									<div class="w-6 h-1 rounded-full bg-permit-denied"></div>
									<span class="text-xs text-gov-600">Blocked - Vehicle cannot pass</span>
								</div>
								<div class="flex items-center gap-2.5">
									<div class="w-6 h-1 rounded-full bg-amber-500" style="background: repeating-linear-gradient(90deg, #f59e0b 0, #f59e0b 4px, transparent 4px, transparent 8px)"></div>
									<span class="text-xs text-gov-600">Conditional - Time or escort required</span>
								</div>
								<div class="flex items-center gap-2.5">
									<div class="w-6 h-1 rounded-full bg-permit-approved"></div>
									<span class="text-xs text-gov-600">Clear - No restrictions</span>
								</div>
								<div class="flex items-center gap-2.5">
									<div class="w-6 h-1 rounded-full bg-gov-500" style="background: repeating-linear-gradient(90deg, #233d78 0, #233d78 4px, transparent 4px, transparent 8px)"></div>
									<span class="text-xs text-gov-600">Your planned route</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			{/if}

			<!-- ═══════════════════════════════════════════════════════════ -->
			<!-- STEP 4: Review & Submit -->
			<!-- ═══════════════════════════════════════════════════════════ -->
			{#if currentStep === 4}
			<div class="animate-slide-in-right">
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<!-- Main Review -->
					<div class="lg:col-span-2 space-y-6">
						<!-- Vehicle Summary -->
						<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6 animate-slide-up">
							<div class="flex items-center gap-3 mb-5">
								<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-gov-600 to-gov-500 flex items-center justify-center">
									<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/></svg>
								</div>
								<div>
									<h3 class="text-lg font-display font-bold text-gov-900">Vehicle Information</h3>
									<p class="text-xs text-gov-400">Review your vehicle details</p>
								</div>
							</div>

							<div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
								<div class="bg-surface-alt rounded-xl p-3">
									<p class="text-[10px] font-semibold text-gov-400 uppercase tracking-wider mb-1">Type</p>
									<p class="text-sm font-bold text-gov-900">{truckType}</p>
								</div>
								<div class="bg-surface-alt rounded-xl p-3">
									<p class="text-[10px] font-semibold text-gov-400 uppercase tracking-wider mb-1">Plate</p>
									<p class="text-sm font-mono font-bold text-gov-900">{plateNumber || 'N/A'}</p>
								</div>
								<div class="bg-surface-alt rounded-xl p-3">
									<p class="text-[10px] font-semibold text-gov-400 uppercase tracking-wider mb-1">Axles</p>
									<p class="text-sm font-bold text-gov-900">{axles}</p>
								</div>
								<div class="bg-surface-alt rounded-xl p-3">
									<p class="text-[10px] font-semibold text-gov-400 uppercase tracking-wider mb-1">Weight</p>
									<p class="text-sm font-mono font-bold {isOverWeight ? 'text-permit-denied' : 'text-gov-900'}">{weight.toLocaleString()} lbs</p>
								</div>
								<div class="bg-surface-alt rounded-xl p-3">
									<p class="text-[10px] font-semibold text-gov-400 uppercase tracking-wider mb-1">Dimensions</p>
									<p class="text-sm font-mono font-bold text-gov-900">{height}' x {width}' x {length}'</p>
								</div>
								{#if isOversize}
								<div class="bg-red-50 rounded-xl p-3 border border-red-200">
									<p class="text-[10px] font-semibold text-permit-denied uppercase tracking-wider mb-1">Status</p>
									<p class="text-sm font-bold text-permit-denied">OVERSIZE</p>
								</div>
								{/if}
							</div>
						</div>

						<!-- Route Summary -->
						<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6 animate-slide-up" style="animation-delay: 100ms">
							<div class="flex items-center gap-3 mb-5">
								<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-civic-500 to-civic-400 flex items-center justify-center">
									<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
								</div>
								<div>
									<h3 class="text-lg font-display font-bold text-gov-900">Route ({stops.length} stops)</h3>
									<p class="text-xs text-gov-400">Your planned route through DC</p>
								</div>
							</div>

							<div class="space-y-2">
								{#each stops as stop, idx}
									<div class="flex items-center gap-3 py-2 {idx < stops.length - 1 ? 'border-b border-gov-50' : ''}">
										<div
											class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
											style="background: {STOP_COLORS[stop.stopType]}"
										>
											{idx + 1}
										</div>
										<div class="flex-1 min-w-0">
											<p class="text-sm font-medium text-gov-900 truncate">{stop.address || 'No address entered'}</p>
											<p class="text-xs text-gov-400">{stop.stopType}</p>
										</div>
									</div>
								{/each}
							</div>
						</div>

						<!-- Restrictions Summary -->
						{#if blockedCount > 0 || conditionalCount > 0}
						<div class="bg-gradient-to-r from-amber-50 to-red-50 rounded-2xl border border-amber-200 p-6 animate-slide-up" style="animation-delay: 200ms">
							<div class="flex items-start gap-3">
								<div class="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
									<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
								</div>
								<div>
									<h3 class="text-sm font-bold text-gov-900 mb-1">Route Restriction Warnings</h3>
									<p class="text-xs text-gov-600">{blockedCount} blocked street{blockedCount !== 1 ? 's' : ''} and {conditionalCount} conditional restriction{conditionalCount !== 1 ? 's' : ''} detected. These will be reviewed by the permitting authority and may affect your approved route.</p>
								</div>
							</div>
						</div>
						{/if}
					</div>

					<!-- Right: Fee & Submit -->
					<div class="space-y-6">
						<!-- Fee Card -->
						<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6 animate-slide-up" style="animation-delay: 150ms">
							<h3 class="text-lg font-display font-bold text-gov-900 mb-4">Fee Summary</h3>

							<div class="space-y-3 mb-4">
								<div class="flex items-center justify-between text-sm">
									<span class="text-gov-500">Permit Fee</span>
									<span class="font-mono font-bold text-gov-900">$150.00</span>
								</div>
								<div class="flex items-center justify-between text-sm">
									<span class="text-gov-500">Technology Fee</span>
									<span class="font-mono font-bold text-gov-900">$15.00</span>
								</div>
								{#if isOversize}
								<div class="flex items-center justify-between text-sm">
									<span class="text-gov-500">Oversize Surcharge</span>
									<span class="font-mono font-bold text-amber-600">$0.00</span>
								</div>
								{/if}
								<div class="border-t border-gov-100 pt-3 flex items-center justify-between">
									<span class="text-sm font-bold text-gov-900">Total</span>
									<span class="text-xl font-mono font-bold text-gov-900">$165.00</span>
								</div>
							</div>

							<div class="bg-gov-50 rounded-xl p-3 mb-6">
								<div class="flex items-center gap-2 mb-1">
									<svg class="w-4 h-4 text-gov-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
									<span class="text-xs font-semibold text-gov-700">Estimated Processing</span>
								</div>
								<p class="text-sm font-bold text-gov-900 ml-6">7 business days</p>
							</div>

							<!-- Submit Button -->
							<button
								onclick={handleSubmit}
								disabled={isSubmitting}
								class="w-full py-4 px-6 bg-gradient-to-r from-gov-600 to-gov-500 text-white font-display font-bold text-base rounded-xl shadow-lg hover:shadow-xl hover:from-gov-700 hover:to-gov-600 transition-all duration-200 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
							>
								{#if isSubmitting}
									<svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
									Submitting Application...
								{:else}
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
									Submit Permit Application
								{/if}
							</button>
						</div>

						<!-- Terms -->
						<div class="bg-gradient-to-br from-gov-50 to-surface-alt rounded-2xl border border-gov-100 p-5">
							<p class="text-xs text-gov-400 leading-relaxed">
								By submitting this application, you certify that the information provided is accurate and complete. The DC Department of Transportation will review your application and may request additional documentation. Approved permits are valid for single use on the specified route and date.
							</p>
						</div>
					</div>
				</div>
			</div>
			{/if}
		</div>

		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- Navigation Buttons -->
		<!-- ═══════════════════════════════════════════════════════════ -->
		{#if !isSubmitted}
		<div class="flex items-center justify-between mt-8 pt-6 border-t border-gov-100">
			<button
				onclick={prevStep}
				disabled={currentStep === 1}
				class="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl transition-all duration-200
					{currentStep === 1 ? 'text-gov-300 cursor-not-allowed' : 'text-gov-600 hover:bg-gov-50 hover:text-gov-800 active:scale-[0.98]'}"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
				Previous
			</button>

			<div class="flex items-center gap-2">
				{#each STEPS as step}
					<div class="w-2.5 h-2.5 rounded-full transition-all duration-300 {currentStep === step.num ? 'bg-gov-600 scale-125' : currentStep > step.num ? 'bg-permit-approved' : 'bg-gov-200'}"></div>
				{/each}
			</div>

			{#if currentStep < 4}
				<button
					onclick={nextStep}
					disabled={(currentStep === 1 && !step1Valid) || (currentStep === 2 && !step2Valid)}
					class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gov-600 to-gov-500 text-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-gov-700 hover:to-gov-600 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Next Step
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
				</button>
			{:else}
				<div class="w-[120px]"></div>
			{/if}
		</div>
		{/if}
	</main>
</div>
{/if}

<style>
	/* Fix Leaflet container sizing */
	:global(.leaflet-container) {
		width: 100%;
		height: 100%;
		min-height: 400px;
		z-index: 1;
	}

	/* Custom marker cleanup */
	:global(.custom-marker) {
		background: transparent !important;
		border: none !important;
	}

	/* Smooth step transitions */
	@keyframes slide-in-from-right {
		from { opacity: 0; transform: translateX(40px); }
		to { opacity: 1; transform: translateX(0); }
	}
	@keyframes slide-in-from-left {
		from { opacity: 0; transform: translateX(-40px); }
		to { opacity: 1; transform: translateX(0); }
	}
</style>
