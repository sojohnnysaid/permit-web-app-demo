<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth.svelte';
	import { permits } from '$lib/stores/permits.svelte';
	import { reviewerStore, type ReviewComment } from '$lib/stores/reviewer.svelte';
	import NavHeader from '$lib/components/NavHeader.svelte';

	// Auth guard
	$effect(() => {
		if (!auth.isAuthenticated) {
			goto('/login');
		}
	});

	const permit = $derived(permits.getById(page.params.id ?? ''));
	const comments = $derived(permit ? reviewerStore.getComments(permit.id) : []);
	const isReturned = $derived(permit?.status === 'returned');

	// Response state: one textarea per comment
	let responses = $state<Record<string, string>>({});
	let additionalNotes = $state('');
	let submitting = $state(false);
	let successMessage = $state('');

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
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

	function roleBadgeClasses(role: string): string {
		if (role === 'Senior Reviewer') return 'bg-purple-100 text-purple-700';
		if (role === 'Reviewer') return 'bg-gov-100 text-gov-700';
		return 'bg-gray-100 text-gray-700';
	}

	function commentTypeIcon(type: ReviewComment['type']): string {
		switch (type) {
			case 'request_info':
				return 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
			case 'approval':
				return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
			case 'denial':
				return 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';
			default:
				return 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z';
		}
	}

	async function handleResubmit() {
		if (!permit) return;

		submitting = true;

		// Add individual responses to comments
		for (const comment of comments) {
			const responseText = responses[comment.id]?.trim();
			if (responseText) {
				reviewerStore.addComment(permit.id, {
					author: permit.applicant,
					role: 'Applicant',
					content: responseText,
					type: 'comment'
				});
			}
		}

		// Add additional notes if provided
		if (additionalNotes.trim()) {
			reviewerStore.addComment(permit.id, {
				author: permit.applicant,
				role: 'Applicant',
				content: additionalNotes.trim(),
				type: 'comment'
			});
		}

		// Update permit status back to submitted
		permits.updateStatus(permit.id, 'submitted');

		// Update SLA deadline to 7 days from now
		const permitObj = permits.getById(permit.id);
		if (permitObj) {
			const newDeadline = new Date();
			newDeadline.setDate(newDeadline.getDate() + 7);
			permitObj.slaDeadline = newDeadline.toISOString();
		}

		successMessage = 'Your response has been submitted. The review clock has been reset.';

		// Redirect to dashboard after 2 seconds
		setTimeout(() => {
			goto('/dashboard');
		}, 2000);
	}
</script>

<NavHeader />

<div class="min-h-screen bg-gray-50">
	<div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
		{#if !permit}
			<!-- Permit not found -->
			<div class="rounded-xl bg-white p-8 text-center shadow-card">
				<svg class="mx-auto mb-4 h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<h2 class="mb-2 text-xl font-semibold text-gray-900">Permit Not Found</h2>
				<p class="mb-6 text-gray-500">The permit you're looking for doesn't exist or has been removed.</p>
				<a href="/dashboard" class="inline-flex items-center gap-2 rounded-lg bg-gov-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gov-700">
					Back to Dashboard
				</a>
			</div>
		{:else if !isReturned}
			<!-- Permit not in returned status -->
			<div class="rounded-xl bg-white p-8 text-center shadow-card">
				<svg class="mx-auto mb-4 h-12 w-12 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
				<h2 class="mb-2 text-xl font-semibold text-gray-900">Response Not Available</h2>
				<p class="mb-6 text-gray-500">This permit has not been returned for additional information. You can only respond when a reviewer has requested changes.</p>
				<a href="/permits/{permit.id}" class="inline-flex items-center gap-2 rounded-lg bg-gov-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gov-700">
					View Permit Details
				</a>
			</div>
		{:else if successMessage}
			<!-- Success state -->
			<div class="rounded-xl bg-white p-8 text-center shadow-card">
				<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
					<svg class="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
				</div>
				<h2 class="mb-2 text-xl font-semibold text-gray-900">Response Submitted</h2>
				<p class="text-gray-600">{successMessage}</p>
				<p class="mt-4 text-sm text-gray-400">Redirecting to dashboard...</p>
			</div>
		{:else}
			<!-- Main respond form -->
			<!-- Header -->
			<div class="mb-8">
				<a href="/permits/{permit.id}" class="mb-4 inline-flex items-center gap-1 text-sm text-gov-600 transition-colors hover:text-gov-700">
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					Back to Permit
				</a>

				<div class="flex items-start gap-4">
					<div class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100">
						<svg class="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
						</svg>
					</div>
					<div>
						<h1 class="text-2xl font-bold text-gray-900">Respond to Review Comments</h1>
						<p class="mt-1 text-lg text-gray-600">{permit.title}</p>
						<p class="mt-0.5 font-mono text-sm text-gray-400">{permit.referenceNumber}</p>
					</div>
				</div>
			</div>

			<!-- Reviewer Comments Section -->
			<div class="mb-8 space-y-6">
				<h2 class="flex items-center gap-2 text-lg font-semibold text-gray-900">
					<svg class="h-5 w-5 text-gov-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
					</svg>
					Review Comments ({comments.length})
				</h2>

				{#if comments.length === 0}
					<div class="rounded-xl bg-white p-6 shadow-card">
						<p class="text-center text-gray-500">No reviewer comments found. You may still add additional notes below.</p>
					</div>
				{/if}

				{#each comments as comment (comment.id)}
					<div class="overflow-hidden rounded-xl bg-white shadow-card">
						<!-- Reviewer comment -->
						<div class="border-l-4 border-gov-300 p-5">
							<div class="mb-3 flex items-center gap-3">
								<div class="flex h-8 w-8 items-center justify-center rounded-full bg-gov-100">
									<svg class="h-4 w-4 text-gov-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={commentTypeIcon(comment.type)} />
									</svg>
								</div>
								<div class="flex-1">
									<div class="flex items-center gap-2">
										<span class="font-medium text-gray-900">{comment.author}</span>
										<span class="rounded-full px-2 py-0.5 text-xs font-medium {roleBadgeClasses(comment.role)}">{comment.role}</span>
									</div>
									<span class="text-xs text-gray-400" title={formatDate(comment.timestamp)}>{timeAgo(comment.timestamp)}</span>
								</div>
							</div>
							<p class="text-sm leading-relaxed text-gray-700">{comment.content}</p>
						</div>

						<!-- Applicant response area -->
						<div class="border-l-4 border-civic-500 bg-gray-50 p-5">
							<label for="response-{comment.id}" class="mb-2 block text-sm font-medium text-gray-700">
								Your Response
							</label>
							<textarea
								id="response-{comment.id}"
								bind:value={responses[comment.id]}
								placeholder="Type your response to this comment..."
								rows="3"
								class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-civic-500 focus:outline-none focus:ring-2 focus:ring-civic-500/20"
							></textarea>

							<button
								type="button"
								class="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800"
							>
								<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
								</svg>
								Attach Updated Document
							</button>
						</div>
					</div>
				{/each}
			</div>

			<!-- Additional Notes Section -->
			<div class="mb-8 rounded-xl bg-white p-6 shadow-card">
				<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
					<svg class="h-5 w-5 text-civic-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
					</svg>
					Additional Notes
				</h2>
				<textarea
					bind:value={additionalNotes}
					placeholder="Add any additional information or context for the reviewer..."
					rows="4"
					class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-civic-500 focus:outline-none focus:ring-2 focus:ring-civic-500/20"
				></textarea>
			</div>

			<!-- Actions -->
			<div class="flex items-center justify-between rounded-xl bg-white p-6 shadow-card">
				<a
					href="/permits/{permit.id}"
					class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
				>
					Cancel
				</a>

				<button
					onclick={handleResubmit}
					disabled={submitting}
					class="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if submitting}
						<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						Submitting...
					{:else}
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
						</svg>
						Resubmit Application
					{/if}
				</button>
			</div>
		{/if}
	</div>
</div>
