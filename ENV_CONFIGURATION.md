# Environment Configuration Guide

## Overview

This guide explains how to configure environment variables for **Development** and **Production** modes.

## Environment Files

### `.env` (Development)

This file is used for local development. It should contain:

```env
# Development Environment Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=hotel

# JWT Configuration
JWT_SECRET=your-secret-key

# Superadmin Configuration
SUPERADMIN_USERNAME=superadmin
SUPERADMIN_PASSWORD=your-password

# Application URLs (Development)
BASE_URL=http://localhost:3000
ADMIN_FRONTEND_URL=http://localhost:5173
GUEST_APP_BASE_URL=http://localhost:5174

# Scheduler Configuration
STATUS_CRON=*/30 * * * * *
STATUS_AUTO_START=false
APP_TIMEZONE=Europe/Rome

# Google Maps API
GOOGLE_MAPS_API_KEY=your-api-key

# Migration and Scheduler Flags
RUN_MIGRATIONS=true
START_SCHEDULER=true
```

### `.env.production` (Production)

For production deployment, create `.env.production` with:

```env
# Production Environment Configuration
NODE_ENV=production
PORT=3000

# Database Configuration
# ⚠️ IMPORTANT: Update these values for production database
DB_HOST=your-production-db-host
DB_PORT=5432
DB_USERNAME=your-db-user
DB_PASSWORD=your-strong-password
DB_NAME=hotel

# JWT Configuration
# ⚠️ IMPORTANT: Change to a strong random key for production
JWT_SECRET=your-strong-production-secret

# Superadmin Configuration
# ⚠️ IMPORTANT: Change password for production
SUPERADMIN_USERNAME=superadmin
SUPERADMIN_PASSWORD=your-strong-password

# Application URLs (Production)
BASE_URL=http://46.224.81.114:3000
ADMIN_FRONTEND_URL=http://46.224.81.114:3000
GUEST_APP_BASE_URL=http://46.224.81.114:3000

# Scheduler Configuration
STATUS_CRON=*/30 * * * * *
STATUS_AUTO_START=true
APP_TIMEZONE=Europe/Rome

# Google Maps API
GOOGLE_MAPS_API_KEY=your-api-key

# Migration and Scheduler Flags
RUN_MIGRATIONS=true
START_SCHEDULER=true
```

## Key Environment Variables

### `NODE_ENV`
- **Development**: `development`
- **Production**: `production`
- **Purpose**: Controls CORS origins and other environment-specific behavior

### `BASE_URL`
- **Development**: `http://localhost:3000`
- **Production**: `http://46.224.81.114:3000`
- **Purpose**: Base URL for the backend API (used in console logs and URL generation)

### `GUEST_APP_BASE_URL`
- **Development**: `http://localhost:5174`
- **Production**: `http://46.224.81.114:3000`
- **Purpose**: Base URL for guest access links

### `ADMIN_FRONTEND_URL`
- **Development**: `http://localhost:5173`
- **Production**: `http://46.224.81.114:3000`
- **Purpose**: URL for admin frontend (for reference)

## CORS Configuration

CORS is automatically configured based on `NODE_ENV`:

- **Development**: Allows `http://localhost:5173` and `http://localhost:5174`
- **Production**: Allows `http://46.224.81.114:3000`

See `src/app.ts` for the CORS configuration.

## Swagger/OpenAPI

The OpenAPI specification includes both servers:

- Production: `http://46.224.81.114:3000`
- Development: `http://localhost:3000`

Swagger UI is available at `/docs` on both environments.

## Loading Environment Files

The application automatically loads `.env` in development mode.

For production, you can:

1. **Option A**: Copy `.env.production` to `.env` on the server
2. **Option B**: Use environment variables directly (recommended for Docker/Kubernetes)
3. **Option C**: Use a tool like `dotenv-cli`:
   ```bash
   npx dotenv -e .env.production -- npm start
   ```

## Security Notes

⚠️ **IMPORTANT for Production:**

1. **Never commit `.env` or `.env.production` to version control**
2. **Use strong, unique passwords** for database and superadmin
3. **Generate a strong random JWT_SECRET** (at least 32 characters)
4. **Restrict database access** to only the application server
5. **Use HTTPS in production** (update URLs accordingly)

## Verification

After configuration, verify:

1. **Development**: 
   - Server starts on `http://localhost:3000`
   - CORS allows requests from `http://localhost:5173` and `http://localhost:5174`
   - Swagger UI: `http://localhost:3000/docs`

2. **Production**:
   - Server starts on `http://46.224.81.114:3000`
   - CORS allows requests from `http://46.224.81.114:3000`
   - Swagger UI: `http://46.224.81.114:3000/docs`

## Troubleshooting

### CORS Errors

If you see CORS errors:
1. Check `NODE_ENV` is set correctly
2. Verify the origin matches the allowed list in `src/app.ts`
3. Ensure `credentials: true` is set in frontend requests

### URL Generation Issues

If guest access links are incorrect:
1. Verify `GUEST_APP_BASE_URL` is set correctly
2. Check `NODE_ENV` matches your environment
3. Restart the server after changing environment variables








