// Reviewer work queue store using Svelte 5 Runes

import { permits, type Permit, type PermitStatus } from './permits.svelte';

export interface ReviewComment {
	id: string;
	author: string;
	role: string;
	content: string;
	timestamp: string;
	type: 'comment' | 'request_info' | 'approval' | 'denial';
}

export interface ReviewAction {
	permitId: string;
	action: 'approve' | 'deny' | 'return';
	notes: string;
	timestamp: string;
	reviewer: string;
}

// Seed review comments for demo
const SEED_COMMENTS: Record<string, ReviewComment[]> = {
	'P-2026-002': [
		{
			id: 'rc-1',
			author: 'K. Davis',
			role: 'Reviewer',
			content: 'Please provide a traffic control plan for the street parking reservation. How will traffic flow be maintained during the event?',
			timestamp: '2026-03-22T09:15:00Z',
			type: 'request_info'
		}
	],
	'P-2026-005': [
		{
			id: 'rc-2',
			author: 'S. Williams',
			role: 'Senior Reviewer',
			content: 'DC Water has been notified and confirmed coordination. Reviewing emergency classification for expedited processing.',
			timestamp: '2026-03-28T10:00:00Z',
			type: 'comment'
		}
	]
};

// AI-generated summaries for demo
const AI_SUMMARIES: Record<string, string> = {
	'P-2026-001': 'Commercial vehicle permit for cement mixer delivery on Capitol Hill. Standard overweight route with 6-axle vehicle. Route from Bladensburg Rd to 3rd St SE. No active conflicts detected in route corridor.',
	'P-2026-002': 'Public space rental for wedding event parking on O Street NW, Ward 2. Requesting 6 parking spaces for Saturday event. Pending traffic control plan from applicant.',
	'P-2026-003': 'Emergency infrastructure report: large pothole on Georgia Ave NW in Ward 4. Reported as 2ft wide, 8 inches deep. Multiple flat tires reported. Recommend expedited review.',
	'P-2026-005': 'Emergency infrastructure report: water main break on H Street NE, Ward 6. Water bubbling through pavement. DC Water notified and coordinating. Active PEPCO conduit project within 500ft — potential conflict.',
	'P-2026-006': 'Commercial vehicle permit for oversize steel beam delivery to Navy Yard. Tractor-trailer at 80,000 lbs with escort requirement. Route through Capitol Hill corridor — check for active construction conflicts.',
	'P-2026-007': 'Emergency infrastructure report: gas leak odor near storm drain on 18th St NW, Adams Morgan (Ward 1). Washington Gas contacted. Recommend immediate priority classification.'
};

class ReviewerStore {
	comments = $state<Record<string, ReviewComment[]>>(SEED_COMMENTS);
	actionHistory = $state<ReviewAction[]>([]);

	// Get permits in reviewer queue (submitted or under_review)
	get queue(): Permit[] {
		return permits.permits
			.filter((p) => p.status === 'submitted' || p.status === 'under_review')
			.sort((a, b) => {
				// Sort by SLA urgency — nearest deadline first
				if (!a.slaDeadline && !b.slaDeadline) return 0;
				if (!a.slaDeadline) return 1;
				if (!b.slaDeadline) return -1;
				return new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime();
			});
	}

	get queueCount(): number {
		return this.queue.length;
	}

	getAISummary(permitId: string): string {
		return AI_SUMMARIES[permitId] ?? 'AI summary will be generated once the application is fully processed.';
	}

	getComments(permitId: string): ReviewComment[] {
		return this.comments[permitId] ?? [];
	}

	addComment(permitId: string, comment: Omit<ReviewComment, 'id' | 'timestamp'>): void {
		const newComment: ReviewComment = {
			...comment,
			id: `rc-${crypto.randomUUID().slice(0, 8)}`,
			timestamp: new Date().toISOString()
		};
		if (!this.comments[permitId]) {
			this.comments[permitId] = [];
		}
		this.comments = {
			...this.comments,
			[permitId]: [...(this.comments[permitId] ?? []), newComment]
		};
	}

	approve(permitId: string, notes: string, reviewer: string): void {
		permits.updateStatus(permitId, 'approved');
		this.addComment(permitId, {
			author: reviewer,
			role: 'Reviewer',
			content: `Application approved. ${notes}`,
			type: 'approval'
		});
		this.actionHistory = [...this.actionHistory, {
			permitId, action: 'approve', notes, timestamp: new Date().toISOString(), reviewer
		}];
	}

	deny(permitId: string, notes: string, reviewer: string): void {
		permits.updateStatus(permitId, 'denied');
		this.addComment(permitId, {
			author: reviewer,
			role: 'Reviewer',
			content: `Application denied. ${notes}`,
			type: 'denial'
		});
		this.actionHistory = [...this.actionHistory, {
			permitId, action: 'deny', notes, timestamp: new Date().toISOString(), reviewer
		}];
	}

	returnForInfo(permitId: string, notes: string, reviewer: string): void {
		permits.updateStatus(permitId, 'returned' as PermitStatus);
		this.addComment(permitId, {
			author: reviewer,
			role: 'Reviewer',
			content: notes,
			type: 'request_info'
		});
		this.actionHistory = [...this.actionHistory, {
			permitId, action: 'return', notes, timestamp: new Date().toISOString(), reviewer
		}];
	}
}

export const reviewerStore = new ReviewerStore();
