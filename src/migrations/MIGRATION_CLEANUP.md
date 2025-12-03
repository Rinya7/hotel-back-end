# Migration Cleanup - Final Schema Migration

## Overview

This document describes the migration cleanup process that consolidates all previous migrations into a single, production-ready schema migration.

## New Migration

**File:** `1700000000000-init_schema.ts`

This is the **final, consolidated migration** that creates the complete database schema for the Hotel PMS system. It replaces all previous migrations and should be used for fresh database initialization.

### What It Creates

The migration creates the following database structure:

#### ENUM Types
- `admin_role_enum`: `'superadmin' | 'admin' | 'editor'`
- `room_status_enum`: `'free' | 'occupied' | 'cleaning'`
- `stay_status_enum`: `'booked' | 'occupied' | 'completed' | 'cancelled'`

#### Core Tables

1. **`admin`** - User accounts (superadmin, admin, editor)
   - Self-referencing FK for `createdBy` (editor → admin relationship)
   - Hotel information (name, address, coordinates)
   - Policy hours (checkInHour, checkOutHour)
   - Default Wi-Fi settings
   - Timestamps (createdAt, updatedAt)

2. **`room`** - Hotel rooms
   - FK to `admin` (CASCADE delete)
   - Unique constraint: (adminId, roomNumber)
   - Status enum with default 'free'
   - Per-room policy hours (nullable, override admin defaults)
   - Wi-Fi credentials, QR code, map position
   - Cleaning tracking fields
   - Timestamps (createdAt, updatedAt)

3. **`stay`** - Bookings/reservations
   - FK to `room` (CASCADE delete)
   - Guest information (name, email, phone)
   - Dates (checkIn, checkOut)
   - Status enum with default 'booked'
   - Balance (numeric 10,2)
   - NeedsAction flag and reason
   - Audit fields (createdBy, updatedBy, updatedByRole)
   - Timestamps (createdAt, updatedAt)

4. **`stay_guest`** - Detailed guest information per stay
   - FK to `stay` (CASCADE delete)
   - Personal details (name, email, phone, documents)
   - Timestamps (createdAt, updatedAt)

5. **`guest_access_token`** - Guest access tokens for stay links
   - FK to `stay` (CASCADE delete)
   - Unique token
   - Expiration and revocation tracking
   - Last used timestamp
   - Timestamps (createdAt, updatedAt)

6. **`stay_status_log`** - History of stay status changes
   - FK to `stay` (CASCADE delete)
   - Old/new status tracking
   - Audit fields (changedBy, changedByRole)
   - Optional comment
   - Timestamp (changedAt)

7. **`room_status_log`** - History of room status changes
   - FK to `room` (CASCADE delete)
   - FK to `stay` (SET NULL on delete)
   - Old/new status tracking
   - Audit fields (changedBy, changedByRole)
   - Optional comment
   - Timestamp (changedAt)

8. **`room_cleaning_log`** - Room cleaning history
   - FK to `room` (CASCADE delete)
   - Cleaning actor (cleanedBy, cleanedByRole)
   - Optional notes
   - Timestamp (cleanedAt)

### Key Features

- ✅ **Proper dependency order**: Tables are created in the correct sequence
- ✅ **Referential integrity**: All foreign keys with appropriate CASCADE/SET NULL behavior
- ✅ **Unique constraints**: Room numbers unique per admin
- ✅ **Check constraints**: Policy hours validated (0-23)
- ✅ **Default values**: Sensible defaults for status, balance, timestamps
- ✅ **Enum types**: Type-safe status enums
- ✅ **Audit fields**: Tracking of who created/updated records
- ✅ **Cascade deletes**: Proper cleanup when parent records are deleted

## Old Migrations

All previous migrations have been moved to `/src/migrations/old/` directory.

**⚠️ IMPORTANT:** Do NOT run old migrations on a fresh database. Use only `1700000000000-init_schema.ts` for new installations.

## Usage

### For Fresh Database

```bash
# Run the migration
npm run db:migrate

# Or using TypeORM CLI directly
npx typeorm migration:run -d src/config/dataSource.ts
```

### For Existing Database

If you have an existing database with old migrations:

1. **Option A: Keep existing data**
   - Do NOT run the new migration
   - Continue using old migrations for incremental updates

2. **Option B: Fresh start (⚠️ DESTRUCTIVE)**
   - Backup your database
   - Drop all tables
   - Run the new migration
   - Restore data if needed

## Verification

After running the migration, verify the schema:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check ENUMs
SELECT typname FROM pg_type WHERE typtype = 'e';

-- Check foreign keys
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';
```

## Migration Order

The migration creates tables in this order (respecting dependencies):

1. ENUM types
2. `admin` (no dependencies)
3. `room` (depends on `admin`)
4. `stay` (depends on `room`)
5. `stay_guest` (depends on `stay`)
6. `guest_access_token` (depends on `stay`)
7. `stay_status_log` (depends on `stay`)
8. `room_status_log` (depends on `room` and `stay`)
9. `room_cleaning_log` (depends on `room`)

## Notes

- All timestamps use `TIMESTAMP` type with `DEFAULT now()`
- Numeric fields use appropriate precision (balance: 10,2; coordinates: 10,7)
- Text fields use appropriate lengths (varchar with limits or text for long content)
- Array fields (extraGuestNames) use PostgreSQL array type
- All nullable fields are explicitly marked as nullable
- Check constraints ensure data integrity (policy hours 0-23)

## Support

If you encounter issues:

1. Check TypeORM migration logs
2. Verify database connection
3. Ensure PostgreSQL version is compatible (9.5+)
4. Check that no conflicting migrations exist in the migrations table









