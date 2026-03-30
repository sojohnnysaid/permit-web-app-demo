// Fake AI chat store using Svelte 5 Runes

export interface ChatMessage {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	timestamp: string;
}

const CANNED_RESPONSES: Record<string, string> = {
	// Permit finding
	'truck': `I can help you with a **Commercial Vehicle Route Permit**! This is needed for oversize/overweight vehicles traveling through DC.\n\nYou'll need:\n- Vehicle dimensions & weight\n- Planned route with stops\n- Valid commercial plates\n\nWould you like me to start a new truck route application?`,
	'wedding': `For a **Wedding Parking Reservation**, you'll need a Public Space permit.\n\nThis covers:\n- Reserved street parking (up to 6 spaces)\n- Sign posting 72 hours in advance\n- Duration up to 16 hours\n\nShall I start a wedding parking application for you?`,
	'pothole': `I can file an **Infrastructure Report** for a pothole right away.\n\nI'll need:\n- Exact location (address or intersection)\n- Approximate size\n- Photo if available\n- Lane affected\n\nWant me to start the report?`,
	'tree': `For tree issues, you'll need a **Tree Removal/Special Tree Permit**.\n\n- **Emergency** (fallen/dangerous): Expedited 24-hour review\n- **Planned removal**: Standard 7-day review\n- **Heritage tree**: Requires arborist assessment\n\nIs this an emergency or planned removal?`,
	'water': `I'll help file a **Water/Sewage Damage Report**.\n\nFor emergencies, also call DC Water: (202) 612-3400\n\nI'll need the location and a description of the issue. Want to start the report?`,
	'gas': `**Gas leaks are urgent!** If you smell gas:\n1. Call Washington Gas: (703) 750-1400\n2. Call 911 if strong odor\n\nI can also file an infrastructure report to document it. Shall I proceed?`,
	'status': `Here's a quick summary of your permits:\n\n✅ **2 Approved** - Ready to use\n🔍 **2 Under Review** - Being processed\n📨 **2 Submitted** - Awaiting assignment\n📝 **1 Draft** - Needs completion\n\nWhich permit would you like details on?`,
	'help': `I'm your **TOPS AI Assistant**! I can help with:\n\n🚛 Commercial vehicle route permits\n🎉 Event/wedding parking permits\n🕳️ Pothole & road damage reports\n🌳 Tree removal permits\n💧 Water/sewage issues\n⛽ Gas leak reports\n\nJust describe what you need, or ask about your permit status!`,
};

function findResponse(input: string): string {
	const lower = input.toLowerCase();
	for (const [key, response] of Object.entries(CANNED_RESPONSES)) {
		if (lower.includes(key)) return response;
	}
	return `I'd be happy to help! Could you tell me more about what you need?\n\nI can assist with:\n- **Truck/vehicle route permits**\n- **Event & wedding permits**\n- **Infrastructure reports** (potholes, water, gas)\n- **Tree removal permits**\n- **Permit status checks**\n\nJust describe your situation and I'll guide you to the right permit.`;
}

class ChatStore {
	messages = $state<ChatMessage[]>([
		{
			id: '0',
			role: 'assistant',
			content: 'Hi! I\'m your TOPS AI assistant. I can help you find the right permit, check your application status, or report an issue. What do you need help with today?',
			timestamp: new Date().toISOString()
		}
	]);
	isOpen = $state(false);
	isTyping = $state(false);
	unreadCount = $state(0);

	toggle() {
		this.isOpen = !this.isOpen;
		if (this.isOpen) this.unreadCount = 0;
	}

	async send(content: string) {
		const userMsg: ChatMessage = {
			id: String(Date.now()),
			role: 'user',
			content,
			timestamp: new Date().toISOString()
		};
		this.messages = [...this.messages, userMsg];
		this.isTyping = true;

		// Simulate AI thinking
		await new Promise((r) => setTimeout(r, 600 + Math.random() * 800));

		const response = findResponse(content);
		const assistantMsg: ChatMessage = {
			id: String(Date.now() + 1),
			role: 'assistant',
			content: response,
			timestamp: new Date().toISOString()
		};
		this.messages = [...this.messages, assistantMsg];
		this.isTyping = false;

		if (!this.isOpen) this.unreadCount++;
	}
}

export const chat = new ChatStore();
