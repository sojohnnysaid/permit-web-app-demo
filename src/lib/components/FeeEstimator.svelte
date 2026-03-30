<script lang="ts">
	interface FeeItem {
		label: string;
		amount: number;
		type?: 'fee' | 'deposit' | 'discount';
	}

	interface Props {
		fees: FeeItem[];
		disclaimer?: string;
	}

	let { fees, disclaimer }: Props = $props();

	function formatUSD(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount);
	}

	let feeItems = $derived(fees.filter((f) => f.type !== 'deposit' && f.type !== 'discount'));
	let depositItems = $derived(fees.filter((f) => f.type === 'deposit'));
	let discountItems = $derived(fees.filter((f) => f.type === 'discount'));

	let subtotal = $derived(feeItems.reduce((sum, f) => sum + f.amount, 0));
	let depositTotal = $derived(depositItems.reduce((sum, f) => sum + f.amount, 0));
	let discountTotal = $derived(discountItems.reduce((sum, f) => sum + f.amount, 0));
	let total = $derived(subtotal + depositTotal + discountTotal);
</script>

<div class="bg-surface rounded-xl shadow-card overflow-hidden">
	<!-- Header -->
	<div class="px-5 py-3 bg-gov-100">
		<div class="flex items-center gap-2">
			<svg class="w-4 h-4 text-gov-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
			</svg>
			<h3 class="font-display font-semibold text-sm text-gov-800">Fee Estimate</h3>
		</div>
	</div>

	<!-- Fee Table -->
	<div class="px-5 py-1">
		<table class="w-full">
			<tbody>
				<!-- Standard fees -->
				{#each feeItems as item, i}
					<tr class={i % 2 === 0 ? 'bg-surface' : 'bg-surface-alt'}>
						<td class="py-2.5 pr-4 text-sm text-gov-700">{item.label}</td>
						<td class="py-2.5 text-sm text-gov-800 text-right font-medium tabular-nums">
							{formatUSD(item.amount)}
						</td>
					</tr>
				{/each}

				<!-- Subtotal -->
				{#if depositItems.length > 0 || discountItems.length > 0}
					<tr class="border-t border-gov-100">
						<td class="py-2.5 pr-4 text-sm text-gov-600 font-medium">Subtotal</td>
						<td class="py-2.5 text-sm text-gov-700 text-right font-semibold tabular-nums">
							{formatUSD(subtotal)}
						</td>
					</tr>
				{/if}

				<!-- Deposit items -->
				{#each depositItems as item}
					<tr class="bg-amber-50">
						<td class="py-2.5 pr-4 text-sm text-amber-800">
							<span class="flex items-center gap-1.5">
								<svg class="w-3.5 h-3.5 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
									<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
								</svg>
								{item.label}
							</span>
						</td>
						<td class="py-2.5 text-sm text-amber-800 text-right font-medium tabular-nums">
							{formatUSD(item.amount)}
						</td>
					</tr>
				{/each}

				<!-- Discount items -->
				{#each discountItems as item}
					<tr class="bg-green-50">
						<td class="py-2.5 pr-4 text-sm text-green-800">
							<span class="flex items-center gap-1.5">
								<svg class="w-3.5 h-3.5 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
									<path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
								</svg>
								{item.label}
							</span>
						</td>
						<td class="py-2.5 text-sm text-green-700 text-right font-medium tabular-nums">
							{formatUSD(item.amount)}
						</td>
					</tr>
				{/each}

				<!-- Total -->
				<tr class="border-t-2 border-gov-200">
					<td class="py-3 pr-4 text-sm text-gov-800 font-bold">Total Due</td>
					<td class="py-3 text-base text-gov-800 text-right font-bold tabular-nums">
						{formatUSD(total)}
					</td>
				</tr>
			</tbody>
		</table>
	</div>

	<!-- Disclaimer -->
	{#if disclaimer}
		<div class="px-5 py-3 bg-gov-50 border-t border-gov-100">
			<p class="text-[11px] text-gov-400 leading-relaxed">
				{disclaimer}
			</p>
		</div>
	{/if}
</div>
