Cloudflare Pages Deployment
===========================

This project is ready to deploy on Cloudflare Pages with a working `/tables/*` API provided by Pages Functions and a D1 database. No changes to your frontend code are required.

Quick Start
-----------
- Create a Cloudflare account (if you don’t have one).
- Pages → Create a project → Connect this GitHub repo.
- Build command: none
- Output directory: /
- Deploy to verify the static site loads (API may 404 until binding is set).

D1 Database
-----------
- Workers & Pages → D1 → Create database (e.g., `production_qi`).
- Initialize schema: open the D1 Query editor and run `scripts/d1-schema.sql` from this repo.

Bind D1 to Pages
----------------
- Pages → Your Project → Settings → Functions → D1 Bindings → Add
- Binding name: `DB`
- Database: select your `production_qi` database

How It Works
------------
- Static files are served from the repo root (`index.html`, `js/*`, `assets/*`).
- API routes under `/tables/*` are handled by `functions/tables/[...slug].js`.
- Data is stored as JSON in a single D1 table `kv(table_name, id, data)`.
- Your existing `fetch('tables/...')` calls keep working.

Local Development (optional)
----------------------------
- Install Wrangler: `npm i -g wrangler`
- Update `wrangler.toml` with your D1 `database_id`.
- Run: `wrangler pages dev .`

Notes
-----
- ID generation: if you don’t provide `id`, the API assigns numeric string IDs within each table (1, 2, 3, …).
- Search: `?search=` performs a case-insensitive LIKE on the stored JSON text.
- Pagination: `?page=` and `?limit=` are supported for list endpoints.
- CORS: enabled for `*` to match the local dev-server’s behavior.

Seeding Data
------------
- This repo includes `database-export.json` and an admin seed function.
- After the first deploy and D1 binding:
  - (Optional) Set a project env var `SEED_TOKEN` to a secret value.
  - Send a POST request to `/admin/seed`:
    - If `SEED_TOKEN` is set, include header: `x-seed-token: <your token>`
    - Example with curl:
      - `curl -X POST https://<your-pages-domain>/admin/seed -H "x-seed-token: <token>"`
  - Response includes `inserted` count.

