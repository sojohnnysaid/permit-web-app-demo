<script lang="ts">
	import { chat } from '$lib/stores/chat.svelte';

	let inputValue = $state('');
	let messagesEnd: HTMLDivElement | undefined = $state();

	// Auto-scroll to bottom when messages change or typing state changes
	$effect(() => {
		// Track reactive dependencies
		chat.messages;
		chat.isTyping;
		// Scroll after DOM update
		if (messagesEnd) {
			messagesEnd.scrollIntoView({ behavior: 'smooth' });
		}
	});

	function handleSend() {
		const text = inputValue.trim();
		if (!text || chat.isTyping) return;
		inputValue = '';
		chat.send(text);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	function handleQuickAction(text: string) {
		if (chat.isTyping) return;
		chat.send(text);
	}

	function renderBold(content: string): string {
		return content
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			.replace(/\n/g, '<br>');
	}
</script>

<!-- Floating Chat Button -->
<div class="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
	<!-- Chat Panel -->
	{#if chat.isOpen}
		<div
			class="w-[400px] h-[500px] bg-surface rounded-2xl shadow-modal flex flex-col overflow-hidden"
			style="transform-origin: bottom right;"
		>
			<!-- Header -->
			<div
				class="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-gov-700 to-gov-600 text-white shrink-0"
			>
				<div class="flex items-center gap-2">
					<svg
						class="w-5 h-5 text-civic-300"
						fill="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							d="M12 2l2.09 6.26L20.18 9l-5 3.64L16.82 19 12 15.77 7.18 19l1.64-6.36-5-3.64 6.09-.74z"
						/>
					</svg>
					<span class="font-display font-semibold text-base">TOPS AI Assistant</span>
				</div>
				<div class="ml-auto">
					<div class="w-2 h-2 rounded-full bg-civic-400"></div>
				</div>
			</div>

			<!-- Messages -->
			<div class="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gov-50/30">
				{#each chat.messages as message, i}
					{#if message.role === 'assistant'}
						<!-- Assistant message -->
						<div class="flex gap-2 max-w-[90%]">
							<div
								class="w-7 h-7 rounded-full bg-gradient-to-br from-gov-600 to-civic-500 flex items-center justify-center shrink-0 mt-0.5"
							>
								<svg class="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
									<path
										d="M12 2l2.09 6.26L20.18 9l-5 3.64L16.82 19 12 15.77 7.18 19l1.64-6.36-5-3.64 6.09-.74z"
									/>
								</svg>
							</div>
							<div class="bg-white rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-card text-sm text-gov-800 leading-relaxed">
								{@html renderBold(message.content)}
							</div>
						</div>
						<!-- Quick actions after first assistant message -->
						{#if i === 0 && chat.messages.length === 1}
							<div class="flex flex-wrap gap-2 pl-9">
								<button
									onclick={() => handleQuickAction('Find a permit')}
									class="px-3 py-1.5 text-xs font-medium rounded-full border border-gov-200 bg-white text-gov-600 hover:bg-gov-50 hover:border-gov-300 transition-colors cursor-pointer"
								>
									Find a permit
								</button>
								<button
									onclick={() => handleQuickAction('Check status')}
									class="px-3 py-1.5 text-xs font-medium rounded-full border border-gov-200 bg-white text-gov-600 hover:bg-gov-50 hover:border-gov-300 transition-colors cursor-pointer"
								>
									Check status
								</button>
								<button
									onclick={() => handleQuickAction('Report issue')}
									class="px-3 py-1.5 text-xs font-medium rounded-full border border-gov-200 bg-white text-gov-600 hover:bg-gov-50 hover:border-gov-300 transition-colors cursor-pointer"
								>
									Report issue
								</button>
							</div>
						{/if}
					{:else}
						<!-- User message -->
						<div class="flex justify-end">
							<div
								class="max-w-[80%] bg-gradient-to-r from-gov-600 to-gov-500 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-card text-sm leading-relaxed"
							>
								{@html renderBold(message.content)}
							</div>
						</div>
					{/if}
				{/each}

				<!-- Typing indicator -->
				{#if chat.isTyping}
					<div class="flex gap-2 max-w-[90%]">
						<div
							class="w-7 h-7 rounded-full bg-gradient-to-br from-gov-600 to-civic-500 flex items-center justify-center shrink-0 mt-0.5"
						>
							<svg class="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
								<path
									d="M12 2l2.09 6.26L20.18 9l-5 3.64L16.82 19 12 15.77 7.18 19l1.64-6.36-5-3.64 6.09-.74z"
								/>
							</svg>
						</div>
						<div class="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-card flex items-center gap-1.5">
							<span class="w-2 h-2 rounded-full bg-gov-400 animate-bounce"></span>
							<span class="w-2 h-2 rounded-full bg-gov-400 animate-bounce"></span>
							<span class="w-2 h-2 rounded-full bg-gov-400 animate-bounce"></span>
						</div>
					</div>
				{/if}

				<!-- Scroll anchor -->
				<div bind:this={messagesEnd}></div>
			</div>

			<!-- Input area -->
			<div class="px-4 py-3 border-t border-gov-100 bg-white shrink-0">
				<div class="flex items-center gap-2">
					<input
						type="text"
						bind:value={inputValue}
						onkeydown={handleKeydown}
						disabled={chat.isTyping}
						placeholder={chat.isTyping ? 'AI is thinking...' : 'Type your message...'}
						class="flex-1 px-4 py-2.5 text-sm rounded-xl border border-gov-200 bg-gov-50/50 text-gov-800 placeholder:text-gov-400 focus:outline-none focus:ring-2 focus:ring-civic-500/30 focus:border-civic-500 disabled:opacity-50 transition-all"
					/>
					<button
						onclick={handleSend}
						disabled={chat.isTyping || !inputValue.trim()}
						class="w-10 h-10 rounded-xl bg-gradient-to-r from-gov-600 to-civic-500 text-white flex items-center justify-center hover:shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-none cursor-pointer shrink-0"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-7-7l7 7-7 7" />
						</svg>
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Floating Button -->
	<button
		onclick={() => chat.toggle()}
		class="w-14 h-14 rounded-full bg-gradient-to-br from-gov-600 to-civic-500 text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all cursor-pointer relative"
	>
		{#if chat.isOpen}
			<!-- X icon -->
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
			</svg>
		{:else}
			<!-- Chat bubble icon -->
			<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
				<path
					d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"
				/>
				<path d="M7 9h10v2H7zm0-3h10v2H7zm0 6h7v2H7z" />
			</svg>
		{/if}

		<!-- Unread badge -->
		{#if !chat.isOpen && chat.unreadCount > 0}
			<span
				class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
			>
				{chat.unreadCount}
			</span>
		{/if}
	</button>
</div>
