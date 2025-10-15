# Deployment Guide

This guide covers deploying the Crypto Portal to Vercel with Neon Postgres.

## Prerequisites

- [Vercel account](https://vercel.com)
- [Neon account](https://neon.tech) (for PostgreSQL)
- GitHub repository with your code

## Step 1: Create Neon Database

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project
3. Copy the connection string (it looks like: `postgresql://user:pass@host:port/db?sslmode=require`)

## Step 2: Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure the following environment variables:

### Required Environment Variables

```
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_DEMO_AUTH=false
```

### Optional Environment Variables

```
# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email Provider
EMAIL_SERVER=smtp://user:pass@smtp.example.com:587
EMAIL_FROM=noreply@yourdomain.com

# Cron Jobs
VERCEL_CRON_SECRET=your-cron-secret

# AWS Storage
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
AWS_S3_REGION=us-east-1
```

5. Set Build Command: `npm run prisma:deploy && next build`
6. Deploy!

## Step 3: Set Up Cron Jobs (Optional)

If you want scheduled content publishing:

1. In Vercel Dashboard, go to your project
2. Go to "Functions" → "Cron Jobs"
3. Add a new cron job:
   - **Schedule**: `*/5 * * * *` (every 5 minutes)
   - **Path**: `/api/cron/publish?secret=YOUR_VERCEL_CRON_SECRET`

## Step 4: Seed Database (One-time)

After deployment, seed your production database:

```bash
# Set your production DATABASE_URL
export DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"

# Run migrations and seed
npm run prisma:deploy
npm run db:seed
```

## Post-Deploy Checklist

- [ ] **Authentication**: Test login/logout flows
- [ ] **Content Creation**: Create a test article in admin
- [ ] **Community**: Post a test message
- [ ] **SEO**: Check `/sitemap.xml` and `/robots.txt`
- [ ] **RSS**: Verify `/rss.xml` feed works
- [ ] **Cron**: Test `/api/cron/publish` endpoint (if configured)

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` format is correct
- Check Neon database is active (not paused)
- Ensure SSL mode is set to `require`

### Build Failures
- Check all environment variables are set
- Verify `NEXTAUTH_SECRET` is not the default value
- Ensure `NEXT_PUBLIC_DEMO_AUTH=false` in production

### Cron Job Issues
- Verify `VERCEL_CRON_SECRET` is set
- Check cron URL includes the secret parameter
- Test endpoint manually first

## Environment Verification

Run locally to check your environment:

```bash
npm run deploy:check
```

This will verify all required environment variables and configuration.
