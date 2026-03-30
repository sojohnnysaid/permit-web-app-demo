import { describe, it, expect } from 'vitest';
import { getDCMRCitations, getDCMRTitle, getAllDCMRTitles } from './dcmr';

describe('DCMR Citations', () => {
	it('returns citations for construction_excavation step 1', () => {
		const citations = getDCMRCitations('construction_excavation', 1);
		expect(citations.length).toBe(2);
		expect(citations[0].title).toBe(6);
		expect(citations[1].title).toBe(24);
	});

	it('returns citations for each wizard step (1-5)', () => {
		for (let step = 1; step <= 5; step++) {
			const citations = getDCMRCitations('construction_excavation', step);
			expect(citations.length).toBeGreaterThan(0);
			citations.forEach((c) => {
				expect(c.title).toBeGreaterThan(0);
				expect(c.name).toBeTruthy();
				expect(c.summary).toBeTruthy();
				expect(c.relevance).toBeTruthy();
			});
		}
	});

	it('step 5 returns all applicable titles as summary', () => {
		const citations = getDCMRCitations('construction_excavation', 5);
		expect(citations.length).toBeGreaterThanOrEqual(3);
		const titles = citations.map((c) => c.title);
		expect(titles).toContain(6);
		expect(titles).toContain(24);
		expect(titles).toContain(9);
	});

	it('returns default citation for unknown permit types', () => {
		const citations = getDCMRCitations('unknown_type', 1);
		expect(citations.length).toBe(1);
		expect(citations[0].title).toBe(24);
	});

	it('getDCMRTitle returns correct data for known titles', () => {
		const title6 = getDCMRTitle(6);
		expect(title6?.name).toBe('Construction Codes');

		const title24 = getDCMRTitle(24);
		expect(title24?.name).toBe('Public Space');
	});

	it('getAllDCMRTitles returns all 5 DCMR titles', () => {
		const all = getAllDCMRTitles();
		expect(all.length).toBe(5);
		expect(all.map((t) => t.number)).toEqual([6, 9, 16, 18, 24]);
	});
});
