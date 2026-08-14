import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.join(__dirname, '..', 'db', 'migrations', '004_attribution_foundation.sql');
const sql = readFileSync(migrationPath, 'utf8');

assert.match(sql, /CREATE TABLE IF NOT EXISTS attribution_touches/i);
assert.match(sql, /CHECK \(gclid IS NOT NULL OR gbraid IS NOT NULL OR wbraid IS NOT NULL\)/i);
assert.match(sql, /CREATE TABLE IF NOT EXISTS attribution_lead_intents/i);
assert.match(sql, /reference_code text NOT NULL UNIQUE/i);
assert.match(sql, /ADD COLUMN IF NOT EXISTS provider_order_id text/i);
assert.match(sql, /ADD COLUMN IF NOT EXISTS touch_id text/i);
assert.match(sql, /proof_tier.*CHECK/i);
assert.match(sql, /link_status.*CHECK/i);

console.log('attribution foundation migration test passed');
