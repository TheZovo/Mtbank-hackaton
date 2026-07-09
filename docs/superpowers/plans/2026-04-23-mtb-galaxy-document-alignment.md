# MTB Galaxy Document Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the current monorepo with the external MTB Galaxy document by adding missing backend flows, contracts, and mobile screens without creating a duplicate app structure.

**Architecture:** Extend the existing FastAPI + SQLAlchemy backend with missing social/payment endpoints, regenerate contracts from that backend, and wire the mobile app to those new contracts through feature modules that follow the current `shared/api` and navigation patterns. Keep existing auth/planets/games flows intact while adding nickname, friends, AI, and QR capabilities incrementally through TDD.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, pytest, React Native, React Query, Zustand, Jest, TypeScript, OpenAPI generation.

---

### Task 1: Backend social and payment red tests

**Files:**
- Create: `apps/api/tests/test_document_alignment.py`
- Test: `apps/api/tests/conftest.py`

- [ ] **Step 1: Write failing tests**

```python
async def test_user_nickname_friendship_and_payment_flow(client) -> None:
    ...
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest apps/api/tests/test_document_alignment.py -v`
Expected: FAIL because `/v1/users`, `/v1/friends`, `/v1/play-together`, and `/v1/payment-requests` do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add SQLAlchemy models, schemas, services, routers, and migration for nickname, friendships, gifts, and payment requests.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest apps/api/tests/test_document_alignment.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/tests/test_document_alignment.py apps/api/src
git commit -m "feat: add document alignment backend flows"
```

### Task 2: Contracts regeneration

**Files:**
- Modify: `contracts/export_openapi.py`
- Modify: `contracts/generate.js`
- Modify: `contracts/openapi.yaml`
- Modify: `contracts/generated/api.ts`
- Modify: `packages/contracts/src/generated/api.ts`

- [ ] **Step 1: Add failing expectation**

Confirm generated contracts do not include the new endpoints.

- [ ] **Step 2: Run generation to verify mismatch**

Run: `npm run contracts:generate`
Expected: output still reflects mock-server or misses new endpoints before export script is fixed.

- [ ] **Step 3: Write minimal implementation**

Point export/generation to `apps/api` and regenerate artifacts.

- [ ] **Step 4: Run generation to verify success**

Run: `npm run contracts:generate`
Expected: exit code `0` and generated types include new routes.

- [ ] **Step 5: Commit**

```bash
git add contracts packages/contracts
git commit -m "feat: regenerate contracts from api app"
```

### Task 3: Mobile profile and friends red tests

**Files:**
- Create: `apps/mobile/src/features/friends/screens/FriendsScreen.test.tsx`
- Modify: `apps/mobile/src/features/profile/screens/ProfileScreen.test.tsx`
- Test: `apps/mobile/src/shared/api/client.ts`

- [ ] **Step 1: Write failing tests**

```tsx
it("saves nickname from profile")
it("finds users, adds friends, and shows gift modal after play together")
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test --workspace @mtb/mobile -- --runInBand ProfileScreen FriendsScreen`
Expected: FAIL because nickname mutation and friends UI do not exist.

- [ ] **Step 3: Write minimal implementation**

Add profile nickname save flow, mobile API helpers, and Friends screen wired to new backend routes.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace @mtb/mobile -- --runInBand ProfileScreen FriendsScreen`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/profile apps/mobile/src/features/friends apps/mobile/src/shared/api/client.ts
git commit -m "feat: add mobile friends and nickname flows"
```

### Task 4: Mobile AI and QR flows

**Files:**
- Create: `apps/mobile/src/features/ai/screens/AIScreen.tsx`
- Create: `apps/mobile/src/features/qr/screens/QRScreen.tsx`
- Modify: `apps/mobile/src/navigation/RootNavigator.tsx`
- Modify: `apps/mobile/package.json`

- [ ] **Step 1: Write failing tests**

Add screen-level tests for AI advice rendering and QR payment request flow.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test --workspace @mtb/mobile -- --runInBand AIScreen QRScreen`
Expected: FAIL because routes/screens do not exist.

- [ ] **Step 3: Write minimal implementation**

Implement local AI-analysis screen and mockable QR payment flow that does not require hardware camera for tests.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace @mtb/mobile -- --runInBand AIScreen QRScreen`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/ai apps/mobile/src/features/qr apps/mobile/src/navigation/RootNavigator.tsx apps/mobile/package.json
git commit -m "feat: add ai and qr screens"
```

### Task 5: Final verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update docs**

Document the new flows and contract generation path from `apps/api`.

- [ ] **Step 2: Run backend verification**

Run: `python -m pytest apps/api/tests -v`
Expected: PASS

- [ ] **Step 3: Run mobile verification**

Run: `npm run test --workspace @mtb/mobile -- --runInBand`
Expected: PASS

- [ ] **Step 4: Run contracts verification**

Run: `npm run contracts:generate`
Expected: exit code `0`

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: describe aligned mobile and api flows"
```
