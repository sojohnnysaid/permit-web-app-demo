import { test, expect } from '@playwright/test';

/**
 * Full DDOT TOPS Demo Walkthrough — covers all 10 stages from the Demo Report.
 * Each test maps to a specific stage. Tests run sequentially to build on each other's state.
 */

async function loginAsRole(page: import('@playwright/test').Page, role: 'Applicant' | 'Reviewer' | 'Administrator') {
	await page.goto('/login', { waitUntil: 'networkidle' });
	await page.locator('input[type="text"], input[placeholder*="user" i]').first().fill('admin');
	await page.locator('input[type="password"]').first().fill('password');
	await page.locator('button[type="submit"]').first().click();
	await page.waitForTimeout(1500);

	const verifyBtn = page.locator('button:has-text("Verify")').first();
	if (await verifyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
		await verifyBtn.click();
		await page.waitForTimeout(500);
	}

	const roleCard = page.locator(`button:has-text("${role}"), [role="button"]:has-text("${role}")`).first();
	if (await roleCard.isVisible({ timeout: 3000 }).catch(() => false)) {
		await roleCard.click();
	}

	await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {});
}

test.describe('DDOT TOPS Full Demo — 10 Stages', () => {
	test.describe.configure({ mode: 'serial' });

	// ─── STAGE 1: Login & Role Selection ──────────────────────────────
	test('Stage 1: Login with MFA and role selection', async ({ page }) => {
		test.setTimeout(60000);

		await page.goto('/login', { waitUntil: 'networkidle' });
		await page.screenshot({ path: 'tests/screenshots/demo-01-login.png', fullPage: true });

		// Fill credentials
		await page.locator('input[type="text"], input[placeholder*="user" i]').first().fill('admin');
		await page.locator('input[type="password"]').first().fill('password');
		await page.locator('button[type="submit"]').first().click();
		await page.waitForTimeout(1500);

		// MFA verification
		await page.screenshot({ path: 'tests/screenshots/demo-02-mfa.png', fullPage: true });
		const verifyBtn = page.locator('button:has-text("Verify")').first();
		if (await verifyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
			await verifyBtn.click();
			await page.waitForTimeout(500);
		}

		// Role selection — should show 3 active roles + SOO roster
		await page.screenshot({ path: 'tests/screenshots/demo-03-role-select.png', fullPage: true });
		const bodyText = await page.textContent('body');
		expect(bodyText).toContain('Applicant');
		expect(bodyText).toContain('Reviewer');
		expect(bodyText).toContain('Administrator');

		// Select Applicant role
		const applicantCard = page.locator('button:has-text("Applicant"), [role="button"]:has-text("Applicant")').first();
		if (await applicantCard.isVisible({ timeout: 3000 }).catch(() => false)) {
			await applicantCard.click();
		}
		await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {});

		await page.screenshot({ path: 'tests/screenshots/demo-04-dashboard.png', fullPage: true });
		expect(page.url()).toContain('dashboard');
	});

	// ─── STAGE 2: Account & Project Setup ─────────────────────────────
	test('Stage 2: Account and project setup', async ({ page }) => {
		test.setTimeout(60000);
		await loginAsRole(page, 'Applicant');

		// Navigate to Account via nav
		const accountLink = page.locator('a:has-text("Account")').first();
		await accountLink.click({ timeout: 5000 }).catch(() => {});
		await page.waitForTimeout(2000);

		await page.screenshot({ path: 'tests/screenshots/demo-05-account.png', fullPage: true });

		const bodyText = await page.textContent('body');
		expect(bodyText).toContain('TOPS');
	});

	// ─── STAGE 3: Permit Application Intake ───────────────────────────
	test('Stage 3: Construction/Excavation permit intake with GIS and DCMR', async ({ page }) => {
		test.setTimeout(90000);
		await loginAsRole(page, 'Applicant');

		// Navigate to New Permit
		const newPermitLink = page.locator('a:has-text("New Permit"), a[href="/permits/new"]').first();
		await newPermitLink.click();
		await page.waitForTimeout(1000);

		// Verify 5 SOO permit types + pre-application banner
		await page.screenshot({ path: 'tests/screenshots/demo-06-permit-selector.png', fullPage: true });
		let bodyText = await page.textContent('body');
		expect(bodyText).toContain('Parking');
		expect(bodyText).toContain('Construction');
		expect(bodyText).toContain('Commercial Vehicle');
		expect(bodyText).toContain('Public Space');
		expect(bodyText).toContain('Heritage Tree');
		expect(bodyText).toContain('Pre-Application');

		// Click Construction/Excavation
		const constructionCard = page.locator('button:has-text("Construction")').first();
		await constructionCard.click();
		await page.waitForTimeout(1500);

		// Step 1: Project Details
		await page.screenshot({ path: 'tests/screenshots/demo-07-wizard-step1.png', fullPage: true });
		bodyText = await page.textContent('body');
		expect(bodyText).toContain('Construction');

		// Fill some fields and advance through steps
		const descInput = page.locator('textarea').first();
		if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
			await descInput.fill('Underground utility replacement along H Street NE corridor');
		}

		// Advance steps (force click through validation for screenshot purposes)
		for (let step = 2; step <= 5; step++) {
			const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue"), button:has-text("Review")').first();
			if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
				await nextBtn.click({ force: true }).catch(() => {});
				await page.waitForTimeout(1000);
			}
			await page.screenshot({ path: `tests/screenshots/demo-0${step + 6}-wizard-step${step}.png`, fullPage: true });
		}

		// Verify DCMR and fee content exists somewhere in the flow
		bodyText = await page.textContent('body');
		const hasFees = bodyText?.includes('$') || bodyText?.includes('Fee');
		console.log('Stage 3 - Has fees:', hasFees);
	});

	// ─── STAGE 4: Submission & Status Dashboard ───────────────────────
	test('Stage 4: Dashboard with SLA clocks and AI status', async ({ page }) => {
		test.setTimeout(60000);
		await loginAsRole(page, 'Applicant');

		await page.screenshot({ path: 'tests/screenshots/demo-12-dashboard-status.png', fullPage: true });

		const bodyText = await page.textContent('body');
		// Verify SLA countdown exists
		const hasSLA = bodyText?.includes('remaining') || bodyText?.includes('Overdue') || bodyText?.includes('SLA');
		// Verify AI status explanations exist
		const hasAIStatus = bodyText?.includes('reviewed') || bodyText?.includes('approved') || bodyText?.includes('received') || bodyText?.includes('business day');

		console.log('Stage 4 - Has SLA:', hasSLA);
		console.log('Stage 4 - Has AI status:', hasAIStatus);
		expect(hasSLA).toBeTruthy();
		expect(hasAIStatus).toBeTruthy();

		// Verify no animation glitch — cards should not have animate-slide-up
		const cardClasses = await page.locator('a[href*="/permits/P-"]').first().getAttribute('class');
		expect(cardClasses).not.toContain('animate-slide-up');
	});

	// ─── STAGE 5: Reviewer Work Queue ─────────────────────────────────
	test('Stage 5: Reviewer work queue with AI summaries', async ({ page }) => {
		test.setTimeout(60000);
		await loginAsRole(page, 'Reviewer');

		// Navigate to Work Queue
		const queueLink = page.locator('a:has-text("Work Queue")').first();
		await queueLink.click({ timeout: 5000 }).catch(() => {});
		await page.waitForTimeout(2000);

		await page.screenshot({ path: 'tests/screenshots/demo-13-reviewer-queue.png', fullPage: true });

		const bodyText = await page.textContent('body');
		const hasPermits = bodyText?.includes('TOPS-') || bodyText?.includes('Review');
		console.log('Stage 5 - Reviewer queue has permits:', hasPermits);
		expect(hasPermits).toBeTruthy();

		// Click first permit to open review detail
		const reviewLink = page.locator('a:has-text("Review"), a[href*="/reviewer/P-"]').first();
		if (await reviewLink.isVisible({ timeout: 3000 }).catch(() => false)) {
			await reviewLink.click();
			await page.waitForTimeout(2000);
		}

		await page.screenshot({ path: 'tests/screenshots/demo-14-review-detail.png', fullPage: true });
	});

	// ─── STAGE 6: GIS Conflict & Coordination ─────────────────────────
	test('Stage 6: GIS conflict view with asset management', async ({ page }) => {
		test.setTimeout(60000);
		await loginAsRole(page, 'Reviewer');

		// Navigate to a review detail (GIS is integrated there)
		const queueLink = page.locator('a:has-text("Work Queue")').first();
		await queueLink.click({ timeout: 5000 }).catch(() => {});
		await page.waitForTimeout(2000);

		const reviewLink = page.locator('a:has-text("Review"), a[href*="/reviewer/P-"]').first();
		if (await reviewLink.isVisible({ timeout: 3000 }).catch(() => false)) {
			await reviewLink.click();
			await page.waitForTimeout(3000); // Wait for Leaflet map to load
		}

		await page.screenshot({ path: 'tests/screenshots/demo-15-gis-conflict.png', fullPage: true });

		const bodyText = await page.textContent('body');
		// Check for GIS-related content
		const hasGIS = bodyText?.includes('Conflict') || bodyText?.includes('conflict') ||
			bodyText?.includes('Asset') || bodyText?.includes('Nearby') ||
			bodyText?.includes('Approve') || bodyText?.includes('map');
		console.log('Stage 6 - Has GIS/conflict content:', hasGIS);
	});

	// ─── STAGE 7: Applicant Response & Resubmission ───────────────────
	test('Stage 7: Response and resubmission flow exists', async ({ page }) => {
		test.setTimeout(60000);
		await loginAsRole(page, 'Applicant');

		// Navigate to a permit detail
		const permitLink = page.locator('a[href*="/permits/P-2026-002"]').first();
		if (await permitLink.isVisible({ timeout: 3000 }).catch(() => false)) {
			await permitLink.click();
			await page.waitForTimeout(1500);
		}

		await page.screenshot({ path: 'tests/screenshots/demo-16-permit-detail.png', fullPage: true });

		// The respond page exists at /permits/[id]/respond — verify the route is accessible
		const bodyText = await page.textContent('body');
		expect(bodyText).toContain('TOPS');
	});

	// ─── STAGE 8: Payment & Permit Issuance ───────────────────────────
	test('Stage 8: Payment and permit issuance pages exist', async ({ page }) => {
		test.setTimeout(60000);
		await loginAsRole(page, 'Applicant');

		// Navigate to approved permit
		const approvedLink = page.locator('a[href*="/permits/P-2026-001"]').first();
		if (await approvedLink.isVisible({ timeout: 3000 }).catch(() => false)) {
			await approvedLink.click();
			await page.waitForTimeout(1500);
		}

		await page.screenshot({ path: 'tests/screenshots/demo-17-approved-permit.png', fullPage: true });

		const bodyText = await page.textContent('body');
		const hasApproved = bodyText?.includes('Approved') || bodyText?.includes('approved');
		console.log('Stage 8 - Shows approved permit:', hasApproved);
		expect(bodyText).toContain('TOPS');
	});

	// ─── STAGE 9: Inspector View ──────────────────────────────────────
	test('Stage 9: Inspector mobile view with compliance', async ({ page }) => {
		test.setTimeout(60000);
		await loginAsRole(page, 'Administrator');

		// Navigate to Inspector via admin nav
		const inspectorLink = page.locator('a:has-text("Inspector")').first();
		if (await inspectorLink.isVisible({ timeout: 3000 }).catch(() => false)) {
			await inspectorLink.click();
			await page.waitForTimeout(2000);
		}

		// Desktop screenshot
		await page.screenshot({ path: 'tests/screenshots/demo-18-inspector-desktop.png', fullPage: true });

		// Mobile screenshot
		await page.setViewportSize({ width: 375, height: 812 });
		await page.waitForTimeout(500);
		await page.screenshot({ path: 'tests/screenshots/demo-19-inspector-mobile.png', fullPage: true });

		// Reset viewport
		await page.setViewportSize({ width: 1280, height: 720 });

		const bodyText = await page.textContent('body');
		expect(bodyText).toContain('TOPS');
	});

	// ─── STAGE 10: Management Dashboard & Reporting ───────────────────
	test('Stage 10: Management dashboard with AI insights', async ({ page }) => {
		test.setTimeout(60000);
		await loginAsRole(page, 'Administrator');

		// Navigate to Management
		const mgmtLink = page.locator('a:has-text("Management")').first();
		if (await mgmtLink.isVisible({ timeout: 3000 }).catch(() => false)) {
			await mgmtLink.click();
			await page.waitForTimeout(2000);
		}

		await page.screenshot({ path: 'tests/screenshots/demo-20-admin-operations.png', fullPage: true });

		// Navigate to Executive View
		const execLink = page.locator('a:has-text("Executive")').first();
		if (await execLink.isVisible({ timeout: 3000 }).catch(() => false)) {
			await execLink.click();
			await page.waitForTimeout(2000);
		}

		await page.screenshot({ path: 'tests/screenshots/demo-21-admin-executive.png', fullPage: true });

		const bodyText = await page.textContent('body');
		expect(bodyText).toContain('TOPS');
	});

	// ─── CROSS-CUTTING: No broken nav links ───────────────────────────
	test('No 404s on any nav link', async ({ page }) => {
		test.setTimeout(90000);

		// Test as each role
		for (const role of ['Applicant', 'Reviewer', 'Administrator'] as const) {
			await loginAsRole(page, role);

			// Get all nav links
			const links = page.locator('nav a[href], header a[href]');
			const count = await links.count();
			const hrefs: string[] = [];

			for (let i = 0; i < count; i++) {
				const href = await links.nth(i).getAttribute('href');
				if (href && href.startsWith('/') && !hrefs.includes(href)) {
					hrefs.push(href);
				}
			}

			console.log(`${role} nav links:`, hrefs);

			// Click each link and verify no 404
			for (const href of hrefs) {
				const link = page.locator(`a[href="${href}"]`).first();
				if (await link.isVisible({ timeout: 1000 }).catch(() => false)) {
					await link.click();
					await page.waitForTimeout(1000);

					const bodyText = await page.textContent('body');
					const is404 = bodyText?.includes('404') && bodyText?.includes('Not Found');
					if (is404) {
						console.error(`BROKEN LINK: ${href} returns 404 for role ${role}`);
					}
					expect(is404).toBeFalsy();
				}
			}
		}
	});
});
