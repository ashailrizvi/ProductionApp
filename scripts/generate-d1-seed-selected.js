// Generate D1-compatible SQL for selected tables from data/*.json
// Usage: node scripts/generate-d1-seed-selected.js
// Outputs: scripts/d1-seed-selected.sql

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const OUT_FILE = path.join(ROOT, 'scripts', 'd1-seed-selected.sql');

// Tables we will include
const TABLES = [
  'settings',
  'services',
  'bundles',
  'bundle_items',
  'company_templates',
  'currency_rates',
];

// Column allowlists inferred from current data/*.json and prior inserts
const COLUMNS = {
  settings: [
    'id',
    'defaultCurrency',
    'baseCurrency',
    'taxRate',
    'discountType',
    'discountValue',
    'headerBuffer',
    'quotationTerms',
    'invoiceTerms',
    'quotationNotes',
    'invoiceNotes',
    // If customUnits exists (array), serialize to JSON string
    'customUnits',
  ],
  services: [
    'serviceCode',
    'name',
    'category',
    'unit',
    'baseRate',
    'currency',
    'contentTypes',
    'teamRoles',
    'isOptional',
    'isNegotiable',
    'minQty',
    'maxQty',
    'includes',
    'notes',
    'id',
  ],
  bundles: [
    'bundleCode',
    'name',
    'parentServiceId',
    'description',
    'unit',
    'id',
  ],
  bundle_items: [
    'bundleId',
    'childServiceId',
    'childQty',
    'isOptional',
    'defaultSelected',
    'include',
    'notes',
    'id',
  ],
  company_templates: [
    'name',
    'companyName',
    'companyPhone',
    'companyEmail',
    'companyLogo',
    'companyAddress',
    'defaultCurrency',
    'taxRate',
    'headerBuffer',
    'discountType',
    'discountValue',
    'quotationTerms',
    'invoiceTerms',
    'quotationNotes',
    'invoiceNotes',
    'isDefault',
    'isActive',
    'id',
  ],
  currency_rates: [
    'id',
    'fromCur',
    'toCur',
    'rate',
    'notes',
    'created_at',
    'updated_at',
  ],
};

function escapeSqlString(str) {
  return String(str).replace(/'/g, "''");
}

function toSqlValue(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (Array.isArray(v) || typeof v === 'object') {
    // Store as JSON string
    const s = JSON.stringify(v);
    return `'${escapeSqlString(s)}'`;
  }
  return `'${escapeSqlString(v)}'`;
}

function loadJson(table) {
  const file = path.join(DATA_DIR, `${table}.json`);
  if (!fs.existsSync(file)) return [];
  const raw = fs.readFileSync(file, 'utf8');
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn(`Warning: Failed to parse ${file}: ${e.message}`);
    return [];
  }
}

function genInserts(table, rows, cols) {
  if (!rows.length) return '';
  const lines = [];
  lines.push(`-- Table: ${table}`);
  lines.push(`DELETE FROM ${table};`);
  for (const row of rows) {
    // Pick only known columns; include column if present (not undefined)
    const presentCols = cols.filter((c) => row[c] !== undefined);
    const values = presentCols.map((c) => toSqlValue(row[c]));
    if (!presentCols.length) continue;
    const colsSql = presentCols.join(', ');
    const valsSql = values.join(', ');
    lines.push(`INSERT INTO ${table} (${colsSql}) VALUES (${valsSql});`);
  }
  lines.push('');
  return lines.join('\n');
}

function main() {
  const parts = [];
  parts.push('-- Generated SQL: selected tables from data/*.json');
  parts.push('-- Safe for Cloudflare D1 editor (no explicit transactions)');
  parts.push('PRAGMA foreign_keys = OFF;');
  parts.push('');

  for (const table of TABLES) {
    const rows = loadJson(table);
    const cols = COLUMNS[table] || [];
    parts.push(genInserts(table, rows, cols));
  }

  const sql = parts.filter(Boolean).join('\n');
  fs.writeFileSync(OUT_FILE, sql, 'utf8');
  console.log(`Wrote ${OUT_FILE}`);
}

if (require.main === module) {
  main();
}

