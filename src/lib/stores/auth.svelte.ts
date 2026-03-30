// RBAC auth store using Svelte 5 Runes

export type UserRole = 'applicant' | 'reviewer' | 'admin';

export interface User {
	username: string;
	name: string;
	role: UserRole;
	email: string;
	avatar: string;
	department?: string;
}

const DEMO_USERS: Record<UserRole, User> = {
	applicant: {
		username: 'applicant',
		name: 'Alex Johnson',
		role: 'applicant',
		email: 'alex.johnson@email.com',
		avatar: 'AJ',
		department: 'Public'
	},
	reviewer: {
		username: 'reviewer',
		name: 'Maria Thompson',
		role: 'reviewer',
		email: 'm.thompson@ddot.dc.gov',
		avatar: 'MT',
		department: 'Transportation Engineering'
	},
	admin: {
		username: 'admin',
		name: 'Director Williams',
		role: 'admin',
		email: 's.williams@ddot.dc.gov',
		avatar: 'DW',
		department: 'DDOT Management'
	}
};

// Full SOO role roster for display (demo shows 3, architecture hints at all)
export const SOO_ROLES = [
	{ name: 'Applicant', active: true, description: 'Submit and track permit applications' },
	{ name: 'Reviewer', active: true, description: 'Review applications, provide redline comments' },
	{ name: 'Administrator', active: true, description: 'System settings, reports, user management' },
	{ name: 'Technician', active: false, description: 'Approve/deny applications, issue permits' },
	{ name: 'Inspector', active: false, description: 'Field inspections, compliance, citations' },
	{ name: 'Auditor', active: false, description: 'Audit logs, compliance checks' },
	{ name: 'Manager / Supervisor', active: false, description: 'Operational oversight, workload management' },
	{ name: 'Cash Management Officer', active: false, description: 'Fee recording, payment verification' },
	{ name: 'Plan Reviewer', active: false, description: 'Detailed plan review, redline markup' },
	{ name: 'Public Space Committee', active: false, description: 'Committee-level review and approval' },
	{ name: 'PDRM Coordinator', active: false, description: 'Public space design review coordination' },
	{ name: 'NOI Administrator', active: false, description: 'Notice of Infraction administration' },
	{ name: 'DDOT Contractor', active: false, description: 'Contractor-facing scoped access' },
	{ name: 'Customer Experience', active: false, description: 'Applicant support, inquiry handling' },
	{ name: 'Visitor', active: false, description: 'Read-only public access' }
] as const;

const PERMISSIONS: Record<UserRole, string[]> = {
	applicant: ['view_own_permits', 'create_permit', 'respond_to_review', 'make_payment'],
	reviewer: ['view_queue', 'review_permit', 'approve_permit', 'deny_permit', 'return_permit', 'view_gis'],
	admin: ['view_all_permits', 'view_queue', 'review_permit', 'approve_permit', 'deny_permit', 'return_permit', 'view_gis', 'view_reports', 'manage_users', 'view_audit_log', 'inspect_permit']
};

class AuthStore {
	user = $state<User | null>(null);
	isAuthenticated = $derived(this.user !== null);
	mfaVerified = $state(false);
	mfaPending = $state(false);
	error = $state('');
	isLoading = $state(false);

	get role(): UserRole | null {
		return this.user?.role ?? null;
	}

	async login(username: string, password: string): Promise<boolean> {
		this.error = '';
		this.isLoading = true;

		// Simulate network delay
		await new Promise((r) => setTimeout(r, 800));

		if (password === 'password' && (username === 'admin' || username === 'applicant' || username === 'reviewer')) {
			this.user = DEMO_USERS[username as UserRole] ?? DEMO_USERS.applicant;
			this.isLoading = false;
			this.mfaPending = true;
			this.mfaVerified = false;
			return true;
		}

		// Also accept "admin/password" as legacy login → defaults to applicant
		if (username === 'admin' && password === 'password') {
			this.user = DEMO_USERS.applicant;
			this.isLoading = false;
			this.mfaPending = true;
			this.mfaVerified = false;
			return true;
		}

		this.error = 'Invalid username or password';
		this.isLoading = false;
		return false;
	}

	verifyMfa(): void {
		this.mfaVerified = true;
		this.mfaPending = false;
	}

	switchRole(role: UserRole): void {
		this.user = { ...DEMO_USERS[role] };
	}

	hasPermission(action: string): boolean {
		if (!this.user) return false;
		return PERMISSIONS[this.user.role]?.includes(action) ?? false;
	}

	logout(): void {
		this.user = null;
		this.mfaVerified = false;
		this.mfaPending = false;
	}
}

export const auth = new AuthStore();
