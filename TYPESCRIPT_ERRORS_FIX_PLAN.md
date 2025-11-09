# TypeScript Errors Fix Plan

**Total Errors:** 35 across 13 files  
**Priority:** Fix systematically by category

---

## 🔍 **Error Categories**

### **Category 1: Missing Package Installation** (3 errors)
- `isomorphic-dompurify` - Import error
- `file-type` - Import error
- **Fix:** Install packages (already in package.json)

---

### **Category 2: Type Exports** (8 errors)
- `PerformanceScope` not exported from `@/lib/perf/index`
- `CachedPerformanceData` not exported from `@/lib/perf/index`
- **Files:** `signals/page.tsx`, `signals/performance/page.tsx`
- **Fix:** Add exports to `src/lib/perf/index.ts`

---

### **Category 3: Null Handling** (6 errors)
- `rMultiple` can be null but used as number
- `exitTime` is `Date | null` but expected `Date | undefined`
- **Files:** `signals/closed/page.tsx`, `api/signals/performance/route.ts`, `lib/portfolio/metrics.ts`
- **Fix:** Add null checks and convert null to undefined

---

### **Category 4: Type Assertions** (6 errors)
- `direction` is `string` but expected `"long" | "short"`
- **Files:** `api/signals/performance/route.ts`, `lib/portfolio/metrics.ts`
- **Fix:** Add type assertions or proper type casting

---

### **Category 5: Variable Scope** (4 errors)
- `file` and `title` not accessible in catch blocks
- **Files:** `api/videos/route.ts`, `api/videos-simple/route.ts`
- **Fix:** Declare variables outside try block or handle differently

---

### **Category 6: Component Props** (4 errors)
- `LearningHubContent.tsx` - contentFilter type mismatch, missing `completedAt`
- `PortfolioContent.tsx` - LucideIcon as ReactNode
- **Fix:** Fix type mismatches, add missing properties

---

### **Category 7: Auth Provider** (2 errors)
- Demo provider return type doesn't match `User` type
- `role` shorthand in logger.error
- **Fix:** Fix return type, fix logger call

---

### **Category 8: Environment & Portfolio Settings** (2 errors)
- `env.ts` - Zod error property access
- `portfolio/metrics.ts` - Missing settings properties
- **Fix:** Fix Zod error handling, add missing settings

---

## 📋 **Execution Order**

1. Install packages
2. Fix exports (Category 2)
3. Fix null handling (Category 3)
4. Fix type assertions (Category 4)
5. Fix variable scope (Category 5)
6. Fix component props (Category 6)
7. Fix auth provider (Category 7)
8. Fix env & settings (Category 8)

---

**Estimated Time:** 60-90 minutes

