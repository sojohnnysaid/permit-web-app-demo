<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth.svelte';
	import { accountStore } from '$lib/stores/account.svelte';
	import NavHeader from '$lib/components/NavHeader.svelte';

	$effect(() => {
		if (!auth.isAuthenticated) {
			goto('/login');
		}
	});

	let companyName = $state(accountStore.account.companyName);
	let ein = $state(accountStore.account.ein);
	let contactName = $state(accountStore.account.contactName);
	let contactEmail = $state(accountStore.account.contactEmail);
	let contactPhone = $state(accountStore.account.contactPhone);
	let address = $state(accountStore.account.address);

	let projectName = $state(accountStore.project.name);
	let projectDescription = $state(accountStore.project.description);
	let projectWard = $state(accountStore.project.ward);
	let projectDuration = $state(accountStore.project.estimatedDuration);

	let saved = $state(false);

	function handleSave() {
		accountStore.updateAccount({
			companyName,
			ein,
			contactName,
			contactEmail,
			contactPhone,
			address
		});
		accountStore.updateProject({
			name: projectName,
			description: projectDescription,
			ward: projectWard,
			estimatedDuration: projectDuration
		});
		accountStore.completeSetup();
		saved = true;
		setTimeout(() => {
			goto('/dashboard');
		}, 1200);
	}
</script>

<div class="min-h-screen bg-surface-alt">
	<NavHeader />

	<main id="main-content" class="mx-auto max-w-4xl px-6 py-10">
		<div class="mb-8">
			<h1 class="font-display text-3xl font-bold text-gov-900">Account & Project Setup</h1>
			<p class="mt-2 text-gov-500">Configure your business account and designate your project before applying for permits.</p>
		</div>

		{#if saved}
			<div class="animate-[fade-in_0.3s_ease-out] rounded-xl border border-green-200 bg-green-50 p-6 text-center">
				<div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-permit-approved text-white">
					<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
					</svg>
				</div>
				<h2 class="font-display text-xl font-bold text-green-800">Account Setup Complete</h2>
				<p class="mt-1 text-green-600">Redirecting to dashboard...</p>
			</div>
		{:else}
			<form on:submit|preventDefault={handleSave} class="space-y-8">
				<!-- Business Account Section -->
				<div class="rounded-xl border border-gov-100 bg-surface p-6 shadow-card">
					<h2 class="mb-5 font-display text-lg font-bold text-gov-900">Business Account</h2>
					<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
						<div>
							<label for="companyName" class="mb-1.5 block text-sm font-medium text-gov-700">Company / Organization Name</label>
							<input
								id="companyName"
								type="text"
								bind:value={companyName}
								class="w-full rounded-lg border border-gov-200 px-3 py-2.5 text-sm text-gov-900 transition-colors focus:border-civic-500 focus:outline-none focus:ring-2 focus:ring-civic-500/20"
							/>
						</div>
						<div>
							<label for="ein" class="mb-1.5 block text-sm font-medium text-gov-700">EIN / Tax ID</label>
							<input
								id="ein"
								type="text"
								bind:value={ein}
								class="w-full rounded-lg border border-gov-200 px-3 py-2.5 text-sm text-gov-900 transition-colors focus:border-civic-500 focus:outline-none focus:ring-2 focus:ring-civic-500/20"
							/>
						</div>
						<div>
							<label for="contactName" class="mb-1.5 block text-sm font-medium text-gov-700">Primary Contact</label>
							<input
								id="contactName"
								type="text"
								bind:value={contactName}
								class="w-full rounded-lg border border-gov-200 px-3 py-2.5 text-sm text-gov-900 transition-colors focus:border-civic-500 focus:outline-none focus:ring-2 focus:ring-civic-500/20"
							/>
						</div>
						<div>
							<label for="contactEmail" class="mb-1.5 block text-sm font-medium text-gov-700">Email</label>
							<input
								id="contactEmail"
								type="email"
								bind:value={contactEmail}
								class="w-full rounded-lg border border-gov-200 px-3 py-2.5 text-sm text-gov-900 transition-colors focus:border-civic-500 focus:outline-none focus:ring-2 focus:ring-civic-500/20"
							/>
						</div>
						<div>
							<label for="contactPhone" class="mb-1.5 block text-sm font-medium text-gov-700">Phone</label>
							<input
								id="contactPhone"
								type="tel"
								bind:value={contactPhone}
								class="w-full rounded-lg border border-gov-200 px-3 py-2.5 text-sm text-gov-900 transition-colors focus:border-civic-500 focus:outline-none focus:ring-2 focus:ring-civic-500/20"
							/>
						</div>
						<div>
							<label for="address" class="mb-1.5 block text-sm font-medium text-gov-700">Business Address</label>
							<input
								id="address"
								type="text"
								bind:value={address}
								class="w-full rounded-lg border border-gov-200 px-3 py-2.5 text-sm text-gov-900 transition-colors focus:border-civic-500 focus:outline-none focus:ring-2 focus:ring-civic-500/20"
							/>
						</div>
					</div>
				</div>

				<!-- Project Designation Section -->
				<div class="rounded-xl border border-gov-100 bg-surface p-6 shadow-card">
					<h2 class="mb-5 font-display text-lg font-bold text-gov-900">Project Designation</h2>
					<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
						<div class="sm:col-span-2">
							<label for="projectName" class="mb-1.5 block text-sm font-medium text-gov-700">Project Name</label>
							<input
								id="projectName"
								type="text"
								bind:value={projectName}
								class="w-full rounded-lg border border-gov-200 px-3 py-2.5 text-sm text-gov-900 transition-colors focus:border-civic-500 focus:outline-none focus:ring-2 focus:ring-civic-500/20"
							/>
						</div>
						<div class="sm:col-span-2">
							<label for="projectDescription" class="mb-1.5 block text-sm font-medium text-gov-700">Project Description</label>
							<textarea
								id="projectDescription"
								bind:value={projectDescription}
								rows="3"
								class="w-full rounded-lg border border-gov-200 px-3 py-2.5 text-sm text-gov-900 transition-colors focus:border-civic-500 focus:outline-none focus:ring-2 focus:ring-civic-500/20"
							></textarea>
						</div>
						<div>
							<label for="projectWard" class="mb-1.5 block text-sm font-medium text-gov-700">Primary Ward</label>
							<select
								id="projectWard"
								bind:value={projectWard}
								class="w-full rounded-lg border border-gov-200 px-3 py-2.5 text-sm text-gov-900 transition-colors focus:border-civic-500 focus:outline-none focus:ring-2 focus:ring-civic-500/20"
							>
								{#each Array.from({ length: 8 }, (_, i) => `Ward ${i + 1}`) as ward}
									<option value={ward}>{ward}</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="projectDuration" class="mb-1.5 block text-sm font-medium text-gov-700">Estimated Duration</label>
							<select
								id="projectDuration"
								bind:value={projectDuration}
								class="w-full rounded-lg border border-gov-200 px-3 py-2.5 text-sm text-gov-900 transition-colors focus:border-civic-500 focus:outline-none focus:ring-2 focus:ring-civic-500/20"
							>
								<option value="1 month">1 month</option>
								<option value="3 months">3 months</option>
								<option value="6 months">6 months</option>
								<option value="12 months">12 months</option>
								<option value="18+ months">18+ months</option>
							</select>
						</div>
					</div>
				</div>

				<!-- Applicant Assignment -->
				<div class="rounded-xl border border-gov-100 bg-surface p-6 shadow-card">
					<h2 class="mb-5 font-display text-lg font-bold text-gov-900">Applicant Assignment</h2>
					<div class="flex items-center gap-4 rounded-lg border border-gov-100 bg-surface-alt p-4">
						<div class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gov-500 to-civic-500 text-sm font-bold text-white">
							{auth.user?.avatar ?? '?'}
						</div>
						<div>
							<p class="font-medium text-gov-900">{auth.user?.name ?? 'Unknown'}</p>
							<p class="text-sm text-gov-500">{auth.user?.email ?? ''}</p>
						</div>
						<span class="ml-auto rounded-full bg-permit-approved/10 px-3 py-1 text-xs font-medium text-permit-approved">Primary Applicant</span>
					</div>
					<p class="mt-3 text-xs text-gov-400">Additional applicants can be assigned after project creation.</p>
				</div>

				<!-- Submit -->
				<div class="flex justify-end gap-3">
					<a
						href="/dashboard"
						class="rounded-lg border border-gov-200 px-6 py-2.5 text-sm font-medium text-gov-600 transition-colors hover:bg-gov-50"
					>
						Skip for Now
					</a>
					<button
						type="submit"
						class="rounded-lg bg-gradient-to-r from-gov-600 to-civic-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md hover:brightness-110"
					>
						Save & Continue
					</button>
				</div>
			</form>
		{/if}
	</main>
</div>
