import fs from 'node:fs';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const migrationDirectory = new URL('../db/migrations/', import.meta.url);
const migrationFiles = fs.readdirSync(migrationDirectory)
  .filter((fileName) => /^\d+_.+\.sql$/.test(fileName))
  .sort();
const sql = neon(process.env.DATABASE_URL);

for (const migrationFile of migrationFiles) {
  const migrationUrl = new URL(migrationFile, migrationDirectory);
  const statements = fs.readFileSync(migrationUrl, 'utf8')
    .split('-- migrate:split')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await sql.query(statement);
  }
}

const result = await sql.query(
  'SELECT migration_id, applied_at FROM attribution_schema_migrations ORDER BY migration_id'
);

console.log(JSON.stringify({ ok: true, migrations: result }, null, 2));
