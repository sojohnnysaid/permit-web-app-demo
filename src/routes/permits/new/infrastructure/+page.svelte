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

	const STEPS = ['Report Details', 'Location', 'Review & Submit'];
	let progress = $derived(((currentStep - 1) / (STEPS.length - 1)) * 100);

	// ─── Step 1: Report Details ─────────────────────────────────────
	const DAMAGE_TYPES = ['Pothole', 'Water Main Break', 'Sewage Backup', 'Gas Leak', 'Road Collapse', 'Sinkhole', 'Street Light Out', 'Flooding'];
	const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

	const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
		Low: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
		Medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
		High: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
		Critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
	};

	let damageType = $state('Pothole');
	let severity = $state('Medium');
	let description = $state('');

	let isUrgent = $derived(severity === 'Critical' || severity === 'High');

	// ─── Step 2: Location ───────────────────────────────────────────
	const LANES = ['Left', 'Right', 'Center', 'Sidewalk', 'All'];
	const SIZES = ['Small', 'Medium', 'Large'];

	let address = $state('');
	let laneAffected = $state('Right');
	let estimatedSize = $state('Medium');

	// ─── Validation ─────────────────────────────────────────────────
	let step1Valid = $derived(description.length > 0);
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
			type: 'infrastructure',
			title: `${damageType} - ${address || 'Reported Location'}`,
			description,
			status: 'submitted',
			damageType,
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
	<div class="relative overflow-hidden bg-gradient-to-r from-amber-600 via-amber-500 to-orange-400">
		<div class="absolute inset-0 opacity-10">
			<svg class="h-full w-full" viewBox="0 0 400 200" fill="none">
				<path d="M0 100 L100 50 L200 120 L300 30 L400 80 L400 200 L0 200 Z" fill="white" />
			</svg>
		</div>
		<div class="relative mx-auto max-w-4xl px-6 py-8">
			<a
				href="/permits/new"
				class="mb-3 inline-flex items-center gap-2 text-sm font-medium text-amber-100 transition-colors hover:text-white"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
				</svg>
				Back to Permit Types
			</a>
			<div class="flex items-center gap-3">
				<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
					<svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
					</svg>
				</div>
				<div>
					<h1 class="font-display text-2xl font-bold text-white">Infrastructure Report</h1>
					<p class="text-sm text-amber-100">Report road damage, utility issues, and hazards</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Progress Bar -->
	<div class="border-b border-gov-100 bg-surface">
		<div class="mx-auto max-w-4xl px-6 py-4">
			<div class="flex items-center justify-between mb-2">
				{#each STEPS as step, i}
					<div class="flex items-center gap-2 text-sm font-medium {currentStep > i + 1 ? 'text-amber-600' : currentStep === i + 1 ? 'text-gov-900' : 'text-gov-400'}">
						<div class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold
							{currentStep > i + 1 ? 'bg-amber-500 text-white' : currentStep === i + 1 ? 'bg-gov-800 text-white' : 'bg-gov-200 text-gov-500'}">
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
					class="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-500 ease-out"
					style="width: {progress}%"
				></div>
			</div>
		</div>
	</div>

	<!-- Wizard Content -->
	<div class="mx-auto max-w-4xl px-6 py-8">
		{#if isSubmitted}
			<!-- Success State -->
			<div class="animate-fade-in rounded-2xl border border-green-200 bg-green-50 p-10 text-center shadow-card">
				<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
					<svg class="h-8 w-8 text-permit-approved" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<h2 class="font-display text-2xl font-bold text-gov-900">Report Submitted!</h2>
				<p class="mt-2 text-gov-600">Reference: <span class="font-mono font-bold text-amber-600">{submittedRef}</span></p>
				<p class="mt-1 text-sm text-gov-500">
					{#if isUrgent}
						Expected response: <span class="font-semibold text-red-600">24-48 hours</span> (urgent priority).
					{:else}
						Expected response: <span class="font-semibold">7 business days</span>.
					{/if}
					Redirecting to dashboard...
				</p>
			</div>
		{:else}
			<!-- Step 1: Report Details -->
			{#if currentStep === 1}
				<div class="animate-slide-up space-y-6">
					<div class="rounded-xl border border-gov-100 bg-surface p-6 shadow-card">
						<h2 class="mb-6 font-display text-xl font-bold text-gov-900">Report Details</h2>

						<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
							<!-- Damage Type -->
							<div>
								<label for="damageType" class="mb-1.5 block text-sm font-semibold text-gov-700">Damage / Issue Type</label>
								<select
									id="damageType"
									bind:value={damageType}
									class="w-full rounded-lg border border-gov-200 bg-surface px-4 py-2.5 text-gov-900 transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-200 focus:outline-none"
								>
									{#each DAMAGE_TYPES as type}
										<option value={type}>{type}</option>
									{/each}
								</select>
							</div>

							<!-- Severity -->
							<div>
								<label for="severity" class="mb-1.5 block text-sm font-semibold text-gov-700">Severity Level</label>
								<div class="flex gap-2">
									{#each SEVERITIES as sev}
										{@const colors = SEVERITY_COLORS[sev]}
										<button
											type="button"
											onclick={() => severity = sev}
											class="flex-1 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-all
												{severity === sev ? `${colors.bg} ${colors.text} ${colors.border} ring-2 ring-offset-1 ring-current` : 'border-gov-200 text-gov-500 hover:bg-gov-50'}"
										>
											{sev}
										</button>
									{/each}
								</div>
							</div>
						</div>

						<!-- Description -->
						<div class="mt-5">
							<label for="description" class="mb-1.5 block text-sm font-semibold text-gov-700">Description of Issue</label>
							<textarea
								id="description"
								bind:value={description}
								rows="4"
								placeholder="Describe the damage or hazard in detail (size, location on road, how long it's been there, etc.)..."
								class="w-full rounded-lg border border-gov-200 bg-surface px-4 py-2.5 text-gov-900 transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-200 focus:outline-none placeholder:text-gov-400"
							></textarea>
						</div>

						<!-- Photo Upload Placeholder -->
						<div class="mt-5">
							<label class="mb-1.5 block text-sm font-semibold text-gov-700">Photo Evidence (Optional)</label>
							<div class="flex h-32 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-gov-300 bg-gov-50 transition-colors hover:border-amber-400 hover:bg-amber-50">
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

					<!-- Urgency Banner -->
					{#if isUrgent}
						<div class="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 animate-fade-in">
							<svg class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
							</svg>
							<div>
								<span class="font-bold">{severity} severity detected.</span> This report will be prioritized for 24-48 hour response.
								{#if damageType === 'Gas Leak'}
									<span class="font-bold"> If you smell gas, evacuate and call 911 immediately.</span>
								{/if}
							</div>
						</div>
					{/if}

					<!-- No Fee Notice -->
					<div class="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-5 py-3 text-sm text-green-700">
						<svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						No fee required for infrastructure reports.
					</div>
				</div>

			<!-- Step 2: Location -->
			{:else if currentStep === 2}
				<div class="animate-slide-up space-y-6">
					<div class="rounded-xl border border-gov-100 bg-surface p-6 shadow-card">
						<h2 class="mb-6 font-display text-xl font-bold text-gov-900">Issue Location</h2>

						<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
							<!-- Address / Intersection -->
							<div class="md:col-span-2">
								<label for="address" class="mb-1.5 block text-sm font-semibold text-gov-700">Address or Intersection</label>
								<input
									id="address"
									type="text"
									bind:value={address}
									placeholder="e.g. 5200 Georgia Ave NW or Georgia Ave & Kennedy St NW"
									class="w-full rounded-lg border border-gov-200 bg-surface px-4 py-2.5 text-gov-900 transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-200 focus:outline-none placeholder:text-gov-400"
								/>
							</div>

							<!-- Lane Affected -->
							<div>
								<label for="lane" class="mb-1.5 block text-sm font-semibold text-gov-700">Lane / Area Affected</label>
								<select
									id="lane"
									bind:value={laneAffected}
									class="w-full rounded-lg border border-gov-200 bg-surface px-4 py-2.5 text-gov-900 transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-200 focus:outline-none"
								>
									{#each LANES as lane}
										<option value={lane}>{lane} Lane</option>
									{/each}
								</select>
							</div>

							<!-- Estimated Size -->
							<div>
								<label for="size" class="mb-1.5 block text-sm font-semibold text-gov-700">Estimated Size of Damage</label>
								<select
									id="size"
									bind:value={estimatedSize}
									class="w-full rounded-lg border border-gov-200 bg-surface px-4 py-2.5 text-gov-900 transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-200 focus:outline-none"
								>
									{#each SIZES as size}
										<option value={size}>{size}</option>
									{/each}
								</select>
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
				<div class="animate-slide-up space-y-6">
					<!-- Urgency Banner for Critical/High -->
					{#if isUrgent}
						<div class="flex items-center gap-3 rounded-xl border-2 border-red-300 bg-red-50 p-5 animate-fade-in">
							<div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
								<svg class="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
								</svg>
							</div>
							<div>
								<p class="font-display font-bold text-red-800">{severity} Priority Report</p>
								<p class="text-sm text-red-600">This report will receive expedited 24-48 hour response.</p>
							</div>
						</div>
					{/if}

					<div class="rounded-xl border border-gov-100 bg-surface p-6 shadow-card">
						<h2 class="mb-6 font-display text-xl font-bold text-gov-900">Review Your Report</h2>

						<div class="space-y-4">
							<div class="rounded-lg bg-amber-50 p-4">
								<h3 class="mb-3 text-sm font-bold uppercase tracking-wider text-amber-700">Issue Details</h3>
								<div class="grid grid-cols-2 gap-3 text-sm">
									<div>
										<span class="text-gov-500">Type:</span>
										<span class="ml-1 font-medium text-gov-900">{damageType}</span>
									</div>
									<div>
										<span class="text-gov-500">Severity:</span>
										<span class="ml-1 font-semibold {SEVERITY_COLORS[severity].text}">{severity}</span>
									</div>
									<div>
										<span class="text-gov-500">Size:</span>
										<span class="ml-1 font-medium text-gov-900">{estimatedSize}</span>
									</div>
									<div>
										<span class="text-gov-500">Lane:</span>
										<span class="ml-1 font-medium text-gov-900">{laneAffected}</span>
									</div>
								</div>
							</div>

							<div class="rounded-lg bg-gov-50 p-4">
								<h3 class="mb-3 text-sm font-bold uppercase tracking-wider text-gov-600">Location</h3>
								<p class="text-sm font-medium text-gov-900">{address || 'Not provided'}</p>
							</div>

							<div class="rounded-lg border border-gov-100 p-4">
								<h3 class="mb-2 text-sm font-bold uppercase tracking-wider text-gov-600">Description</h3>
								<p class="text-sm leading-relaxed text-gov-700">{description || 'No description provided.'}</p>
							</div>
						</div>
					</div>

					<!-- No Fee + Processing Info -->
					<div class="rounded-xl border border-gov-200 bg-surface p-6 shadow-card">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm text-gov-500">Fee</p>
								<p class="text-lg font-bold text-permit-approved">$0.00 - No charge</p>
							</div>
							<div class="text-right">
								<p class="text-sm text-gov-500">Response Time</p>
								<p class="text-lg font-bold {isUrgent ? 'text-red-600' : 'text-gov-900'}">
									{isUrgent ? '24-48 hours' : '7 business days'}
								</p>
							</div>
						</div>
					</div>

					<!-- Submit Button -->
					<button
						onclick={handleSubmit}
						disabled={isSubmitting}
						class="w-full rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 px-6 py-4 font-display text-lg font-bold text-white shadow-card transition-all hover:shadow-card-hover hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
					>
						{#if isSubmitting}
							<span class="inline-flex items-center gap-2">
								<svg class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
								</svg>
								Submitting Report...
							</span>
						{:else}
							Submit Infrastructure Report
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
