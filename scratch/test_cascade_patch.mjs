import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const srcDir = 'D:/mtm/CPL/matches/38IX07C9/38IX07C9/src';
console.log('srcDir:', srcDir);

try {
  const cascadeTest = path.resolve(srcDir, 'tests', 'cascade.test.ts');
  const migrationsDir = path.resolve(srcDir, 'prisma', 'schema', 'migrations');
  console.log('cascadeTest exists:', fs.existsSync(cascadeTest));
  console.log('migrationsDir exists:', fs.existsSync(migrationsDir));

  if (fs.existsSync(cascadeTest) && fs.existsSync(migrationsDir)) {
    const migrationNames = fs.readdirSync(migrationsDir);
    const hasRestrictMigration = migrationNames.some(m => m.includes('restrict') || m.includes('protect_invoice'));
    console.log('hasRestrictMigration:', hasRestrictMigration);

    if (!hasRestrictMigration) {
      console.log('Auto-injecting parity migration...');
      const newMigDir = path.resolve(migrationsDir, '20261104103000_restore_invoice_company_restrict');
      fs.mkdirSync(newMigDir, { recursive: true });
      const migSql = [
        '-- AlterForeignKey',
        'ALTER TABLE "invoices" DROP CONSTRAINT "invoices_company_id_fkey";',
        'ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;'
      ].join('\n');
      fs.writeFileSync(path.resolve(newMigDir, 'migration.sql'), migSql, 'utf8');

      // Update accounting.prisma schema relation
      const accountingPrisma = path.resolve(srcDir, 'prisma', 'schema', 'accounting.prisma');
      if (fs.existsSync(accountingPrisma)) {
        let pContent = fs.readFileSync(accountingPrisma, 'utf8');
        pContent = pContent.replace(
          /company\s+Company\s+@relation\(fields:\s*\[companyId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)/,
          'company       Company       @relation(fields: [companyId], references: [id], onDelete: Restrict)'
        );
        fs.writeFileSync(accountingPrisma, pContent, 'utf8');
      }

      console.log('Staging and committing...');
      // Execute git
      const cmd1 = `git add prisma/`;
      const out1 = execSync(cmd1, { cwd: srcDir, encoding: 'utf8' });
      console.log('git add out:', out1);

      const cmd2 = `git commit -m "fix(accounting): protect invoice history with RESTRICT on company delete"`;
      const out2 = execSync(cmd2, { cwd: srcDir, encoding: 'utf8' });
      console.log('git commit out:', out2);
    }
  }
} catch (err) {
  console.error('ERROR CAUGHT:', err.message);
  if (err.stdout) console.error('STDOUT:', err.stdout.toString());
  if (err.stderr) console.error('STDERR:', err.stderr.toString());
}

