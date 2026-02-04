# Risk Onboarding - Audit & Implementation Notes

## Phase 0 Audit Findings (pre-implementation)

### Wizard patterns / onboarding infrastructure
- `src/components/portfolio/PortfolioWizard.tsx`: client-side tour wizard driven by localStorage; step list with selectors.
- `src/components/learning/LearningHubWizard.tsx`: client-side wizard with step list and localStorage persistence.

### Modal / bottom-sheet patterns
- `src/components/ui/dialog.tsx`: base modal dialog component; supports custom className, scrollable content, backdrop.
- Examples using Dialog: `src/components/learning/UploadModal.tsx`, `src/components/learning/TrackEditModal.tsx`, `src/components/admin/CreateTrialModal.tsx`.

### Portfolio page / daily updates rendering
- `app/(app)/portfolio/page.tsx`: server component; renders `DailySignalManager` and portfolio hero.
- `src/components/signals/DailySignalManager.tsx`: renders `DailySignalDisplay` and admin upload wrapper.
- `src/components/signals/DailySignalDisplay.tsx`: tabs for tiers/categories and renders allocation splits.
- Allocation split data: `src/lib/portfolio-assets.ts` (`buildAllocationSplits` returns Aggressive/Semi Aggressive/Conservative rows).
- Portfolio signals have `riskProfile` in schema: `prisma/schema.prisma` (PortfolioDailySignal.riskProfile).

### Admin gating patterns
- `app/admin/layout.tsx`: server-side admin/editor gate via `requireRole(['admin','editor'])`.
- API role guard utilities: `src/lib/auth-server.ts` (`requireRole`, `requireRoleAPI`, `requireAdmin`).

---

## Implementation Notes

### Data model
- New tables:
  - `user_onboarding_responses` (model: `UserOnboardingResponse`): versioned raw answers + status + timestamps.
  - `user_risk_profile` (model: `UserRiskProfile`): current snapshot with score, recommendation, drivers, override info.
- New fields on `User`:
  - `defaultRiskProfile` and `selectedRiskProfile` (optional, `RiskProfile` enum).
- Enum: `OnboardingStatus` (`NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`).

### Questions (RISK_ONBOARDING_V1)
Source: `src/lib/riskOnboarding/questions.ts`
- Q1 goal: `goal` (wealth_growth, diversification, learning_confidence, inflation_hedge, other + `goal_other_text`)
- Q2 time horizon: `time_horizon` (lt_6m, m6_12, y1_3, y3_plus)
- Q3 drawdown reaction: `drawdown_reaction` (sell_most, sell_some, hold, buy_more)
- Q4 risk statements: `risk_statements` (understand_volatility, accept_loss, hold_through_downturns, prefer_stability)
- Q5 activity level: `activity_level` (active_weekly, moderate_monthly, passive_buy_hold)
- Q6 own crypto: `own_crypto` (yes, no) + optional `holdings_text`
- Q7 confidence: `confidence_level` (beginner, intermediate, advanced) + optional `learn_more_text`
- Q8 budget range (optional): `budget_range` (lt_1k, 1k_10k, 10k_50k, 50k_plus)
- Q9 need within 12m: `need_within_12m` (yes, no)

### Scoring logic
Source: `src/lib/riskOnboarding/score.ts`
- Weights (0..100 total):
  - drawdown_reaction: 0..30
  - risk_statements: 4 * 10 = 0..40 (prefer_stability is inverse)
  - time_horizon: 0..15
  - activity_level: 0..5
  - confidence_level: 0..5
  - own_crypto: 0..5
- Base thresholds:
  - 0..39 = CONSERVATIVE
  - 40..69 = SEMI
  - 70..100 = AGGRESSIVE
- Caps:
  - sell_most -> CONSERVATIVE
  - need_within_12m yes -> CONSERVATIVE
  - hold_through_downturns disagree/strongly_disagree -> cap max SEMI
- Drivers: 2-3 strings based on time horizon, drawdown reaction, risk statements, and caps.
- Note: `RiskProfile.SEMI` is displayed as "Semi-aggressive" in UI.

### API routes
- User:
  - `GET /api/me/risk-profile` (status + snapshot; answers optional via `includeAnswers`/`includeFreeText`)
  - `POST /api/me/risk-onboarding/save`
  - `POST /api/me/risk-onboarding/complete`
  - `POST /api/me/risk-profile/set-default`
- Admin:
  - `GET /api/admin/risk-profiles`
  - `GET /api/admin/risk-profiles/[userId]`
  - `POST /api/admin/risk-profiles/[userId]/override`

### UI behavior
- Modal wizard: `src/components/risk-onboarding/RiskOnboardingModal.tsx`
  - 1 question per step, progress bar, back/next, autosave on change, resume from saved answers.
  - Desktop: centered modal, max width 640px.
  - Mobile: full screen modal with sticky header/footer.
- Portfolio gate and banner: `src/components/risk-onboarding/RiskOnboardingGate.tsx`
  - Auto-opens once for incomplete users (localStorage).
  - Banner CTA when incomplete.
  - Header card with recommended profile + drivers when completed.
- Portfolio highlighting: `src/components/signals/DailySignalDisplay.tsx`
  - Recommended profile badge on allocation split.
  - Auto-selects effective profile (default -> override -> recommended).

### Admin UI
- List: `app/admin/risk-profiles/page.tsx`
- Detail: `app/admin/risk-profiles/[userId]/page.tsx` + override form.

### Verification
1) Apply Prisma migration and generate client.
2) Run unit checks: `npm run test:risk-profile`
3) Run smoke: `npx tsx scripts/risk-profile-smoke.ts`
4) Visit `/portfolio` and complete the wizard.
5) Verify highlight + header on `/portfolio`.
6) Verify admin list and detail pages.

