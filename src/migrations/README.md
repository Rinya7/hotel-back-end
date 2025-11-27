# Database Migrations

## Current Migration

**`1700000000000-init_schema.ts`** - Final consolidated schema migration

This is the **single source of truth** for the database schema. It creates all tables, enums, constraints, and relationships needed for the Hotel PMS system.

## Quick Start

### Fresh Database Setup

```bash
# Run the migration
npm run db:migrate
```

This will create:
- 3 ENUM types (admin_role, room_status, stay_status)
- 9 tables (admin, room, stay, stay_guest, guest_access_token, stay_status_log, room_status_log, room_cleaning_log)
- All foreign keys, unique constraints, and check constraints

## Schema Overview

### Tables Created

1. **admin** - User accounts (superadmin, admin, editor)
2. **room** - Hotel rooms
3. **stay** - Bookings/reservations
4. **stay_guest** - Detailed guest information
5. **guest_access_token** - Guest access tokens
6. **stay_status_log** - Stay status change history
7. **room_status_log** - Room status change history
8. **room_cleaning_log** - Room cleaning history

### Key Relationships

- `admin` → `room` (1:N, CASCADE)
- `room` → `stay` (1:N, CASCADE)
- `stay` → `stay_guest` (1:N, CASCADE)
- `stay` → `guest_access_token` (1:N, CASCADE)
- `stay` → `stay_status_log` (1:N, CASCADE)
- `room` → `room_status_log` (1:N, CASCADE)
- `room` → `room_cleaning_log` (1:N, CASCADE)
- `stay` → `room_status_log` (1:N, SET NULL)

## Old Migrations

All previous migrations have been moved to `/old/` directory for reference only.

**⚠️ Do NOT run old migrations on fresh databases.**

## Documentation

See `MIGRATION_CLEANUP.md` for detailed documentation.


