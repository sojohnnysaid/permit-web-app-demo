<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth, type UserRole } from '$lib/stores/auth.svelte';

	// Navigation links per role
	const NAV_LINKS: Record<UserRole, { label: string; href: string }[]> = {
		applicant: [
			{ label: 'Dashboard', href: '/dashboard' },
			{ label: 'My Permits', href: '/permits' },
			{ label: 'Account', href: '/account' }
		],
		reviewer: [
			{ label: 'Work Queue', href: '/queue' },
			{ label: 'GIS View', href: '/gis' }
		],
		admin: [
			{ label: 'Dashboard', href: '/dashboard' },
			{ label: 'Management', href: '/management' },
			{ label: 'Reports', href: '/reports' }
		]
	};

	// Role display config
	const ROLE_CONFIG: Record<UserRole, { label: string; bg: string; text: string }> = {
		applicant: { label: 'Applicant', bg: 'bg-civic-100', text: 'text-civic-600' },
		reviewer: { label: 'Reviewer', bg: 'bg-purple-100', text: 'text-permit-review' },
		admin: { label: 'Admin', bg: 'bg-gov-100', text: 'text-gov-700' }
	};

	const SWITCHABLE_ROLES: UserRole[] = ['applicant', 'reviewer', 'admin'];

	// Component state
	let roleDropdownOpen = $state(false);
	let lang = $state<'EN' | 'ES'>('EN');

	// Derived values
	let currentRole = $derived(auth.role ?? 'applicant');
	let navLinks = $derived(NAV_LINKS[currentRole]);
	let roleConfig = $derived(ROLE_CONFIG[currentRole]);
	let currentPath = $state('');

	// Track current path for active link highlighting
	$effect(() => {
		if (typeof window !== 'undefined') {
			currentPath = window.location.pathname;
		}
	});

	function handleRoleSwitch(role: UserRole) {
		auth.switchRole(role);
		roleDropdownOpen = false;
	}

	function handleLogout() {
		auth.logout();
		goto('/login');
	}

	function toggleLang() {
		lang = lang === 'EN' ? 'ES' : 'EN';
	}

	// Close dropdown when clicking outside
	function handleWindowClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('[data-role-dropdown]')) {
			roleDropdownOpen = false;
		}
	}
</script>

<svelte:window onclick={handleWindowClick} />

<!-- Skip to content (a11y) -->
<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-gov-700 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-civic-400 focus:ring-offset-2 font-semibold text-sm"
>
	Skip to content
</a>

<header class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gov-100 shadow-sm">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex items-center justify-between h-16">
			<!-- Left: Logo / Brand -->
			<div class="flex items-center gap-3 shrink-0">
				<a href="/dashboard" class="flex items-center gap-3 group">
					<div
						class="w-9 h-9 rounded-lg bg-gradient-to-br from-gov-700 to-civic-500 flex items-center justify-center transition-shadow group-hover:shadow-md"
					>
						<svg
							class="w-5 h-5 text-white"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
							/>
						</svg>
					</div>
					<div>
						<h1 class="text-lg font-display font-bold text-gov-900 leading-tight">TOPS</h1>
						<p class="text-[10px] text-gov-400 -mt-0.5 hidden sm:block">
							Transportation Online Permitting System
						</p>
					</div>
				</a>
			</div>

			<!-- Center: Navigation Links -->
			<nav class="hidden md:flex items-center gap-1">
				{#each navLinks as link}
					{@const isActive =
						currentPath === link.href ||
						(link.href !== '/dashboard' && currentPath.startsWith(link.href))}
					<a
						href={link.href}
						class="relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
							{isActive
							? 'text-gov-700 bg-gov-50'
							: 'text-gov-400 hover:text-gov-700 hover:bg-gov-50/60'}"
					>
						{link.label}
						{#if isActive}
							<span
								class="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-civic-500 rounded-full"
							></span>
						{/if}
					</a>
				{/each}
			</nav>

			<!-- Right: Controls -->
			<div class="flex items-center gap-2 sm:gap-3 shrink-0">
				<!-- Role Badge + Switcher -->
				<div class="relative" data-role-dropdown>
					<button
						onclick={() => (roleDropdownOpen = !roleDropdownOpen)}
						class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer
							{roleConfig.bg} {roleConfig.text} hover:shadow-md"
						title="Switch role"
					>
						{roleConfig.label}
						<svg
							class="w-3 h-3 transition-transform duration-200 {roleDropdownOpen
								? 'rotate-180'
								: ''}"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 9l-7 7-7-7"
							/>
						</svg>
					</button>

					{#if roleDropdownOpen}
						<div
							class="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-modal border border-gov-100 py-1.5 animate-scale-in z-40"
						>
							<div class="px-3 py-2 border-b border-gov-100">
								<p class="text-[10px] font-semibold text-gov-400 uppercase tracking-wider">
									Switch Role
								</p>
							</div>
							{#each SWITCHABLE_ROLES as role}
								{@const config = ROLE_CONFIG[role]}
								{@const isCurrentRole = role === currentRole}
								<button
									onclick={() => handleRoleSwitch(role)}
									class="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-150
										{isCurrentRole
										? 'bg-gov-50 text-gov-700 font-semibold'
										: 'text-gov-500 hover:bg-gov-50/60 hover:text-gov-700'}"
								>
									<span
										class="w-2 h-2 rounded-full {isCurrentRole
											? 'bg-civic-500'
											: 'bg-gov-200'}"
									></span>
									{config.label}
									{#if isCurrentRole}
										<svg
											class="w-4 h-4 ml-auto text-civic-500"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M5 13l4 4L19 7"
											/>
										</svg>
									{/if}
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Language Toggle -->
				<button
					onclick={toggleLang}
					class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200
						{lang === 'EN'
						? 'text-gov-500 bg-gov-50 hover:bg-gov-100'
						: 'text-civic-600 bg-civic-50 hover:bg-civic-100'}"
					title="Toggle language"
				>
					{lang}
				</button>

				<!-- User Avatar -->
				<div
					class="w-9 h-9 rounded-full bg-gradient-to-br from-gov-600 to-civic-500 flex items-center justify-center text-white font-bold text-xs shadow-md cursor-default"
					title="{auth.user?.name} ({auth.user?.email})"
				>
					{auth.user?.avatar}
				</div>

				<!-- Logout -->
				<button
					onclick={handleLogout}
					class="p-2 rounded-lg text-gov-400 hover:text-permit-denied hover:bg-red-50 transition-colors duration-200"
					title="Logout"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
						/>
					</svg>
				</button>
			</div>
		</div>
	</div>

	<!-- Mobile Navigation (visible on small screens) -->
	<div class="md:hidden border-t border-gov-100">
		<div class="flex items-center gap-1 px-4 py-2 overflow-x-auto">
			{#each navLinks as link}
				{@const isActive =
					currentPath === link.href ||
					(link.href !== '/dashboard' && currentPath.startsWith(link.href))}
				<a
					href={link.href}
					class="whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200
						{isActive
						? 'text-gov-700 bg-gov-50'
						: 'text-gov-400 hover:text-gov-600 hover:bg-gov-50/60'}"
				>
					{link.label}
				</a>
			{/each}
		</div>
	</div>
</header>
