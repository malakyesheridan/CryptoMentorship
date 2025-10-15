#!/bin/bash

# Learning Paths v1.1 Hardening Migration Script
# This script creates proper migrations for production deployment

echo "🚀 Creating Learning Paths v1.1 Hardening Migration..."

# Create the migration
npx prisma migrate dev --name learning_hardening_constraints --create-only

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
