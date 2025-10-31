Cloudflare Pages Deployment
===========================

This project is ready to deploy on Cloudflare Pages with a working `/tables/*` API provided by Pages Functions and a D1 database. No changes to your frontend code are required.

Quick Start
-----------
- Create a Cloudflare account (if you don't have one).
- Pages → Create a project → Connect this GitHub repo.
- Build command: none
- Output directory: /
- Deploy to verify the static site loads (API may 404 until binding is set).

D1 Database
-----------
- Workers & Pages → D1 → Create database (e.g., `production_qi`).
- Schema is auto-initialized by the Pages Function on first request. You can also create it manually via D1 Query editor:
  - `CREATE TABLE IF NOT EXISTS kv (table_name TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (table_name, id));`
  - `CREATE INDEX IF NOT EXISTS idx_kv_table ON kv(table_name);`

Bind D1 to Pages
----------------
- Pages → Your Project → Settings → Bindings → Add binding
- Type: D1 database
- Binding name: `DB`
- Database: select your `production_qi` database

How It Works
------------
- Static files are served from the repo root (`index.html`, `js/*`, `assets/*`).
- API routes under `/tables/*` are handled by `functions/tables/[[slug]].js`.
- Data is stored as JSON in a single D1 table `kv(table_name, id, data)`.
- Your existing `fetch('tables/...')` calls keep working.

Local Development (optional)
----------------------------
- Install Wrangler: `npm i -g wrangler`
- Run: `wrangler pages dev .`

Seeding Data
------------
- Option A — Admin seed from export: POST to `/admin/seed` (optionally set env var `SEED_TOKEN` and send header `x-seed-token`).
- Option B — Manual KV seed from local JSON files:
  1. Generate SQL: `pwsh -File .\scripts\generate-d1-seed-kv.ps1` → creates `scripts/d1-seed-kv.sql`
  2. Open D1 → your database → Query editor, paste and run the file contents

Verification
------------
- D1 query: `SELECT table_name, COUNT(*) AS rows FROM kv GROUP BY table_name ORDER BY table_name;`
- Endpoints: `/tables/settings`, `/tables/services?limit=1`, `/tables/bundles?limit=1`

Troubleshooting
---------------
- `D1 binding missing`: ensure a D1 binding named `DB` is configured for the environment (Production/Preview) and redeploy.
- `Cannot read properties of undefined (reading 'duration')`: ensure you are on a deployment that initializes schema using prepared statements (already in this repo). As a workaround, pre-create `kv` with the SQL shown above.

