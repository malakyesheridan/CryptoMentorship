# Crypto Portal - Premium Cryptocurrency Research Platform

A comprehensive cryptocurrency research and analysis platform built with Next.js, featuring role-based access control, content management, live sessions & events, community features, and a complete admin CMS.

## 🚀 Features

### Core Platform
- **Authentication**: Google OAuth, Email, and Credentials providers with JWT sessions
- **Role-Based Access**: Guest, Member, Editor, Admin roles with tiered content access
- **Content Management**: Research articles, Crypto Compass episodes, Trading signals, Resources
- **Community**: Real-time chat with channels, message management, and rate limiting
- **Admin Panel**: Complete CMS for content, episodes, users, and audit management
- **Responsive Design**: Mobile-first design with unified design system

### Live Sessions & Events 🎯
- **Event Management**: Create, schedule, and manage live sessions and events
- **RSVP System**: Capacity-aware RSVP with Going/Interested/Decline options
- **Calendar Integration**: ICS export for individual events and public calendar feed
- **Time Zone Support**: Full timezone handling for global events
- **Live Features**: Real-time join buttons, check-in functionality
- **Post-Event Resources**: Recording links and downloadable resources
- **Smart Notifications**: 24h and 60m reminder notifications
- **Admin Tools**: Attendee management, CSV export, capacity tracking
- **Q&A System**: Pre-submit questions, upvoting, admin moderation and answers
- **Replay Experience**: Video player with chapters and searchable transcripts
- **Deep Linking**: Click-to-seek functionality with URL time parameters

### Member Experience 🌟
- **Personalization**: Bookmarks, follow tags, continue reading, customized feeds
- **Notifications**: In-app notification system with preferences
- **Dashboard**: Personalized sections based on viewing history and interests
- **Saved Content**: Dedicated page for bookmarked research and episodes
- **Tag Following**: Follow specific topics and get relevant content
- **View Tracking**: Privacy-respecting view event tracking

### Content Features
- **MDX Support**: Rich content with markdown and custom components
- **Search & Filters**: Advanced filtering by tags, content type, and search terms
- **Content Gating**: Tiered access control with preview functionality
- **File Uploads**: Local development storage with cloud-ready architecture
- **SEO Optimized**: Meta tags, breadcrumbs, and structured content

### Signals Performance & Model Portfolio 📊
- **Trade Management**: Complete lifecycle from entry to exit with detailed analysis
- **Performance Analytics**: Real-time KPIs including total return, max drawdown, win rate, profit factor
- **Risk Management**: R-multiple calculations, position sizing, and risk percentage tracking
- **Visual Analytics**: Equity curves, drawdown charts, monthly returns heatmap, R-multiple distribution
- **Trade Ledger**: Open positions and closed trades with comprehensive filtering
- **CSV Import/Export**: Bulk import trades via CSV with validation, full trade data export
- **Portfolio Settings**: Configurable base capital, position models, and trading costs
- **High Precision**: Decimal arithmetic for all financial calculations to prevent rounding errors
- **Performance Caching**: Intelligent caching system for fast analytics at scale
- **Methodology Transparency**: Clear documentation of calculation methods and assumptions
- **Admin Tools**: Signal creation, editing, and closing with notification system

### Learning Paths (Tracks) 🎓
- **Structured Learning**: Organized tracks with sections and lessons for progressive skill building
- **Interactive Lessons**: MDX-powered content with video support and rich formatting
- **Progress Tracking**: Real-time progress tracking with completion percentages and streaks
- **Quiz System**: Built-in quizzes with multiple choice questions and pass/fail logic
- **Certificates**: Shareable certificates with verification codes upon track completion
- **Admin Management**: Complete CRUD interface for creating and managing educational content
- **Tier-Based Access**: Role-based access control for different learning tracks
- **Learning Dashboard**: Personal dashboard showing enrolled tracks, progress, and achievements
- **Cohorts & Drip Scheduling**: Time-boxed cohorts with scheduled lesson releases
- **Cohort Management**: Admin tools for creating cohorts, scheduling releases, and managing enrollments
- **Access Control**: Server-enforced lesson access based on cohort enrollment and release schedule
- **In-App Notifications**: Automatic notifications for lesson releases and cohort updates

### Admin Features
- **Content CRUD**: Full content lifecycle management
- **Episode Management**: Video episodes with notes and metadata
- **Event Management**: Complete event lifecycle with RSVP tracking
- **User Management**: Role assignment and membership management
- **Audit Logging**: Complete activity tracking
- **Data Export/Import**: Backup and restore functionality

## 📊 Signals CSV Import

The platform supports bulk import of trading signals via CSV files:

### CSV Format
Download the template from `/admin/signals/import` or use this format:

```csv
symbol,direction,entryTime,entryPrice,stopLoss,takeProfit,exitTime,exitPrice,conviction,riskPct,tags,notes
BTC,LONG,2024-01-15T10:30:00Z,42000.50,40000.00,45000.00,2024-01-20T14:45:00Z,44800.25,4,2.5,"[""crypto"", ""btc""]","Strong breakout above resistance"
ETH,SHORT,2024-01-18T09:15:00Z,2650.75,2700.00,2500.00,,,,3,1.8,"[""crypto"", ""eth""]","Bearish divergence on daily chart"
```

### Required Fields
- `symbol`: Trading symbol (e.g., BTC, ETH)
- `direction`: LONG or SHORT
- `entryTime`: ISO 8601 timestamp
- `entryPrice`: Decimal price value
- `conviction`: Integer 1-5
- `riskPct`: Risk percentage as decimal

### Optional Fields
- `stopLoss`, `takeProfit`: Decimal price values
- `exitTime`, `exitPrice`: For closed trades
- `tags`: JSON array string
- `notes`: Free text notes

### Import Process
1. Navigate to `/admin/signals/import`
2. Upload CSV file
3. Review column mapping (if needed)
4. Preview data validation
5. Confirm import

The system validates all data, checks for duplicates, and provides detailed error reporting.

## 🎓 Learning Paths System

The platform includes a comprehensive learning management system for structured education:

### For Members
- **Browse Tracks**: View available learning tracks with progress indicators
- **Enroll & Learn**: Enroll in tracks and progress through lessons at your own pace
- **Take Quizzes**: Complete quizzes to test your knowledge and unlock lesson completion
- **Track Progress**: Monitor your learning progress with detailed analytics
- **Earn Certificates**: Receive shareable certificates upon track completion
- **Learning Dashboard**: Personal dashboard showing all your learning activities
- **Join Cohorts**: Enroll in time-boxed cohorts with structured lesson releases
- **Cohort Dashboard**: View cohort schedule, progress, and upcoming releases
- **Access Control**: Lessons unlock automatically based on cohort schedule

### For Admins
- **Create Tracks**: Design structured learning paths with sections and lessons
- **Manage Content**: Create rich MDX lessons with video, resources, and quizzes
- **Quiz Builder**: Build interactive quizzes with multiple choice questions
- **Track Analytics**: Monitor student progress and engagement
- **Certificate Management**: Issue and verify completion certificates
- **Cohort Management**: Create and manage time-boxed learning cohorts
- **Schedule Builder**: Set up lesson release schedules with timezone support
- **Enrollment Management**: Add/remove users from cohorts and assign roles

### Key Features
- **MDX Support**: Rich content with markdown and custom components
- **Video Integration**: Support for YouTube, Vimeo, and HTML5 video
- **Progress Tracking**: Real-time progress updates and completion tracking
- **Quiz System**: Configurable quizzes with pass/fail logic
- **Certificates**: Blockchain-style verification with unique codes
- **Tier-Based Access**: Control access based on user membership level
- **Cohort Scheduling**: Time-boxed cohorts with drip-fed lesson releases
- **Timezone Support**: Full timezone awareness for global cohorts
- **Access Control**: Server-enforced lesson access based on enrollment and schedule
- **Notifications**: In-app notifications for releases and cohort updates

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: SQLite (dev) / PostgreSQL (prod) with Prisma ORM
- **Authentication**: NextAuth.js with JWT strategy
- **Styling**: Tailwind CSS with custom design tokens

## 🗄 Database Migrations

### Development
```bash
# Create new migration
npx prisma migrate dev --name your_migration_name

# Apply pending migrations
npx prisma migrate dev
```

### Production
```bash
# Apply migrations (non-interactive)
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

**Important**: Never use `npx prisma db push` in production. Always use proper migrations for schema changes.

## 🎓 Cohort System Setup

### Creating Cohorts
1. **Admin Access**: Navigate to `/admin/learn/cohorts`
2. **Create Cohort**: Set title, slug, start date, timezone, and visibility
3. **Schedule Lessons**: Use the schedule builder to set lesson release times
4. **Manage Enrollments**: Add users and assign roles (member/coach)

### Testing Cohorts
```bash
# Fast-forward time for testing (development only)
curl "http://localhost:3000/api/cron/dev/fast-forward?minutes=10080" # 1 week

# Check cohort releases (dry run)
curl "http://localhost:3000/api/cron/cohort-releases?dryRun=true"

# Process actual releases
curl "http://localhost:3000/api/cron/cohort-releases"
```

### Production Cron Setup
For Vercel deployment, add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/cohort-releases",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### Cohort Features
- **Self-Paced Tracks**: Work independently without cohort constraints
- **Cohort Tracks**: Time-boxed learning with scheduled releases
- **Access Control**: Server-enforced lesson access based on enrollment
- **Progress Tracking**: Cohort-specific progress counting only released lessons
- **Notifications**: Automatic in-app notifications for lesson releases
- **Timezone Support**: Full timezone awareness for global cohorts
- **UI Components**: Radix UI primitives with shadcn/ui
- **Content**: MDX with next-mdx-remote
- **Icons**: Lucide React
- **Forms**: React Hook Form with Zod validation
- **Testing**: Playwright for E2E testing

## 🚀 Quick Start

### 1. Installation
```bash
git clone <repository-url>
cd crypto-portal
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

**Required Environment Variables:**
```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Optional: Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 3. Database Setup
```bash
npm run db:setup
```

### 4. Start Development Server
```bash
npm run dev
```

The server will automatically find an available port (5000 → 5001 → 3000).

### 5. Access the Application
- **Frontend**: http://localhost:3000 (or detected port)
- **Admin Panel**: http://localhost:3000/admin

## 👥 Client Guide

### Demo Accounts
The seeded database includes demo accounts:
- **Admin**: demo-admin@example.com (full access)
- **Editor**: demo-editor@example.com (content management)
- **Member**: demo-member@example.com (T2 membership)

### Content Management

#### Creating Content
1. Navigate to `/admin/content/new`
2. Fill in title, slug, content type, and excerpt
3. Upload cover image using the file upload component
4. Write content in MDX format with live preview
5. Set access controls (locked/unlocked, minimum tier)
6. Add tags for better organization
7. Publish when ready

#### Managing Episodes
1. Navigate to `/admin/episodes/new`
2. Add title, video URL (YouTube/Vimeo embed)
3. Upload thumbnail image
4. Add episode notes in MDX format
5. Set access controls
6. Publish episode

#### User Management
1. Navigate to `/admin/users`
2. View all users and their roles
3. Promote/demote users (admin only)
4. Monitor user activity

### 🎯 Live Sessions & Events

#### Managing Events
1. Navigate to `/admin/events/new`
2. Fill in event details:
   - **Title & Slug**: Auto-generated from title
   - **Date & Time**: Set start/end with timezone support
   - **Location**: Online (with join URL) or In Person (with address)
   - **Capacity**: Set attendance limit (optional)
   - **Visibility**: Public, Members Only, or Admin Only
3. Add post-event resources:
   - **Recording URL**: Link to replay video
   - **Resources**: Additional materials (reports, guides, etc.)
4. Publish event

#### RSVP Management
1. Navigate to `/admin/events/[id]/attendees`
2. View attendees by status (Going/Interested/Declined)
3. Export attendee list as CSV
4. Check-in attendees during live events
5. Monitor capacity usage

#### Calendar Integration
- **Public Feed**: `/events/calendar.ics` - ICS calendar feed
- **Individual Events**: `/api/events/[slug]/ics` - Single event download
- **Timezone Support**: Events display in user's local timezone

#### Smart Notifications
Events automatically trigger notifications:
- **Creation**: Announces new events to eligible members
- **24h Reminder**: Notifies RSVP'd users 24 hours before
- **60m Reminder**: Sends join links to "Going" users 60 minutes before
- **Recording Available**: Announces when replay is published

#### Q&A Management
1. Navigate to `/admin/events/[id]/questions`
2. View all questions with vote counts and status
3. Answer questions using the modal interface
4. Archive inappropriate or duplicate questions
5. Export Q&A data as CSV for analysis
6. Bulk operations for question management

#### Replay & Transcript Management
1. Navigate to `/admin/events/[id]/replay`
2. **Chapters**: Add/edit/delete chapter markers with timestamps
3. **Transcript Upload**: Upload VTT/SRT files or paste plain text
4. **Preview**: Test transcript search and click-to-seek functionality
5. **Player Integration**: Ensure chapters and transcripts sync with video

#### Testing Events
```bash
# Trigger reminder notifications (for testing)
curl -X GET "http://localhost:3000/api/cron/event-reminders" \
  -H "Authorization: Bearer your-cron-secret"
```

### 📊 Signals Performance & Model Portfolio

#### Managing Trading Signals
1. Navigate to `/admin/signals`
2. View all signals with performance metrics:
   - **Total Signals**: Count of all trades
   - **Open Positions**: Currently active trades
   - **Closed Trades**: Completed trades
   - **Win Rate**: Percentage of profitable trades

#### Creating New Signals
1. Navigate to `/admin/signals/new`
2. Fill in trade details:
   - **Symbol**: Trading pair (BTC, ETH, SOL, etc.)
   - **Direction**: Long or Short position
   - **Entry Details**: Price, time, stop loss, take profit
   - **Risk Management**: Risk percentage and conviction level
   - **Analysis**: MDX-formatted trade thesis
   - **Tags**: Categorization tags for filtering
3. Set access controls and publish signal

#### Closing Trades
1. Navigate to `/admin/signals/[id]`
2. Click "Close Trade" button
3. Enter exit details:
   - **Exit Time**: When the trade was closed
   - **Exit Price**: Final exit price
   - **Exit Notes**: Reasoning for closing the trade
4. Save changes - trade moves to closed status

#### Portfolio Settings
1. Navigate to `/admin/signals/settings`
2. Configure global parameters:
   - **Base Capital**: Starting portfolio value
   - **Position Model**: Risk percentage or fixed fraction
   - **Trading Costs**: Slippage and fees in basis points
3. Save settings to update performance calculations

#### Performance Analytics
Members can view comprehensive performance data at `/signals/performance`:
- **KPIs Dashboard**: Total return, max drawdown, win rate, profit factor
- **Equity Curve**: Portfolio value over time
- **Drawdown Chart**: Risk visualization
- **R-Multiple Distribution**: Risk-adjusted returns histogram
- **Monthly Heatmap**: Returns by month and year
- **Trade Tables**: Detailed trade history with filtering

#### Data Export
1. Navigate to `/admin/signals`
2. Click "Export CSV" button
3. Choose export parameters:
   - **Date Range**: Filter by time period
   - **Status**: Open, closed, or all trades
   - **Symbols**: Specific trading pairs
4. Download comprehensive trade data

#### Key Performance Metrics
- **Total Return**: Overall portfolio performance
- **Max Drawdown**: Largest peak-to-trough decline
- **Win Rate**: Percentage of profitable trades
- **Profit Factor**: Gross profit divided by gross loss
- **Average R-Multiple**: Risk-adjusted return per trade
- **Expectancy**: Expected value per trade
- **Average Hold Time**: Typical trade duration

### File Uploads

#### Development Mode
- Files are stored in `public/uploads/`
- Automatic filename generation with UUIDs
- Image validation (10MB max, image types only)

#### Production Setup
To enable cloud storage, add these environment variables:
```env
# UploadThing
UPLOADTHING_SECRET="your-uploadthing-secret"
UPLOADTHING_APP_ID="your-uploadthing-app-id"

# Or AWS S3
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="your-aws-region"
AWS_BUCKET_NAME="your-s3-bucket"
```

### Data Management

#### Export Data
```bash
npm run export:data
# Creates backup in backups/portal-YYYYMMDD-HHMMSS.json
```

#### Import Data
```bash
npm run import:data -- ./backups/portal-20240115-143022.json
# Dry run: npm run import:data -- ./backups/file.json --dry
```

#### Make Admin
```bash
npm run make-admin -- user@example.com
```

## 🔧 Development

### Database Management
- **Generate Prisma client**: `npm run db:generate`
- **Push schema changes**: `npm run db:push`
- **Create migration**: `npm run db:migrate`
- **Deploy migrations**: `npm run db:deploy`
- **Seed database**: `npm run db:seed`
- **Reset database**: `npm run db:reset`

### 🔍 Dev Health Check

Use these commands to verify your development environment:

```bash
# Core health check
npm ci                    # Install dependencies
npm run typecheck         # Check TypeScript (expect 0 errors)
npm run lint             # Check code quality  
npm run audit:routes     # Check for route conflicts
npm run build            # Verify build works
npm run db:push          # Apply schema changes (dev only)
npm run db:seed          # Populate with demo data

# Start development
npm run dev              # Start dev server (should show no red errors)

# Test critical endpoints (when server running)
curl http://localhost:5000/                    # Homepage
curl http://localhost:5000/api/signals         # API health  
curl http://localhost:5000/learn               # Learning system
curl http://localhost:5000/admin               # Admin access
```

**Expected Results:**
- ✅ TypeScript: 0 errors
- ✅ Build: Completes successfully  
- ✅ Dev server: Starts without errors
- ✅ All endpoints: Return 200 status
- ✅ Route audit: No conflicts detected

**Troubleshooting:**
- If build fails with route conflicts: See `docs/AUDIT.md` or run `npm run audit:routes`
- If TypeScript errors: Run `npm run typecheck` for details
- If database issues: Run `npm run db:reset`
- If ESLint errors: Run `npm run lint` for details

## 🛣️ Routing Conventions

**Public Routes (use slugs):**
- `/events/[slug]` - Event detail pages
- `/learn/[trackSlug]` - Learning track pages  
- `/signals/[slug]` - Signal detail pages
- `/content/[slug]` - Content pages

**Admin Routes (use IDs with static /admin/ prefix):**
- `/admin/events/[eventId]` - Admin event management
- `/admin/learn/tracks/[trackId]` - Admin track management
- `/admin/signals/[signalId]` - Admin signal management

**Route Guardrails:**
- Route conflicts are automatically detected and fail the build
- Admin paths are excluded from sitemap and SEO
- Admin routes require authentication and admin role

### 🔧 Typed Route Helpers

Use `src/lib/routes.ts` for consistent URL generation:

```typescript
import { routes } from '@/lib/routes'

// Public routes
routes.public.events.detail('my-event') // → /events/my-event
routes.public.learn.track.detail('crypto-basics') // → /learn/crypto-basics

// Admin routes  
routes.admin.events.detail('evt_123') // → /admin/events/evt_123
routes.admin.signals.detail('sig_456') // → /admin/signals/sig_456

// API routes
routes.api.admin.events.detail('evt_123') // → /api/admin/events/evt_123
```

### 🚨 Route Audit System

The route audit system prevents conflicts by:

1. **Scanning** all `page.tsx`, `route.ts`, `layout.tsx` files
2. **Normalizing** paths (ignoring route groups like `(app)`)
3. **Detecting** conflicts where the same path uses different dynamic segment names
4. **Failing** the build if conflicts are found

**Example conflict:**
```
❌ /events/[id] and /events/[slug] - Mixed dynamic names
✅ /events/[slug] and /admin/events/[eventId] - Different paths
```

**Commands:**
- `npm run audit:routes` - Manual audit
- `npm run build` - Includes audit (fails on conflicts)

### Port Management
The application includes automatic port fallback:
- Primary: Port 5000
- Fallback: Port 5001
- Final: Port 3000

Override with environment variable:
```env
PORT=3000
```

### Testing
- **Run tests**: `npm test`
- **Run tests with UI**: `npm run test:ui`

### Linting
```bash
npm run lint
```

## 🎨 Design System

### Design Tokens
The platform uses a unified design system with CSS custom properties:
- **Colors**: Ivory background, gold accents, semantic colors
- **Typography**: Playfair Display (headings), Inter (body)
- **Spacing**: Consistent padding and margins
- **Components**: Reusable card, button, and badge styles

### Custom Components
- **Cards**: `.card` class with backdrop blur and subtle shadows
- **Buttons**: `.btn-gold` with gradient and hover effects
- **Badges**: `.badge-preview` and `.badge-locked` variants
- **Headings**: `.heading-two-tone` for split-color headings

## 📁 Project Structure

```
├── app/                    # Next.js App Router
│   ├── (app)/             # Protected routes
│   │   ├── signals/       # Signals performance pages
│   │   └── admin/         # Admin panel
│   │       └── signals/   # Signals management
│   ├── api/               # API routes
│   │   ├── admin/signals/ # Signals CRUD APIs
│   │   └── signals/       # Member-facing signals APIs
│   └── globals.css        # Global styles
├── src/
│   ├── components/        # React components
│   │   └── signals/       # Signals-specific components
│   ├── lib/              # Utilities and configurations
│   │   ├── perf/         # Performance calculation library
│   │   └── actions/       # Server actions
│   └── styles/           # Design system and tokens
├── prisma/
│   ├── schema.prisma     # Database schema
│   ├── seeds/            # Database seeding
│   │   └── signals.ts    # Signals sample data
│   └── seed.ts          # Main seeding script
├── scripts/              # Utility scripts
└── public/
    └── uploads/          # Local file uploads
```

## 🚀 Deploy to Vercel

For detailed deployment instructions, see [DEPLOYMENT.md](docs/DEPLOYMENT.md).

### Quick Deploy
1. **Create Neon Database**: Get PostgreSQL connection string
2. **Deploy to Vercel**: Import GitHub repo, set environment variables
3. **Set Build Command**: `npm run prisma:deploy && next build`
4. **Seed Database**: Run migrations and seed data

### Environment Variables for Production
```env
DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"
NEXTAUTH_SECRET="your-production-secret"
NEXTAUTH_URL="https://your-domain.com"
NEXT_PUBLIC_DEMO_AUTH=false
```

### Other Platforms
The application works on any Node.js hosting platform:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🔒 Security Features

- **Rate Limiting**: Message posting limited to 10 per minute per user
- **Input Validation**: Zod schemas for all form inputs
- **SQL Injection Protection**: Prisma ORM with parameterized queries
- **XSS Protection**: Sanitized content rendering
- **CSRF Protection**: NextAuth.js built-in protection
- **Role-Based Access**: Server-side permission checks

## 📊 Analytics & Monitoring

### Built-in Features
- **Audit Logging**: All admin actions tracked
- **Error Boundaries**: Graceful error handling
- **Performance**: Optimized images and code splitting

### Recommended Additions
- **Analytics**: Google Analytics or Mixpanel
- **Error Tracking**: Sentry or LogRocket
- **Uptime Monitoring**: UptimeRobot or Pingdom
- **Performance**: Vercel Analytics or Web Vitals

## 🆘 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
npm run fix:env
# Or manually set PORT environment variable
```

#### Prisma Issues
```bash
npm run fix:prisma
npm run clean:prisma
npm run db:setup
```

#### Database Locked (Windows)
```bash
npm run clean:prisma
npm run db:setup
```

### Getting Help
1. Check the console for error messages
2. Verify environment variables are set correctly
3. Ensure database is properly initialized
4. Check file permissions on uploads directory

## 📈 Future Enhancements

### Recommended Next Sprint
- **Analytics Dashboard**: User engagement and content performance
- **Email Notifications**: New content alerts and community updates
- **Advanced Search**: Full-text search with Elasticsearch
- **Mobile App**: React Native companion app
- **API Documentation**: OpenAPI/Swagger documentation
- **Billing Integration**: Stripe for subscription management

### Long-term Roadmap
- **Multi-language Support**: Internationalization
- **Advanced Analytics**: Custom dashboards and reporting
- **Integration APIs**: Third-party service connections
- **White-label Solution**: Customizable branding
- **Enterprise Features**: SSO, advanced permissions, audit trails

## 📄 License

This project is proprietary software. All rights reserved.

## 🤝 Support

For technical support or questions:
- Check this README first
- Review the code comments
- Contact the development team

---

**Crypto Portal** - Premium cryptocurrency research and analysis platform
Built with ❤️ using Next.js, Prisma, and modern web technologies.# Force deployment update
