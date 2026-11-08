import dotenv from 'dotenv';
dotenv.config({ path: 'D:/mtm/CPL/matches/CMSC8VA4/CMSC8VA4/src/.env' });
import { PrismaClient } from 'D:/mtm/CPL/matches/CMSC8VA4/CMSC8VA4/src/node_modules/@prisma/client/index.js';

const db = new PrismaClient({
  datasources: { db: { url: process.env.TEST_DATABASE_URL } }
});

async function main() {
  const constraints = await db.$queryRawUnsafe(`
    SELECT conname, confdeltype 
    FROM pg_constraint 
    WHERE conname = 'invoices_company_id_fkey'
  `);
  console.log('Constraint in test DB:', constraints);

  const migrations = await db.$queryRawUnsafe(`
    SELECT migration_name, finished_at 
    FROM _prisma_migrations 
    ORDER BY finished_at ASC
  `);
  console.log('Migrations in test DB:', migrations);

  await db.$disconnect();
}

main().catch(console.error);

