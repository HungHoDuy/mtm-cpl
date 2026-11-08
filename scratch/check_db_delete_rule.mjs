import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://freelanceos:freelanceos_secret@127.0.0.1:5433/freelanceos_test'
    }
  }
});

async function check() {
  const res = await prisma.$queryRawUnsafe(`
    SELECT
        tc.table_name, 
        kcu.column_name, 
        rc.delete_rule
    FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.referential_constraints AS rc
          ON tc.constraint_name = rc.constraint_name
    WHERE tc.table_name = 'invoices' AND kcu.column_name = 'company_id';
  `);
  console.log('Local DB delete_rule:', res);

  const mig = await prisma.$queryRawUnsafe('SELECT * FROM _prisma_migrations ORDER BY finished_at DESC');
  console.log('Migrations in DB:', mig.map(m => m.migration_name));

  await prisma.$disconnect();
}
check().catch(console.error);
