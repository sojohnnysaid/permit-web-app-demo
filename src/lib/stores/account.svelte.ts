// Account & project setup store using Svelte 5 Runes

export interface BusinessAccount {
	companyName: string;
	ein: string;
	contactName: string;
	contactEmail: string;
	contactPhone: string;
	address: string;
}

export interface Project {
	name: string;
	description: string;
	ward: string;
	estimatedDuration: string;
}

const DEMO_ACCOUNT: BusinessAccount = {
	companyName: 'National Capital Construction LLC',
	ein: '52-1234567',
	contactName: 'Alex Johnson',
	contactEmail: 'alex.johnson@ncc-dc.com',
	contactPhone: '(202) 555-0147',
	address: '1420 K St NW, Suite 200, Washington, DC 20005'
};

const DEMO_PROJECT: Project = {
	name: 'H Street Corridor Utility Upgrade',
	description: 'Underground utility replacement and sidewalk restoration along H Street NE corridor',
	ward: 'Ward 6',
	estimatedDuration: '6 months'
};

class AccountStore {
	account = $state<BusinessAccount>(DEMO_ACCOUNT);
	project = $state<Project>(DEMO_PROJECT);
	isSetupComplete = $state(false);

	completeSetup(): void {
		this.isSetupComplete = true;
	}

	updateAccount(updates: Partial<BusinessAccount>): void {
		this.account = { ...this.account, ...updates };
	}

	updateProject(updates: Partial<Project>): void {
		this.project = { ...this.project, ...updates };
	}
}

export const accountStore = new AccountStore();
