// Fake auth store using Svelte 5 Runes

interface User {
	username: string;
	name: string;
	role: 'citizen' | 'admin';
	email: string;
	avatar: string;
}

const FAKE_USER: User = {
	username: 'admin',
	name: 'Alex Johnson',
	role: 'citizen',
	email: 'alex.johnson@email.com',
	avatar: 'AJ'
};

const FAKE_PASSWORD = 'password';

class AuthStore {
	user = $state<User | null>(null);
	isAuthenticated = $derived(this.user !== null);
	error = $state('');
	isLoading = $state(false);

	async login(username: string, password: string): Promise<boolean> {
		this.error = '';
		this.isLoading = true;

		// Simulate network delay
		await new Promise((r) => setTimeout(r, 800));

		if (username === 'admin' && password === FAKE_PASSWORD) {
			this.user = FAKE_USER;
			this.isLoading = false;
			return true;
		}

		this.error = 'Invalid username or password';
		this.isLoading = false;
		return false;
	}

	logout() {
		this.user = null;
	}
}

export const auth = new AuthStore();
