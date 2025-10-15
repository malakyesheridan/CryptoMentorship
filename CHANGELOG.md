# Changelog

## [3.1.0] - 2024-12-19 - Cohorts & Drip Scheduling v1

### 🎯 Major Features Added

#### Cohort System
- **Time-Boxed Learning**: Create cohorts with scheduled lesson releases
- **Drip Scheduling**: Lessons release automatically based on cohort schedule
- **Cohort Enrollment**: Users can join cohorts with member/coach roles
- **Access Control**: Server-enforced lesson access based on enrollment and release schedule
- **Timezone Support**: Full timezone awareness (defaults to Australia/Sydney)
- **Self-Paced Compatibility**: Self-paced tracks remain unchanged and fully functional

#### Member Experience
- **Cohort Dashboard**: View cohort schedule, progress, and upcoming releases
- **Lesson Access Control**: Lessons unlock automatically based on cohort schedule
- **Progress Tracking**: Cohort-specific progress counting only released lessons
- **Release Notifications**: In-app notifications when lessons become available
- **Locked Lesson View**: Clear messaging when lessons are not yet available

#### Admin Management
- **Cohort Creation**: Create cohorts with start dates, timezones, and visibility settings
- **Schedule Builder**: Set up lesson release schedules with timezone support
- **Enrollment Management**: Add/remove users from cohorts and assign roles
- **Release Management**: Manual override of lesson release times
- **Cohort Analytics**: Monitor cohort enrollment and progress

### 🔧 Technical Implementation

#### Database Schema
- **Cohort Model**: Core cohort with metadata, timezone, and visibility
- **CohortEnrollment Model**: User enrollment in cohorts with roles
- **LessonRelease Model**: Schedule mapping lessons to release times
- **Proper Indexes**: Optimized queries for cohort and release data

#### API Endpoints
- **Cohort Management**: Full CRUD operations for cohorts
- **Enrollment Actions**: Join/leave cohort functionality
- **Release Management**: Create and manage lesson releases
- **Cron Handler**: Automated lesson release processing
- **Development Tools**: Fast-forward time for testing

#### Access Control
- **Server-Side Enforcement**: All lesson access controlled server-side
- **Cohort Logic**: Complex logic for determining lesson access
- **Self-Paced Support**: Maintains existing self-paced functionality
- **Progress Calculation**: Cohort-specific progress tracking

### 🎨 User Experience

#### Cohort Dashboard
- **Schedule Timeline**: Visual timeline of released vs locked lessons
- **Progress Tracking**: Cohort-specific progress with released lesson count
- **Release Information**: Clear indication of when lessons will be available
- **Enrollment Actions**: Easy join/leave cohort functionality

#### Lesson Access
- **Locked Lesson View**: Professional locked lesson interface
- **Release Countdown**: Shows when lesson will be available
- **Navigation**: Keyboard shortcuts work when lessons are accessible
- **Clear Messaging**: Explains why lesson is locked

#### Admin Interface
- **Cohort List**: Search and filter cohorts by status
- **Schedule Builder**: Visual interface for setting release times
- **Enrollment Management**: Easy user management for cohorts
- **Preview Mode**: Safe preview of member experience

### 🔔 Notification System

#### In-App Notifications
- **Lesson Releases**: Automatic notifications when lessons become available
- **Cohort Updates**: Notifications for cohort enrollment and updates
- **Idempotent Processing**: Prevents duplicate notifications
- **Rich Data**: Notifications include lesson and cohort information

#### Cron Processing
- **Automated Releases**: Cron job processes lesson releases
- **Configurable Window**: Adjustable time window for processing
- **Error Handling**: Comprehensive error handling and logging
- **Development Tools**: Fast-forward time for testing

### 🧪 Testing & Development

#### Development Tools
- **Fast-Forward API**: Simulate time advancement for testing
- **Dry Run Mode**: Test cron processing without creating notifications
- **Cohort Seeds**: Sample cohort data for immediate testing
- **Time Simulation**: Easy testing of release schedules

#### Testing Features
- **Access Control Testing**: Verify lesson access rules work correctly
- **Release Testing**: Test lesson release functionality
- **Enrollment Testing**: Test cohort enrollment and management
- **Notification Testing**: Verify notification system works properly

### 📊 Performance & Scalability

#### Optimized Queries
- **Efficient Access Checks**: Fast lesson access determination
- **Cohort Queries**: Optimized queries for cohort data
- **Release Scheduling**: Efficient release time calculations
- **Progress Tracking**: Fast progress calculation for cohorts

#### Caching Strategy
- **Access Control**: Cached access control decisions
- **Progress Data**: Efficient progress tracking
- **Release Information**: Cached release schedules
- **Cohort Data**: Optimized cohort information retrieval

### 🔒 Security & Validation

#### Access Control
- **Server-Side Enforcement**: All access control enforced server-side
- **Role-Based Access**: Proper role checking for cohort management
- **Data Validation**: Comprehensive validation for all cohort operations
- **Error Handling**: Graceful error handling throughout

#### Data Integrity
- **Unique Constraints**: Prevent duplicate enrollments and releases
- **Cascade Deletes**: Proper cleanup when cohorts are deleted
- **Validation Rules**: Comprehensive validation for all cohort data
- **Error Recovery**: Robust error handling and recovery

### 📚 Documentation

#### Setup Guide
- **Cohort Creation**: Step-by-step guide for creating cohorts
- **Schedule Setup**: How to set up lesson release schedules
- **Testing Guide**: How to test cohort functionality
- **Production Setup**: Cron configuration for production

#### API Documentation
- **Cohort Endpoints**: Complete API documentation
- **Cron Configuration**: Cron setup for Vercel deployment
- **Development Tools**: Testing and development utilities
- **Error Handling**: Error codes and handling

### 🚀 Migration & Setup

#### Database Migration
- **Safe Migration**: Non-destructive migration for existing data
- **New Models**: Cohort, CohortEnrollment, LessonRelease models
- **Index Optimization**: Proper indexes for performance
- **Backward Compatibility**: Maintains existing functionality

#### Production Setup
- **Cron Configuration**: Vercel cron setup for production
- **Environment Variables**: Required environment configuration
- **Monitoring**: Error monitoring and logging
- **Performance**: Optimized for production scale

### 🎯 Key Benefits

#### For Members
- **Structured Learning**: Time-boxed learning with clear schedules
- **Community Learning**: Learn alongside other cohort members
- **Automatic Releases**: Lessons unlock automatically
- **Progress Tracking**: Clear progress tracking for cohort learning

#### For Admins
- **Cohort Management**: Easy creation and management of cohorts
- **Schedule Control**: Full control over lesson release timing
- **Student Management**: Easy enrollment and role management
- **Analytics**: Detailed cohort analytics and progress tracking

### 📋 How to Test

#### Cohort Creation
1. **Admin Access**: Navigate to `/admin/learn/cohorts`
2. **Create Cohort**: Set title, slug, start date, timezone
3. **Schedule Lessons**: Use schedule builder to set release times
4. **Manage Enrollments**: Add users and assign roles

#### Member Experience
1. **Browse Cohorts**: View available cohorts
2. **Join Cohort**: Enroll in a cohort
3. **View Schedule**: See lesson release schedule
4. **Access Lessons**: Lessons unlock based on schedule

#### Testing Tools
```bash
# Fast-forward time for testing
curl "http://localhost:3000/api/cron/dev/fast-forward?minutes=10080"

# Check releases (dry run)
curl "http://localhost:3000/api/cron/cohort-releases?dryRun=true"

# Process releases
curl "http://localhost:3000/api/cron/cohort-releases"
```

### 🐛 Bug Fixes

- **Access Control**: Fixed lesson access logic for cohorts
- **Progress Calculation**: Corrected cohort progress calculation
- **Notification Timing**: Fixed notification timing for releases
- **Timezone Handling**: Proper timezone conversion and display

### 🔄 Breaking Changes

- **Database Schema**: New cohort-related tables require migration
- **API Endpoints**: New cohort management endpoints
- **Access Control**: Lesson access now considers cohort enrollment
- **Progress Logic**: Progress calculation now cohort-aware

---

## [3.0.0] - 2024-12-19 - Learning Paths (Tracks) v1

### 🎯 Major Features Added

#### Structured Learning System
- **Learning Tracks**: Complete LMS with tracks, sections, and lessons
- **Progress Tracking**: Real-time progress tracking with completion percentages
- **Quiz System**: Interactive quizzes with multiple choice questions and pass/fail logic
- **Certificates**: Shareable certificates with verification codes upon completion
- **Learning Dashboard**: Personal dashboard for enrolled tracks and achievements

#### Member Experience
- **Track Catalog**: Browse available learning tracks with progress indicators
- **Lesson Player**: Rich lesson viewer with MDX content, video support, and resources
- **Quiz Interface**: Interactive quiz component with real-time feedback
- **Progress Analytics**: Detailed progress tracking with streaks and completion stats
- **Certificate Viewer**: Beautiful certificate display with print-to-PDF functionality

#### Admin Management
- **Track Management**: Complete CRUD interface for creating and managing tracks
- **Content Creation**: Rich MDX editor for lesson content with video and resource support
- **Quiz Builder**: Visual quiz builder with multiple choice questions
- **Student Analytics**: Monitor student progress and engagement metrics
- **Certificate Management**: Issue and verify completion certificates

### 🔧 Technical Implementation

#### Database Schema
- **Track Model**: Core learning track with metadata and access control
- **TrackSection Model**: Organize lessons into logical sections
- **Lesson Model**: Individual lessons with MDX content and quiz integration
- **Enrollment Model**: Track user progress and completion status
- **LessonProgress Model**: Detailed progress tracking per lesson
- **Quiz Model**: Quiz questions and configuration
- **QuizSubmission Model**: User quiz attempts and scores
- **Certificate Model**: Completion certificates with verification codes

#### API Endpoints
- **Learning Actions**: Server actions for track enrollment and lesson completion
- **Quiz Submission**: Quiz submission and scoring logic
- **Certificate Verification**: API for verifying certificate authenticity
- **Progress Tracking**: Real-time progress updates and analytics

#### UI Components
- **QuizComponent**: Interactive quiz interface with real-time feedback
- **Learning Dashboard**: Personal learning progress and achievements
- **Track Catalog**: Browse and enroll in learning tracks
- **Lesson Player**: Rich lesson viewer with navigation and progress tracking
- **Certificate Display**: Beautiful certificate with verification features

### 🎨 User Experience

#### Member Features
- **Seamless Enrollment**: One-click enrollment in learning tracks
- **Progress Visualization**: Clear progress bars and completion indicators
- **Interactive Quizzes**: Engaging quiz experience with immediate feedback
- **Certificate Sharing**: Shareable certificates with verification links
- **Learning Streaks**: Track consecutive days of learning activity

#### Admin Features
- **Intuitive Management**: Easy-to-use interface for content creation
- **Rich Content Editor**: MDX support with custom components
- **Quiz Builder**: Visual interface for creating interactive quizzes
- **Analytics Dashboard**: Monitor student engagement and progress
- **Certificate Generation**: Automatic certificate issuance upon completion

### 📊 Sample Content

#### Foundations of Cryptocurrency Trading
- **5 Lessons**: From basic concepts to advanced strategies
- **3 Sections**: Getting Started, Trading Fundamentals, Advanced Strategies
- **Quiz Integration**: Final lesson includes comprehensive quiz
- **Rich Content**: MDX lessons with examples and practical exercises

#### Risk & Portfolio Management
- **3 Lessons**: Advanced risk management and portfolio construction
- **2 Sections**: Advanced Risk Management, Portfolio Construction
- **Quiz Integration**: Position sizing quiz with practical scenarios
- **Professional Content**: Industry-standard risk management techniques

### 🔒 Security & Access Control

#### Tier-Based Access
- **Role Integration**: Seamless integration with existing user roles
- **Access Control**: Track-level access control based on user tier
- **Progress Privacy**: User progress data is private and secure
- **Certificate Security**: Unique verification codes prevent forgery

#### Data Validation
- **Zod Schemas**: Strict validation for all learning-related actions
- **Type Safety**: Full TypeScript coverage for all components
- **Error Handling**: Comprehensive error handling and user feedback

### 🚀 Performance Features

#### Optimized Loading
- **Lazy Loading**: Lessons load content on-demand
- **Progress Caching**: Efficient progress tracking and updates
- **Image Optimization**: Optimized cover images and media
- **Responsive Design**: Mobile-first design for all learning interfaces

#### Real-Time Updates
- **Progress Sync**: Real-time progress updates across sessions
- **Quiz Results**: Immediate quiz feedback and scoring
- **Certificate Generation**: Automatic certificate issuance
- **Notification System**: In-app notifications for milestones

### 📚 Content Management

#### MDX Integration
- **Rich Content**: Support for markdown and custom components
- **Video Support**: YouTube, Vimeo, and HTML5 video integration
- **Resource Links**: External resource management
- **Custom Components**: Callout, Metric, Quote components

#### Quiz System
- **Multiple Choice**: Support for single and multiple correct answers
- **Configurable Passing**: Customizable pass percentages per quiz
- **Retake Logic**: Allow quiz retakes with score tracking
- **Progress Integration**: Quiz completion required for lesson completion

### 🧪 Testing & Quality

#### Comprehensive Testing
- **Unit Tests**: Core learning logic and progress calculations
- **Integration Tests**: Quiz submission and certificate generation
- **E2E Tests**: Complete learning workflow testing
- **Performance Tests**: Load testing for concurrent users

#### Data Integrity
- **Progress Validation**: Ensure progress calculations are accurate
- **Quiz Scoring**: Verify quiz scoring logic and pass/fail determination
- **Certificate Uniqueness**: Prevent duplicate certificate codes
- **Enrollment Logic**: Validate enrollment and access control

### 📈 Analytics & Insights

#### Learning Analytics
- **Progress Tracking**: Detailed progress metrics and completion rates
- **Engagement Metrics**: Time spent on lessons and quiz performance
- **Completion Rates**: Track completion rates across different tracks
- **Student Insights**: Individual learning patterns and preferences

#### Admin Analytics
- **Track Performance**: Monitor track popularity and completion rates
- **Content Effectiveness**: Identify most effective lessons and content
- **Student Progress**: Track individual student progress and engagement
- **Certificate Analytics**: Monitor certificate issuance and verification

### 🔄 Migration & Setup

#### Database Migration
- **Safe Migration**: Non-destructive migration for existing data
- **Schema Updates**: New learning-related tables and relationships
- **Data Seeding**: Sample tracks and lessons for immediate use
- **Backward Compatibility**: Maintains compatibility with existing features

#### Content Setup
- **Sample Tracks**: Pre-built tracks for immediate testing
- **Quiz Examples**: Sample quizzes demonstrating functionality
- **Certificate Templates**: Professional certificate designs
- **Documentation**: Comprehensive setup and usage guides

### 🎯 Key Benefits

#### For Members
- **Structured Learning**: Clear learning paths with measurable progress
- **Interactive Experience**: Engaging quizzes and rich content
- **Achievement System**: Certificates and progress tracking
- **Flexible Pace**: Self-paced learning with progress persistence

#### For Admins
- **Content Management**: Easy creation and management of educational content
- **Student Insights**: Detailed analytics on student progress and engagement
- **Scalable System**: Support for unlimited tracks, lessons, and students
- **Professional Output**: High-quality certificates and progress tracking

### 📋 How to Test

#### Member Workflow
1. **Browse Tracks**: Visit `/learn` to see available tracks
2. **Enroll in Track**: Click "Start Track" to begin learning
3. **Complete Lessons**: Progress through lessons and take quizzes
4. **Earn Certificate**: Complete track to receive certificate
5. **View Progress**: Check `/learning` for learning dashboard

#### Admin Workflow
1. **Create Track**: Visit `/admin/learn/tracks/new` to create track
2. **Add Sections**: Organize lessons into logical sections
3. **Create Lessons**: Add MDX content, videos, and resources
4. **Build Quizzes**: Create interactive quizzes for lessons
5. **Monitor Progress**: Track student engagement and completion

#### Quiz Testing
1. **Take Quiz**: Complete quiz with various answer combinations
2. **Verify Scoring**: Check that scoring logic works correctly
3. **Test Retakes**: Verify retake functionality for failed quizzes
4. **Progress Integration**: Ensure quiz completion unlocks lesson completion

### 🐛 Bug Fixes

- **Progress Calculation**: Fixed progress percentage calculations
- **Quiz Scoring**: Corrected quiz scoring logic for multiple choice questions
- **Certificate Generation**: Fixed certificate code generation uniqueness
- **Enrollment Logic**: Corrected enrollment and access control validation

### 🔄 Breaking Changes

- **Database Schema**: New learning-related tables require migration
- **API Endpoints**: New learning endpoints added
- **User Interface**: New learning pages and components added

---

## [2.0.0] - 2024-12-19 - Signals Accuracy Hardening + CSV Import + Caching

### 🎯 Major Features Added

#### High-Precision Financial Calculations
- **Decimal Arithmetic**: Migrated all financial calculations from Float to Decimal using `decimal.js`
- **Precision Guarantee**: Eliminated floating-point precision errors in price calculations, fees, and performance metrics
- **Cross-Platform Compatibility**: Works seamlessly with both SQLite (dev) and PostgreSQL (prod)

#### CSV Import System
- **Bulk Import**: Admin can import multiple trades via CSV upload
- **Data Validation**: Comprehensive validation with detailed error reporting
- **Column Mapping**: Flexible column mapping for different CSV formats
- **Duplicate Detection**: Automatic duplicate detection and handling
- **Template Download**: Pre-built CSV template with sample data

#### Performance Caching
- **Intelligent Caching**: Performance data cached with hash-based invalidation
- **Fast Analytics**: Sub-200ms response times for performance pages
- **Automatic Invalidation**: Cache cleared on trade updates and settings changes
- **Scope-Aware**: Separate cache entries for different time ranges (YTD, 1Y, 90D, ALL)

### 🔧 Technical Improvements

#### Database Schema
- **Decimal Fields**: All price and percentage fields converted to Decimal type
- **PerfSnapshot Model**: New caching table for performance data
- **Safe Migrations**: Non-destructive migrations for existing data

#### Performance Library Refactor
- **Complete Rewrite**: All performance calculations use Decimal arithmetic
- **Modular Design**: Separate modules for equity, stats, R-multiples, heatmap
- **Type Safety**: Full TypeScript coverage with strict typing
- **Unit Tests**: Comprehensive test suite with deterministic golden tests

#### API Enhancements
- **CSV Import API**: `/api/admin/signals/import` with validation and error handling
- **Performance API**: `/api/signals/performance` with caching and scope filtering
- **Cache Management**: Automatic cache invalidation and cleanup

### 🎨 UI/UX Improvements

#### Admin Interface
- **CSV Import Page**: Step-by-step import wizard with preview
- **Enhanced Signals Page**: Import/Export buttons and improved navigation
- **Error Handling**: Clear error messages and validation feedback

#### Member Experience
- **Performance Page**: Comprehensive analytics dashboard
- **Methodology Section**: Transparent calculation methods and assumptions
- **Disclaimer Banner**: Clear "Not Financial Advice" warnings
- **Time Range Selectors**: Easy switching between different time periods

### 📊 New Components

#### Performance Analytics
- **PerformanceKPIs**: Key performance indicators with proper formatting
- **EquityChart**: Equity curve visualization
- **DrawdownChart**: Drawdown analysis chart
- **MonthlyHeatmap**: Monthly returns heatmap
- **RDistributionChart**: R-multiple distribution histogram

#### CSV Import
- **Import Wizard**: Multi-step import process
- **Data Preview**: Validation preview before import
- **Error Reporting**: Detailed error messages with row numbers

### 🧪 Testing & Quality

#### Unit Tests
- **Deterministic Tests**: Golden tests for two-trade scenarios
- **Float Prevention**: Tests to prevent Float usage in performance calculations
- **Edge Cases**: Tests for empty data, zero risk, precision handling

#### Data Validation
- **Zod Schemas**: Strict validation for all API endpoints
- **Type Safety**: Full TypeScript coverage
- **Error Handling**: Comprehensive error handling and logging

### 📈 Performance Metrics

#### New KPIs
- **Total Return**: Percentage return from equity curve
- **Max Drawdown**: Largest peak-to-trough decline
- **Win Rate**: Percentage of profitable trades
- **Profit Factor**: Gross profit divided by gross loss
- **Average R-Multiple**: Risk-adjusted return average
- **Expectancy**: Expected value per trade
- **Sharpe Ratio**: Risk-adjusted return metric
- **Calmar Ratio**: Return to max drawdown ratio

#### Calculation Methods
- **Position Sizing**: Risk-based sizing with fallback to fixed percentage
- **Fee Handling**: Configurable fees and slippage in basis points
- **R-Multiple**: Proper calculation for both long and short trades
- **Monthly Aggregation**: Accurate monthly returns calculation

### 🔒 Security & Validation

#### Input Validation
- **CSV Parsing**: Safe CSV parsing with error handling
- **Data Sanitization**: All inputs validated and sanitized
- **Duplicate Prevention**: Automatic duplicate detection
- **Role-Based Access**: Admin-only import functionality

#### Error Handling
- **Graceful Degradation**: System continues working with partial data
- **User Feedback**: Clear error messages and validation results
- **Logging**: Comprehensive error logging for debugging

### 📚 Documentation

#### Updated README
- **CSV Import Guide**: Complete guide for CSV import process
- **Performance Metrics**: Detailed explanation of all KPIs
- **Methodology**: Transparent calculation methods
- **API Documentation**: Updated API endpoint documentation

#### Code Documentation
- **Type Definitions**: Complete TypeScript interfaces
- **Function Documentation**: JSDoc comments for all functions
- **Example Usage**: Code examples for common operations

### 🚀 Migration Guide

#### For Developers
1. **Install Dependencies**: `npm install decimal.js papaparse @types/papaparse`
2. **Run Migrations**: `npx prisma migrate deploy`
3. **Update Imports**: Use `Decimal` from `@/lib/num` for all financial calculations
4. **Test Performance**: Run unit tests to verify calculations

#### For Admins
1. **Access Import**: Navigate to `/admin/signals/import`
2. **Download Template**: Use the provided CSV template
3. **Prepare Data**: Format your trade data according to the template
4. **Import Trades**: Follow the step-by-step import process

### 🐛 Bug Fixes

- **Precision Errors**: Fixed floating-point precision issues in financial calculations
- **Cache Invalidation**: Fixed cache not updating after trade changes
- **Import Validation**: Fixed validation errors in CSV import
- **Performance Issues**: Fixed slow performance page loading

### 🔄 Breaking Changes

- **Database Schema**: Decimal fields require migration
- **API Responses**: Performance data now includes additional metrics
- **Import Format**: CSV import requires specific column format

### 📋 How to Test

#### Unit Tests
```bash
npm test src/lib/perf/__tests__/deterministic.test.ts
npm test src/lib/perf/__tests__/float-prevention.test.ts
```

#### Integration Tests
1. **CSV Import**: Upload sample CSV and verify data import
2. **Performance Page**: Check all charts and KPIs load correctly
3. **Cache Performance**: Verify fast loading after initial load
4. **Data Validation**: Test error handling with invalid data

#### Manual Testing
1. **Admin Flow**: Create trades, import CSV, close trades
2. **Member Flow**: View performance page, check all metrics
3. **Edge Cases**: Test with empty data, invalid prices, missing fields

---

## [1.0.0] - 2024-12-18 - Initial Release

### 🎯 Core Features
- Authentication system with role-based access
- Content management system
- Live sessions and events
- Community chat features
- Basic signals management
- Admin panel with CMS functionality