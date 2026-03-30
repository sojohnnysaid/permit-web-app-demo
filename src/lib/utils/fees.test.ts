import { describe, it, expect } from 'vitest';
import { calculateConstructionFees, calculateParkingFees, calculateCommercialVehicleFees, formatCurrency } from './fees';

describe('Fee Calculations', () => {
	describe('Construction/Excavation fees', () => {
		it('calculates correct fees for 4-week project', () => {
			const estimate = calculateConstructionFees(4);
			expect(estimate.subtotal).toBe(250 + 150 + 400 + 25); // 825
			expect(estimate.depositTotal).toBe(500);
			expect(estimate.total).toBe(1325);
		});

		it('calculates correct fees for 1-week project', () => {
			const estimate = calculateConstructionFees(1);
			expect(estimate.subtotal).toBe(250 + 150 + 100 + 25); // 525
			expect(estimate.total).toBe(1025);
		});

		it('includes all required line items', () => {
			const estimate = calculateConstructionFees(2);
			const labels = estimate.items.map((i) => i.label);
			expect(labels).toContain('Base Permit Fee');
			expect(labels).toContain('Plan Review Fee');
			expect(labels).toContain('Technology Fee');
			expect(labels.some((l) => l.includes('Inspection'))).toBe(true);
			expect(labels.some((l) => l.includes('Deposit'))).toBe(true);
		});

		it('inspection fee scales with duration', () => {
			const short = calculateConstructionFees(1);
			const long = calculateConstructionFees(10);
			const shortInspection = short.items.find((i) => i.label.includes('Inspection'))!;
			const longInspection = long.items.find((i) => i.label.includes('Inspection'))!;
			expect(longInspection.amount).toBe(shortInspection.amount * 10);
		});
	});

	describe('Parking fees', () => {
		it('calculates correct fees', () => {
			const estimate = calculateParkingFees(3, 2);
			expect(estimate.subtotal).toBe(75 + 75 + 20 + 25); // 195
			expect(estimate.depositTotal).toBe(0);
			expect(estimate.total).toBe(195);
		});
	});

	describe('Commercial Vehicle fees', () => {
		it('standard vehicle has no surcharge', () => {
			const estimate = calculateCommercialVehicleFees(false);
			expect(estimate.total).toBe(50 + 75 + 25); // 150
		});

		it('oversize vehicle adds surcharge', () => {
			const estimate = calculateCommercialVehicleFees(true);
			expect(estimate.total).toBe(50 + 75 + 150 + 25); // 300
		});
	});

	describe('formatCurrency', () => {
		it('formats as USD', () => {
			expect(formatCurrency(1325)).toBe('$1,325.00');
			expect(formatCurrency(25)).toBe('$25.00');
			expect(formatCurrency(0)).toBe('$0.00');
		});
	});
});
