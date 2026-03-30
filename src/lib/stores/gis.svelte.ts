// GIS conflict detection and coordination data store

export interface NearbyPermit {
	id: string;
	title: string;
	type: string;
	status: 'active' | 'pending' | 'completed';
	lat: number;
	lng: number;
	ward: string;
	startDate: string;
	endDate: string;
}

export interface DDOTProject {
	id: string;
	title: string;
	type: 'road_resurfacing' | 'utility' | 'bridge' | 'transit' | 'pedestrian';
	status: 'active' | 'planned' | 'completed';
	lat: number;
	lng: number;
	description: string;
	agency: string;
	scheduledDate: string;
}

export interface AssetCondition {
	id: string;
	type: 'sidewalk' | 'street' | 'ada_ramp' | 'traffic_signal' | 'street_light';
	condition: 'good' | 'fair' | 'poor' | 'scheduled_repair';
	lat: number;
	lng: number;
	label: string;
	lastInspected: string;
}

export interface ConflictAlert {
	severity: 'high' | 'medium' | 'low';
	title: string;
	description: string;
	recommendation: string;
}

// Seed data for DC area
const NEARBY_PERMITS: NearbyPermit[] = [
	{ id: 'NP-1', title: 'Sidewalk Café — 1100 H St NE', type: 'public_space_rental', status: 'active', lat: 38.9005, lng: -76.9920, ward: 'Ward 6', startDate: '2026-03-01', endDate: '2026-10-31' },
	{ id: 'NP-2', title: 'Water Line Replacement — 1300 H St NE', type: 'construction_excavation', status: 'active', lat: 38.9003, lng: -76.9880, ward: 'Ward 6', startDate: '2026-02-15', endDate: '2026-05-30' },
	{ id: 'NP-3', title: 'Fiber Optic Installation — I St NE', type: 'construction_excavation', status: 'pending', lat: 38.9015, lng: -76.9910, ward: 'Ward 6', startDate: '2026-04-01', endDate: '2026-06-15' },
	{ id: 'NP-4', title: 'Street Parking — Wedding Event', type: 'parking_occupancy', status: 'active', lat: 38.9108, lng: -77.0310, ward: 'Ward 2', startDate: '2026-03-22', endDate: '2026-03-22' },
	{ id: 'NP-5', title: 'Gas Main Repair — 17th St NW', type: 'construction_excavation', status: 'completed', lat: 38.9200, lng: -77.0410, ward: 'Ward 1', startDate: '2026-02-01', endDate: '2026-03-15' }
];

const DDOT_PROJECTS: DDOTProject[] = [
	{ id: 'DP-1', title: 'H Street NE Resurfacing', type: 'road_resurfacing', status: 'planned', lat: 38.9000, lng: -76.9900, description: 'Full road resurfacing from 10th to 15th St NE', agency: 'DDOT', scheduledDate: '2026-Q3' },
	{ id: 'DP-2', title: 'DC Water Main Replacement', type: 'utility', status: 'active', lat: 38.9002, lng: -76.9895, description: 'Water main replacement — 12-inch line upgrade', agency: 'DC Water', scheduledDate: '2026-Q2' },
	{ id: 'DP-3', title: 'PEPCO Underground Conduit', type: 'utility', status: 'planned', lat: 38.9008, lng: -76.9905, description: 'Underground power conduit installation', agency: 'PEPCO', scheduledDate: '2026-Q3' },
	{ id: 'DP-4', title: 'ADA Ramp Upgrades — Ward 6', type: 'pedestrian', status: 'active', lat: 38.8995, lng: -76.9915, description: 'ADA-compliant curb ramp installations at 12 intersections', agency: 'DDOT', scheduledDate: '2026-Q2' },
	{ id: 'DP-5', title: 'Georgia Ave Bus Rapid Transit', type: 'transit', status: 'planned', lat: 38.9580, lng: -77.0270, description: 'Dedicated bus lanes and station construction', agency: 'DDOT/WMATA', scheduledDate: '2027-Q1' }
];

const ASSET_CONDITIONS: AssetCondition[] = [
	{ id: 'AC-1', type: 'sidewalk', condition: 'good', lat: 38.9004, lng: -76.9905, label: 'Sidewalk: Good condition', lastInspected: '2026-01-15' },
	{ id: 'AC-2', type: 'street', condition: 'scheduled_repair', lat: 38.9001, lng: -76.9900, label: 'Street: Scheduled resurfacing Q3 2026', lastInspected: '2025-12-01' },
	{ id: 'AC-3', type: 'ada_ramp', condition: 'good', lat: 38.9000, lng: -76.9898, label: 'ADA Ramp: Compliant (inspected Jan 2026)', lastInspected: '2026-01-20' },
	{ id: 'AC-4', type: 'traffic_signal', condition: 'good', lat: 38.9002, lng: -76.9892, label: 'Traffic Signal: Operational', lastInspected: '2026-02-10' },
	{ id: 'AC-5', type: 'street_light', condition: 'fair', lat: 38.9006, lng: -76.9908, label: 'Street Light: Dim — maintenance scheduled', lastInspected: '2025-11-20' },
	{ id: 'AC-6', type: 'sidewalk', condition: 'poor', lat: 38.9580, lng: -77.0275, label: 'Sidewalk: Trip hazard — repair needed', lastInspected: '2026-02-28' }
];

class GISStore {
	nearbyPermits = $state<NearbyPermit[]>(NEARBY_PERMITS);
	ddotProjects = $state<DDOTProject[]>(DDOT_PROJECTS);
	assetConditions = $state<AssetCondition[]>(ASSET_CONDITIONS);

	getNearbyPermits(lat: number, lng: number, radiusKm: number = 0.5): NearbyPermit[] {
		return this.nearbyPermits.filter((p) => {
			const dist = this.haversineDistance(lat, lng, p.lat, p.lng);
			return dist <= radiusKm;
		});
	}

	getNearbyProjects(lat: number, lng: number, radiusKm: number = 0.5): DDOTProject[] {
		return this.ddotProjects.filter((p) => {
			const dist = this.haversineDistance(lat, lng, p.lat, p.lng);
			return dist <= radiusKm;
		});
	}

	getNearbyAssets(lat: number, lng: number, radiusKm: number = 0.5): AssetCondition[] {
		return this.assetConditions.filter((a) => {
			const dist = this.haversineDistance(lat, lng, a.lat, a.lng);
			return dist <= radiusKm;
		});
	}

	detectConflicts(lat: number, lng: number, startDate: string, endDate: string): ConflictAlert[] {
		const alerts: ConflictAlert[] = [];
		const nearbyPermits = this.getNearbyPermits(lat, lng, 0.3);
		const nearbyProjects = this.getNearbyProjects(lat, lng, 0.3);

		// Check for overlapping active permits
		nearbyPermits
			.filter((p) => p.status === 'active' || p.status === 'pending')
			.forEach((p) => {
				const overlap = this.datesOverlap(startDate, endDate, p.startDate, p.endDate);
				if (overlap) {
					alerts.push({
						severity: 'high',
						title: `Permit Conflict: ${p.title}`,
						description: `Active ${p.type} permit within 300m with overlapping dates (${p.startDate} to ${p.endDate}).`,
						recommendation: 'Coordinate scheduling with existing permit holder. Contact DDOT coordination office.'
					});
				}
			});

		// Check for DDOT project conflicts
		nearbyProjects
			.filter((p) => p.status === 'active' || p.status === 'planned')
			.forEach((p) => {
				alerts.push({
					severity: p.status === 'active' ? 'high' : 'medium',
					title: `DDOT Project: ${p.title}`,
					description: `${p.agency} ${p.type} project within 300m. Status: ${p.status}. Scheduled: ${p.scheduledDate}.`,
					recommendation: `Coordinate with ${p.agency}. ${p.status === 'active' ? 'Active work may affect site access.' : 'Planned work may conflict with permit timeline.'}`
				});
			});

		// Check for poor-condition assets
		const poorAssets = this.getNearbyAssets(lat, lng, 0.2).filter((a) => a.condition === 'poor' || a.condition === 'scheduled_repair');
		poorAssets.forEach((a) => {
			alerts.push({
				severity: 'low',
				title: `Asset Condition: ${a.label}`,
				description: `${a.type} asset near permit location requires attention.`,
				recommendation: 'Incorporate restoration requirements into permit conditions.'
			});
		});

		return alerts.sort((a, b) => {
			const order = { high: 0, medium: 1, low: 2 };
			return order[a.severity] - order[b.severity];
		});
	}

	private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
		const R = 6371;
		const dLat = (lat2 - lat1) * Math.PI / 180;
		const dLng = (lng2 - lng1) * Math.PI / 180;
		const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
		return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	}

	private datesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
		const start1 = new Date(s1).getTime();
		const end1 = new Date(e1).getTime();
		const start2 = new Date(s2).getTime();
		const end2 = new Date(e2).getTime();
		return start1 <= end2 && start2 <= end1;
	}
}

export const gisStore = new GISStore();
