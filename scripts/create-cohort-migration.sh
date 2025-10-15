#!/bin/bash

# Cohorts & Drip Scheduling v1 Migration Script
# This script creates proper migrations for production deployment

echo "🚀 Creating Cohorts & Drip Scheduling v1 Migration..."

# Create the migration
npx prisma migrate dev --name add_cohort_system --create-only

echo "✅ Migration created successfully!"
echo ""
echo "📋 Next steps for production:"
echo "1. Review the generated migration file in prisma/migrations/"
echo "2. Test the migration locally: npx prisma migrate dev"
echo "3. Commit the migration files to version control"
echo "4. Deploy to production: npx prisma migrate deploy"
echo ""
echo "⚠️  Important: Never use 'npx prisma db push' in production!"
echo "   Always use proper migrations for schema changes."
echo ""
echo "🔧 Cohort System Features:"
echo "- Time-boxed cohorts with lesson release scheduling"
echo "- Cohort enrollment and access control"
echo "- In-app notifications for lesson releases"
echo "- Timezone-aware scheduling"
echo "- Self-paced tracks remain unchanged"
