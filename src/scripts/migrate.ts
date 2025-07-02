import { migrateCharacterJobs } from '../lib/migrations';

async function main() {
  try {
    await migrateCharacterJobs();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main(); 