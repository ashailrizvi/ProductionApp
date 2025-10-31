// Seed local data directory from database-export.json
// Usage: node scripts/seed-from-export.js

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const EXPORT_FILE = path.join(ROOT, 'database-export.json');

// Tables supported by the dev server
const TABLES = new Set([
  'settings',
  'services',
  'bundles',
  'bundle_items',
  'quotation_lines',
  'invoices',
  'invoice_lines',
  'currency_rates',
  'company_templates',
  'customers',
  'quotations',
]);

function main() {
  if (!fs.existsSync(EXPORT_FILE)) {
    console.error('Export file not found:', EXPORT_FILE);
    process.exit(1);
  }
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

  const raw = fs.readFileSync(EXPORT_FILE, 'utf8');
  let json;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse export JSON:', e.message);
    process.exit(1);
  }

  const srcTables = (json && json.tables) || {};
  let written = 0;

  for (const name of Object.keys(srcTables)) {
    if (!TABLES.has(name)) continue; // ignore unknown tables
    
    const outPath = path.join(DATA_DIR, `${name}.json`);
    
    // Check if file exists and has data
    if (fs.existsSync(outPath)) {
      const existingData = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      if (Array.isArray(existingData) && existingData.length > 0) {
        console.log(`Skipping ${name}.json - file exists with ${existingData.length} records`);
        continue;
      }
    }

    const entry = srcTables[name];
    const data = Array.isArray(entry?.data) ? entry.data : [];
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
    written++;
    console.log(`Wrote ${data.length} rows to ${path.relative(ROOT, outPath)}`);
  }

  if (written === 0) {
    console.log('No new tables written - existing data preserved.');
  }
}

if (require.main === module) {
  main();
}

