<script lang="ts">
	interface DCMRCitation {
		title: number;
		name: string;
		chapter: string;
		section: string;
		summary: string;
	}

	interface Props {
		permitType: string;
		currentStep: number;
	}

	let { permitType, currentStep }: Props = $props();

	let isExpanded = $state(false);

	const dcmrData: Record<number, DCMRCitation> = {
		6: {
			title: 6,
			name: 'Construction Codes',
			chapter: 'Chapter 1 — General Administrative Provisions',
			section: '6 DCMR § 101',
			summary: 'Building permits, structural requirements, and construction standards for all projects within the District.'
		},
		9: {
			title: 9,
			name: 'Transportation',
			chapter: 'Chapter 9 — Traffic Control & Vehicle Permits',
			section: '9 DCMR § 901',
			summary: 'Vehicle permits, traffic control plans, and transportation impact requirements for construction zones.'
		},
		16: {
			title: 16,
			name: 'Zoning',
			chapter: 'Chapter 3 — Residential & Commercial Zones',
			section: '16 DCMR § 301',
			summary: 'Land use regulations, setback requirements, height restrictions, and zoning compliance standards.'
		},
		18: {
			title: 18,
			name: 'Vehicles & Traffic',
			chapter: 'Chapter 24 — Parking & Road Closures',
			section: '18 DCMR § 2400',
			summary: 'Parking restrictions, road closure permits, detour planning, and traffic management during construction.'
		},
		24: {
			title: 24,
			name: 'Public Space',
			chapter: 'Chapter 1 — Right-of-Way Permits',
			section: '24 DCMR § 100',
			summary: 'Right-of-way permits, sidewalk and street occupancy, and public space usage regulations.'
		}
	};

	const stepRelevance: Record<string, Record<number, number[]>> = {
		construction_excavation: {
			1: [6, 24],
			2: [24, 16],
			3: [6, 9],
			4: [24],
			5: [6, 9, 16, 18, 24]
		},
		street_closure: {
			1: [18, 24],
			2: [18, 16],
			3: [9, 18],
			4: [24, 18],
			5: [9, 16, 18, 24]
		},
		utility_connection: {
			1: [6, 24],
			2: [24, 16],
			3: [6, 9],
			4: [24],
			5: [6, 9, 16, 24]
		},
		sidewalk_repair: {
			1: [24, 6],
			2: [24, 16],
			3: [6, 24],
			4: [24],
			5: [6, 16, 24]
		}
	};

	const stepNames: Record<number, string> = {
		1: 'Project Details',
		2: 'Location',
		3: 'Documents',
		4: 'Fees',
		5: 'Review'
	};

	let relevantTitles = $derived.by(() => {
		const typeMap = stepRelevance[permitType] ?? stepRelevance['construction_excavation'];
		const titleIds = typeMap[currentStep] ?? [6, 24];
		return titleIds.map((id) => dcmrData[id]).filter(Boolean);
	});

	const accentColors: Record<number, string> = {
		6: 'border-l-gov-500',
		9: 'border-l-civic-500',
		16: 'border-l-permit-review',
		18: 'border-l-permit-pending',
		24: 'border-l-gov-400'
	};

	const badgeColors: Record<number, { bg: string; text: string }> = {
		6: { bg: 'bg-gov-100', text: 'text-gov-700' },
		9: { bg: 'bg-civic-100', text: 'text-civic-600' },
		16: { bg: 'bg-purple-100', text: 'text-purple-700' },
		18: { bg: 'bg-amber-100', text: 'text-amber-700' },
		24: { bg: 'bg-gov-100', text: 'text-gov-600' }
	};
</script>

<!-- Collapsed Tab -->
{#if !isExpanded}
	<button
		onclick={() => (isExpanded = true)}
		class="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-gov-700 text-white px-2 py-4 rounded-l-lg shadow-card-hover hover:bg-gov-600 transition-colors cursor-pointer"
		style="writing-mode: vertical-rl; text-orientation: mixed;"
		aria-label="Open DCMR reference panel"
	>
		<span class="font-display font-semibold text-xs tracking-widest">DCMR</span>
	</button>
{/if}

<!-- Expanded Sidebar -->
{#if isExpanded}
	<div
		class="fixed right-0 top-0 bottom-0 w-[320px] z-40 bg-surface shadow-modal border-l border-gov-200 flex flex-col"
	>
		<!-- Header -->
		<div class="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gov-700 to-gov-600 text-white shrink-0">
			<div class="flex items-center gap-2">
				<svg class="w-4 h-4 text-civic-300" fill="currentColor" viewBox="0 0 24 24">
					<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
				</svg>
				<span class="font-display font-semibold text-sm">DCMR Reference</span>
			</div>
			<button
				onclick={() => (isExpanded = false)}
				class="w-7 h-7 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
				aria-label="Close DCMR panel"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Step Context -->
		<div class="px-4 py-2.5 bg-gov-50 border-b border-gov-100 shrink-0">
			<p class="text-xs text-gov-500 font-medium">
				Step {currentStep} — {stepNames[currentStep] ?? 'Unknown'}
			</p>
			<p class="text-xs text-gov-400 mt-0.5">
				{relevantTitles.length} applicable regulation{relevantTitles.length !== 1 ? 's' : ''}
			</p>
		</div>

		<!-- Citations List -->
		<div class="flex-1 overflow-y-auto px-4 py-4 space-y-3">
			{#each relevantTitles as citation (citation.title)}
				<div
					class="bg-white rounded-lg shadow-card border border-gov-100 border-l-4 {accentColors[citation.title]} overflow-hidden"
				>
					<div class="px-3.5 py-3">
						<!-- Title Badge -->
						<div class="flex items-center gap-2 mb-2">
							<span
								class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold {badgeColors[citation.title]?.bg} {badgeColors[citation.title]?.text}"
							>
								Title {citation.title}
							</span>
							<span class="text-xs font-semibold text-gov-700">{citation.name}</span>
						</div>

						<!-- Chapter & Section -->
						<p class="text-xs text-gov-500 font-medium mb-1">{citation.chapter}</p>
						<p class="text-[11px] text-gov-400 font-mono mb-2">{citation.section}</p>

						<!-- Summary -->
						<p class="text-xs text-gov-600 leading-relaxed mb-2.5">{citation.summary}</p>

						<!-- View Full Text Link -->
						<button
							class="inline-flex items-center gap-1 text-[11px] font-semibold text-civic-600 hover:text-civic-500 transition-colors cursor-pointer"
							onclick={(e) => e.preventDefault()}
						>
							<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
							</svg>
							View Full Text
						</button>
					</div>
				</div>
			{/each}
		</div>

		<!-- Footer -->
		<div class="px-4 py-3 border-t border-gov-100 bg-gov-50/50 shrink-0">
			<p class="text-[10px] text-gov-400 leading-relaxed">
				DC Municipal Regulations are provided for reference only. Contact DCRA for official interpretations.
			</p>
		</div>
	</div>
{/if}
