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

	const STEPS = ['Event Details', 'Location', 'Review & Submit'];
	let progress = $derived(((currentStep - 1) / (STEPS.length - 1)) * 100);

	// ─── Step 1: Event Details ──────────────────────────────────────
	const EVENT_TYPES = ['Wedding', 'Block Party', 'Funeral', 'Festival', 'Farmers Market', 'Film/TV Shoot'];

	let eventType = $state('Wedding');
	let eventDate = $state('');
	let eventStartTime = $state('');
	let eventEndTime = $state('');
	let expectedGuests = $state(50);
	let parkingSpaces = $state(2);
	let description = $state('');

	// ─── Step 2: Location ───────────────────────────────────────────
	const QUADRANTS = ['NW', 'NE', 'SW', 'SE'];
	const WARD_MAP: Record<string, string> = {
		NW: 'Ward 2',
		NE: 'Ward 5',
		SW: 'Ward 6',
		SE: 'Ward 8'
	};

	let address = $state('');
	let quadrant = $state('NW');
	let ward = $derived(WARD_MAP[quadrant]);
	let spaceDescription = $state('');

	// ─── Fees ───────────────────────────────────────────────────────
	let baseFee = $derived(75);
	let parkingFee = $derived(parkingSpaces * 25);
	let totalFee = $derived(baseFee + parkingFee);

	// ─── Validation ─────────────────────────────────────────────────
	let step1Valid = $derived(eventDate !== '' && eventStartTime !== '' && eventEndTime !== '' && description.length > 0);
	let step2Valid = $derived(address.length > 0 && spaceDescription.length > 0);

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
			type: 'public_space',
			title: `${eventType} - Street Parking & Space Reservation`,
			description,
			status: 'submitted',
			eventType,
			ward,
			quadrant,
			addresses: [
				{
					address: `${address}, Washington, DC ${quadrant}`,
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
	<div class="relative overflow-hidden bg-gradient-to-r from-civic-600 via-civic-500 to-civic-400">
		<div class="absolute inset-0 opacity-10">
			<svg class="h-full w-full" viewBox="0 0 400 200" fill="none">
				<circle cx="350" cy="30" r="100" fill="white" />
				<circle cx="50" cy="180" r="60" fill="white" />
			</svg>
		</div>
		<div class="relative mx-auto max-w-4xl px-6 py-8">
			<a
				href="/permits/new"
				class="mb-3 inline-flex items-center gap-2 text-sm font-medium text-civic-100 transition-colors hover:text-white"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
				</svg>
				Back to Permit Types
			</a>
			<div class="flex items-center gap-3">
				<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
					<svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
					</svg>
				</div>
				<div>
					<h1 class="font-display text-2xl font-bold text-white">Public Space / Event Permit</h1>
					<p class="text-sm text-civic-100">Reserve parking and public space for your event</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Progress Bar -->
	<div class="border-b border-gov-100 bg-surface">
		<div class="mx-auto max-w-4xl px-6 py-4">
			<div class="flex items-center justify-between mb-2">
				{#each STEPS as step, i}
					<div class="flex items-center gap-2 text-sm font-medium {currentStep > i + 1 ? 'text-civic-600' : currentStep === i + 1 ? 'text-gov-900' : 'text-gov-400'}">
						<div class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold
							{currentStep > i + 1 ? 'bg-civic-500 text-white' : currentStep === i + 1 ? 'bg-gov-800 text-white' : 'bg-gov-200 text-gov-500'}">
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
					class="h-full rounded-full bg-gradient-to-r from-civic-500 to-civic-400 transition-all duration-500 ease-out"
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
				<h2 class="font-display text-2xl font-bold text-gov-900">Permit Submitted!</h2>
				<p class="mt-2 text-gov-600">Reference: <span class="font-mono font-bold text-civic-600">{submittedRef}</span></p>
				<p class="mt-1 text-sm text-gov-500">Expected processing: 7 business days. Redirecting to dashboard...</p>
			</div>
		{:else}
			<!-- Step 1: Event Details -->
			{#if currentStep === 1}
				<div class="animate-slide-up space-y-6">
					<div class="rounded-xl border border-gov-100 bg-surface p-6 shadow-card">
						<h2 class="mb-6 font-display text-xl font-bold text-gov-900">Event Details</h2>

						<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
							<!-- Event Type -->
							<div>
								<label for="eventType" class="mb-1.5 block text-sm font-semibold text-gov-700">Event Type</label>
								<select
									id="eventType"
									bind:value={eventType}
									class="w-full rounded-lg border border-gov-200 bg-surface px-4 py-2.5 text-gov-900 transition-colors focus:border-civic-400 focus:ring-2 focus:ring-civic-200 focus:outline-none"
								>
									{#each EVENT_TYPES as type}
										<option value={type}>{type}</option>
									{/each}
								</select>
							</div>

							<!-- Expected Guests -->
							<div>
								<label for="guests" class="mb-1.5 block text-sm font-semibold text-gov-700">Expected Guests</label>
								<input
									id="guests"
									type="number"
									bind:value={expectedGuests}
									min="1"
									max="10000"
									class="w-full rounded-lg border border-gov-200 bg-surface px-4 py-2.5 text-gov-900 transition-colors focus:border-civic-400 focus:ring-2 focus:ring-civic-200 focus:outline-none"
								/>
							</div>

							<!-- Event Date -->
							<div>
								<label for="eventDate" class="mb-1.5 block text-sm font-semibold text-gov-700">Event Date</label>
								<input
									id="eventDate"
									type="date"
									bind:value={eventDate}
									class="w-full rounded-lg border border-gov-200 bg-surface px-4 py-2.5 text-gov-900 transition-colors focus:border-civic-400 focus:ring-2 focus:ring-civic-200 focus:outline-none"
								/>
							</div>

							<!-- Parking Spaces -->
							<div>
								<label for="parking" class="mb-1.5 block text-sm font-semibold text-gov-700">Parking Spaces Needed (1-6)</label>
								<select
									id="parking"
									bind:value={parkingSpaces}
									class="w-full rounded-lg border border-gov-200 bg-surface px-4 py-2.5 text-gov-900 transition-colors focus:border-civic-400 focus:ring-2 focus:ring-civic-200 focus:outline-none"
								>
									{#each [1, 2, 3, 4, 5, 6] as num}
										<option value={num}>{num} space{num > 1 ? 's' : ''}</option>
									{/each}
								</select>
							</div>

							<!-- Start Time -->
							<div>
								<label for="startTime" class="mb-1.5 block text-sm font-semibold text-gov-700">Start Time</label>
								<input
									id="startTime"
									type="time"
									bind:value={eventStartTime}
									class="w-full rounded-lg border border-gov-200 bg-surface px-4 py-2.5 text-gov-900 transition-colors focus:border-civic-400 focus:ring-2 focus:ring-civic-200 focus:outline-none"
								/>
							</div>

							<!-- End Time -->
							<div>
								<label for="endTime" class="mb-1.5 block text-sm font-semibold text-gov-700">End Time</label>
								<input
									id="endTime"
									type="time"
									bind:value={eventEndTime}
									class="w-full rounded-lg border border-gov-200 bg-surface px-4 py-2.5 text-gov-900 transition-colors focus:border-civic-400 focus:ring-2 focus:ring-civic-200 focus:outline-none"
								/>
							</div>
						</div>

						<!-- Description -->
						<div class="mt-5">
							<label for="description" class="mb-1.5 block text-sm font-semibold text-gov-700">Event Description</label>
							<textarea
								id="description"
								bind:value={description}
								rows="3"
								placeholder="Describe your event, including any special needs (sound, tents, food service, etc.)..."
								class="w-full rounded-lg border border-gov-200 bg-surface px-4 py-2.5 text-gov-900 transition-colors focus:border-civic-400 focus:ring-2 focus:ring-civic-200 focus:outline-none placeholder:text-gov-400"
							></textarea>
						</div>
					</div>

					<!-- Fee Preview -->
					<div class="rounded-lg border border-civic-200 bg-civic-50 px-5 py-3">
						<div class="flex items-center gap-2 text-sm text-civic-600">
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
							</svg>
							Estimated fee: <span class="font-bold">${baseFee} base + ${parkingFee} parking = ${totalFee}</span>
						</div>
					</div>
				</div>

			<!-- Step 2: Location -->
			{:else if currentStep === 2}
				<div class="animate-slide-up space-y-6">
					<div class="rounded-xl border border-gov-100 bg-surface p-6 shadow-card">
						<h2 class="mb-6 font-display text-xl font-bold text-gov-900">Event Location</h2>

						<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
							<!-- Address -->
							<div class="md:col-span-2">
								<label for="address" class="mb-1.5 block text-sm font-semibold text-gov-700">Street Address</label>
								<input
									id="address"
									type="text"
									bind:value={address}
									placeholder="e.g. 1400 O St NW"
									class="w-full rounded-lg border border-gov-200 bg-surface px-4 py-2.5 text-gov-900 transition-colors focus:border-civic-400 focus:ring-2 focus:ring-civic-200 focus:outline-none placeholder:text-gov-400"
								/>
							</div>

							<!-- Quadrant -->
							<div>
								<label for="quadrant" class="mb-1.5 block text-sm font-semibold text-gov-700">Quadrant</label>
								<select
									id="quadrant"
									bind:value={quadrant}
									class="w-full rounded-lg border border-gov-200 bg-surface px-4 py-2.5 text-gov-900 transition-colors focus:border-civic-400 focus:ring-2 focus:ring-civic-200 focus:outline-none"
								>
									{#each QUADRANTS as q}
										<option value={q}>{q}</option>
									{/each}
								</select>
							</div>

							<!-- Ward (Auto) -->
							<div>
								<label class="mb-1.5 block text-sm font-semibold text-gov-700">Ward (Auto-assigned)</label>
								<div class="flex h-[42px] items-center rounded-lg border border-gov-200 bg-gov-50 px-4 text-gov-600 font-medium">
									{ward}
								</div>
							</div>
						</div>

						<!-- Space Description -->
						<div class="mt-5">
							<label for="spaceDesc" class="mb-1.5 block text-sm font-semibold text-gov-700">Description of Space Needed</label>
							<textarea
								id="spaceDesc"
								bind:value={spaceDescription}
								rows="3"
								placeholder="Describe the space you need (parking lane, sidewalk area, street closure, etc.)..."
								class="w-full rounded-lg border border-gov-200 bg-surface px-4 py-2.5 text-gov-900 transition-colors focus:border-civic-400 focus:ring-2 focus:ring-civic-200 focus:outline-none placeholder:text-gov-400"
							></textarea>
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
					<div class="rounded-xl border border-gov-100 bg-surface p-6 shadow-card">
						<h2 class="mb-6 font-display text-xl font-bold text-gov-900">Review Your Application</h2>

						<!-- Event Summary -->
						<div class="space-y-4">
							<div class="rounded-lg bg-civic-50 p-4">
								<h3 class="mb-3 text-sm font-bold uppercase tracking-wider text-civic-600">Event Information</h3>
								<div class="grid grid-cols-2 gap-3 text-sm">
									<div>
										<span class="text-gov-500">Type:</span>
										<span class="ml-1 font-medium text-gov-900">{eventType}</span>
									</div>
									<div>
										<span class="text-gov-500">Date:</span>
										<span class="ml-1 font-medium text-gov-900">{eventDate || 'Not set'}</span>
									</div>
									<div>
										<span class="text-gov-500">Time:</span>
										<span class="ml-1 font-medium text-gov-900">{eventStartTime || '?'} - {eventEndTime || '?'}</span>
									</div>
									<div>
										<span class="text-gov-500">Guests:</span>
										<span class="ml-1 font-medium text-gov-900">{expectedGuests}</span>
									</div>
									<div>
										<span class="text-gov-500">Parking Spaces:</span>
										<span class="ml-1 font-medium text-gov-900">{parkingSpaces}</span>
									</div>
								</div>
							</div>

							<div class="rounded-lg bg-gov-50 p-4">
								<h3 class="mb-3 text-sm font-bold uppercase tracking-wider text-gov-600">Location</h3>
								<div class="grid grid-cols-2 gap-3 text-sm">
									<div class="col-span-2">
										<span class="text-gov-500">Address:</span>
										<span class="ml-1 font-medium text-gov-900">{address || 'Not set'}, Washington, DC {quadrant}</span>
									</div>
									<div>
										<span class="text-gov-500">Ward:</span>
										<span class="ml-1 font-medium text-gov-900">{ward}</span>
									</div>
									<div>
										<span class="text-gov-500">Space Needed:</span>
										<span class="ml-1 font-medium text-gov-900">{spaceDescription || 'Not described'}</span>
									</div>
								</div>
							</div>

							<!-- Description -->
							<div class="rounded-lg border border-gov-100 p-4">
								<h3 class="mb-2 text-sm font-bold uppercase tracking-wider text-gov-600">Description</h3>
								<p class="text-sm leading-relaxed text-gov-700">{description || 'No description provided.'}</p>
							</div>
						</div>
					</div>

					<!-- Fee Breakdown -->
					<div class="rounded-xl border border-civic-200 bg-surface p-6 shadow-card">
						<h3 class="mb-4 font-display text-lg font-bold text-gov-900">Fee Breakdown</h3>
						<div class="space-y-2 text-sm">
							<div class="flex justify-between text-gov-600">
								<span>Base event permit fee</span>
								<span>${baseFee}.00</span>
							</div>
							<div class="flex justify-between text-gov-600">
								<span>Parking reservation ({parkingSpaces} spaces x $25)</span>
								<span>${parkingFee}.00</span>
							</div>
							<div class="mt-3 flex justify-between border-t border-gov-200 pt-3 text-base font-bold text-gov-900">
								<span>Total Due</span>
								<span class="text-civic-600">${totalFee}.00</span>
							</div>
						</div>
					</div>

					<!-- Processing Info -->
					<div class="flex items-center gap-3 rounded-lg border border-gov-200 bg-gov-50 p-4 text-sm text-gov-600">
						<svg class="h-5 w-5 flex-shrink-0 text-gov-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
						</svg>
						Processing time: approximately <span class="font-semibold">7 business days</span>.
					</div>

					<!-- Submit Button -->
					<button
						onclick={handleSubmit}
						disabled={isSubmitting}
						class="w-full rounded-xl bg-gradient-to-r from-civic-600 to-civic-500 px-6 py-4 font-display text-lg font-bold text-white shadow-card transition-all hover:shadow-card-hover hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
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
							Submit Application & Pay ${totalFee}.00
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
