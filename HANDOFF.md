# TOPS Development Handoff

> Read this first in any new session. Then check Plane for confirmation.

## Current State
- **Phase:** 2 of 6
- **Phase Name:** Construction/Excavation Intake with AI & DCMR
- **Plane Module:** Stage 3: Permit Application Intake (in-progress)
- **Last Session:** 2026-03-30

## What Was Completed Last Session
- Phase 1 fully closed out (RBAC, MFA, role switcher, SOO types, vitest, Playwright)
- 9 unit tests passing, 3 E2E tests passing against prod
- Deployed to tops.sogos.io and verified
- Plane modules Stage 1 & 2 marked completed
- Stage 3 module set to in-progress

## Next Action
Build the Construction/Excavation permit wizard — this is the primary demo flow per the DDOT report. Specifically:
1. Create `/permits/new/construction-excavation/+page.svelte` (5-step wizard)
2. Create `DCMRSidebar.svelte` component (regulation citations by step)
3. Create `FeeEstimator.svelte` component (transparent fee breakdown)
4. Add AI pre-submission validation on the Review step
5. Add plain-language status explanations on dashboard permit cards

## Blockers
None.

## Deployment
Push to main → GitHub Actions builds Docker image → GHCR → manually restart pod:
```bash
kubectl --context admin@macmini-cluster -n tops rollout restart deployment tops-frontend
```

## Key References
- Plan: `/Users/john/.claude/plans/mossy-splashing-deer.md`
- Plane project: TOPS (workspace: sogos, project ID: da316c94-b4fa-46dd-aba8-787b157f1fed)
- Prod: https://tops.sogos.io
- DDOT report: `DDOT_TOPS_Demo_Report.pdf` in project root
