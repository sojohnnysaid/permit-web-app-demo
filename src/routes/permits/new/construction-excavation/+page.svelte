<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { permits } from '$lib/stores/permits.svelte';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import NavHeader from '$lib/components/NavHeader.svelte';

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

	// ─── Step 1: Project Details ────────────────────────────────────
	const WORK_TYPES = [
		'Street Cut',
		'Utility Installation',
		'Building Construction',
		'Sidewalk Repair',
		'Bridge/Tunnel Work',
		'Emergency Repair'
	];

	const EQUIPMENT_OPTIONS = [
		'Backhoe',
		'Crane',
		'Drill Rig',
		'Excavator',
		'Concrete Mixer',
		'None'
	];

	let workType = $state('Street Cut');
	let projectDescription = $state('');
	let contractorName = $state('');
	let licenseNumber = $state('');
	let startDate = $state('');
	let endDate = $state('');
	let numWorkers = $state(4);
	let selectedEquipment = $state<string[]>([]);

	function toggleEquipment(item: string) {
		if (item === 'None') {
			selectedEquipment = selectedEquipment.includes('None') ? [] : ['None'];
			return;
		}
		if (selectedEquipment.includes('None')) {
			selectedEquipment = [item];
			return;
		}
		if (selectedEquipment.includes(item)) {
			selectedEquipment = selectedEquipment.filter(e => e !== item);
		} else {
			selectedEquipment = [...selectedEquipment, item];
		}
	}

	let durationWeeks = $derived.by(() => {
		if (!startDate || !endDate) return 0;
		const start = new Date(startDate);
		const end = new Date(endDate);
		const diffMs = end.getTime() - start.getTime();
		if (diffMs <= 0) return 0;
		return Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)));
	});

	let durationExceeds30 = $derived.by(() => {
		if (!startDate || !endDate) return false;
		const start = new Date(startDate);
		const end = new Date(endDate);
		const diffDays = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
		return diffDays > 30;
	});

	// ─── Step 2: Location & GIS ─────────────────────────────────────
	const DC_ADDRESSES = [
		{ address: '1350 Pennsylvania Ave NW, Washington, DC 20004', ward: 'Ward 6', quadrant: 'NW' },
		{ address: '801 Mount Vernon Pl NW, Washington, DC 20001', ward: 'Ward 2', quadrant: 'NW' },
		{ address: '2000 14th St NW, Washington, DC 20009', ward: 'Ward 1', quadrant: 'NW' },
		{ address: '600 H St NE, Washington, DC 20002', ward: 'Ward 6', quadrant: 'NE' },
		{ address: '3100 Martin Luther King Jr Ave SE, Washington, DC 20032', ward: 'Ward 8', quadrant: 'SE' },
		{ address: '4200 Connecticut Ave NW, Washington, DC 20008', ward: 'Ward 3', quadrant: 'NW' },
		{ address: '1800 Columbia Rd NW, Washington, DC 20009', ward: 'Ward 1', quadrant: 'NW' },
		{ address: '500 New Jersey Ave NW, Washington, DC 20001', ward: 'Ward 6', quadrant: 'NW' },
		{ address: '3200 Georgia Ave NW, Washington, DC 20010', ward: 'Ward 4', quadrant: 'NW' },
		{ address: '700 Constitution Ave NE, Washington, DC 20002', ward: 'Ward 6', quadrant: 'NE' },
		{ address: '1900 East Capitol St SE, Washington, DC 20003', ward: 'Ward 7', quadrant: 'SE' },
		{ address: '2500 Wisconsin Ave NW, Washington, DC 20007', ward: 'Ward 3', quadrant: 'NW' },
		{ address: '4500 South Capitol St SW, Washington, DC 20032', ward: 'Ward 8', quadrant: 'SW' },
		{ address: '1250 U St NW, Washington, DC 20009', ward: 'Ward 1', quadrant: 'NW' },
		{ address: '800 Bladensburg Rd NE, Washington, DC 20002', ward: 'Ward 5', quadrant: 'NE' }
	];

	let addressInput = $state('');
	let selectedAddress = $state('');
	let detectedWard = $state('');
	let quadrant = $state('NW');
	let showAddressSuggestions = $state(false);
	let markerLat = $state<number | null>(null);
	let markerLng = $state<number | null>(null);

	let filteredAddresses = $derived.by(() => {
		if (addressInput.length < 2) return [];
		const query = addressInput.toLowerCase();
		return DC_ADDRESSES.filter(a => a.address.toLowerCase().includes(query)).slice(0, 5);
	});

	function selectAddress(addr: typeof DC_ADDRESSES[0]) {
		addressInput = addr.address;
		selectedAddress = addr.address;
		detectedWard = addr.ward;
		quadrant = addr.quadrant;
		showAddressSuggestions = false;

		const coords = fakeGeocode(addr.address);
		markerLat = coords.lat;
		markerLng = coords.lng;
		updateMapMarker();
	}

	function handleAddressInput() {
		showAddressSuggestions = addressInput.length >= 2;
		if (addressInput !== selectedAddress) {
			detectedWard = '';
		}
	}

	const NEARBY_PROJECTS = [
		{ name: 'DC Water Main Replacement', distance: '0.3 mi', status: 'Active', type: 'Utility' },
		{ name: 'PEPCO Underground Conduit', distance: '0.5 mi', status: 'Planned', type: 'Utility' },
		{ name: 'Sidewalk ADA Upgrade', distance: '0.8 mi', status: 'Complete', type: 'Public Works' }
	];

	// ─── Step 3: Site Plan & Documents ──────────────────────────────
	const DOCUMENT_TYPES = [
		'Site Plan',
		'Traffic Control Plan',
		'Insurance Certificate',
		'Contractor License'
	];

	interface UploadedDoc {
		id: string;
		name: string;
		type: string;
		size: string;
		uploadedAt: string;
	}

	let selectedDocType = $state('Site Plan');
	let uploadedDocs = $state<UploadedDoc[]>([]);
	let isDragOver = $state(false);

	let requiredDocsStatus = $derived.by(() => {
		return DOCUMENT_TYPES.map(docType => ({
			type: docType,
			uploaded: uploadedDocs.some(d => d.type === docType)
		}));
	});

	let allRequiredUploaded = $derived(requiredDocsStatus.every(d => d.uploaded));

	function simulateUpload(fileName?: string) {
		const fakeName = fileName || `${selectedDocType.toLowerCase().replace(/ /g, '_')}_${Date.now()}.pdf`;
		const fakeSize = `${(Math.random() * 4 + 0.5).toFixed(1)} MB`;
		const newDoc: UploadedDoc = {
			id: crypto.randomUUID(),
			name: fakeName,
			type: selectedDocType,
			size: fakeSize,
			uploadedAt: new Date().toLocaleTimeString()
		};
		uploadedDocs = [...uploadedDocs, newDoc];
	}

	function removeDoc(id: string) {
		uploadedDocs = uploadedDocs.filter(d => d.id !== id);
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragOver = false;
		const files = e.dataTransfer?.files;
		if (files && files.length > 0) {
			for (let i = 0; i < files.length; i++) {
				simulateUpload(files[i].name);
			}
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragOver = true;
	}

	function handleDragLeave() {
		isDragOver = false;
	}

	function handleFileClick() {
		simulateUpload();
	}

	// ─── Step 4: Fee Estimate ───────────────────────────────────────
	let baseFee = $derived(250);
	let planReviewFee = $derived(150);
	let inspectionFee = $derived(Math.max(1, durationWeeks) * 100);
	let technologyFee = $derived(25);
	let refundableDeposit = $derived(500);
	let subtotal = $derived(baseFee + planReviewFee + inspectionFee + technologyFee);
	let total = $derived(subtotal + refundableDeposit);

	// ─── Step 5: Review & Submit ────────────────────────────────────
	interface PreCheckItem {
		label: string;
		status: 'pass' | 'warn' | 'fail';
		detail: string;
	}

	let preSubmissionChecks = $derived.by<PreCheckItem[]>(() => {
		const checks: PreCheckItem[] = [];

		checks.push({
			label: 'Work Type',
			status: workType ? 'pass' : 'fail',
			detail: workType ? `${workType} selected` : 'Work type not selected'
		});

		checks.push({
			label: 'Project Description',
			status: projectDescription.length >= 10 ? 'pass' : projectDescription.length > 0 ? 'warn' : 'fail',
			detail: projectDescription.length >= 10 ? 'Description provided' : 'Description may be too brief for review'
		});

		checks.push({
			label: 'Contractor Information',
			status: contractorName && licenseNumber ? 'pass' : 'fail',
			detail: contractorName && licenseNumber ? `${contractorName} (License: ${licenseNumber})` : 'Missing contractor info'
		});

		checks.push({
			label: 'Project Duration',
			status: durationExceeds30 ? 'warn' : (startDate && endDate && durationWeeks > 0) ? 'pass' : 'fail',
			detail: durationExceeds30 ? 'Duration exceeds 30 days — extended permit review may apply' : durationWeeks > 0 ? `${durationWeeks} week${durationWeeks !== 1 ? 's' : ''} (${startDate} to ${endDate})` : 'Dates not set'
		});

		checks.push({
			label: 'Site Location',
			status: selectedAddress ? 'pass' : 'fail',
			detail: selectedAddress ? `${selectedAddress}` : 'No address selected'
		});

		checks.push({
			label: 'Ward Detection',
			status: detectedWard ? 'pass' : 'warn',
			detail: detectedWard ? `${detectedWard} — ${quadrant} quadrant` : 'Ward not auto-detected'
		});

		checks.push({
			label: 'Required Documents',
			status: allRequiredUploaded ? 'pass' : uploadedDocs.length > 0 ? 'warn' : 'fail',
			detail: allRequiredUploaded ? 'All required documents uploaded' : `${requiredDocsStatus.filter(d => !d.uploaded).length} document${requiredDocsStatus.filter(d => !d.uploaded).length !== 1 ? 's' : ''} still required`
		});

		if (workType === 'Emergency Repair') {
			checks.push({
				label: 'Emergency Classification',
				status: 'warn',
				detail: 'Emergency repairs may qualify for expedited 24-hour review per DCMR Title 24, Chapter 5'
			});
		}

		if (numWorkers > 20) {
			checks.push({
				label: 'Large Crew Size',
				status: 'warn',
				detail: `${numWorkers} workers — additional safety documentation may be required`
			});
		}

		return checks;
	});

	let passCount = $derived(preSubmissionChecks.filter(c => c.status === 'pass').length);
	let warnCount = $derived(preSubmissionChecks.filter(c => c.status === 'warn').length);
	let failCount = $derived(preSubmissionChecks.filter(c => c.status === 'fail').length);

	// ─── Leaflet Map ────────────────────────────────────────────────
	let mapContainer: HTMLDivElement | undefined = $state();
	let map: any = $state(null);
	let L: any = $state(null);
	let marker: any = $state(null);

	function fakeGeocode(address: string): { lat: number; lng: number } {
		let hash = 0;
		for (let i = 0; i < address.length; i++) {
			hash = ((hash << 5) - hash) + address.charCodeAt(i);
			hash |= 0;
		}
		const latOff = ((hash % 100) / 100) * 0.04 - 0.02;
		const lngOff = (((hash >> 8) % 100) / 100) * 0.04 - 0.02;
		return { lat: 38.9072 + latOff, lng: -77.0369 + lngOff };
	}

	async function initMap() {
		if (!browser || !mapContainer) return;
		const leaflet = await import('leaflet');
		L = leaflet.default || leaflet;

		map = L.map(mapContainer, {
			zoomControl: true,
			scrollWheelZoom: true
		}).setView([38.9072, -77.0369], 14);

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
			maxZoom: 19
		}).addTo(map);

		map.on('click', (e: any) => {
			markerLat = e.latlng.lat;
			markerLng = e.latlng.lng;
			updateMapMarker();
		});

		if (markerLat !== null && markerLng !== null) {
			updateMapMarker();
		}
	}

	function updateMapMarker() {
		if (!map || !L) return;
		if (marker) marker.remove();

		if (markerLat !== null && markerLng !== null) {
			const icon = L.divIcon({
				className: 'custom-marker',
				html: `<div style="
					width: 36px; height: 36px; border-radius: 50%;
					background: #233d78; border: 3px solid white;
					box-shadow: 0 2px 8px rgba(0,0,0,0.3);
					display: flex; align-items: center; justify-content: center;
					color: white; font-weight: 700; font-size: 16px;
					font-family: system-ui, sans-serif;
				">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
				</div>`,
				iconSize: [36, 36],
				iconAnchor: [18, 18]
			});

			marker = L.marker([markerLat, markerLng], { icon })
				.addTo(map)
				.bindPopup(`<b>Work Site</b><br/>${selectedAddress || 'Selected location'}<br/><small>${markerLat.toFixed(4)}, ${markerLng.toFixed(4)}</small>`)
				.openPopup();

			map.setView([markerLat, markerLng], 16);
		}
	}

	onDestroy(() => {
		if (map) {
			map.remove();
			map = null;
		}
	});

	$effect(() => {
		const _step = currentStep;
		if (_step === 2 && mapContainer && !map) {
			initMap();
		}
		if (map && L) {
			setTimeout(() => {
				map?.invalidateSize();
				updateMapMarker();
			}, 100);
		}
	});

	// ─── Validation ─────────────────────────────────────────────────
	let step1Valid = $derived(
		workType !== '' &&
		projectDescription.trim().length >= 5 &&
		contractorName.trim().length >= 2 &&
		licenseNumber.trim().length >= 3 &&
		startDate !== '' &&
		endDate !== '' &&
		durationWeeks > 0 &&
		numWorkers > 0
	);

	let step2Valid = $derived(
		selectedAddress !== '' &&
		detectedWard !== '' &&
		quadrant !== '' &&
		markerLat !== null
	);

	let step3Valid = $derived(uploadedDocs.length > 0);

	// ─── Navigation ─────────────────────────────────────────────────
	const STEPS = [
		{ num: 1, label: 'Project Details', icon: 'clipboard' },
		{ num: 2, label: 'Location & GIS', icon: 'map' },
		{ num: 3, label: 'Documents', icon: 'file' },
		{ num: 4, label: 'Fee Estimate', icon: 'dollar' },
		{ num: 5, label: 'Review & Submit', icon: 'check' }
	];

	function nextStep() {
		if (currentStep === 1 && !step1Valid) return;
		if (currentStep === 2 && !step2Valid) return;
		if (currentStep === 3 && !step3Valid) return;
		if (currentStep < 5) {
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
		await new Promise(r => setTimeout(r, 2000));

		const newPermit = permits.addPermit({
			type: 'construction_excavation',
			title: `${workType} — ${selectedAddress || 'DC Area'}`,
			description: projectDescription || `${workType} permit for ${contractorName}. ${durationWeeks} week duration with ${numWorkers} workers on site.`,
			status: 'submitted',
			ward: detectedWard || 'Ward 6',
			quadrant: quadrant,
			slaDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
			addresses: markerLat !== null && markerLng !== null ? [{
				address: selectedAddress,
				lat: markerLat,
				lng: markerLng,
				stopType: 'start' as const
			}] : [],
			damageType: workType
		});

		submittedRef = newPermit.referenceNumber;
		isSubmitting = false;
		isSubmitted = true;

		setTimeout(() => {
			goto('/dashboard');
		}, 3500);
	}
</script>

<svelte:head>
	<title>New Construction/Excavation Permit - TOPS</title>
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

{#if auth.isAuthenticated}
<div class="min-h-screen bg-surface-alt">
	<NavHeader />

	<!-- Sub-Header -->
	<div class="bg-white/80 backdrop-blur-xl border-b border-gov-100">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex items-center gap-3 h-14">
				<a href="/permits/new" class="flex items-center gap-2 text-gov-400 hover:text-gov-700 transition-colors">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
					<span class="text-sm font-medium">Back</span>
				</a>
				<div class="w-px h-8 bg-gov-100"></div>
				<div class="w-9 h-9 rounded-lg bg-gradient-to-br from-permit-pending to-amber-400 flex items-center justify-center">
					<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
				</div>
				<div>
					<h1 class="text-lg font-display font-bold text-gov-900">Construction / Excavation Permit</h1>
					<p class="text-xs text-gov-400">Public Right-of-Way Work Authorization</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Success Overlay -->
	{#if isSubmitted}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-gov-900/60 backdrop-blur-sm">
		<div class="bg-white rounded-2xl shadow-modal p-10 text-center max-w-md mx-4">
			<div class="w-20 h-20 rounded-full bg-gradient-to-br from-permit-approved to-emerald-400 flex items-center justify-center mx-auto mb-6">
				<svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
			</div>
			<h2 class="text-2xl font-display font-bold text-gov-900 mb-2">Permit Application Submitted!</h2>
			<p class="text-gov-400 mb-4">Your Construction/Excavation permit application has been received and is being processed.</p>
			<div class="bg-gov-50 rounded-xl p-4 mb-6">
				<p class="text-xs text-gov-400 mb-1">Reference Number</p>
				<p class="text-lg font-mono font-bold text-gov-700">{submittedRef}</p>
			</div>
			<div class="flex items-center justify-center gap-4 text-sm text-gov-400 mb-2">
				<div class="flex items-center gap-1.5">
					<svg class="w-4 h-4 text-civic-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
					<span>Estimated review: <span class="font-semibold text-gov-700">5-7 business days</span></span>
				</div>
			</div>
			<p class="text-xs text-gov-300 mt-3">Redirecting to dashboard...</p>
		</div>
	</div>
	{/if}

	<main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Step Indicator -->
		<div class="mb-8">
			<div class="flex items-center justify-between max-w-3xl mx-auto">
				{#each STEPS as step, i}
					{@const isActive = currentStep === step.num}
					{@const isCompleted = currentStep > step.num}
					<div class="flex items-center {i < STEPS.length - 1 ? 'flex-1' : ''}">
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
			<!-- STEP 1: Project Details -->
			<!-- ═══════════════════════════════════════════════════════════ -->
			{#if currentStep === 1}
			<div class="">
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<!-- Main Form -->
					<div class="lg:col-span-2 space-y-6">
						<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6 sm:p-8">
							<h2 class="text-xl font-display font-bold text-gov-900 mb-1">Project Details</h2>
							<p class="text-sm text-gov-400 mb-6">Describe the construction or excavation work to be performed in public right-of-way.</p>

							<!-- Work Type -->
							<div class="mb-6">
								<label for="workType" class="block text-sm font-semibold text-gov-700 mb-2">Work Type</label>
								<select
									id="workType"
									bind:value={workType}
									class="w-full px-4 py-3 bg-surface-alt border border-gov-200 rounded-xl text-gov-900 font-medium focus:outline-none focus:ring-2 focus:ring-civic-400 focus:border-transparent transition-all appearance-none"
								>
									{#each WORK_TYPES as type}
										<option value={type}>{type}</option>
									{/each}
								</select>
							</div>

							<!-- Project Description -->
							<div class="mb-6">
								<label for="description" class="block text-sm font-semibold text-gov-700 mb-2">Project Description</label>
								<textarea
									id="description"
									bind:value={projectDescription}
									rows={4}
									placeholder="Describe the scope of work, including any utility connections, road closures, or special conditions..."
									class="w-full px-4 py-3 bg-surface-alt border border-gov-200 rounded-xl text-gov-900 placeholder:text-gov-300 focus:outline-none focus:ring-2 focus:ring-civic-400 focus:border-transparent transition-all resize-none"
								></textarea>
								<p class="text-[10px] text-gov-300 mt-1">{projectDescription.length} characters</p>
							</div>

							<!-- Contractor Info -->
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
								<div>
									<label for="contractor" class="block text-sm font-semibold text-gov-700 mb-2">Contractor Name</label>
									<input
										id="contractor"
										type="text"
										bind:value={contractorName}
										placeholder="e.g., DC Paving Solutions LLC"
										class="w-full px-4 py-3 bg-surface-alt border border-gov-200 rounded-xl text-gov-900 placeholder:text-gov-300 focus:outline-none focus:ring-2 focus:ring-civic-400 focus:border-transparent transition-all"
									/>
								</div>
								<div>
									<label for="license" class="block text-sm font-semibold text-gov-700 mb-2">License Number</label>
									<input
										id="license"
										type="text"
										bind:value={licenseNumber}
										placeholder="e.g., DC-CON-2026-4481"
										class="w-full px-4 py-3 bg-surface-alt border border-gov-200 rounded-xl text-gov-900 font-mono placeholder:text-gov-300 focus:outline-none focus:ring-2 focus:ring-civic-400 focus:border-transparent transition-all uppercase"
									/>
								</div>
							</div>

							<!-- Duration -->
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
								<div>
									<label for="startDate" class="block text-sm font-semibold text-gov-700 mb-2">Start Date</label>
									<input
										id="startDate"
										type="date"
										bind:value={startDate}
										class="w-full px-4 py-3 bg-surface-alt border border-gov-200 rounded-xl text-gov-900 focus:outline-none focus:ring-2 focus:ring-civic-400 focus:border-transparent transition-all"
									/>
								</div>
								<div>
									<label for="endDate" class="block text-sm font-semibold text-gov-700 mb-2">End Date</label>
									<input
										id="endDate"
										type="date"
										bind:value={endDate}
										class="w-full px-4 py-3 bg-surface-alt border border-gov-200 rounded-xl text-gov-900 focus:outline-none focus:ring-2 focus:ring-civic-400 focus:border-transparent transition-all"
									/>
								</div>
							</div>

							{#if durationWeeks > 0}
								<div class="mb-6 flex items-center gap-2">
									<span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold
										{durationExceeds30 ? 'bg-amber-100 text-amber-700' : 'bg-civic-100 text-civic-600'}">
										<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
										{durationWeeks} week{durationWeeks !== 1 ? 's' : ''} estimated duration
									</span>
									{#if durationExceeds30}
										<span class="text-xs text-amber-600 font-medium">Extended review may apply</span>
									{/if}
								</div>
							{/if}

							<!-- Workers -->
							<div class="mb-6 max-w-xs">
								<label for="workers" class="block text-sm font-semibold text-gov-700 mb-2">Number of Workers on Site</label>
								<input
									id="workers"
									type="number"
									min="1"
									max="200"
									bind:value={numWorkers}
									class="w-full px-4 py-3 bg-surface-alt border border-gov-200 rounded-xl text-gov-900 font-mono focus:outline-none focus:ring-2 focus:ring-civic-400 focus:border-transparent transition-all"
								/>
							</div>

							<!-- Equipment -->
							<div>
								<label class="block text-sm font-semibold text-gov-700 mb-3">Equipment Needed</label>
								<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
									{#each EQUIPMENT_OPTIONS as equip}
										{@const isSelected = selectedEquipment.includes(equip)}
										<button
											onclick={() => toggleEquipment(equip)}
											class="flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 transition-all duration-200 text-left
												{isSelected ? 'border-civic-400 bg-civic-50 text-civic-600 shadow-sm' : 'border-gov-100 bg-surface-alt text-gov-500 hover:border-gov-200 hover:bg-white'}"
										>
											<div class="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all
												{isSelected ? 'border-civic-400 bg-civic-500' : 'border-gov-300 bg-white'}">
												{#if isSelected}
													<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
												{/if}
											</div>
											<span class="text-sm font-medium">{equip}</span>
										</button>
									{/each}
								</div>
							</div>
						</div>
					</div>

					<!-- Side Panel -->
					<div class="space-y-6">
						<!-- Work Type Info -->
						<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6">
							<h3 class="text-sm font-display font-bold text-gov-700 mb-4">Work Type Details</h3>
							<div class="relative bg-gradient-to-b from-gov-50 to-surface-alt rounded-xl p-5 mb-4">
								<div class="flex justify-center mb-3">
									<div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-permit-pending to-amber-400 flex items-center justify-center">
										{#if workType === 'Street Cut'}
											<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z"/></svg>
										{:else if workType === 'Utility Installation'}
											<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
										{:else if workType === 'Building Construction'}
											<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
										{:else if workType === 'Bridge/Tunnel Work'}
											<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4z"/></svg>
										{:else}
											<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
										{/if}
									</div>
								</div>
								<div class="text-center">
									<p class="text-sm font-bold text-gov-900 mb-1">{workType}</p>
									<p class="text-xs text-gov-400">
										{#if workType === 'Street Cut'}
											Cutting into roadway for utility access or repair
										{:else if workType === 'Utility Installation'}
											Installing new water, sewer, gas, or telecom lines
										{:else if workType === 'Building Construction'}
											Construction activity affecting public right-of-way
										{:else if workType === 'Sidewalk Repair'}
											Repairing or replacing public sidewalk segments
										{:else if workType === 'Bridge/Tunnel Work'}
											Structural work on bridges or tunnel infrastructure
										{:else}
											Urgent repair work requiring expedited processing
										{/if}
									</p>
								</div>
							</div>

							<!-- Quick Stats -->
							<div class="space-y-3">
								<div class="flex items-center justify-between text-sm">
									<span class="text-gov-500">Workers</span>
									<span class="font-mono font-bold text-gov-900">{numWorkers}</span>
								</div>
								<div class="flex items-center justify-between text-sm">
									<span class="text-gov-500">Equipment</span>
									<span class="font-bold text-gov-900">{selectedEquipment.length > 0 ? selectedEquipment.length + ' items' : 'None'}</span>
								</div>
								<div class="flex items-center justify-between text-sm">
									<span class="text-gov-500">Duration</span>
									<span class="font-bold {durationExceeds30 ? 'text-amber-600' : 'text-gov-900'}">{durationWeeks > 0 ? durationWeeks + ' week' + (durationWeeks !== 1 ? 's' : '') : 'Not set'}</span>
								</div>
							</div>
						</div>

						<!-- Regulation Hint -->
						<div class="bg-gradient-to-br from-civic-50 to-civic-100 rounded-2xl border border-civic-200 p-5">
							<div class="flex gap-3">
								<div class="w-8 h-8 rounded-lg bg-civic-500 flex items-center justify-center flex-shrink-0">
									<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
								</div>
								<div>
									<h4 class="text-sm font-bold text-civic-600 mb-1">DCMR Requirements</h4>
									<p class="text-xs text-gov-500 leading-relaxed">Construction/Excavation permits are governed by DCMR Title 24, Chapter 5 — Public Space Permits. All work impacting public right-of-way requires approved traffic control plans.</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			{/if}

			<!-- ═══════════════════════════════════════════════════════════ -->
			<!-- STEP 2: Location & GIS -->
			<!-- ═══════════════════════════════════════════════════════════ -->
			{#if currentStep === 2}
			<div class="">
				<div class="grid grid-cols-1 lg:grid-cols-5 gap-6" style="min-height: 600px;">
					<!-- Left: Address & Details -->
					<div class="lg:col-span-2">
						<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6 h-full flex flex-col">
							<h2 class="text-xl font-display font-bold text-gov-900 mb-1">Site Location</h2>
							<p class="text-sm text-gov-400 mb-6">Enter the work site address or click on the map to place a marker.</p>

							<!-- Address Input with Autocomplete -->
							<div class="mb-5 relative">
								<label for="address" class="block text-sm font-semibold text-gov-700 mb-2">
									Street Address
									<span class="text-xs font-normal text-gov-400 ml-1">(DC Master Address Repository)</span>
								</label>
								<div class="relative">
									<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gov-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
									<input
										id="address"
										type="text"
										bind:value={addressInput}
										oninput={handleAddressInput}
										onfocus={() => { if (addressInput.length >= 2) showAddressSuggestions = true; }}
										onblur={() => { setTimeout(() => { showAddressSuggestions = false; }, 200); }}
										placeholder="Start typing a DC address..."
										class="w-full pl-10 pr-4 py-3 bg-surface-alt border border-gov-200 rounded-xl text-gov-900 placeholder:text-gov-300 focus:outline-none focus:ring-2 focus:ring-civic-400 focus:border-transparent transition-all"
									/>
								</div>

								<!-- Autocomplete Dropdown -->
								{#if showAddressSuggestions && filteredAddresses.length > 0}
									<div class="absolute z-20 w-full mt-1 bg-white rounded-xl shadow-modal border border-gov-100 py-1 max-h-60 overflow-y-auto">
										{#each filteredAddresses as addr}
											<button
												onmousedown={() => selectAddress(addr)}
												class="w-full text-left px-4 py-3 hover:bg-gov-50 transition-colors flex items-start gap-3"
											>
												<svg class="w-4 h-4 text-gov-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
												<div>
													<p class="text-sm font-medium text-gov-900">{addr.address}</p>
													<p class="text-xs text-gov-400">{addr.ward} &middot; {addr.quadrant}</p>
												</div>
											</button>
										{/each}
									</div>
								{/if}
							</div>

							<!-- Ward Auto-Detection -->
							{#if detectedWard}
								<div class="mb-5 bg-gradient-to-r from-civic-50 to-surface-alt rounded-xl border border-civic-200 p-4">
									<div class="flex items-center gap-2 mb-2">
										<span class="w-2 h-2 rounded-full bg-civic-500"></span>
										<span class="text-xs font-bold text-civic-600 uppercase tracking-wider">Auto-Detected</span>
									</div>
									<div class="flex items-center gap-4">
										<div>
											<p class="text-xs text-gov-400">Ward</p>
											<p class="text-sm font-bold text-gov-900">{detectedWard}</p>
										</div>
										<div class="w-px h-8 bg-gov-200"></div>
										<div>
											<p class="text-xs text-gov-400">ANC</p>
											<p class="text-sm font-bold text-gov-900">ANC {detectedWard.replace('Ward ', '')}B</p>
										</div>
										<div class="w-px h-8 bg-gov-200"></div>
										<div>
											<p class="text-xs text-gov-400">SMD</p>
											<p class="text-sm font-bold text-gov-900">{detectedWard.replace('Ward ', '')}B04</p>
										</div>
									</div>
								</div>
							{/if}

							<!-- Quadrant Selector -->
							<div class="mb-5">
								<label class="block text-sm font-semibold text-gov-700 mb-2">Quadrant</label>
								<div class="grid grid-cols-4 gap-2">
									{#each ['NW', 'NE', 'SW', 'SE'] as q}
										<button
											onclick={() => { quadrant = q; }}
											class="py-2.5 rounded-xl text-sm font-bold transition-all duration-200 border-2
												{quadrant === q ? 'border-gov-500 bg-gov-500 text-white shadow-md' : 'border-gov-100 bg-surface-alt text-gov-500 hover:border-gov-200'}"
										>
											{q}
										</button>
									{/each}
								</div>
							</div>

							<!-- Map Location Indicator -->
							{#if markerLat !== null}
								<div class="mb-5 flex items-center gap-2 text-xs text-permit-approved font-medium bg-green-50 rounded-lg px-3 py-2 border border-green-200">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
									Site pinned: {markerLat.toFixed(4)}, {markerLng?.toFixed(4)}
								</div>
							{/if}

							<!-- Nearby Infrastructure -->
							<div class="mt-auto pt-4 border-t border-gov-100">
								<div class="flex items-center gap-2 mb-3">
									<svg class="w-4 h-4 text-gov-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
									<h3 class="text-sm font-display font-bold text-gov-700">Nearby Infrastructure Projects</h3>
								</div>
								<div class="space-y-2">
									{#each NEARBY_PROJECTS as project, i}
										<div class="flex items-center justify-between py-2 px-3 bg-surface-alt rounded-lg" style="animation-delay: {i * 80}ms">
											<div class="flex items-center gap-2">
												<span class="w-2 h-2 rounded-full {project.status === 'Active' ? 'bg-permit-approved' : project.status === 'Planned' ? 'bg-permit-pending' : 'bg-gov-300'}"></span>
												<div>
													<p class="text-xs font-medium text-gov-900">{project.name}</p>
													<p class="text-[10px] text-gov-400">{project.type} &middot; {project.distance}</p>
												</div>
											</div>
											<span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full
												{project.status === 'Active' ? 'bg-green-100 text-permit-approved' : project.status === 'Planned' ? 'bg-amber-100 text-amber-700' : 'bg-gov-100 text-gov-400'}">
												{project.status}
											</span>
										</div>
									{/each}
								</div>
							</div>
						</div>
					</div>

					<!-- Right: Map -->
					<div class="lg:col-span-3">
						<div class="bg-white rounded-2xl shadow-card border border-gov-100 overflow-hidden h-full flex flex-col">
							<div class="px-6 py-4 border-b border-gov-100 bg-gradient-to-r from-gov-50 to-surface-alt">
								<h3 class="text-sm font-display font-bold text-gov-700">GIS Work Site Map</h3>
								<p class="text-xs text-gov-400">Click on the map to place or adjust the work site marker</p>
							</div>
							<div class="flex-1 min-h-[500px]" bind:this={mapContainer}></div>
							<div class="px-6 py-3 border-t border-gov-100 bg-gov-50">
								<p class="text-[10px] text-gov-400 leading-relaxed">
									Map data sourced from DC GIS Open Data. Ward and ANC boundaries are approximate. Final boundary determination will be confirmed during permit review.
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
			{/if}

			<!-- ═══════════════════════════════════════════════════════════ -->
			<!-- STEP 3: Site Plan & Documents -->
			<!-- ═══════════════════════════════════════════════════════════ -->
			{#if currentStep === 3}
			<div class="">
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<!-- Upload Area -->
					<div class="lg:col-span-2 space-y-6">
						<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6 sm:p-8">
							<h2 class="text-xl font-display font-bold text-gov-900 mb-1">Site Plan & Documents</h2>
							<p class="text-sm text-gov-400 mb-6">Upload required documents for your construction/excavation permit application.</p>

							<!-- Document Type Selector -->
							<div class="mb-6">
								<label for="docType" class="block text-sm font-semibold text-gov-700 mb-2">Document Type</label>
								<select
									id="docType"
									bind:value={selectedDocType}
									class="w-full px-4 py-3 bg-surface-alt border border-gov-200 rounded-xl text-gov-900 font-medium focus:outline-none focus:ring-2 focus:ring-civic-400 focus:border-transparent transition-all appearance-none"
								>
									{#each DOCUMENT_TYPES as type}
										<option value={type}>{type}</option>
									{/each}
								</select>
							</div>

							<!-- Drag & Drop Zone -->
							<div
								role="button"
								tabindex="0"
								ondrop={handleDrop}
								ondragover={handleDragOver}
								ondragleave={handleDragLeave}
								onclick={handleFileClick}
								onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleFileClick(); } }}
								class="relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 cursor-pointer text-center
									{isDragOver ? 'border-civic-400 bg-civic-50 scale-[1.02]' : 'border-gov-200 bg-surface-alt hover:border-gov-300 hover:bg-gov-50'}"
							>
								<div class="flex flex-col items-center gap-3">
									<div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-gov-100 to-gov-50 flex items-center justify-center transition-transform
										{isDragOver ? 'scale-110' : ''}">
										<svg class="w-8 h-8 text-gov-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
									</div>
									<div>
										<p class="text-sm font-semibold text-gov-700 mb-1">
											{isDragOver ? 'Drop file here' : 'Drag & drop files here'}
										</p>
										<p class="text-xs text-gov-400">or click to select &middot; PDF, JPG, PNG up to 25MB</p>
									</div>
									<div class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-civic-500 to-civic-400 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all">
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
										Upload {selectedDocType}
									</div>
								</div>
							</div>

							<!-- Uploaded Documents List -->
							{#if uploadedDocs.length > 0}
								<div class="mt-6">
									<h3 class="text-sm font-display font-bold text-gov-700 mb-3">Uploaded Documents ({uploadedDocs.length})</h3>
									<div class="space-y-2">
										{#each uploadedDocs as doc, i}
											<div class="flex items-center gap-3 bg-surface-alt rounded-xl px-4 py-3 border border-gov-100 group hover:border-gov-200 transition-all" style="animation-delay: {i * 50}ms">
												<!-- File Icon -->
												<div class="w-10 h-10 rounded-lg bg-gov-100 flex items-center justify-center flex-shrink-0">
													<svg class="w-5 h-5 text-gov-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
												</div>
												<div class="flex-1 min-w-0">
													<p class="text-sm font-medium text-gov-900 truncate">{doc.name}</p>
													<p class="text-[10px] text-gov-400">{doc.type} &middot; {doc.size} &middot; {doc.uploadedAt}</p>
												</div>
												<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-permit-approved">
													Uploaded
												</span>
												<button
													onclick={() => removeDoc(doc.id)}
													class="w-8 h-8 rounded-lg flex items-center justify-center text-gov-300 hover:text-permit-denied hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
												>
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
												</button>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					</div>

					<!-- Required Documents Checklist -->
					<div class="space-y-6">
						<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6">
							<h3 class="text-sm font-display font-bold text-gov-700 mb-4">Required Documents</h3>
							<div class="space-y-3">
								{#each requiredDocsStatus as doc, i}
									<div class="flex items-center gap-3" style="animation-delay: {i * 60}ms">
										<div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
											{doc.uploaded ? 'bg-green-100' : 'bg-gov-100'}">
											{#if doc.uploaded}
												<svg class="w-4 h-4 text-permit-approved" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
											{:else}
												<svg class="w-4 h-4 text-gov-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
											{/if}
										</div>
										<div class="flex-1">
											<p class="text-sm font-medium {doc.uploaded ? 'text-permit-approved' : 'text-gov-700'}">{doc.type}</p>
											<p class="text-[10px] text-gov-400">{doc.uploaded ? 'Uploaded' : 'Required'}</p>
										</div>
									</div>
								{/each}
							</div>

							<!-- Progress -->
							<div class="mt-5 pt-4 border-t border-gov-100">
								<div class="flex items-center justify-between mb-2">
									<span class="text-xs font-semibold text-gov-500">Upload Progress</span>
									<span class="text-xs font-bold text-gov-700">{requiredDocsStatus.filter(d => d.uploaded).length}/{DOCUMENT_TYPES.length}</span>
								</div>
								<div class="w-full h-2 bg-gov-100 rounded-full overflow-hidden">
									<div
										class="h-full bg-gradient-to-r from-civic-500 to-permit-approved rounded-full transition-all duration-500"
										style="width: {(requiredDocsStatus.filter(d => d.uploaded).length / DOCUMENT_TYPES.length) * 100}%"
									></div>
								</div>
							</div>
						</div>

						<!-- Document Tips -->
						<div class="bg-gradient-to-br from-civic-50 to-civic-100 rounded-2xl border border-civic-200 p-5">
							<div class="flex gap-3">
								<div class="w-8 h-8 rounded-lg bg-civic-500 flex items-center justify-center flex-shrink-0">
									<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
								</div>
								<div>
									<h4 class="text-sm font-bold text-civic-600 mb-1">Document Tips</h4>
									<ul class="text-xs text-gov-500 leading-relaxed space-y-1">
										<li>Site plans must include work zone dimensions and staging areas</li>
										<li>Traffic control plans must follow MUTCD standards</li>
										<li>Insurance certificates must list DC Government as additional insured</li>
										<li>Contractor license must be current and valid in DC</li>
									</ul>
								</div>
							</div>
						</div>

						<!-- Note about supplemental docs -->
						<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-5">
							<div class="flex items-start gap-3">
								<svg class="w-5 h-5 text-permit-pending flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
								<p class="text-xs text-gov-500 leading-relaxed">Additional documentation may be requested during review, including environmental impact assessments for excavation near waterways or historic districts.</p>
							</div>
						</div>
					</div>
				</div>
			</div>
			{/if}

			<!-- ═══════════════════════════════════════════════════════════ -->
			<!-- STEP 4: Fee Estimate -->
			<!-- ═══════════════════════════════════════════════════════════ -->
			{#if currentStep === 4}
			<div class="">
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<!-- Fee Breakdown -->
					<div class="lg:col-span-2">
						<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6 sm:p-8">
							<div class="flex items-center gap-3 mb-6">
								<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-gov-600 to-gov-500 flex items-center justify-center">
									<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
								</div>
								<div>
									<h2 class="text-xl font-display font-bold text-gov-900">Fee Estimate</h2>
									<p class="text-sm text-gov-400">Preliminary fee breakdown for your Construction/Excavation permit</p>
								</div>
							</div>

							<!-- Fee Lines -->
							<div class="space-y-4">
								<!-- Base Permit Fee -->
								<div class="flex items-center justify-between py-4 px-5 bg-surface-alt rounded-xl border border-gov-100">
									<div class="flex items-center gap-3">
										<div class="w-8 h-8 rounded-lg bg-gov-100 flex items-center justify-center">
											<svg class="w-4 h-4 text-gov-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
										</div>
										<div>
											<p class="text-sm font-semibold text-gov-900">Base Permit Fee</p>
											<p class="text-xs text-gov-400">Standard Construction/Excavation permit processing</p>
										</div>
									</div>
									<span class="text-lg font-mono font-bold text-gov-900">${baseFee.toFixed(2)}</span>
								</div>

								<!-- Plan Review Fee -->
								<div class="flex items-center justify-between py-4 px-5 bg-surface-alt rounded-xl border border-gov-100">
									<div class="flex items-center gap-3">
										<div class="w-8 h-8 rounded-lg bg-gov-100 flex items-center justify-center">
											<svg class="w-4 h-4 text-gov-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
										</div>
										<div>
											<p class="text-sm font-semibold text-gov-900">Plan Review Fee</p>
											<p class="text-xs text-gov-400">Engineering review of site plan and traffic control plan</p>
										</div>
									</div>
									<span class="text-lg font-mono font-bold text-gov-900">${planReviewFee.toFixed(2)}</span>
								</div>

								<!-- Inspection Fee -->
								<div class="flex items-center justify-between py-4 px-5 bg-surface-alt rounded-xl border border-gov-100">
									<div class="flex items-center gap-3">
										<div class="w-8 h-8 rounded-lg bg-gov-100 flex items-center justify-center">
											<svg class="w-4 h-4 text-gov-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
										</div>
										<div>
											<p class="text-sm font-semibold text-gov-900">Inspection Fee</p>
											<p class="text-xs text-gov-400">$100.00 per week &times; {Math.max(1, durationWeeks)} week{Math.max(1, durationWeeks) !== 1 ? 's' : ''} of permitted duration</p>
										</div>
									</div>
									<span class="text-lg font-mono font-bold text-gov-900">${inspectionFee.toFixed(2)}</span>
								</div>

								<!-- Technology Fee -->
								<div class="flex items-center justify-between py-4 px-5 bg-surface-alt rounded-xl border border-gov-100">
									<div class="flex items-center gap-3">
										<div class="w-8 h-8 rounded-lg bg-gov-100 flex items-center justify-center">
											<svg class="w-4 h-4 text-gov-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
										</div>
										<div>
											<p class="text-sm font-semibold text-gov-900">Technology Fee</p>
											<p class="text-xs text-gov-400">TOPS online permitting system maintenance</p>
										</div>
									</div>
									<span class="text-lg font-mono font-bold text-gov-900">${technologyFee.toFixed(2)}</span>
								</div>

								<!-- Subtotal Divider -->
								<div class="border-t-2 border-gov-200 pt-4 mt-4">
									<div class="flex items-center justify-between px-5">
										<span class="text-sm font-bold text-gov-700">Subtotal (Fees)</span>
										<span class="text-xl font-mono font-bold text-gov-900">${subtotal.toFixed(2)}</span>
									</div>
								</div>

								<!-- Refundable Deposit -->
								<div class="flex items-center justify-between py-4 px-5 bg-amber-50 rounded-xl border border-amber-200">
									<div class="flex items-center gap-3">
										<div class="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
											<svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/></svg>
										</div>
										<div>
											<p class="text-sm font-semibold text-gov-900">Refundable Deposit</p>
											<p class="text-xs text-amber-700">Returned upon satisfactory site restoration inspection</p>
										</div>
									</div>
									<span class="text-lg font-mono font-bold text-amber-700">${refundableDeposit.toFixed(2)}</span>
								</div>

								<!-- Total -->
								<div class="bg-gradient-to-r from-gov-700 to-gov-600 rounded-2xl p-5 text-white">
									<div class="flex items-center justify-between">
										<div>
											<p class="text-sm font-medium text-gov-200">Total Due at Issuance</p>
											<p class="text-xs text-gov-300 mt-0.5">Fees + Refundable Deposit</p>
										</div>
										<span class="text-3xl font-mono font-bold">${total.toFixed(2)}</span>
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Side Panel -->
					<div class="space-y-6">
						<!-- Payment Info -->
						<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6">
							<h3 class="text-sm font-display font-bold text-gov-700 mb-4">Payment Information</h3>
							<div class="space-y-3">
								<div class="flex items-center gap-3 text-sm">
									<div class="w-8 h-8 rounded-lg bg-gov-50 flex items-center justify-center flex-shrink-0">
										<svg class="w-4 h-4 text-gov-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
									</div>
									<p class="text-gov-600">Credit/debit cards accepted</p>
								</div>
								<div class="flex items-center gap-3 text-sm">
									<div class="w-8 h-8 rounded-lg bg-gov-50 flex items-center justify-center flex-shrink-0">
										<svg class="w-4 h-4 text-gov-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/></svg>
									</div>
									<p class="text-gov-600">ACH/EFT for business accounts</p>
								</div>
								<div class="flex items-center gap-3 text-sm">
									<div class="w-8 h-8 rounded-lg bg-gov-50 flex items-center justify-center flex-shrink-0">
										<svg class="w-4 h-4 text-gov-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
									</div>
									<p class="text-gov-600">Payment due upon approval</p>
								</div>
							</div>
						</div>

						<!-- Deposit Details -->
						<div class="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl border border-amber-200 p-5">
							<div class="flex gap-3">
								<div class="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
									<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
								</div>
								<div>
									<h4 class="text-sm font-bold text-amber-700 mb-1">About the Deposit</h4>
									<p class="text-xs text-gov-600 leading-relaxed">The $500 refundable deposit ensures proper restoration of public space after construction. It is returned within 30 days of passing final site restoration inspection.</p>
								</div>
							</div>
						</div>

						<!-- Disclaimer -->
						<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-5">
							<div class="flex items-start gap-3">
								<svg class="w-5 h-5 text-gov-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
								<div>
									<p class="text-xs font-semibold text-gov-700 mb-1">Fee Estimate Disclaimer</p>
									<p class="text-xs text-gov-400 leading-relaxed">Fee estimates are preliminary and subject to change based on final plan review. Additional fees may apply for extended duration, emergency work, or work in historic preservation zones. Final fee determination will be issued with permit approval.</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			{/if}

			<!-- ═══════════════════════════════════════════════════════════ -->
			<!-- STEP 5: Review & Submit -->
			<!-- ═══════════════════════════════════════════════════════════ -->
			{#if currentStep === 5}
			<div class="">
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<!-- Main Review -->
					<div class="lg:col-span-2 space-y-6">
						<!-- Project Details Summary -->
						<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6">
							<div class="flex items-center gap-3 mb-5">
								<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-permit-pending to-amber-400 flex items-center justify-center">
									<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
								</div>
								<div>
									<h3 class="text-lg font-display font-bold text-gov-900">Project Details</h3>
									<p class="text-xs text-gov-400">Review your project information</p>
								</div>
							</div>

							<div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
								<div class="bg-surface-alt rounded-xl p-3">
									<p class="text-[10px] font-semibold text-gov-400 uppercase tracking-wider mb-1">Work Type</p>
									<p class="text-sm font-bold text-gov-900">{workType}</p>
								</div>
								<div class="bg-surface-alt rounded-xl p-3">
									<p class="text-[10px] font-semibold text-gov-400 uppercase tracking-wider mb-1">Contractor</p>
									<p class="text-sm font-bold text-gov-900">{contractorName || 'N/A'}</p>
								</div>
								<div class="bg-surface-alt rounded-xl p-3">
									<p class="text-[10px] font-semibold text-gov-400 uppercase tracking-wider mb-1">License</p>
									<p class="text-sm font-mono font-bold text-gov-900">{licenseNumber || 'N/A'}</p>
								</div>
								<div class="bg-surface-alt rounded-xl p-3">
									<p class="text-[10px] font-semibold text-gov-400 uppercase tracking-wider mb-1">Duration</p>
									<p class="text-sm font-bold {durationExceeds30 ? 'text-amber-600' : 'text-gov-900'}">{durationWeeks} week{durationWeeks !== 1 ? 's' : ''}</p>
								</div>
								<div class="bg-surface-alt rounded-xl p-3">
									<p class="text-[10px] font-semibold text-gov-400 uppercase tracking-wider mb-1">Start Date</p>
									<p class="text-sm font-bold text-gov-900">{startDate || 'N/A'}</p>
								</div>
								<div class="bg-surface-alt rounded-xl p-3">
									<p class="text-[10px] font-semibold text-gov-400 uppercase tracking-wider mb-1">End Date</p>
									<p class="text-sm font-bold text-gov-900">{endDate || 'N/A'}</p>
								</div>
								<div class="bg-surface-alt rounded-xl p-3">
									<p class="text-[10px] font-semibold text-gov-400 uppercase tracking-wider mb-1">Workers</p>
									<p class="text-sm font-bold text-gov-900">{numWorkers}</p>
								</div>
								<div class="bg-surface-alt rounded-xl p-3 col-span-2">
									<p class="text-[10px] font-semibold text-gov-400 uppercase tracking-wider mb-1">Equipment</p>
									<p class="text-sm font-bold text-gov-900">{selectedEquipment.length > 0 ? selectedEquipment.join(', ') : 'None specified'}</p>
								</div>
							</div>

							{#if projectDescription}
								<div class="mt-4 bg-surface-alt rounded-xl p-4">
									<p class="text-[10px] font-semibold text-gov-400 uppercase tracking-wider mb-1">Project Description</p>
									<p class="text-sm text-gov-700 leading-relaxed">{projectDescription}</p>
								</div>
							{/if}
						</div>

						<!-- Location Summary -->
						<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6">
							<div class="flex items-center gap-3 mb-5">
								<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-civic-500 to-civic-400 flex items-center justify-center">
									<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
								</div>
								<div>
									<h3 class="text-lg font-display font-bold text-gov-900">Site Location</h3>
									<p class="text-xs text-gov-400">Work site address and jurisdiction</p>
								</div>
							</div>

							<div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
								<div class="bg-surface-alt rounded-xl p-3 col-span-2 sm:col-span-3">
									<p class="text-[10px] font-semibold text-gov-400 uppercase tracking-wider mb-1">Address</p>
									<p class="text-sm font-bold text-gov-900">{selectedAddress || 'Not specified'}</p>
								</div>
								<div class="bg-surface-alt rounded-xl p-3">
									<p class="text-[10px] font-semibold text-gov-400 uppercase tracking-wider mb-1">Ward</p>
									<p class="text-sm font-bold text-gov-900">{detectedWard || 'N/A'}</p>
								</div>
								<div class="bg-surface-alt rounded-xl p-3">
									<p class="text-[10px] font-semibold text-gov-400 uppercase tracking-wider mb-1">Quadrant</p>
									<p class="text-sm font-bold text-gov-900">{quadrant}</p>
								</div>
								{#if markerLat !== null}
								<div class="bg-surface-alt rounded-xl p-3">
									<p class="text-[10px] font-semibold text-gov-400 uppercase tracking-wider mb-1">Coordinates</p>
									<p class="text-sm font-mono font-bold text-gov-900">{markerLat.toFixed(4)}, {markerLng?.toFixed(4)}</p>
								</div>
								{/if}
							</div>
						</div>

						<!-- Documents Summary -->
						<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6">
							<div class="flex items-center gap-3 mb-5">
								<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-gov-600 to-gov-500 flex items-center justify-center">
									<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
								</div>
								<div>
									<h3 class="text-lg font-display font-bold text-gov-900">Documents ({uploadedDocs.length})</h3>
									<p class="text-xs text-gov-400">Uploaded supporting documents</p>
								</div>
							</div>

							{#if uploadedDocs.length > 0}
								<div class="space-y-2">
									{#each uploadedDocs as doc}
										<div class="flex items-center gap-3 py-2 px-3 bg-surface-alt rounded-lg">
											<svg class="w-4 h-4 text-permit-approved flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
											<div class="flex-1 min-w-0">
												<p class="text-sm font-medium text-gov-900 truncate">{doc.name}</p>
												<p class="text-[10px] text-gov-400">{doc.type} &middot; {doc.size}</p>
											</div>
										</div>
									{/each}
								</div>
							{:else}
								<p class="text-sm text-gov-400 italic">No documents uploaded</p>
							{/if}

							<!-- Required docs status -->
							<div class="mt-4 pt-4 border-t border-gov-100">
								<div class="flex flex-wrap gap-2">
									{#each requiredDocsStatus as doc}
										<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold
											{doc.uploaded ? 'bg-green-100 text-permit-approved' : 'bg-red-100 text-permit-denied'}">
											{#if doc.uploaded}
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
											{:else}
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
											{/if}
											{doc.type}
										</span>
									{/each}
								</div>
							</div>
						</div>
					</div>

					<!-- Right: AI Check + Fee + Submit -->
					<div class="space-y-6">
						<!-- AI Pre-Submission Check -->
						<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6">
							<div class="flex items-center gap-3 mb-5">
								<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-permit-review to-purple-400 flex items-center justify-center">
									<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
								</div>
								<div>
									<h3 class="text-sm font-display font-bold text-gov-900">AI Pre-Submission Check</h3>
									<p class="text-[10px] text-gov-400">Automated application review</p>
								</div>
							</div>

							<!-- Summary Badge -->
							<div class="flex items-center gap-2 mb-4">
								{#if passCount > 0}
									<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-permit-approved">
										{passCount} Passed
									</span>
								{/if}
								{#if warnCount > 0}
									<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
										{warnCount} Warning{warnCount !== 1 ? 's' : ''}
									</span>
								{/if}
								{#if failCount > 0}
									<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-red-100 text-permit-denied">
										{failCount} Missing
									</span>
								{/if}
							</div>

							<!-- Check Items -->
							<div class="space-y-2.5">
								{#each preSubmissionChecks as check, i}
									<div class="flex items-start gap-2.5 py-2" style="animation-delay: {150 + i * 40}ms">
										<div class="mt-0.5 flex-shrink-0">
											{#if check.status === 'pass'}
												<div class="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
													<svg class="w-3 h-3 text-permit-approved" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
												</div>
											{:else if check.status === 'warn'}
												<div class="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
													<svg class="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01"/></svg>
												</div>
											{:else}
												<div class="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
													<svg class="w-3 h-3 text-permit-denied" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
												</div>
											{/if}
										</div>
										<div class="flex-1 min-w-0">
											<p class="text-xs font-semibold text-gov-700">{check.label}</p>
											<p class="text-[10px] {check.status === 'pass' ? 'text-gov-400' : check.status === 'warn' ? 'text-amber-600' : 'text-permit-denied'}">{check.detail}</p>
										</div>
									</div>
								{/each}
							</div>

							<!-- DCMR References -->
							<div class="mt-4 pt-4 border-t border-gov-100">
								<p class="text-[10px] font-bold text-gov-500 uppercase tracking-wider mb-2">Applicable Regulations</p>
								<div class="space-y-1.5">
									<p class="text-[10px] text-gov-400 flex items-start gap-1.5">
										<span class="text-civic-500 font-bold mt-px">*</span>
										DCMR Title 24, Chapter 5 — Public Space Permits apply to this work type
									</p>
									<p class="text-[10px] text-gov-400 flex items-start gap-1.5">
										<span class="text-civic-500 font-bold mt-px">*</span>
										DCMR Title 24, Chapter 35 — Traffic Control Plans required for all excavation work
									</p>
									{#if workType === 'Bridge/Tunnel Work'}
										<p class="text-[10px] text-gov-400 flex items-start gap-1.5">
											<span class="text-civic-500 font-bold mt-px">*</span>
											DCMR Title 24, Chapter 37 — Bridge and Structure Permits require structural review
										</p>
									{/if}
								</div>
							</div>

							<!-- Estimated Review Time -->
							<div class="mt-4 pt-4 border-t border-gov-100">
								<div class="flex items-center gap-2 mb-1">
									<svg class="w-4 h-4 text-gov-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
									<span class="text-xs font-semibold text-gov-700">Estimated Review Time</span>
								</div>
								<p class="text-sm font-bold text-gov-900 ml-6">
									{durationExceeds30 ? '10-14' : '5-7'} business days
									<span class="text-xs font-normal text-gov-400">based on Construction/Excavation permits in {detectedWard || 'DC'}</span>
								</p>
							</div>
						</div>

						<!-- Fee Summary (Compact) -->
						<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6">
							<h3 class="text-sm font-display font-bold text-gov-700 mb-4">Fee Summary</h3>
							<div class="space-y-2.5">
								<div class="flex items-center justify-between text-sm">
									<span class="text-gov-500">Base Permit Fee</span>
									<span class="font-mono font-bold text-gov-900">${baseFee.toFixed(2)}</span>
								</div>
								<div class="flex items-center justify-between text-sm">
									<span class="text-gov-500">Plan Review Fee</span>
									<span class="font-mono font-bold text-gov-900">${planReviewFee.toFixed(2)}</span>
								</div>
								<div class="flex items-center justify-between text-sm">
									<span class="text-gov-500">Inspection Fee ({Math.max(1, durationWeeks)}wk)</span>
									<span class="font-mono font-bold text-gov-900">${inspectionFee.toFixed(2)}</span>
								</div>
								<div class="flex items-center justify-between text-sm">
									<span class="text-gov-500">Technology Fee</span>
									<span class="font-mono font-bold text-gov-900">${technologyFee.toFixed(2)}</span>
								</div>
								<div class="flex items-center justify-between text-sm text-amber-700">
									<span>Refundable Deposit</span>
									<span class="font-mono font-bold">${refundableDeposit.toFixed(2)}</span>
								</div>
								<div class="border-t border-gov-100 pt-3 flex items-center justify-between">
									<span class="text-sm font-bold text-gov-900">Total</span>
									<span class="text-xl font-mono font-bold text-gov-900">${total.toFixed(2)}</span>
								</div>
							</div>
						</div>

						<!-- Submit Button -->
						<div class="bg-white rounded-2xl shadow-card border border-gov-100 p-6">
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

							<p class="text-xs text-gov-400 leading-relaxed mt-4">
								By submitting this application, you certify that the information provided is accurate and complete. The DC Department of Transportation will review your application per DCMR Title 24 requirements. You will receive email notification of approval, denial, or requests for additional information.
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

			{#if currentStep < 5}
				<button
					onclick={nextStep}
					disabled={(currentStep === 1 && !step1Valid) || (currentStep === 2 && !step2Valid) || (currentStep === 3 && !step3Valid)}
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
