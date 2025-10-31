// Cloudflare Pages Function for `/tables/*` endpoints backed by D1
// Generic JSON store schema: a single table `kv` with (table text, id text, data text)
// This mirrors your local dev-server behavior and avoids per-table schemas.

/**
 * Helper to build standard CORS + JSON headers
 */
function headers(extra = {}) {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...extra,
  };
}

function parseURL(req) {
  const u = new URL(req.url);
  const pathname = u.pathname || '/';
  // Expecting /tables/<table> or /tables/<table>/<id>
  const parts = pathname.split('/').filter(Boolean);
  return { url: u, parts };
}

async function ensureSchema(env) {
  // Create a single generic store if it doesn't exist
  await env.DB.exec(`
    CREATE TABLE IF NOT EXISTS kv (
      table_name TEXT NOT NULL,
      id TEXT NOT NULL,
      data TEXT NOT NULL,
      PRIMARY KEY (table_name, id)
    );
    CREATE INDEX IF NOT EXISTS idx_kv_table ON kv(table_name);
  `);
}

async function getNextId(env, table) {
  // Derive next numeric id within a table, fallback to 1
  const { results } = await env.DB.prepare(
    `SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) + 1 AS next_id FROM kv WHERE table_name = ?`
  ).bind(table).all();
  const next = results?.[0]?.next_id || 1;
  return String(next);
}

export async function onRequest(context) {
  const { request, env } = context;
  const method = (request.method || 'GET').toUpperCase();
  const { url, parts } = parseURL(request);

  if (!env || !env.DB) {
    return new Response(
      JSON.stringify({
        error: 'D1 binding missing',
        detail: 'No D1 database bound as "DB" for this environment. Add it in Pages → Settings → Bindings and redeploy.'
      }),
      { status: 500, headers: headers() }
    );
  }

  // CORS preflight
  if (method === 'OPTIONS') {
    return new Response('', { status: 200, headers: headers() });
  }

  // Expect route starting with /tables
  if (parts[0] !== 'tables') {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: headers() });
  }

  const table = parts[1];
  const id = parts[2] || null;
  if (!table) {
    return new Response(JSON.stringify({ error: 'Missing table' }), { status: 400, headers: headers() });
  }

  try {
    await ensureSchema(env);

    switch (method) {
      case 'GET': {
        const search = url.searchParams.get('search') || '';
        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
        const limit = Math.max(0, parseInt(url.searchParams.get('limit') || '0', 10) || 0);

        if (id) {
          const { results } = await env.DB.prepare(
            `SELECT data FROM kv WHERE table_name = ? AND id = ?`
          ).bind(table, String(id)).all();
          if (!results || results.length === 0) {
            return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: headers() });
          }
          const row = JSON.parse(results[0].data);
          return new Response(JSON.stringify(row), { status: 200, headers: headers() });
        }

        // Count + list with optional LIKE filter on JSON text
        const like = `%${search}%`;
        const countSQL = search
          ? `SELECT COUNT(*) AS c FROM kv WHERE table_name = ? AND data LIKE ?`
          : `SELECT COUNT(*) AS c FROM kv WHERE table_name = ?`;
        const countBind = search ? [table, like] : [table];
        const c = await env.DB.prepare(countSQL).bind(...countBind).all();
        const total = c.results?.[0]?.c || 0;

        let data = [];
        if (limit === 0) {
          const listSQL = search
            ? `SELECT data FROM kv WHERE table_name = ? AND data LIKE ? ORDER BY CAST(id AS INTEGER)`
            : `SELECT data FROM kv WHERE table_name = ? ORDER BY CAST(id AS INTEGER)`;
          const listBind = search ? [table, like] : [table];
          const { results } = await env.DB.prepare(listSQL).bind(...listBind).all();
          data = (results || []).map(r => JSON.parse(r.data));
          return new Response(JSON.stringify({ data, total, page, limit: total }), { status: 200, headers: headers() });
        } else {
          const offset = (page - 1) * limit;
          const listSQL = search
            ? `SELECT data FROM kv WHERE table_name = ? AND data LIKE ? ORDER BY CAST(id AS INTEGER) LIMIT ? OFFSET ?`
            : `SELECT data FROM kv WHERE table_name = ? ORDER BY CAST(id AS INTEGER) LIMIT ? OFFSET ?`;
          const listBind = search ? [table, like, limit, offset] : [table, limit, offset];
          const { results } = await env.DB.prepare(listSQL).bind(...listBind).all();
          data = (results || []).map(r => JSON.parse(r.data));
          return new Response(JSON.stringify({ data, total, page, limit }), { status: 200, headers: headers() });
        }
      }

      case 'POST': {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') {
          return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: headers() });
        }
        let newId = body.id ? String(body.id) : await getNextId(env, table);
        const merged = { ...body, id: newId };
        await env.DB.prepare(
          `INSERT INTO kv (table_name, id, data) VALUES (?, ?, ?)`
        ).bind(table, newId, JSON.stringify(merged)).run();
        return new Response(JSON.stringify(merged), { status: 201, headers: headers() });
      }

      case 'PUT':
      case 'PATCH': {
        if (!id) {
          return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400, headers: headers() });
        }
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') {
          return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: headers() });
        }
        const existing = await env.DB.prepare(
          `SELECT data FROM kv WHERE table_name = ? AND id = ?`
        ).bind(table, String(id)).all();
        if (!existing.results || existing.results.length === 0) {
          return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: headers() });
        }
        const current = JSON.parse(existing.results[0].data);
        const merged = { ...current, ...body, id: String(id) };
        await env.DB.prepare(
          `UPDATE kv SET data = ? WHERE table_name = ? AND id = ?`
        ).bind(JSON.stringify(merged), table, String(id)).run();
        return new Response(JSON.stringify(merged), { status: 200, headers: headers() });
      }

      case 'DELETE': {
        if (!id) {
          return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400, headers: headers() });
        }
        const r = await env.DB.prepare(
          `DELETE FROM kv WHERE table_name = ? AND id = ?`
        ).bind(table, String(id)).run();
        const changes = (r.meta && typeof r.meta.changes === 'number') ? r.meta.changes : 0;
        if (changes === 0) {
          return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: headers() });
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: headers() });
      }

      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: headers() });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error', detail: String(err && err.message || err) }), { status: 500, headers: headers() });
  }
}
