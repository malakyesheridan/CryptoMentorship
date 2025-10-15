# Neon PostgreSQL Production Setup Guide

This guide will help you deploy your CryptoMentorship app to production with Neon PostgreSQL.

## Prerequisites

✅ **Completed**: Neon PostgreSQL database created  
✅ **Completed**: Connection string obtained  
✅ **Completed**: Prisma schema updated for PostgreSQL  

## Step 1: Set Up Environment Variables

Create a `.env.local` file in your project root with:

```bash
# Production Database (Neon PostgreSQL)
DATABASE_URL="postgresql://neondb_owner:npg_grz4csh0AWRl@ep-green-dawn-a7cqi4ee-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://neondb_owner:npg_grz4csh0AWRl@ep-green-dawn-a7cqi4ee.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Development Database (SQLite - for local development)
DATABASE_URL_DEV="file:./dev.db"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:5001"
NEXTAUTH_SECRET="your_generated_secret_here"
```

## Step 2: Test Database Connection

Run these commands to test your setup:

```bash
# Test PostgreSQL connection
npm run db:test:prod

# Generate Prisma client for PostgreSQL
npm run db:generate

# Run initial migration
npm run db:migrate:prod
```

## Step 3: Migrate Existing Data (Optional)

If you have existing SQLite data you want to migrate:

```bash
# Migrate data from SQLite to PostgreSQL
npm run migrate:to-postgres
```

## Step 4: Deploy to Vercel

### 4.1: Set Environment Variables in Vercel

In your Vercel dashboard, add these environment variables:

- `DATABASE_URL`: Your Neon PostgreSQL connection string
- `DIRECT_URL`: Your Neon direct connection string  
- `NEXTAUTH_SECRET`: A secure random string
- `NEXTAUTH_URL`: Your production domain (e.g., `https://your-app.vercel.app`)

### 4.2: Deploy

```bash
# Push to GitHub
git add .
git commit -m "Add Neon PostgreSQL production setup"
git push

# Deploy to Vercel (if connected to GitHub)
# Vercel will automatically deploy
```

## Step 5: Verify Production Setup

After deployment, verify:

1. **Database Connection**: Check Vercel function logs for connection errors
2. **Authentication**: Test login/logout functionality
3. **Data Persistence**: Create test data and verify it persists
4. **Learning Progress**: Test the learning system with real data
5. **Real-time Features**: Verify SSE learning progress updates work

## Production Checklist

- [ ] Environment variables set in Vercel
- [ ] Database migration completed
- [ ] Authentication working
- [ ] Learning progress tracking functional
- [ ] Real-time updates working
- [ ] Data persistence verified
- [ ] Performance monitoring enabled

## Troubleshooting

### Database Connection Issues

```bash
# Test connection locally
npm run db:test:prod

# Check Prisma client generation
npm run db:generate

# Verify environment variables
echo $DATABASE_URL
```

### Migration Issues

```bash
# Reset and re-run migration
npm run db:migrate:prod

# Check migration status
npx prisma migrate status
```

### Performance Issues

- Monitor Neon dashboard for connection usage
- Check Vercel function logs for slow queries
- Consider adding database indexes for frequently queried fields

## Next Steps

After successful deployment:

1. **Enable Authentication**: Configure OAuth providers (Google/Email)
2. **Set Up Monitoring**: Add error tracking and performance monitoring
3. **Client Onboarding**: Test multi-user scenarios
4. **Data Backup**: Verify Neon automatic backups are working
5. **Scaling**: Monitor usage and scale as needed

## Support

- **Neon Documentation**: https://neon.tech/docs
- **Prisma PostgreSQL Guide**: https://www.prisma.io/docs/concepts/database-connectors/postgresql
- **Vercel Environment Variables**: https://vercel.com/docs/concepts/projects/environment-variables
