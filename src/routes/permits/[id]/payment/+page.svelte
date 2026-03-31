<script lang="ts">
	import { page } from '$app/state';
	import { auth } from '$lib/stores/auth.svelte';
	import { permits, PERMIT_TYPE_META } from '$lib/stores/permits.svelte';
	import { goto } from '$app/navigation';
	import NavHeader from '$lib/components/NavHeader.svelte';
	import FeeEstimator from '$lib/components/FeeEstimator.svelte';
	import {
		calculateConstructionFees,
		calculateParkingFees,
		calculateCommercialVehicleFees,
		formatCurrency,
		type FeeLineItem
	} from '$lib/utils/fees';

	// Auth guard
	$effect(() => {
		if (!auth.isAuthenticated) {
			goto('/login');
		}
	});

	const permit = $derived(permits.getById(page.params.id ?? ''));
	const typeMeta = $derived(permit ? PERMIT_TYPE_META[permit.type] : null);

	// Fee calculation based on permit type
	const feeEstimate = $derived(() => {
		if (!permit) return null;
		switch (permit.type) {
			case 'construction_excavation':
				return calculateConstructionFees(4);
			case 'parking_occupancy':
				return calculateParkingFees(3, 7);
			case 'commercial_vehicle':
				return calculateCommercialVehicleFees(true);
			case 'public_space_rental':
				return {
					items: [
						{ label: 'Public Space Rental Fee', amount: 200, type: 'fee' as const },
						{ label: 'Event Closure Surcharge', amount: 150, type: 'fee' as const },
						{ label: 'Technology Fee', amount: 25, type: 'fee' as const },
						{ label: 'Refundable Cleanup Deposit', amount: 300, type: 'deposit' as const }
					],
					subtotal: 375,
					depositTotal: 300,
					total: 675
				};
			case 'special_heritage_tree':
				return {
					items: [
						{ label: 'Tree Work Permit Fee', amount: 175, type: 'fee' as const },
						{ label: 'Arborist Review Fee', amount: 100, type: 'fee' as const },
						{ label: 'Technology Fee', amount: 25, type: 'fee' as const },
						{ label: 'Refundable Tree Replacement Bond', amount: 750, type: 'deposit' as const }
					],
					subtotal: 300,
					depositTotal: 750,
					total: 1050
				};
			default:
				return calculateConstructionFees(4);
		}
	});

	// Payment method state
	let selectedMethod = $state<'card' | 'ach' | 'in_person'>('card');

	// Card fields (pre-filled)
	let cardNumber = $state('4111 1111 1111 1111');
	let cardExpiry = $state('12/28');
	let cardCvv = $state('123');
	let cardName = $state('Alex Johnson');

	// ACH fields (pre-filled)
	let routingNumber = $state('021000021');
	let accountNumber = $state('123456789012');

	// Payment processing state
	let isProcessing = $state(false);
	let paymentSuccess = $state(false);
	let paymentReference = $state('');

	function generateReference(): string {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		let ref = 'PAY-';
		for (let i = 0; i < 8; i++) {
			ref += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return ref;
	}

	async function handlePayNow() {
		if (!permit) return;
		isProcessing = true;
		paymentReference = generateReference();

		await new Promise((resolve) => setTimeout(resolve, 2000));

		permits.updateStatus(permit.id, 'paid');
		isProcessing = false;
		paymentSuccess = true;

		setTimeout(() => {
			goto(`/permits/${permit.id}/issued`);
		}, 2000);
	}

	let inPersonReference = $state('');
	let showInPersonRef = $state(false);

	function generateInPersonReference() {
		inPersonReference = generateReference();
		showInPersonRef = true;
	}
</script>

<svelte:head>
	<title>{permit ? `Payment - ${permit.title}` : 'Payment'} - TOPS</title>
</svelte:head>

<NavHeader />

{#if auth.isAuthenticated}
	<div class="min-h-screen bg-surface-alt pt-6">
		<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
			{#if !permit}
				<!-- Permit not found -->
				<div class="flex items-center justify-center py-20">
					<div class="bg-surface rounded-2xl shadow-card border border-gov-100 p-12 text-center max-w-md">
						<div class="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
							<svg class="w-8 h-8 text-permit-denied" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<h2 class="text-xl font-display font-bold text-gov-900 mb-2">Permit Not Found</h2>
						<a href="/dashboard" class="text-gov-500 hover:text-gov-700 underline text-sm">Back to Dashboard</a>
					</div>
				</div>
			{:else if permit.status !== 'approved'}
				<!-- Not ready for payment -->
				<div class="flex items-center justify-center py-20">
					<div class="bg-surface rounded-2xl shadow-card border border-gov-100 p-12 text-center max-w-md">
						<div class="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
							<svg class="w-8 h-8 text-permit-pending" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<h2 class="text-xl font-display font-bold text-gov-900 mb-3">This permit is not ready for payment</h2>
						<p class="text-gov-400 text-sm mb-6">
							The permit must be approved before payment can be processed. Current status: <span class="font-semibold capitalize">{permit.status.replace('_', ' ')}</span>
						</p>
						<a
							href="/permits/{permit.id}"
							class="inline-flex items-center gap-2 px-5 py-2.5 bg-gov-600 text-white font-semibold rounded-xl hover:bg-gov-700 transition-colors text-sm"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
							</svg>
							Back to Permit
						</a>
					</div>
				</div>
			{:else if paymentSuccess}
				<!-- Payment success -->
				<div class="flex items-center justify-center py-20">
					<div class="bg-surface rounded-2xl shadow-card border border-green-200 p-12 text-center max-w-md">
						<div class="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
							<svg class="w-10 h-10 text-permit-approved" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
						</div>
						<h2 class="text-2xl font-display font-bold text-gov-900 mb-2">Payment Successful</h2>
						<p class="text-gov-400 text-sm mb-4">
							Your payment has been processed successfully.
						</p>
						<div class="bg-gov-50 rounded-lg px-4 py-3 mb-6">
							<p class="text-xs text-gov-400 mb-1">Payment Reference</p>
							<p class="text-lg font-mono font-bold text-gov-800">{paymentReference}</p>
						</div>
						<p class="text-xs text-gov-300">Redirecting to your issued permit...</p>
					</div>
				</div>
			{:else}
				<!-- Breadcrumb -->
				<nav class="flex items-center gap-2 text-sm text-gov-400 mb-6">
					<a href="/dashboard" class="hover:text-gov-700 transition-colors">Dashboard</a>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
					<a href="/permits/{permit.id}" class="hover:text-gov-700 transition-colors">{permit.referenceNumber}</a>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
					<span class="text-gov-700 font-medium">Payment</span>
				</nav>

				<!-- Page title -->
				<div class="mb-8">
					<h1 class="text-2xl font-display font-bold text-gov-900 mb-1">Permit Payment</h1>
					<p class="text-gov-400 text-sm">
						{typeMeta?.label} — {permit.referenceNumber}
					</p>
				</div>

				<div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
					<!-- Left: Payment form -->
					<div class="lg:col-span-3 space-y-6">
						<!-- Payment method selector -->
						<div class="bg-surface rounded-xl shadow-card border border-gov-100 overflow-hidden">
							<div class="px-5 py-4 border-b border-gov-100">
								<h2 class="font-display font-semibold text-gov-800">Payment Method</h2>
							</div>

							<!-- Method tabs -->
							<div class="flex border-b border-gov-100">
								<button
									onclick={() => selectedMethod = 'card'}
									class="flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2
										{selectedMethod === 'card' ? 'text-gov-700 border-b-2 border-gov-600 bg-gov-50' : 'text-gov-400 hover:text-gov-600 hover:bg-gov-50'}"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
									</svg>
									Credit / Debit
								</button>
								<button
									onclick={() => selectedMethod = 'ach'}
									class="flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2
										{selectedMethod === 'ach' ? 'text-gov-700 border-b-2 border-gov-600 bg-gov-50' : 'text-gov-400 hover:text-gov-600 hover:bg-gov-50'}"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
									</svg>
									Check / ACH
								</button>
								<button
									onclick={() => selectedMethod = 'in_person'}
									class="flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2
										{selectedMethod === 'in_person' ? 'text-gov-700 border-b-2 border-gov-600 bg-gov-50' : 'text-gov-400 hover:text-gov-600 hover:bg-gov-50'}"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
									</svg>
									In-Person
								</button>
							</div>

							<div class="p-5">
								{#if selectedMethod === 'card'}
									<!-- Credit/Debit Card Form -->
									<div class="space-y-4">
										<div>
											<label for="cardName" class="block text-sm font-medium text-gov-700 mb-1.5">Cardholder Name</label>
											<input
												id="cardName"
												type="text"
												bind:value={cardName}
												class="w-full px-4 py-2.5 border border-gov-200 rounded-lg text-gov-800 text-sm focus:outline-none focus:ring-2 focus:ring-gov-400 focus:border-gov-400 bg-surface"
											/>
										</div>
										<div>
											<label for="cardNumber" class="block text-sm font-medium text-gov-700 mb-1.5">Card Number</label>
											<input
												id="cardNumber"
												type="text"
												bind:value={cardNumber}
												class="w-full px-4 py-2.5 border border-gov-200 rounded-lg text-gov-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gov-400 focus:border-gov-400 bg-surface"
											/>
										</div>
										<div class="grid grid-cols-2 gap-4">
											<div>
												<label for="cardExpiry" class="block text-sm font-medium text-gov-700 mb-1.5">Expiry Date</label>
												<input
													id="cardExpiry"
													type="text"
													bind:value={cardExpiry}
													placeholder="MM/YY"
													class="w-full px-4 py-2.5 border border-gov-200 rounded-lg text-gov-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gov-400 focus:border-gov-400 bg-surface"
												/>
											</div>
											<div>
												<label for="cardCvv" class="block text-sm font-medium text-gov-700 mb-1.5">CVV</label>
												<input
													id="cardCvv"
													type="text"
													bind:value={cardCvv}
													class="w-full px-4 py-2.5 border border-gov-200 rounded-lg text-gov-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gov-400 focus:border-gov-400 bg-surface"
												/>
											</div>
										</div>
									</div>
								{:else if selectedMethod === 'ach'}
									<!-- ACH Form -->
									<div class="space-y-4">
										<div>
											<label for="routingNumber" class="block text-sm font-medium text-gov-700 mb-1.5">Routing Number</label>
											<input
												id="routingNumber"
												type="text"
												bind:value={routingNumber}
												class="w-full px-4 py-2.5 border border-gov-200 rounded-lg text-gov-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gov-400 focus:border-gov-400 bg-surface"
											/>
										</div>
										<div>
											<label for="accountNumber" class="block text-sm font-medium text-gov-700 mb-1.5">Account Number</label>
											<input
												id="accountNumber"
												type="text"
												bind:value={accountNumber}
												class="w-full px-4 py-2.5 border border-gov-200 rounded-lg text-gov-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gov-400 focus:border-gov-400 bg-surface"
											/>
										</div>
										<div class="bg-gov-50 rounded-lg p-3">
											<p class="text-xs text-gov-500">
												ACH payments typically take 2-3 business days to process. Your permit will be issued once the payment clears.
											</p>
										</div>
									</div>
								{:else}
									<!-- In-Person -->
									<div class="space-y-4">
										<div class="bg-gov-50 border border-gov-200 rounded-lg p-4">
											<div class="flex items-start gap-3">
												<svg class="w-5 h-5 text-gov-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
												</svg>
												<div>
													<p class="text-sm font-semibold text-gov-800 mb-1">Office of the Chief Financial Officer</p>
													<p class="text-sm text-gov-600">1350 Pennsylvania Ave NW</p>
													<p class="text-sm text-gov-600">Washington, DC 20004</p>
													<p class="text-xs text-gov-400 mt-2">Hours: Mon-Fri, 8:30 AM - 4:30 PM</p>
												</div>
											</div>
										</div>

										<p class="text-sm text-gov-500">
											Generate a payment reference number to present at the cashier window. Payment can be made by cash, check, or money order.
										</p>

										{#if showInPersonRef}
											<div class="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
												<p class="text-xs text-green-600 mb-1">Payment Reference Number</p>
												<p class="text-xl font-mono font-bold text-green-800">{inPersonReference}</p>
												<p class="text-xs text-green-500 mt-2">Present this number at the cashier window</p>
											</div>
										{:else}
											<button
												onclick={generateInPersonReference}
												class="w-full px-4 py-3 bg-gov-100 text-gov-700 font-semibold rounded-lg hover:bg-gov-200 transition-colors text-sm"
											>
												Generate Payment Reference
											</button>
										{/if}
									</div>
								{/if}
							</div>
						</div>

						<!-- PCI Compliance badge -->
						<div class="flex items-center gap-3 px-4 py-3 bg-surface rounded-xl border border-gov-100">
							<svg class="w-5 h-5 text-gov-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
							</svg>
							<p class="text-xs text-gov-400">
								<span class="font-semibold text-gov-600">PCI-DSS Compliant</span> &bull; Payments processed securely
							</p>
						</div>

						<!-- Pay Now button (not shown for in-person) -->
						{#if selectedMethod !== 'in_person'}
							<button
								onclick={handlePayNow}
								disabled={isProcessing}
								class="w-full px-6 py-4 bg-gov-600 text-white font-bold rounded-xl hover:bg-gov-700 transition-colors text-base disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
							>
								{#if isProcessing}
									<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
										<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
										<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									Processing Payment...
								{:else}
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
									</svg>
									Pay Now — {formatCurrency(feeEstimate()?.total ?? 0)}
								{/if}
							</button>
						{/if}
					</div>

					<!-- Right: Fee breakdown -->
					<div class="lg:col-span-2 space-y-6">
						<!-- Permit summary -->
						<div class="bg-surface rounded-xl shadow-card border border-gov-100 p-5">
							<h3 class="font-display font-semibold text-sm text-gov-800 mb-3">Permit Summary</h3>
							<dl class="space-y-2.5 text-sm">
								<div class="flex justify-between">
									<dt class="text-gov-400">Reference</dt>
									<dd class="font-mono text-gov-700 font-medium">{permit.referenceNumber}</dd>
								</div>
								<div class="flex justify-between">
									<dt class="text-gov-400">Type</dt>
									<dd class="text-gov-700">{typeMeta?.label}</dd>
								</div>
								<div class="flex justify-between">
									<dt class="text-gov-400">Applicant</dt>
									<dd class="text-gov-700">{permit.applicant}</dd>
								</div>
								{#if permit.addresses?.[0]}
									<div class="flex justify-between gap-4">
										<dt class="text-gov-400 shrink-0">Location</dt>
										<dd class="text-gov-700 text-right text-xs">{permit.addresses[0].address}</dd>
									</div>
								{/if}
							</dl>
						</div>

						<!-- Fee breakdown -->
						{#if feeEstimate()}
							<FeeEstimator
								fees={feeEstimate()!.items}
								disclaimer="Fees are determined by DCMR Title 24 and are subject to change. Deposits are refundable upon satisfactory completion and inspection."
							/>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
