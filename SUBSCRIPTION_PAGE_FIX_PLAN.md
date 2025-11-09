# Plan: Fix Subscription Page Layout to Match Reference Screenshot

## Issues Identified

1. **Price Display Clipping**: Prices showing "$1,20" instead of "$1,200" - CSS clipping on right side
2. **Card Content Cut Off**: Cards truncated at bottom, features and buttons not fully visible
3. **Text Truncation**: Feature text cut off ("All Found Feature" instead of "All Foundation Features")
4. **Layout Constraints**: Cards appear cramped despite spacing increases

## Root Causes

1. **CSS Overflow**: Price container or parent has `overflow-hidden` or width constraints
2. **Card Height**: `min-h-[600px]` may be insufficient or conflicting with flex layout
3. **Text Overflow**: Feature text needs proper wrapping, no `overflow-hidden` or `text-overflow: ellipsis`
4. **Container Width**: Price/feature containers may be too narrow

## Implementation Plan

### Phase 1: Fix Price Display Clipping

**File**: `app/(auth)/subscribe/page.tsx`

**Changes**:
1. Remove any width constraints on price container
2. Add explicit `overflow-visible` to price display div
3. Ensure price text has `whitespace-nowrap` or proper wrapping
4. Add `min-w-fit` or `w-full` to price container to prevent clipping
5. Check parent containers for `overflow-hidden` that might clip prices

**Specific fixes**:
- Price container: Add `overflow-visible`, `min-w-fit`, ensure no `max-w` constraints
- Price text: Ensure `text-5xl` doesn't cause clipping, add `break-words` if needed
- Parent containers: Check Card and CardContent for overflow issues

### Phase 2: Fix Card Content Cut Off

**File**: `app/(auth)/subscribe/page.tsx`

**Changes**:
1. Remove or adjust `min-h-[600px]` - replace with `h-auto` or remove entirely
2. Ensure Card has `overflow-visible` (already set, verify)
3. Ensure CardContent has proper flex layout with `flex-1` and `min-h-0`
4. Add proper spacing between sections to prevent cramping
5. Ensure button container has `mt-auto` to push to bottom without cutting off

**Specific fixes**:
- Card: Remove `min-h-[600px]`, keep `flex flex-col`, ensure `overflow-visible`
- CardContent: Keep `flex flex-col flex-1`, add `min-h-0` to prevent flex shrinking issues
- Features list: Ensure `flex-1` allows proper growth, add `min-h-0`
- Button: Keep `mt-auto` but ensure parent allows it to be visible

### Phase 3: Fix Text Truncation in Features

**File**: `app/(auth)/subscribe/page.tsx`

**Changes**:
1. Remove any `line-clamp` utilities from feature text
2. Ensure feature text has `overflow-visible` and `whitespace-normal`
3. Add proper `word-break` or `break-words` if needed
4. Ensure feature list item container has proper width
5. Check for any `text-overflow: ellipsis` CSS

**Specific fixes**:
- Feature `<li>`: Ensure `flex items-start gap-4` with proper width
- Feature text `<span>`: Add `overflow-visible`, `whitespace-normal`, `break-words`
- Remove any `truncate`, `line-clamp`, or `overflow-hidden` classes

### Phase 4: Improve Layout Spacing and Structure

**File**: `app/(auth)/subscribe/page.tsx`

**Changes**:
1. Adjust spacing to match reference screenshot proportions
2. Ensure cards have equal height with proper flex distribution
3. Verify gap between cards is appropriate (`gap-10` should be fine)
4. Ensure all content sections have proper margins
5. Verify button spacing and visibility

**Specific fixes**:
- Grid container: Keep `gap-10`, verify `max-w-7xl` is appropriate
- Card spacing: Verify `p-10` padding is sufficient
- Section spacing: Ensure `mb-8`, `mb-10` values are appropriate
- Button: Ensure visible with proper `py-7` padding

### Phase 5: Verify Card Component

**File**: `src/components/ui/card.tsx`

**Changes**:
1. Ensure Card component doesn't have default `overflow-hidden`
2. Verify CardContent doesn't have overflow constraints
3. Check for any global CSS affecting cards

**Specific fixes**:
- Card: Verify no `overflow-hidden` in base styles
- CardContent: Verify no overflow constraints

### Phase 6: Test and Verify

**Testing Checklist**:
1. ✅ Prices display fully without clipping ("$1,200" not "$1,20")
2. ✅ All card content visible (all features, button fully visible)
3. ✅ Feature text displays completely (no truncation)
4. ✅ Cards have proper spacing and don't appear cramped
5. ✅ Layout matches reference screenshot proportions
6. ✅ Responsive behavior works on different screen sizes

## Implementation Order

1. **First**: Fix price clipping (Phase 1) - Most critical visual issue
2. **Second**: Fix card cut-off (Phase 2) - Critical for usability
3. **Third**: Fix text truncation (Phase 3) - Important for readability
4. **Fourth**: Adjust spacing (Phase 4) - Polish and refinement
5. **Fifth**: Verify components (Phase 5) - Ensure no conflicts
6. **Finally**: Test all fixes (Phase 6) - Validation

## Expected Outcome

After implementation:
- Prices display correctly: "$700", "$1,200", "$2,000" (no clipping)
- All card content fully visible (no cut-off at bottom)
- All feature text displays completely (no truncation)
- Layout matches reference screenshot with proper spacing
- Clean, professional appearance matching the design

