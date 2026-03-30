import { describe, it, expect } from 'vitest';
import { PERMIT_TYPE_META } from './permits.svelte';

describe('Permits Store - SOO Type Names', () => {
	it('has exactly 5 SOO-correct permit types', () => {
		const types = Object.keys(PERMIT_TYPE_META);
		expect(types.length).toBe(5);
	});

	it('uses the exact SOO permit type keys', () => {
		const types = Object.keys(PERMIT_TYPE_META);
		expect(types).toContain('parking_occupancy');
		expect(types).toContain('construction_excavation');
		expect(types).toContain('commercial_vehicle');
		expect(types).toContain('public_space_rental');
		expect(types).toContain('special_heritage_tree');
	});

	it('uses SOO-correct display labels', () => {
		expect(PERMIT_TYPE_META.parking_occupancy.label).toBe('Parking / Occupancy');
		expect(PERMIT_TYPE_META.construction_excavation.label).toBe('Construction / Excavation');
		expect(PERMIT_TYPE_META.commercial_vehicle.label).toBe('Commercial Vehicle');
		expect(PERMIT_TYPE_META.public_space_rental.label).toBe('Public Space Rental / Annual');
		expect(PERMIT_TYPE_META.special_heritage_tree.label).toBe('Special / Heritage Tree Permit');
	});

	it('every permit type has required metadata fields', () => {
		Object.values(PERMIT_TYPE_META).forEach((meta) => {
			expect(meta.label).toBeTruthy();
			expect(meta.icon).toBeTruthy();
			expect(meta.color).toBeTruthy();
			expect(meta.description).toBeTruthy();
			expect(meta.description.length).toBeGreaterThan(10);
		});
	});

	it('does not contain old non-SOO type names', () => {
		const types = Object.keys(PERMIT_TYPE_META);
		expect(types).not.toContain('truck_route');
		expect(types).not.toContain('public_space');
		expect(types).not.toContain('infrastructure');
		expect(types).not.toContain('tree_removal');
	});
});
