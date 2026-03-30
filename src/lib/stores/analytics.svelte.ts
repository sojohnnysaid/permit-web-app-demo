// Analytics store for management dashboard — derived from permit data

import { permits, PERMIT_TYPE_META, type PermitType, type PermitStatus } from './permits.svelte';

export interface MetricCard {
	label: string;
	value: number | string;
	trend?: 'up' | 'down' | 'flat';
	trendValue?: string;
	color: string;
}

export interface AIInsight {
	severity: 'info' | 'warning' | 'alert';
	title: string;
	description: string;
}

// Seed audit log entries
export const AUDIT_LOG = [
	{ timestamp: '2026-03-30T14:30:00Z', actor: 'M. Thompson', action: 'Approved permit TOPS-CV-2026-001', category: 'approval' },
	{ timestamp: '2026-03-29T16:45:00Z', actor: 'K. Davis', action: 'Requested info on TOPS-PS-2026-002', category: 'review' },
	{ timestamp: '2026-03-28T10:00:00Z', actor: 'S. Williams', action: 'Started review of TOPS-IR-2026-005', category: 'review' },
	{ timestamp: '2026-03-27T09:15:00Z', actor: 'System', action: 'Auto-routed TOPS-IR-2026-003 to Ward 4 reviewer pool', category: 'routing' },
	{ timestamp: '2026-03-26T08:00:00Z', actor: 'R. Patel', action: 'Approved emergency tree removal TOPS-TR-2026-004', category: 'approval' },
	{ timestamp: '2026-03-25T14:00:00Z', actor: 'System', action: 'SLA warning: TOPS-PS-2026-002 approaching deadline', category: 'sla' },
	{ timestamp: '2026-03-24T11:30:00Z', actor: 'A. Johnson', action: 'Submitted new permit application TOPS-CV-2026-006', category: 'submission' },
	{ timestamp: '2026-03-23T09:00:00Z', actor: 'System', action: 'Daily report generated: 7 active permits, 2 overdue reviews', category: 'report' }
] as const;

// AI-generated insights (seed data)
export const AI_INSIGHTS: AIInsight[] = [
	{ severity: 'warning', title: 'SLA Compliance Drop in Ward 6', description: 'Construction/Excavation permits in Ward 6 averaging 14% over SLA this quarter. Consider additional reviewer assignment.' },
	{ severity: 'info', title: 'Public Space Rental Trending Up', description: 'Public Space Rental applications up 40% vs. last quarter — seasonal trend consistent with spring event season.' },
	{ severity: 'alert', title: 'H Street Corridor Conflicts', description: '3 permit conflicts detected in the H Street NE corridor this month. Recommend coordination meeting with DC Water and PEPCO.' },
	{ severity: 'info', title: 'Review Efficiency Improving', description: 'Average review time decreased 12% month-over-month. AI-assisted summaries reducing initial triage time.' }
];

// Monthly permit data for charts (seed)
export const MONTHLY_DATA = [
	{ month: 'Oct', submitted: 12, approved: 10, denied: 1 },
	{ month: 'Nov', submitted: 15, approved: 12, denied: 2 },
	{ month: 'Dec', submitted: 8, approved: 7, denied: 0 },
	{ month: 'Jan', submitted: 18, approved: 14, denied: 3 },
	{ month: 'Feb', submitted: 22, approved: 18, denied: 2 },
	{ month: 'Mar', submitted: 25, approved: 19, denied: 1 }
];

// Ward-level data for choropleth
export const WARD_DATA = [
	{ ward: 'Ward 1', permits: 8, slaCompliance: 92 },
	{ ward: 'Ward 2', permits: 12, slaCompliance: 88 },
	{ ward: 'Ward 3', permits: 5, slaCompliance: 95 },
	{ ward: 'Ward 4', permits: 7, slaCompliance: 90 },
	{ ward: 'Ward 5', permits: 9, slaCompliance: 87 },
	{ ward: 'Ward 6', permits: 18, slaCompliance: 78 },
	{ ward: 'Ward 7', permits: 4, slaCompliance: 94 },
	{ ward: 'Ward 8', permits: 6, slaCompliance: 91 }
];

// Reviewer workload
export const REVIEWER_WORKLOAD = [
	{ name: 'M. Thompson', active: 4, completed: 12, avgDays: 3.2, ward: 'Ward 6' },
	{ name: 'K. Davis', active: 3, completed: 9, avgDays: 4.1, ward: 'Ward 2' },
	{ name: 'S. Williams', active: 5, completed: 15, avgDays: 2.8, ward: 'Ward 1' },
	{ name: 'R. Patel', active: 2, completed: 8, avgDays: 3.5, ward: 'Ward 3' }
];

class AnalyticsStore {
	get totalPermits(): number { return permits.permits.length; }
	get pendingCount(): number { return permits.permits.filter(p => p.status === 'submitted' || p.status === 'under_review').length; }
	get approvedCount(): number { return permits.approvedCount; }
	get deniedCount(): number { return permits.deniedCount; }

	get byType(): Record<string, number> {
		const counts: Record<string, number> = {};
		for (const p of permits.permits) {
			counts[p.type] = (counts[p.type] || 0) + 1;
		}
		return counts;
	}

	get byWard(): Record<string, number> {
		const counts: Record<string, number> = {};
		for (const p of permits.permits) {
			const ward = p.ward || 'Unknown';
			counts[ward] = (counts[ward] || 0) + 1;
		}
		return counts;
	}

	get slaComplianceRate(): number {
		const withSla = permits.permits.filter(p => p.slaDeadline);
		if (withSla.length === 0) return 100;
		const onTime = withSla.filter(p => {
			if (p.status === 'approved' || p.status === 'denied') {
				return new Date(p.updatedAt) <= new Date(p.slaDeadline!);
			}
			return new Date() <= new Date(p.slaDeadline!);
		});
		return Math.round((onTime.length / withSla.length) * 100);
	}

	get totalRevenue(): number {
		return permits.permits
			.filter(p => p.status === 'approved' || p.status === 'paid' || p.status === 'issued')
			.length * 825; // Average fee estimate
	}

	get operationsMetrics(): MetricCard[] {
		return [
			{ label: 'Pending Applications', value: this.pendingCount, trend: 'up', trendValue: '+3 this week', color: 'gov' },
			{ label: 'SLA Compliance', value: `${this.slaComplianceRate}%`, trend: this.slaComplianceRate > 85 ? 'up' : 'down', trendValue: this.slaComplianceRate > 85 ? 'On target' : 'Below target', color: this.slaComplianceRate > 85 ? 'permit-approved' : 'permit-denied' },
			{ label: 'Avg Review Time', value: '3.4 days', trend: 'down', trendValue: '-0.5 days', color: 'civic' },
			{ label: 'Revenue (MTD)', value: `$${this.totalRevenue.toLocaleString()}`, trend: 'up', trendValue: '+18% vs last month', color: 'permit-approved' }
		];
	}
}

export const analytics = new AnalyticsStore();
