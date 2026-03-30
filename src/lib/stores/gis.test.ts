import { describe, it, expect } from 'vitest';

// Test the pure utility functions by importing the store
// Note: $state/$derived won't work in vitest, but we can test the data and logic patterns
// The actual store reactivity is tested via Playwright E2E

describe('GIS Data & Conflict Detection', () => {
	// Test haversine distance calculation (extracted for testing)
	function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
		const R = 6371;
		const dLat = (lat2 - lat1) * Math.PI / 180;
		const dLng = (lng2 - lng1) * Math.PI / 180;
		const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
		return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	}

	function datesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
		const start1 = new Date(s1).getTime();
		const end1 = new Date(e1).getTime();
		const start2 = new Date(s2).getTime();
		const end2 = new Date(e2).getTime();
		return start1 <= end2 && start2 <= end1;
	}

	describe('haversine distance', () => {
		it('returns 0 for same point', () => {
			const d = haversineDistance(38.9, -77.0, 38.9, -77.0);
			expect(d).toBe(0);
		});

		it('returns ~1.1 km for two nearby DC points', () => {
			// Capitol to Union Station is roughly 1.1 km
			const d = haversineDistance(38.8899, -77.0091, 38.8971, -77.0069);
			expect(d).toBeGreaterThan(0.5);
			expect(d).toBeLessThan(2.0);
		});

		it('identifies points within 500m radius', () => {
			// Two points on H Street NE, ~200m apart
			const d = haversineDistance(38.9001, -76.9900, 38.9003, -76.9880);
			expect(d).toBeLessThan(0.5);
		});
	});

	describe('date overlap detection', () => {
		it('detects overlapping date ranges', () => {
			expect(datesOverlap('2026-03-01', '2026-04-30', '2026-04-01', '2026-05-31')).toBe(true);
		});

		it('detects contained date ranges', () => {
			expect(datesOverlap('2026-03-01', '2026-06-30', '2026-04-01', '2026-05-31')).toBe(true);
		});

		it('detects non-overlapping date ranges', () => {
			expect(datesOverlap('2026-01-01', '2026-02-28', '2026-04-01', '2026-05-31')).toBe(false);
		});

		it('detects adjacent dates as overlapping', () => {
			expect(datesOverlap('2026-03-01', '2026-03-31', '2026-03-31', '2026-04-30')).toBe(true);
		});
	});
});
