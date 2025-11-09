# Database Provider Management

## Current Situation

The Prisma schema is set to `sqlite` for local development compatibility. For production deployments with PostgreSQL, the schema provider must match the database URL.

## Problem

- **Schema says:** `sqlite`
- **Production needs:** `postgresql`
- **Prisma limitation:** Cannot override provider dynamically in schema

## Solutions

### Option 1: Production Deployment Script (Recommended)

Before deploying to production, update the schema provider:

```bash
# In prisma/schema.prisma, change:
datasource db {
  provider = "postgresql"  # Change from "sqlite"
  url      = env("DATABASE_URL")
}

# Then regenerate client and deploy
npx prisma generate
npx prisma migrate deploy
```

### Option 2: Use PostgreSQL for Both Dev and Prod

Switch to PostgreSQL for local development too:

1. Set up local PostgreSQL (Docker recommended)
2. Update schema to `postgresql`
3. Set `DATABASE_URL` to local PostgreSQL connection string

### Option 3: Schema Swapping Script

Create a script that swaps providers based on environment:

```bash
# scripts/switch-db-provider.mjs
# Swaps schema provider between SQLite and PostgreSQL
```

**Note:** This requires careful version control to avoid conflicts.

## Recommendation

For now, keep schema as SQLite for development. Before production deployment:
1. Manually update schema to PostgreSQL
2. Regenerate Prisma client
3. Run migrations
4. Deploy

This is documented in `docs/NEON_SETUP.md`.

