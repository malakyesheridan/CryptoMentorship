# Learning Hub Wizard Audit (Member Experience)

Date: 2026-01-23  
Scope: Member-only experience (excludes admin upload flows)

## A) Learning Hub routes and entry points

Primary routes
- **Main Learning Hub dashboard**: `/learning`  
  `app/(app)/learning/page.tsx`
- **Learning Paths (tracks list)**: `/learn`  
  `app/(app)/learn/page.tsx`
- **Track detail**: `/learn/[trackSlug]`  
  `app/(app)/learn/[trackSlug]/page.tsx`
- **Lesson player**: `/learn/[trackSlug]/lesson/[lessonSlug]`  
  `app/(app)/learn/[trackSlug]/lesson/[lessonSlug]/page.tsx`
- **Cohort schedule**: `/learn/[trackSlug]/cohort/[cohortSlug]`  
  `app/(app)/learn/[trackSlug]/cohort/[cohortSlug]/page.tsx`
- **Certificate verification**: `/learn/cert/[code]`  
  `app/(app)/learn/cert/[code]/page.tsx`

Entry points (member-facing)
- Sidebar: "Learning Hub" link -> `/learning`  
  `src/components/layout/Sidebar.tsx`
- Dashboard stats widgets link to `/learn` and `/learning`  
  `src/components/learning/DashboardStats.tsx`  
  `src/components/learning/EnhancedStats.tsx`
- "Back to Learning Hub" buttons on `/learn` and `/learn/[trackSlug]`  
  `app/(app)/learn/page.tsx`  
  `app/(app)/learn/[trackSlug]/page.tsx`
- Progress timeline CTA "Browse Courses" -> `/learn`  
  `src/components/learning/ProgressTimeline.tsx`
- Not-found page link -> `/learning`  
  `app/(app)/not-found.tsx`

Deep links / related routes
- Track lesson links inside track and cohort pages -> `/learn/[trackSlug]/lesson/[lessonSlug]`
- Certificate links in timeline -> `/learn/cert/[code]`
- Routes helper references `/api/learn/tracks` but it is not implemented in `app/api`  
  `src/lib/routes.ts`

## B) Member UI inventory (wizard targets)

### 1) `/learning` (Learning Hub dashboard)
Files:
- `app/(app)/learning/page.tsx`
- `src/components/learning/LearningHubContent.tsx`
- `src/components/learning/LearningHubTabs.tsx`
- `src/components/learning/ContentGrid.tsx`
- `src/components/learning/ProgressTimeline.tsx`
- `src/components/learning/RealTimeProgress.tsx`
- `src/components/learning/LearningAnalytics.tsx`

Key UI elements (suggested stable targets)
- Hero title "Learning Hub" (heading)
- Tabs: "Discover", "Progress"  
  Suggest `data-tour="learning-tabs"`
- Search input (Discover tab)  
  Suggest `data-tour="learning-search"`
- Track cards grid (Discover tab)  
  Suggest `data-tour="learning-track-grid"` and `data-tour="learning-track-card"`
- Track card primary CTA button ("Start Learning" / "Continue Learning" / "Watch Again")  
  Suggest `data-tour="learning-track-cta"`
- Progress tab: "Learning Timeline" card  
  Suggest `data-tour="learning-timeline"`
- Progress tab: "Learning Analytics" section  
  Suggest `data-tour="learning-analytics"`

State dependencies
- **Streak banner** shows only if `streak > 0`.  
  `LearningHubContent`
- **Discover tab** content filtered by `searchQuery`.
- **Empty state** if no tracks found (shows BookOpen icon + text).
- **Progress tab** always renders timeline + analytics, but timeline has its own empty state if no milestones.
- **RealTimeProgress** on `/learning` is passed no `trackId`, so it exits early and shows nothing (not a visible UI target).

Tier gating behavior
- **Tracks**: no gating or min-tier enforcement in UI. All published tracks are shown to any logged-in member.
- **Resources**: data is fetched but not rendered in current UI (no resource list in `LearningHubContent`).

Analytics hooks
- `LearningAnalytics` fetches `/api/learning/analytics`
- Timeline data comes from server-rendered `progress`, `enrollments`, `certificates`

Notes
- `LearningHubContent` includes admin-only upload and track edit modals; hidden for members.
- Unused components (not currently rendered on `/learning`): `CourseCarousel`, `CourseSearch`, `CourseRecommendations`, `StreakWidget`, `SmartNotifications`, `DashboardStats`.

### 2) `/learn` (Learning Paths list)
Files:
- `app/(app)/learn/page.tsx`

Key UI elements (targets)
- "Back to Learning Hub" button (top-left)
- Stats cards (Available Tracks, Tracks Started, Total Lessons)
- Track cards with cover image, title, summary
- Progress bar (only if user has progress)
- Primary CTA: "Start Track", "Continue", "Watch Again"

State dependencies
- Empty state if no published tracks.
- Progress bar only if progress exists for a track.

Tier gating behavior
- None in UI; all published tracks appear.

Analytics hooks
- None (server-rendered Prisma queries only).

### 3) `/learn/[trackSlug]` (Track detail)
Files:
- `app/(app)/learn/[trackSlug]/page.tsx`

Key UI elements (targets)
- "Back to Learning Hub" button
- Track cover image
- Track title + summary
- Progress bar + "X of Y lessons completed" (only if enrolled)
- Primary CTA: "Start Track", "Continue Learning", "Watch Again"
- Track PDFs list (if `track.pdfResources` present)
- Lessons list
  - Lesson row with icon (Play/Completed), title
  - Badges: "Completed", "Quiz"
  - Action button: "Watch" / "Review"

State dependencies
- Redirects to `/learn` if track not found or not published.
- Progress bar only for enrolled users.
- "Continue Learning" targets next incomplete lesson.
- Lessons list split into sectioned and "Other Lessons" if needed.

Tier gating behavior
- No min-tier enforcement in UI.

Analytics hooks
- None.

### 4) `/learn/[trackSlug]/lesson/[lessonSlug]` (Lesson player)
Files:
- `app/(app)/learn/[trackSlug]/lesson/[lessonSlug]/page.tsx`
- `src/components/learning/LessonPlayer.tsx`
- `src/components/VideoPlayer.tsx`
- `src/components/learning/QuizComponent.tsx`
- `src/components/learning/LessonMDXRenderer.tsx`
- `src/components/ViewTracker.tsx`

Key UI elements (targets)
- Sidebar lesson list (current, completed states)
  - Suggest `data-tour="lesson-sidebar"`
- Video player (iframe or custom player)
  - `data-video-player` already present (good target)
- Lesson description (MDX)
- Lesson PDFs list
- Quiz section (if present)
- "Mark Complete" button (only if allowed)
- Navigation buttons: "Previous Lesson", "Next Lesson", "Complete Track"

State dependencies
- Auto-enrolls user in track on visit (upsert).
- Locked view if `accessInfo.isLocked` is true (currently only if lesson not published).
- Quiz gating: "Mark Complete" disabled unless quiz passed.
- Completed state shows "Completed" badge and alters navigation.

Tier gating behavior
- `checkLessonAccess` currently only checks published status; no cohort/tier gating.
- Locked UI exists but is not triggered for published lessons.

Analytics hooks
- `ViewTracker` records lesson view via `recordView`.
- `completeLesson` server action updates `LessonProgress` + `Enrollment.progressPct`.

### 5) `/learn/[trackSlug]/cohort/[cohortSlug]` (Cohort schedule)
Files:
- `app/(app)/learn/[trackSlug]/cohort/[cohortSlug]/page.tsx`

Key UI elements (targets)
- "Back to Track" button
- Cohort title + status badge (Active/Upcoming/Past)
- Stats cards (Total Lessons, Available, Members)
- Progress bar (only if enrolled)
- Join/Leave Cohort button
- Lessons list with "Start Lesson" CTA and release date

State dependencies
- Redirect to `/learn` if cohort not found.
- Join/Leave toggles based on enrollment.
- "Available Lessons" includes published lessons only.

Tier gating behavior
- None; cohort membership is the gating mechanism.

Analytics hooks
- None.

### 6) `/learn/cert/[code]` (Certificate)
Files:
- `app/(app)/learn/cert/[code]/page.tsx`
- `src/components/CertificateActions.tsx`

Key UI elements (targets)
- Certificate title, name, track title, issued date
- "Back to Learning" link
- Certificate actions (share/download)
- Verification card

State dependencies
- Redirects to `/learn` if certificate not found.

Tier gating behavior
- None (public verification).

Analytics hooks
- None.

## C) Data model and APIs

Member-facing APIs
- `GET /api/learning/analytics`  
  `app/api/learning/analytics/route.ts`
- `GET /api/learning/track-progress?trackId=...`  
  `app/api/learning/track-progress/route.ts`
- `GET /api/learning/events` (SSE)  
  `app/api/learning/events/route.ts`  
  Note: SSE hook exists but not used in UI.

Server-side data (no API)
- `/learning`, `/learn`, `/learn/[trackSlug]`, `/lesson/...` query Prisma directly in server components.

Lesson representation (Prisma)
- `Lesson`: `id`, `slug`, `title`, `durationMin`, `videoUrl`, `contentMDX`, `pdfResources`, `quizId`, `publishedAt`, `order`, `sectionId`
- `Track`: `id`, `slug`, `title`, `summary`, `coverUrl`, `minTier`, `publishedAt`, `order`, `pdfResources`
- `TrackSection`: `title`, `summary`, `order`
- `Quiz`: `questions`, `passPct`
  `prisma/schema.prisma`

Progress tracking
- `LessonProgress`: `completedAt`, `timeSpentMs`
- `Enrollment`: `progressPct`, `startedAt`, `completedAt`
- `completeLesson` updates `LessonProgress` and recalculates track progress  
  `src/lib/actions/learning.ts`

Bookmarks / favorites
- General bookmark system for `content` and `episode` only.  
  `app/api/me/bookmarks/route.ts`, `src/hooks/usePersonalization`  
  Not used in Learning Hub pages; no lesson bookmarking.

Continue / resume
- "Continue" uses enrollment progress only, not last watched lesson.  
  `/learn` -> track page -> first incomplete lesson.
- No persistence of video playback position; `VideoPlayer` has no DB storage.
- `/api/me/continue` does not include lessons (content/episodes only).

Paths / tracks
- Tracks are the core learning "paths". There is no explicit "Beginner/Intermediate/Advanced" taxonomy in the UI.

## D) Member journey map

1) First entry (from sidebar -> `/learning`)
- Hero + summary metrics.
- Discover tab selected by default.
- Search input + grid of learning tracks.

2) Finding content
- Search on `/learning` filters track cards by title/description.
- `/learn` provides a grid of all published tracks, with progress indicators.

3) Starting a lesson
- Click "Start Track" on `/learn` or `/learning`.
- Track page shows lessons list and "Start Track" button (enrolls).
- First incomplete lesson is suggested via "Continue Learning".

4) Completing a lesson
- Lesson page shows video/MDX/PDFs and quiz if present.
- If quiz required, must pass before "Mark Complete" appears.
- "Mark Complete" updates progress and routes to next lesson or back to track.

5) Returning to continue
- `/learn` and `/learning` show progress badges and "Continue" CTAs (track-level).
- Track page auto-selects next incomplete lesson.
- No "resume exact timestamp" or "last watched lesson" persistence.

6) Locked content
- Locked lesson UI exists, but `checkLessonAccess` currently only locks unpublished lessons.
- Track min-tier is stored but not enforced in member UI.

## E) Wizard feasibility notes

Most valuable wizard steps (proposed)
1) Learning Hub tabs (`Discover` vs `Progress`)
2) Search input for tracks
3) Track card and CTA ("Start/Continue Learning")
4) Track page progress bar + "Continue Learning"
5) Lesson list + quiz badge
6) Video player controls (play, fullscreen)
7) "Mark Complete" action
8) "Next Lesson" navigation
9) Progress Timeline milestones (Progress tab)
10) Learning Analytics timeframe selector

Missing data for smarter wizard
- `lastWatchedLessonId` per user (not tracked).
- Video playback position/time spent per lesson (not recorded).
- Track-level gating per membership tier is not enforced in UI.
- SSE real-time achievements exist but no UI consumption.

Recommended wizard state storage
- **Primary**: `User.preferences` (string JSON) in Prisma for cross-device persistence.
- **Secondary**: localStorage for quick "don't show again" toggles.
- Reason: wizard should not re-run on every device/session; server-side storage enables consistent UX.

## F) High-level implementation plan

Library/pattern
- Use a lightweight in-house tour built on Radix UI Popover (already in design system), or
- `react-joyride` for a quick, standardized stepper.

Stable targeting strategy
- Add `data-tour="..."` attributes to key elements.
- Avoid brittle class-name selectors and text-based selectors.

Trigger strategy
- First visit to `/learning` (no enrollments).
- After signup if `enrollments.length === 0`.
- Manual "Help"/"Take the tour" button in `/learning` header.
- Optional: re-trigger when user opens first lesson.

## Appendix: Not currently wired UI (for awareness)
These components exist but are not rendered on `/learning` right now:
- `src/components/learning/CourseCarousel.tsx`
- `src/components/learning/CourseSearch.tsx`
- `src/components/learning/CourseRecommendations.tsx`
- `src/components/learning/StreakWidget.tsx`
- `src/components/learning/SmartNotifications.tsx`
- `src/components/learning/DashboardStats.tsx`

They can be ignored for the first wizard iteration unless reintroduced.

