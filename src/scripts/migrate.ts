import { migrateCharacterJobs } from '../lib/migrations';

async function main() {
  try {
    console.log('Starting character job migration...');
    await migrateCharacterJobs();
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main(); 