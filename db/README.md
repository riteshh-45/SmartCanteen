# PostgreSQL Migration Guide

This directory contains the necessary files to migrate your Smart Canteen app from in-memory storage to a PostgreSQL database.

## Files Overview

1. `migrate_to_postgres.sql` - Contains the SQL schema definitions to create all necessary tables in PostgreSQL
2. `data_migration.ts` - TypeScript script to export data from in-memory storage to PostgreSQL

## Migration Steps

### Step 1: Set Up PostgreSQL Database

1. Make sure you have PostgreSQL installed on your system
2. Create a new database for the Smart Canteen application:
   ```sql
   CREATE DATABASE smartcanteen;
   ```

### Step 2: Run the Schema Migration

1. Connect to your PostgreSQL database
2. Run the migration script:
   ```bash
   psql -U your_username -d smartcanteen -f db/migrate_to_postgres.sql
   ```
   Or copy and paste the contents of `migrate_to_postgres.sql` into your PostgreSQL client.

### Step 3: Prepare for Data Migration

1. Make sure you have the application running with some data in the in-memory storage
2. Set the DATABASE_URL environment variable with your PostgreSQL connection string:
   ```bash
   export DATABASE_URL=postgresql://username:password@localhost:5432/smartcanteen
   ```

### Step 4: Run the Data Migration Script

1. Run the data migration script to transfer all in-memory data to PostgreSQL:
   ```bash
   npx tsx db/data_migration.ts
   ```

### Step 5: Switch to PostgreSQL Storage

To use PostgreSQL instead of in-memory storage:

1. Edit the environment variables to use PostgreSQL:
   ```
   STORAGE_TYPE=postgres
   DATABASE_URL=postgresql://username:password@localhost:5432/smartcanteen
   ```

2. Restart your application

## PostgreSQL Connection String Format

The connection string follows this format:
```
postgresql://username:password@hostname:port/database_name
```

Example:
```
postgresql://postgres:password123@localhost:5432/smartcanteen
```

## Additional Notes

- The migration will preserve all your existing data, including users, menu items, orders, etc.
- If you need to reset the database, you can run the schema migration script again which will drop and recreate all tables
- Make sure to update your environment variables in production to use PostgreSQL