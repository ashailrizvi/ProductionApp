// Generate SQL to seed Cloudflare D1 `kv` table from database-export.json
// Usage:
//   node scripts/generate-d1-seed-sql.mjs > scripts/d1-seed-from-export.sql
// Then paste the SQL into D1 Query Editor, or run with Wrangler:
//   wrangler d1 execute production_qi --file scripts/d1-seed-from-export.sql --remote

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const exportPath = path.join(root, 'database-export.json');

if (!fs.existsSync(exportPath)) {
  console.error('database-export.json not found at repo root');
  process.exit(1);
}

/** escape single quotes for SQL strings */
const esc = (s) => String(s).replace(/'/g, "''");

const raw = fs.readFileSync(exportPath, 'utf8');
const json = JSON.parse(raw);
const tables = json?.tables || {};

let out = '';
out += `-- Generated SQL for Cloudflare D1 seeding\n`;
out += `-- Source: database-export.json\n\n`;
out += `CREATE TABLE IF NOT EXISTS kv (\n  table_name TEXT NOT NULL,\n  id TEXT NOT NULL,\n  data TEXT NOT NULL,\n  PRIMARY KEY (table_name, id)\n);\n`; 
out += `CREATE INDEX IF NOT EXISTS idx_kv_table ON kv(table_name);\n\n`;

for (const [tableName, payload] of Object.entries(tables)) {
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  for (const row of rows) {
    const id = row.id ? String(row.id) : '';
    if (!id) {
      // If id missing, leave it blank; you can backfill with app later
      // or you may edit the SQL to set custom ids. Here we skip to avoid ambiguity.
      continue;
    }
    const serialized = esc(JSON.stringify({ ...row, id }));
    out += `INSERT OR REPLACE INTO kv (table_name, id, data) VALUES ('${esc(tableName)}', '${esc(id)}', '${serialized}');\n`;
  }
}

console.log(out);

