// DCMR (DC Municipal Regulations) reference data

export interface DCMRCitation {
	title: number;
	chapter?: number;
	name: string;
	summary: string;
	relevance: string;
}

const DCMR_TITLES: Record<number, { name: string; summary: string }> = {
	6: { name: 'Construction Codes', summary: 'Building permits, structural requirements, contractor licensing' },
	9: { name: 'Transportation', summary: 'Vehicle permits, traffic control plans, road closures' },
	16: { name: 'Zoning', summary: 'Land use regulations, setbacks, height restrictions, special exceptions' },
	18: { name: 'Vehicles & Traffic', summary: 'Parking regulations, road closures, detour requirements' },
	24: { name: 'Public Space', summary: 'Right-of-way permits, sidewalk and street occupancy, restoration' }
};

// Step-based relevance mapping for construction_excavation
const STEP_CITATIONS: Record<number, DCMRCitation[]> = {
	1: [
		{ title: 6, chapter: 1, name: 'General Construction Requirements', summary: 'Contractor licensing and permit prerequisites for construction work in the District', relevance: 'Validates contractor credentials and work type classification' },
		{ title: 24, chapter: 5, name: 'Public Space Permits', summary: 'Requirements for permits when construction impacts public right-of-way', relevance: 'Establishes permit category and base requirements for excavation work' }
	],
	2: [
		{ title: 24, chapter: 6, name: 'Public Space Occupancy', summary: 'Regulations governing temporary occupancy of sidewalks, alleys, and streets', relevance: 'Location-specific requirements based on the selected work area' },
		{ title: 16, chapter: 3, name: 'Zoning Districts', summary: 'Zone-specific restrictions that may affect construction methods and hours', relevance: 'Ward and zone-based constraints on work hours and noise levels' }
	],
	3: [
		{ title: 6, chapter: 4, name: 'Plan Submission Requirements', summary: 'Required documentation including site plans, traffic control plans, and insurance', relevance: 'Checklist for required supporting documents' },
		{ title: 9, chapter: 9, name: 'Traffic Control Standards', summary: 'Standards for temporary traffic control during construction activities', relevance: 'Traffic control plan requirements for permit approval' }
	],
	4: [
		{ title: 24, chapter: 8, name: 'Permit Fees & Deposits', summary: 'Fee schedule for public space permits including refundable restoration deposits', relevance: 'Basis for fee calculation and deposit requirements' }
	],
	5: [
		{ title: 6, chapter: 1, name: 'General Construction Requirements', summary: 'Contractor licensing and permit prerequisites', relevance: 'Final validation of all requirements' },
		{ title: 24, chapter: 5, name: 'Public Space Permits', summary: 'Right-of-way permit requirements', relevance: 'Comprehensive permit compliance check' },
		{ title: 9, chapter: 9, name: 'Traffic Control Standards', summary: 'Temporary traffic control requirements', relevance: 'Traffic plan compliance verification' },
		{ title: 16, chapter: 3, name: 'Zoning Districts', summary: 'Zone-specific work restrictions', relevance: 'Zoning compliance confirmation' }
	]
};

export function getDCMRCitations(permitType: string, step: number): DCMRCitation[] {
	if (permitType === 'construction_excavation') {
		return STEP_CITATIONS[step] ?? [];
	}
	// Default citations for other permit types
	return [
		{ title: 24, chapter: 5, name: 'Public Space Permits', summary: 'General permit requirements for public space use', relevance: 'Applicable to all permit types' }
	];
}

export function getDCMRTitle(titleNumber: number): { name: string; summary: string } | undefined {
	return DCMR_TITLES[titleNumber];
}

export function getAllDCMRTitles(): Array<{ number: number; name: string; summary: string }> {
	return Object.entries(DCMR_TITLES).map(([num, data]) => ({
		number: parseInt(num),
		...data
	}));
}
