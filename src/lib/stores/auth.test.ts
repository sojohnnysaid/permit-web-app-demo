import { describe, it, expect, beforeEach } from 'vitest';

// We can't use $state/$derived in vitest without Svelte compiler,
// so we test the exported constants and type contracts directly.
// The reactive store behavior is verified via Playwright E2E.

import { SOO_ROLES } from './auth.svelte';

describe('Auth Store - SOO Roles', () => {
	it('has 15 roles defined matching SOO requirements', () => {
		expect(SOO_ROLES.length).toBe(15);
	});

	it('has exactly 3 active demo roles', () => {
		const active = SOO_ROLES.filter((r) => r.active);
		expect(active.length).toBe(3);
		expect(active.map((r) => r.name)).toEqual(['Applicant', 'Reviewer', 'Administrator']);
	});

	it('includes all SOO-specified roles', () => {
		const roleNames = SOO_ROLES.map((r) => r.name);
		expect(roleNames).toContain('Applicant');
		expect(roleNames).toContain('Reviewer');
		expect(roleNames).toContain('Administrator');
		expect(roleNames).toContain('Technician');
		expect(roleNames).toContain('Inspector');
		expect(roleNames).toContain('Auditor');
		expect(roleNames).toContain('Manager / Supervisor');
		expect(roleNames).toContain('Cash Management Officer');
		expect(roleNames).toContain('Plan Reviewer');
		expect(roleNames).toContain('Public Space Committee');
		expect(roleNames).toContain('PDRM Coordinator');
		expect(roleNames).toContain('NOI Administrator');
		expect(roleNames).toContain('DDOT Contractor');
		expect(roleNames).toContain('Customer Experience');
		expect(roleNames).toContain('Visitor');
	});

	it('every role has a description', () => {
		SOO_ROLES.forEach((role) => {
			expect(role.description).toBeTruthy();
			expect(role.description.length).toBeGreaterThan(5);
		});
	});
});
