import { IStorage } from './storage';
import { MemStorage, storage as memStorage } from './storage';
import { PostgresStorage } from './pg-storage';

// Environment variable to determine which storage to use
// Set to "postgres" to use PostgreSQL, "memory" to use in-memory storage
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'memory';

// PostgreSQL connection string
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/smartcanteen';

// Create the appropriate storage instance
let storageInstance: IStorage;

if (STORAGE_TYPE === 'postgres') {
  console.log('Using PostgreSQL storage');
  storageInstance = new PostgresStorage(DATABASE_URL);
} else {
  console.log('Using in-memory storage');
  storageInstance = memStorage;
}

export const storage = storageInstance;