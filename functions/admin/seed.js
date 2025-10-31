// Seed endpoint to import data from database-export.json into D1 kv store
// Usage: POST /admin/seed  (optionally set env.SEED_TOKEN and send header x-seed-token)

import exportData from '../../database-export.json' assert { type: 'json' };

function headers(extra = {}) {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,x-seed-token',
    ...extra,
  };
}

async function ensureSchema(env) {
  // Use prepared statements to avoid exec quirks
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS kv (
      table_name TEXT NOT NULL,
      id TEXT NOT NULL,
      data TEXT NOT NULL,
      PRIMARY KEY (table_name, id)
    )`
  ).run();
  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_kv_table ON kv(table_name)`
  ).run();
}

export async function onRequestPost({ request, env }) {
  if (!env || !env.DB) {
    return new Response(
      JSON.stringify({
        error: 'D1 binding missing',
        detail: 'No D1 database bound as "DB". In Pages → Settings → Bindings, add a D1 binding named DB for this environment, then redeploy.'
      }),
      { status: 500, headers: headers() }
    );
  }
  // Optional token protection
  const configured = (env.SEED_TOKEN || '').toString();
  if (configured) {
    const provided = request.headers.get('x-seed-token') || '';
    if (provided !== configured) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: headers() });
    }
  }

  try {
    await ensureSchema(env);

    const tables = exportData?.tables || {};
    let total = 0;
    for (const [tableName, payload] of Object.entries(tables)) {
      const rows = Array.isArray(payload?.data) ? payload.data : [];
      for (const row of rows) {
        // Ensure string id
        const id = row.id ? String(row.id) : undefined;
        // If missing id, derive one using current max+1 within the table
        let useId = id;
        if (!useId) {
          const r = await env.DB.prepare(`SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) + 1 AS next_id FROM kv WHERE table_name = ?`).bind(tableName).all();
          useId = String(r.results?.[0]?.next_id || 1);
        }
        const merged = { ...row, id: useId };
        await env.DB.prepare(
          `INSERT OR REPLACE INTO kv (table_name, id, data) VALUES (?, ?, ?)`
        ).bind(tableName, useId, JSON.stringify(merged)).run();
        total += 1;
      }
    }
    return new Response(JSON.stringify({ ok: true, inserted: total }), { status: 200, headers: headers() });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Seed failed', detail: String(err && err.message || err) }), { status: 500, headers: headers() });
  }
}

export async function onRequestOptions() {
  return new Response('', { status: 200, headers: headers() });
}
