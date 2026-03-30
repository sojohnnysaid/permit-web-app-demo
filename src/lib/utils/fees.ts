// Fee calculation utilities for TOPS permits

export interface FeeLineItem {
	label: string;
	amount: number;
	type: 'fee' | 'deposit' | 'discount';
}

export interface FeeEstimate {
	items: FeeLineItem[];
	subtotal: number;
	depositTotal: number;
	total: number;
}

export function calculateConstructionFees(durationWeeks: number): FeeEstimate {
	const items: FeeLineItem[] = [
		{ label: 'Base Permit Fee', amount: 250, type: 'fee' },
		{ label: 'Plan Review Fee', amount: 150, type: 'fee' },
		{ label: `Inspection Fee (${durationWeeks} week${durationWeeks !== 1 ? 's' : ''} × $100)`, amount: durationWeeks * 100, type: 'fee' },
		{ label: 'Technology Fee', amount: 25, type: 'fee' },
		{ label: 'Refundable Restoration Deposit', amount: 500, type: 'deposit' }
	];

	const subtotal = items.filter((i) => i.type === 'fee').reduce((sum, i) => sum + i.amount, 0);
	const depositTotal = items.filter((i) => i.type === 'deposit').reduce((sum, i) => sum + i.amount, 0);

	return {
		items,
		subtotal,
		depositTotal,
		total: subtotal + depositTotal
	};
}

export function calculateParkingFees(spaces: number, days: number): FeeEstimate {
	const items: FeeLineItem[] = [
		{ label: 'Base Parking Permit Fee', amount: 75, type: 'fee' },
		{ label: `Space Occupancy (${spaces} space${spaces !== 1 ? 's' : ''} × $25)`, amount: spaces * 25, type: 'fee' },
		{ label: `Duration (${days} day${days !== 1 ? 's' : ''} × $10)`, amount: days * 10, type: 'fee' },
		{ label: 'Technology Fee', amount: 25, type: 'fee' }
	];

	const subtotal = items.filter((i) => i.type === 'fee').reduce((sum, i) => sum + i.amount, 0);

	return { items, subtotal, depositTotal: 0, total: subtotal };
}

export function calculateCommercialVehicleFees(isOversize: boolean): FeeEstimate {
	const items: FeeLineItem[] = [
		{ label: 'Single Haul Permit Fee', amount: 50, type: 'fee' },
		{ label: 'Route Review Fee', amount: 75, type: 'fee' },
		{ label: 'Technology Fee', amount: 25, type: 'fee' }
	];

	if (isOversize) {
		items.splice(2, 0, { label: 'Oversize/Overweight Surcharge', amount: 150, type: 'fee' });
	}

	const subtotal = items.filter((i) => i.type === 'fee').reduce((sum, i) => sum + i.amount, 0);

	return { items, subtotal, depositTotal: 0, total: subtotal };
}

export function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}
