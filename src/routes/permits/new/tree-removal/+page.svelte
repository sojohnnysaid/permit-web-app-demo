<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { permits } from '$lib/stores/permits.svelte';
	import { goto } from '$app/navigation';

	// Auth guard
	$effect(() => {
		if (!auth.isAuthenticated) {
			goto('/login');
		}
	});

	// ─── Wizard State ───────────────────────────────────────────────
	let currentStep = $state(1);
	let isSubmitting = $state(false);
	let isSubmitted = $state(false);
	let submittedRef = $state('');

	const STEPS = ['Tree Details', 'Location', 'Review & Submit'];
	let progress = $derived(((currentStep - 1) / (STEPS.length - 1)) * 100);

	// ─── Step 1: Tree Details ───────────────────────────────────────
	const SITUATIONS = ['Fallen Tree - Emergency', 'Hazardous Tree', 'Planned Removal', 'Heritage Tree Trim'];
	const SITUATION_INFO: Record<string, { urgent: boolean; fee: number; processing: string }> = {
		'Fallen Tree - Emergency': { urgent: true, fee: 0, processing: '24 hours' },
		'Hazardous Tree': { urgent: true, fee: 0, processing: '24 hours' },
		'Planned Removal': { urgent: false, fee: 125, processing: '14 business days' },
		'Heritage Tree Trim': { urgent: false, fee: 200, processing: '14 business days' }
	};

	let situation = $state('Planned Removal');
	let treeSpecies = $state('');
	let height = $state(30);
	let diameter = $state(12);
	let description = $state('');
	let blockingRoad = $state(false);

	let isEmergency = $derived(situation === 'Fallen Tree - Emergency' || situation === 'Hazardous Tree');
	let fee = $derived(SITUATION_INFO[situation].fee);
	let processingTime = $derived(SITUATION_INFO[situation].processing);

	// ─── Step 2: Location ───────────────────────────────────────────
	const PROPERTY_TYPES = ['Public Right-of-Way', 'Private Property', 'Park'];

	let address = $state('');
	let propertyType = $state('Public Right-of-Way');

	// ─── Validation ─────────────────────────────────────────────────
	let step1Valid = $derived(treeSpecies.length > 0 && description.length > 0);
	let step2Valid = $derived(address.length > 0);

	function nextStep() {
		if (currentStep < 3) currentStep++;
	}

	function prevStep() {
		if (currentStep > 1) currentStep--;
	}

	async function handleSubmit() {
		isSubmitting = true;
		await new Promise((r) => setTimeout(r, 1200));

		const newPermit = permits.addPermit({
			type: 'special_heritage_tree',
			title: `${situation} - ${treeSpecies || 'Unknown Species'}`,
			description,
			status: 'submitted',
			treeSpecies,
			addresses: [
				{
					address: address || 'Unknown',
					lat: 38.9 + Math.random() * 0.06,
					lng: -77.05 + Math.random() * 0.06,
					stopType: 'start'
				}
			]
		});

		submittedRef = newPermit.referenceNumber;
		isSubmitted = true;
		isSubmitting = false;

		setTimeout(() => goto('/dashboard'), 2500);
	}
</script>

<div class="min-h-screen bg-surface-alt">
	<!-- Themed Header -->
	<div class="relative overflow-hidden bg-gradient-to-r from-green-700 via-emerald-600 to-green-500">
		<div class="absolute inset-0 opacity-10">
			<svg class="h-full w-full" viewBox="0 0 400 200" fill="none">
				<ellipse cx="100" cy="180" rx="80" ry="40" fill="white" />
				<ellipse cx="300" cy="160" rx="60" ry="30" fill="white" />
				<circle cx="200" cy="60" r="50" fill="white" />
			</svg>
		</div>
		<div class="relative mx-auto max-w-4xl px-6 py-8">
			<a
				href="/permits/new"
				class="mb-3 inline-flex items-center gap-2 text-sm font-medium text-green-200 transition-colors hover:text-white"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
				</svg>
				Back to Permit Types
			</a>
			<div class="flex items-center gap-3">
				<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
					<svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-5m0 0l-3-3m3 3l3-3" />
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 3C9.5 3 7 5.5 7 8.5c0 .5.07 1 .2 1.5C5.34 10.5 4 12.1 4 14c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4 0-1.9-1.34-3.5-3.2-3.95.13-.52.2-1.03.2-1.55C17 5.5 14.5 3 12 3Z" />
					</svg>
				</div>
				<div>
					<h1 class="font-display text-2xl font-bold text-white">Tree Removal Permit</h1>
					<p class="text-sm text-green-200">Emergency removal, hazardous trees, and heritage permits</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Progress Bar -->
	<div class="border-b border-gov-100 bg-surface">
		<div class="mx-auto max-w-4xl px-6 py-4">
			<div class="flex items-center justify-between mb-2">
				{#each STEPS as step, i}
					<div class="flex items-center gap-2 text-sm font-medium {currentStep > i + 1 ? 'text-green-600' : currentStep === i + 1 ? 'text-gov-900' : 'text-gov-400'}">
						<div class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold
							{currentStep > i + 1 ? 'bg-green-600 text-white' : currentStep === i + 1 ? 'bg-gov-800 text-white' : 'bg-gov-200 text-gov-500'}">
							{#if currentStep > i + 1}
								<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
									<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
								</svg>
							{:else}
								{i + 1}
							{/if}
						</div>
						<span class="hidden sm:inline">{step}</span>
					</div>
				{/each}
			</div>
			<div class="h-2 rounded-full bg-gov-100 overflow-hidden">
				<div
					class="h-full rounded-full bg-gradient-to-r from-green-600 to-emerald-500 transition-all duration-500 ease-out"
					style="width: {progress}%"
				></div>
			</div>
		</div>
	</div>

	<!-- Wizard Content -->
	<div class="mx-auto max-w-4xl px-6 py-8">
		{#if isSubmitted}
			<!-- Success State -->
			<div class="rounded-2xl border border-green-200 bg-green-50 p-10 text-center shadow-card">
				<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
					<svg class="h-8 w-8 text-permit-approved" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<h2 class="font-display text-2xl font-bold text-gov-900">Permit Submitted!</h2>
				<p class="mt-2 text-gov-600">Reference: <span class="font-mono font-bold text-green-600">{submittedRef}</span></p>
				<p class="mt-1 text-sm text-gov-500">
					{#if isEmergency}
						Emergency priority -- expected response within <span class="font-semibold text-red-600">24 hours</span>.
					{:else}
						Expected processing: <span class="font-semibold">{processingTime}</span>.
					{/if}
					Redirecting to dashboard...
				</p>
			</div>
		{:else}
			<!-- Step 1: Tree Details -->
			{#if currentStep === 1}
				<div class="space-y-6">
					<!-- Emergency Banner -->
					{#if isEmergency}
						<div class="flex items-center gap-3 rounded-xl border-2 border-red-300 bg-red-50 p-5">
							<div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
								<svg class="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
								</svg>
							</div>
							<div>
								<p class="font-display font-bold text-red-800">Emergency Request</p>
								<p class="text-sm text-red-600">No fee charged. Prioritized for 24-hour response.</p>
							</div>
						</div>
					{/if}

					<div class="rounded-xl border border-gov-100 bg-surface p-6 shadow-card">
						<h2 class="mb-6 font-display text-xl font-bold text-gov-900">Tree Details</h2>

						<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
							<!-- Situation -->
							<div class="md:col-span-2">
								<label for="situation" class="mb-1.5 block text-sm font-semibold text-gov-700">Situation</label>
								<select
									id="situation"
									bind:value={situation}
									class="w-full rounded-lg border border-gov-200 bg-surface px-4 py-2.5 text-gov-900 transition-colors focus:border-green-400 focus:ring-2 focus:ring-green-200 focus:outline-none"
								>
									{#each SITUATIONS as s}
										<option value={s}>{s}</option>
									{/each}
								</select>
							</div>

							<!-- Species -->
							<div>
								<label for="species" class="mb-1.5 block text-sm font-semibold text-gov-700">Tree Species</label>
								<input
									id="species"
									type="text"
									bind:value={treeSpecies}
									placeholder="e.g. White Oak, Red Maple, American Elm"
									class="w-full rounded-lg border border-gov-200 bg-surface px-4 py-2.5 text-gov-900 transition-colors focus:border-green-400 focus:ring-2 focus:ring-green-200 focus:outline-none placeholder:text-gov-400"
								/>
							</div>

							<!-- Height -->
							<div>
								<label for="height" class="mb-1.5 block text-sm font-semibold text-gov-700">Approximate Height (ft)</label>
								<input
									id="height"
									type="number"
									bind:value={height}
									min="1"
									max="200"
									class="w-full rounded-lg border border-gov-200 bg-surface px-4 py-2.5 text-gov-900 transition-colors focus:border-green-400 focus:ring-2 focus:ring-green-200 focus:outline-none"
								/>
							</div>

							<!-- Diameter -->
							<div>
								<label for="diameter" class="mb-1.5 block text-sm font-semibold text-gov-700">Trunk Diameter (inches)</label>
								<input
									id="diameter"
									type="number"
									bind:value={diameter}
									min="1"
									max="120"
									class="w-full rounded-lg border border-gov-200 bg-surface px-4 py-2.5 text-gov-900 transition-colors focus:border-green-400 focus:ring-2 focus:ring-green-200 focus:outline-none"
								/>
							</div>

							<!-- Blocking Road -->
							<div class="flex items-center gap-3">
								<input
									id="blockingRoad"
									type="checkbox"
									bind:checked={blockingRoad}
									class="h-5 w-5 rounded border-gov-300 text-green-600 focus:ring-green-500"
								/>
								<label for="blockingRoad" class="text-sm font-semibold text-gov-700">Tree is blocking a road or sidewalk</label>
							</div>
						</div>

						<!-- Description -->
						<div class="mt-5">
							<label for="description" class="mb-1.5 block text-sm font-semibold text-gov-700">Description</label>
							<textarea
								id="description"
								bind:value={description}
								rows="3"
								placeholder="Describe the tree's condition, any damage caused, accessibility concerns, etc."
								class="w-full rounded-lg border border-gov-200 bg-surface px-4 py-2.5 text-gov-900 transition-colors focus:border-green-400 focus:ring-2 focus:ring-green-200 focus:outline-none placeholder:text-gov-400"
							></textarea>
						</div>
					</div>

					<!-- Fee Preview -->
					<div class="flex items-center gap-2 rounded-lg border {fee === 0 ? 'border-green-200 bg-green-50 text-green-700' : 'border-gov-200 bg-gov-50 text-gov-600'} px-5 py-3 text-sm">
						<svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
						</svg>
						{#if fee === 0}
							No fee for emergency tree removal
						{:else}
							Estimated fee: <span class="font-bold">${fee}.00</span>
						{/if}
					</div>
				</div>

			<!-- Step 2: Location -->
			{:else if currentStep === 2}
				<div class="space-y-6">
					<div class="rounded-xl border border-gov-100 bg-surface p-6 shadow-card">
						<h2 class="mb-6 font-display text-xl font-bold text-gov-900">Tree Location</h2>

						<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
							<!-- Address -->
							<div class="md:col-span-2">
								<label for="address" class="mb-1.5 block text-sm font-semibold text-gov-700">Street Address</label>
								<input
									id="address"
									type="text"
									bind:value={address}
									placeholder="e.g. 3800 Brandywine St NW"
									class="w-full rounded-lg border border-gov-200 bg-surface px-4 py-2.5 text-gov-900 transition-colors focus:border-green-400 focus:ring-2 focus:ring-green-200 focus:outline-none placeholder:text-gov-400"
								/>
							</div>

							<!-- Property Type -->
							<div>
								<label for="propertyType" class="mb-1.5 block text-sm font-semibold text-gov-700">Property Type</label>
								<select
									id="propertyType"
									bind:value={propertyType}
									class="w-full rounded-lg border border-gov-200 bg-surface px-4 py-2.5 text-gov-900 transition-colors focus:border-green-400 focus:ring-2 focus:ring-green-200 focus:outline-none"
								>
									{#each PROPERTY_TYPES as type}
										<option value={type}>{type}</option>
									{/each}
								</select>
							</div>
						</div>

						<!-- Photo Upload Placeholder -->
						<div class="mt-5">
							<label class="mb-1.5 block text-sm font-semibold text-gov-700">Photo of Tree (Optional)</label>
							<div class="flex h-32 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-gov-300 bg-gov-50 transition-colors hover:border-green-400 hover:bg-green-50">
								<div class="text-center">
									<svg class="mx-auto mb-1 h-8 w-8 text-gov-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
										<path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
									</svg>
									<p class="text-sm font-medium text-gov-500">Click or drag to upload photos</p>
									<p class="text-xs text-gov-400">PNG, JPG up to 10MB</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Map Placeholder -->
					<div class="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-gov-200 bg-gov-50">
						<div class="text-center text-gov-400">
							<svg class="mx-auto mb-2 h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
								<path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
								<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
							</svg>
							<p class="text-sm font-medium">Map preview will appear here</p>
						</div>
					</div>
				</div>

			<!-- Step 3: Review & Submit -->
			{:else if currentStep === 3}
				<div class="space-y-6">
					<!-- Emergency Banner -->
					{#if isEmergency}
						<div class="flex items-center gap-3 rounded-xl border-2 border-red-300 bg-red-50 p-5">
							<div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
								<svg class="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
								</svg>
							</div>
							<div>
								<p class="font-display font-bold text-red-800">Emergency Tree Removal</p>
								<p class="text-sm text-red-600">No fee. Prioritized for 24-hour response.{blockingRoad ? ' Road obstruction flagged.' : ''}</p>
							</div>
						</div>
					{/if}

					<div class="rounded-xl border border-gov-100 bg-surface p-6 shadow-card">
						<h2 class="mb-6 font-display text-xl font-bold text-gov-900">Review Your Application</h2>

						<div class="space-y-4">
							<div class="rounded-lg bg-green-50 p-4">
								<h3 class="mb-3 text-sm font-bold uppercase tracking-wider text-green-700">Tree Information</h3>
								<div class="grid grid-cols-2 gap-3 text-sm">
									<div>
										<span class="text-gov-500">Situation:</span>
										<span class="ml-1 font-medium text-gov-900">{situation}</span>
									</div>
									<div>
										<span class="text-gov-500">Species:</span>
										<span class="ml-1 font-medium text-gov-900">{treeSpecies || 'Not specified'}</span>
									</div>
									<div>
										<span class="text-gov-500">Height:</span>
										<span class="ml-1 font-medium text-gov-900">~{height} ft</span>
									</div>
									<div>
										<span class="text-gov-500">Trunk Diameter:</span>
										<span class="ml-1 font-medium text-gov-900">~{diameter} in</span>
									</div>
									<div>
										<span class="text-gov-500">Blocking Road:</span>
										<span class="ml-1 font-medium {blockingRoad ? 'text-red-600' : 'text-gov-900'}">{blockingRoad ? 'Yes' : 'No'}</span>
									</div>
								</div>
							</div>

							<div class="rounded-lg bg-gov-50 p-4">
								<h3 class="mb-3 text-sm font-bold uppercase tracking-wider text-gov-600">Location</h3>
								<div class="grid grid-cols-2 gap-3 text-sm">
									<div class="col-span-2">
										<span class="text-gov-500">Address:</span>
										<span class="ml-1 font-medium text-gov-900">{address || 'Not provided'}</span>
									</div>
									<div>
										<span class="text-gov-500">Property:</span>
										<span class="ml-1 font-medium text-gov-900">{propertyType}</span>
									</div>
								</div>
							</div>

							<div class="rounded-lg border border-gov-100 p-4">
								<h3 class="mb-2 text-sm font-bold uppercase tracking-wider text-gov-600">Description</h3>
								<p class="text-sm leading-relaxed text-gov-700">{description || 'No description provided.'}</p>
							</div>
						</div>
					</div>

					<!-- Fee & Processing -->
					<div class="rounded-xl border border-gov-200 bg-surface p-6 shadow-card">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm text-gov-500">Permit Fee</p>
								<p class="text-lg font-bold {fee === 0 ? 'text-permit-approved' : 'text-gov-900'}">
									{fee === 0 ? '$0.00 - No charge' : `$${fee}.00`}
								</p>
							</div>
							<div class="text-right">
								<p class="text-sm text-gov-500">Processing Time</p>
								<p class="text-lg font-bold {isEmergency ? 'text-red-600' : 'text-gov-900'}">
									{processingTime}
								</p>
							</div>
						</div>
					</div>

					<!-- Submit Button -->
					<button
						onclick={handleSubmit}
						disabled={isSubmitting}
						class="w-full rounded-xl bg-gradient-to-r from-green-700 to-emerald-600 px-6 py-4 font-display text-lg font-bold text-white shadow-card transition-all hover:shadow-card-hover hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
					>
						{#if isSubmitting}
							<span class="inline-flex items-center gap-2">
								<svg class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
								</svg>
								Submitting...
							</span>
						{:else}
							{#if fee === 0}
								Submit Emergency Request
							{:else}
								Submit Application & Pay ${fee}.00
							{/if}
						{/if}
					</button>
				</div>
			{/if}

			<!-- Navigation Buttons -->
			{#if !isSubmitted}
				<div class="mt-8 flex items-center justify-between">
					<button
						onclick={prevStep}
						disabled={currentStep === 1}
						class="inline-flex items-center gap-2 rounded-lg border border-gov-200 bg-surface px-5 py-2.5 text-sm font-semibold text-gov-700 transition-all hover:bg-gov-50 hover:shadow-card disabled:opacity-40 disabled:cursor-not-allowed"
					>
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
						</svg>
						Previous
					</button>

					{#if currentStep < 3}
						<button
							onclick={nextStep}
							disabled={(currentStep === 1 && !step1Valid) || (currentStep === 2 && !step2Valid)}
							class="inline-flex items-center gap-2 rounded-lg bg-gov-800 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-gov-700 hover:shadow-card disabled:opacity-40 disabled:cursor-not-allowed"
						>
							Next
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
							</svg>
						</button>
					{/if}
				</div>
			{/if}
		{/if}
	</div>
</div>
