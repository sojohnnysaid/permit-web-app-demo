// Fake permit data store using Svelte 5 Runes

export type PermitStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'denied' | 'expired';
export type PermitType = 'truck_route' | 'public_space' | 'infrastructure' | 'tree_removal';

export interface PermitAddress {
	address: string;
	lat: number;
	lng: number;
	stopType: 'start' | 'stop' | 'end' | 'pickup' | 'delivery';
	notes?: string;
}

export interface TruckInfo {
	type: string;
	weight: number;
	height: number;
	width: number;
	length: number;
	axles: number;
	plateNumber: string;
}

export interface Permit {
	id: string;
	type: PermitType;
	title: string;
	description: string;
	status: PermitStatus;
	submittedAt: string;
	updatedAt: string;
	expiresAt?: string;
	slaDeadline?: string;
	applicant: string;
	referenceNumber: string;

	// Location data
	addresses?: PermitAddress[];
	ward?: string;
	quadrant?: string;

	// Type-specific
	truckInfo?: TruckInfo;
	eventType?: string;
	damageType?: string;
	treeSpecies?: string;

	// Review
	reviewerNotes?: string;
	assignedReviewer?: string;
}

export const PERMIT_TYPE_META: Record<PermitType, { label: string; icon: string; color: string; description: string }> = {
	truck_route: {
		label: 'Commercial Vehicle Route',
		icon: 'truck',
		color: 'gov',
		description: 'Oversize/overweight vehicle single haul permits with route planning'
	},
	public_space: {
		label: 'Public Space / Event',
		icon: 'calendar',
		color: 'civic',
		description: 'Wedding parking, street closures, sidewalk cafes, block parties'
	},
	infrastructure: {
		label: 'Infrastructure Report',
		icon: 'alert',
		color: 'permit-pending',
		description: 'Potholes, water/sewage damage, gas line issues, road hazards'
	},
	tree_removal: {
		label: 'Tree Removal / Special Tree',
		icon: 'tree',
		color: 'permit-approved',
		description: 'Fallen tree removal, hazardous tree trimming, heritage tree permits'
	}
};

// Fake DC-area permits
const SEED_PERMITS: Permit[] = [
	{
		id: 'P-2026-001',
		type: 'truck_route',
		title: 'Concrete Delivery - Capitol Hill Project',
		description: 'Cement mixer route from Bladensburg Rd depot to 3rd St SE construction site. Overweight vehicle requiring designated truck route.',
		status: 'approved',
		submittedAt: '2026-03-15T09:00:00Z',
		updatedAt: '2026-03-18T14:30:00Z',
		expiresAt: '2026-04-15T23:59:00Z',
		slaDeadline: '2026-03-22T09:00:00Z',
		applicant: 'Alex Johnson',
		referenceNumber: 'TOPS-CV-2026-001',
		ward: 'Ward 6',
		quadrant: 'SE',
		addresses: [
			{ address: '2100 Bladensburg Rd NE, Washington, DC', lat: 38.9142, lng: -76.9628, stopType: 'start' },
			{ address: '300 3rd St SE, Washington, DC', lat: 38.8850, lng: -77.0028, stopType: 'end' }
		],
		truckInfo: {
			type: 'Cement Mixer',
			weight: 66000,
			height: 13.2,
			width: 8.5,
			length: 35,
			axles: 6,
			plateNumber: 'DC-CMX-4421'
		},
		assignedReviewer: 'M. Thompson'
	},
	{
		id: 'P-2026-002',
		type: 'public_space',
		title: 'Wedding Reception - Street Parking Reservation',
		description: 'Reserve 6 parking spaces on O St NW for wedding guests. Saturday event, 12 PM - 11 PM.',
		status: 'under_review',
		submittedAt: '2026-03-20T11:00:00Z',
		updatedAt: '2026-03-22T09:15:00Z',
		slaDeadline: '2026-03-27T11:00:00Z',
		applicant: 'Alex Johnson',
		referenceNumber: 'TOPS-PS-2026-002',
		ward: 'Ward 2',
		quadrant: 'NW',
		eventType: 'Wedding',
		addresses: [
			{ address: '1400 O St NW, Washington, DC', lat: 38.9108, lng: -77.0310, stopType: 'start' }
		],
		assignedReviewer: 'K. Davis'
	},
	{
		id: 'P-2026-003',
		type: 'infrastructure',
		title: 'Large Pothole - Georgia Ave NW',
		description: 'Dangerous pothole approximately 2ft wide and 8 inches deep in the right lane. Multiple flat tires reported.',
		status: 'submitted',
		submittedAt: '2026-03-28T07:30:00Z',
		updatedAt: '2026-03-28T07:30:00Z',
		slaDeadline: '2026-04-04T07:30:00Z',
		applicant: 'Alex Johnson',
		referenceNumber: 'TOPS-IR-2026-003',
		ward: 'Ward 4',
		quadrant: 'NW',
		damageType: 'Pothole',
		addresses: [
			{ address: '5200 Georgia Ave NW, Washington, DC', lat: 38.9580, lng: -77.0270, stopType: 'start' }
		]
	},
	{
		id: 'P-2026-004',
		type: 'tree_removal',
		title: 'Fallen Oak Tree - After Storm',
		description: 'Large oak tree fell during storm, blocking half of residential street and damaging fence. Immediate removal needed.',
		status: 'approved',
		submittedAt: '2026-03-25T16:00:00Z',
		updatedAt: '2026-03-26T08:00:00Z',
		expiresAt: '2026-04-02T23:59:00Z',
		slaDeadline: '2026-03-26T16:00:00Z',
		applicant: 'Alex Johnson',
		referenceNumber: 'TOPS-TR-2026-004',
		ward: 'Ward 3',
		quadrant: 'NW',
		treeSpecies: 'White Oak',
		addresses: [
			{ address: '3800 Brandywine St NW, Washington, DC', lat: 38.9460, lng: -77.0710, stopType: 'start' }
		],
		assignedReviewer: 'R. Patel'
	},
	{
		id: 'P-2026-005',
		type: 'infrastructure',
		title: 'Water Main Break - H St NE',
		description: 'Water bubbling up through pavement, flooding curb lane. DC Water notified.',
		status: 'under_review',
		submittedAt: '2026-03-27T14:00:00Z',
		updatedAt: '2026-03-28T10:00:00Z',
		slaDeadline: '2026-03-29T14:00:00Z',
		applicant: 'Alex Johnson',
		referenceNumber: 'TOPS-IR-2026-005',
		ward: 'Ward 6',
		quadrant: 'NE',
		damageType: 'Water Main',
		addresses: [
			{ address: '1200 H St NE, Washington, DC', lat: 38.9001, lng: -76.9900, stopType: 'start' }
		],
		assignedReviewer: 'S. Williams'
	},
	{
		id: 'P-2026-006',
		type: 'truck_route',
		title: 'Steel Beam Delivery - Navy Yard',
		description: 'Oversize tractor-trailer hauling steel I-beams from Virginia to Navy Yard construction site. Requires escort.',
		status: 'draft',
		submittedAt: '2026-03-29T10:00:00Z',
		updatedAt: '2026-03-29T10:00:00Z',
		applicant: 'Alex Johnson',
		referenceNumber: 'TOPS-CV-2026-006',
		ward: 'Ward 8',
		quadrant: 'SE',
		addresses: [
			{ address: '1000 S Capitol St SE, Washington, DC', lat: 38.8720, lng: -77.0075, stopType: 'start' },
			{ address: '1st St SE & M St SE, Washington, DC', lat: 38.8760, lng: -77.0050, stopType: 'stop', notes: 'Staging area' },
			{ address: '100 Potomac Ave SE, Washington, DC', lat: 38.8740, lng: -77.0010, stopType: 'end' }
		],
		truckInfo: {
			type: 'Tractor-Trailer',
			weight: 80000,
			height: 14.0,
			width: 8.5,
			length: 65,
			axles: 5,
			plateNumber: 'VA-TRL-8819'
		}
	},
	{
		id: 'P-2026-007',
		type: 'infrastructure',
		title: 'Gas Leak Smell - Adams Morgan',
		description: 'Strong gas smell near storm drain on 18th St. Washington Gas contacted.',
		status: 'submitted',
		submittedAt: '2026-03-29T20:00:00Z',
		updatedAt: '2026-03-29T20:00:00Z',
		slaDeadline: '2026-03-30T08:00:00Z',
		applicant: 'Alex Johnson',
		referenceNumber: 'TOPS-IR-2026-007',
		ward: 'Ward 1',
		quadrant: 'NW',
		damageType: 'Gas Leak',
		addresses: [
			{ address: '2400 18th St NW, Washington, DC', lat: 38.9210, lng: -77.0425, stopType: 'start' }
		]
	}
];

class PermitStore {
	permits = $state<Permit[]>(SEED_PERMITS);

	// Derived stats
	totalCount = $derived(this.permits.length);
	draftCount = $derived(this.permits.filter((p) => p.status === 'draft').length);
	submittedCount = $derived(this.permits.filter((p) => p.status === 'submitted').length);
	reviewCount = $derived(this.permits.filter((p) => p.status === 'under_review').length);
	approvedCount = $derived(this.permits.filter((p) => p.status === 'approved').length);
	deniedCount = $derived(this.permits.filter((p) => p.status === 'denied').length);

	getById(id: string): Permit | undefined {
		return this.permits.find((p) => p.id === id);
	}

	getByType(type: PermitType): Permit[] {
		return this.permits.filter((p) => p.type === type);
	}

	getByStatus(status: PermitStatus): Permit[] {
		return this.permits.filter((p) => p.status === status);
	}

	addPermit(permit: Omit<Permit, 'id' | 'referenceNumber' | 'submittedAt' | 'updatedAt' | 'applicant'>): Permit {
		const now = new Date().toISOString();
		const num = String(this.permits.length + 1).padStart(3, '0');
		const typePrefix = { truck_route: 'CV', public_space: 'PS', infrastructure: 'IR', tree_removal: 'TR' };
		const newPermit: Permit = {
			...permit,
			id: `P-2026-${num}`,
			referenceNumber: `TOPS-${typePrefix[permit.type]}-2026-${num}`,
			submittedAt: now,
			updatedAt: now,
			applicant: 'Alex Johnson'
		};
		this.permits = [newPermit, ...this.permits];
		return newPermit;
	}

	updateStatus(id: string, status: PermitStatus) {
		const permit = this.permits.find((p) => p.id === id);
		if (permit) {
			permit.status = status;
			permit.updatedAt = new Date().toISOString();
		}
	}
}

export const permits = new PermitStore();
