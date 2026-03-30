import { describe, it, expect } from 'vitest';
import { AUDIT_LOG, AI_INSIGHTS, MONTHLY_DATA, WARD_DATA, REVIEWER_WORKLOAD } from './analytics.svelte';

describe('Analytics Store - Seed Data', () => {
	it('has audit log entries with required fields', () => {
		expect(AUDIT_LOG.length).toBeGreaterThan(5);
		AUDIT_LOG.forEach((entry) => {
			expect(entry.timestamp).toBeTruthy();
			expect(entry.actor).toBeTruthy();
			expect(entry.action).toBeTruthy();
			expect(entry.category).toBeTruthy();
		});
	});

	it('has AI insights with severity levels', () => {
		expect(AI_INSIGHTS.length).toBeGreaterThanOrEqual(3);
		const severities = AI_INSIGHTS.map((i) => i.severity);
		expect(severities).toContain('warning');
		expect(severities).toContain('info');
		AI_INSIGHTS.forEach((insight) => {
			expect(insight.title).toBeTruthy();
			expect(insight.description.length).toBeGreaterThan(20);
		});
	});

	it('has monthly data for 6 months', () => {
		expect(MONTHLY_DATA.length).toBe(6);
		MONTHLY_DATA.forEach((m) => {
			expect(m.month).toBeTruthy();
			expect(m.submitted).toBeGreaterThan(0);
			expect(m.approved).toBeGreaterThan(0);
			expect(m.approved).toBeLessThanOrEqual(m.submitted);
		});
	});

	it('has data for all 8 DC wards', () => {
		expect(WARD_DATA.length).toBe(8);
		const wards = WARD_DATA.map((w) => w.ward);
		for (let i = 1; i <= 8; i++) {
			expect(wards).toContain(`Ward ${i}`);
		}
		WARD_DATA.forEach((w) => {
			expect(w.permits).toBeGreaterThan(0);
			expect(w.slaCompliance).toBeGreaterThan(0);
			expect(w.slaCompliance).toBeLessThanOrEqual(100);
		});
	});

	it('has reviewer workload data', () => {
		expect(REVIEWER_WORKLOAD.length).toBeGreaterThanOrEqual(3);
		REVIEWER_WORKLOAD.forEach((r) => {
			expect(r.name).toBeTruthy();
			expect(r.ward).toBeTruthy();
			expect(r.avgDays).toBeGreaterThan(0);
		});
	});

	it('Ward 6 has highest permit count per DDOT report reference', () => {
		const ward6 = WARD_DATA.find((w) => w.ward === 'Ward 6');
		expect(ward6).toBeDefined();
		const maxPermits = Math.max(...WARD_DATA.map((w) => w.permits));
		expect(ward6!.permits).toBe(maxPermits);
	});
});
