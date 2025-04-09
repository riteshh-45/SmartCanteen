# PostgreSQL Storage Guide

This directory contains the necessary code to use PostgreSQL as the storage engine for the Smart Canteen app.

## Switching from In-Memory to PostgreSQL

The application supports two storage mechanisms:
1. **In-Memory Storage** (default) - Data is stored in memory and lost when the server restarts
2. **PostgreSQL Storage** - Data is stored in a PostgreSQL database for persistence

## How to Use PostgreSQL Storage

### Step 1: Create a PostgreSQL Database

Create a PostgreSQL database for your application:

```sql
CREATE DATABASE smartcanteen;
```

### Step 2: Set Up the Schema

Run the database schema script to create all required tables:

```bash
psql -U your_username -d smartcanteen -f db/migrate_to_postgres.sql
```

### Step 3: Configure Environment Variables

Create a `.env` file in the root of the project or set environment variables directly:

```
STORAGE_TYPE=postgres
DATABASE_URL=postgresql://username:password@hostname:port/database_name
```

### Step 4: Install Required Packages

Make sure you have the PostgreSQL client packages installed:

```bash
npm install pg connect-pg-simple
```

### Step 5: Start the Application

Start the application normally, and it will use PostgreSQL for storage:

```bash
npm run dev
```

## Key Files

- `server/storage-config.ts` - Main configuration file that selects the appropriate storage implementation
- `server/pg-storage.ts` - PostgreSQL implementation of the storage interface
- `server/storage.ts` - In-memory implementation of the storage interface
- `db/migrate_to_postgres.sql` - SQL schema for creating the database tables
- `db/data_migration.ts` - Script for migrating from in-memory storage to PostgreSQL

## Implementation Details

The application uses a storage abstraction layer that allows switching between different storage backends. The key components are:

1. **IStorage Interface** - Defines the contract that all storage implementations must follow
2. **MemStorage Class** - In-memory implementation using JavaScript Maps
3. **PostgresStorage Class** - PostgreSQL implementation using the `pg` package

The `storage-config.ts` file determines which implementation to use based on the `STORAGE_TYPE` environment variable.

## Troubleshooting

If you encounter issues with the PostgreSQL connection:

1. Verify that your PostgreSQL server is running
2. Check that the connection string in DATABASE_URL is correct
3. Make sure the database and tables exist
4. Check the permissions of the database user
5. Look at the server logs for specific error messages

## Session Storage

The application uses the session store that corresponds to the chosen storage method:
- In-memory mode uses `memorystore`
- PostgreSQL mode uses `connect-pg-simple`

This ensures that user sessions are stored in the same place as the application data.