# Database Fix Implementation Plan

**Goal:** Fix all critical and high-priority database issues systematically with zero regressions

---

## Phase 1: Critical Schema Fixes (Zero Breaking Changes)

### 1.1 Add Missing Foreign Key Cascades
**Files:** `prisma/schema.prisma`
- Add `onDelete: Cascade` to `Question.event` and `Question.user`
- Add `onDelete: Cascade` to `Vote.user` and `Vote.question`
- Add `onDelete: SetNull` to `SignalTrade.createdBy`

**Risk:** None - only affects deletion behavior, no data changes
**Test:** Verify orphaned records prevented

### 1.2 Fix SignalTrade CreatedBy Relation
**Files:** `prisma/schema.prisma`
- Ensure proper cascade behavior

---

## Phase 2: Transaction Wrapping (Atomic Operations)

### 2.1 User Registration Transaction
**Files:** `src/lib/auth-server.ts`, `app/api/auth/*`
- Wrap user + account + session creation in transaction
- Test rollback on failure

### 2.2 Content Creation Transaction
**Files:** `app/api/admin/content/route.ts`, `app/api/admin/episodes/route.ts`
- Wrap content creation + audit log in transaction
- Ensure atomicity

### 2.3 Quiz Submission Transaction
**Files:** `src/lib/actions/enrollment.ts`
- Wrap quiz submission + progress update + certificate check
- Ensure all-or-nothing

### 2.4 Enrollment Creation Transaction
**Files:** `src/lib/actions/learning.ts` or similar
- Wrap enrollment + initial progress records
- Ensure consistency

### 2.5 Signal Trade Updates Transaction
**Files:** `app/api/admin/signals/route.ts`
- Wrap trade update + cache invalidation
- Ensure atomicity

---

## Phase 3: Error Handling Improvements

### 3.1 Create Error Handler Utility
**Files:** `src/lib/errors.ts` (new)
- Distinguish error types (Prisma errors, validation, etc.)
- Return appropriate HTTP status codes
- Provide context for debugging

### 3.2 Update API Routes
**Files:** All `app/api/**/route.ts`
- Use new error handler
- Replace generic errors with specific codes
- Add proper error logging

### 3.3 Fix Silent Failures
**Files:** `app/videos/[id]/page.tsx`, other places with silent catches
- Proper error handling instead of console.error only
- User-friendly error messages

---

## Phase 4: Connection Resilience

### 4.1 Enhanced Prisma Client
**Files:** `src/lib/prisma.ts`
- Add connection pool configuration
- Add retry logic wrapper
- Add timeout configuration
- Add health check improvements

### 4.2 Error Recovery
**Files:** `src/lib/database-utils.ts` (new)
- Circuit breaker pattern
- Automatic reconnection
- Query timeout handling

---

## Phase 5: Query Optimization

### 5.1 Fix N+1 Queries
**Files:**
- `app/api/learning/analytics/route.ts` - Batch queries
- `app/(app)/dashboard/page.tsx` - Combine queries
- Other identified N+1 patterns

### 5.2 Add WHERE Clauses
**Files:** `app/api/signals/performance/route.ts`
- Filter in database instead of loading all trades
- Add proper date range filtering

### 5.3 Query Limits
**Files:** All `findMany` queries
- Ensure `take` is specified
- Add reasonable defaults

---

## Phase 6: Pagination Implementation

### 6.1 Episode Listings
**Files:** `app/(app)/macro/page.tsx`, `src/components/cryptocompass/CryptoCompassContent.tsx`
- Add cursor-based pagination
- Update UI to support pagination

### 6.2 Video Listings
**Files:** `app/videos/page.tsx`, `app/api/videos/route.ts`
- Add pagination
- Update UI

### 6.3 Notification Lists
**Files:** `app/api/notifications/route.ts`
- Add cursor-based pagination
- Update frontend

---

## Phase 7: Audit Trail Completion

### 7.1 Audit Wrapper Function
**Files:** `src/lib/audit.ts`
- Enhance `logAudit` to be transaction-safe
- Add automatic audit logging wrapper
- Support for all write operations

### 7.2 Add Missing Audit Logs
**Files:** 
- User updates
- Enrollment changes
- Quiz submissions
- Signal trade updates
- Message operations (if supported)

---

## Phase 8: Missing Indexes

### 8.1 Add Indexes
**Files:** `prisma/schema.prisma`
- `UserInterest.tag`
- `Notification.type`
- `QuizSubmission.passed`
- `VideoView.completed`
- `LessonProgress.completedAt`

---

## Implementation Order

1. **Phase 1** (Schema) - No code changes, safe
2. **Phase 8** (Indexes) - Additive, safe
3. **Phase 3** (Error Handling) - Improves without breaking
4. **Phase 4** (Connection) - Infrastructure, low risk
5. **Phase 2** (Transactions) - Most critical, test thoroughly
6. **Phase 5** (Query Optimization) - Performance, test carefully
7. **Phase 6** (Pagination) - UI changes, test thoroughly
8. **Phase 7** (Audit) - Additive, safe

---

## Testing Strategy

1. **After each phase:**
   - Run database test script
   - Test affected endpoints
   - Verify no TypeScript errors
   - Check for regressions

2. **Integration tests:**
   - User registration flow
   - Content creation flow
   - Quiz submission flow
   - Dashboard loading
   - Episode listings

3. **Edge cases:**
   - Concurrent operations
   - Database connection loss
   - Invalid input data
   - Large datasets

---

## Rollback Plan

- All changes are additive or improve existing code
- Schema changes are safe (cascades only affect deletions)
- Transaction wrapping maintains same behavior, adds safety
- Can revert any phase independently

