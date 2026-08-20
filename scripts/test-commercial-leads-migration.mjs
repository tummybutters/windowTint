import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(new URL('../db/migrations/005_commercial_leads.sql', import.meta.url), 'utf8');
assert.match(sql, /CREATE TABLE IF NOT EXISTS commercial_leads/i);
for (const column of ['submission_id', 'session_id', 'lead_intent_id', 'reference_code', 'name', 'phone', 'property_city', 'additional_notes', 'answers', 'attribution', 'touch']) {
  assert.match(sql, new RegExp(`\\b${column}\\b`, 'i'), `Migration must retain ${column}.`);
}
assert.match(sql, /submission_id text NOT NULL UNIQUE/i, 'Retries must be idempotent by submission ID.');
assert.match(sql, /005_commercial_leads/i, 'Migration must record its marker.');

console.log('commercial leads migration contracts passed');
