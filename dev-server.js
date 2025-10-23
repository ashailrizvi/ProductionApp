// Simple development server with mock REST API for /tables/* endpoints
// - Serves static files from repo root
// - Persists data as JSON files under ./data/{table}.json
// - Supports GET (list and by id), POST (create), PUT (update), DELETE

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');

// Tables used by the app
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

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

function send(res, status, body, headers = {}) {
  const isString = typeof body === 'string';
  const isBuffer = Buffer.isBuffer(body) || body instanceof Uint8Array;
  const defaultType = isString
    ? 'text/plain; charset=utf-8'
    : (isBuffer ? 'application/octet-stream' : 'application/json');

  const finalHeaders = {
    'Content-Type': headers['Content-Type'] || defaultType,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...headers,
  };

  res.writeHead(status, finalHeaders);

  if (isString || isBuffer) {
    res.end(body);
  } else {
    res.end(JSON.stringify(body));
  }
}

function readTable(table) {
  const file = path.join(DATA_DIR, `${table}.json`);
  if (!fs.existsSync(file)) return [];
  try {
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

function writeTable(table, rows) {
  const file = path.join(DATA_DIR, `${table}.json`);
  fs.writeFileSync(file, JSON.stringify(rows, null, 2), 'utf8');
}

function parseBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      if (!data) return resolve(null);
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve(null);
      }
    });
  });
}

function serveStatic(req, res, pathname) {
  let filePath = path.join(ROOT, pathname);
  if (pathname === '/') filePath = path.join(ROOT, 'index.html');

  // Prevent path traversal
  const normalized = path.normalize(filePath);
  if (!normalized.startsWith(ROOT)) {
    return send(res, 403, 'Forbidden');
  }

  fs.stat(normalized, (err, stats) => {
    if (err || !stats.isFile()) {
      return send(res, 404, 'Not Found');
    }
    const ext = path.extname(normalized).toLowerCase();
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject',
    };
    const type = types[ext] || 'application/octet-stream';
    fs.readFile(normalized, (readErr, data) => {
      if (readErr) return send(res, 500, 'Server Error');
      send(res, 200, data, { 'Content-Type': type });
    });
  });
}

function handleApi(req, res, pathname, query) {
  const method = (req.method || '').toString().trim().toUpperCase();
  try { console.log(`[API] ${method} ${pathname}`); } catch {}
  // /tables/<table> or /tables/<table>/<id>
  const parts = pathname.split('/').filter(Boolean); // ["tables", table, id?]
  const table = parts[1];
  const id = parts[2] || null;

  if (!TABLES.has(table)) {
    const maybeFile = path.join(DATA_DIR, `${table}.json`);
    if (!fs.existsSync(maybeFile)) {
      return send(res, 404, { error: 'Unknown table' });
    }
  }

  if (req.method === 'OPTIONS') return send(res, 200, '');

  // Basic pagination support: ?page=1&limit=5
  const page = parseInt(query.page || '1', 10) || 1;
  const limit = parseInt(query.limit || '0', 10) || 0;
  const search = query.search || '';

  let rows = readTable(table);
  // Simple search: match any field containing search string
  if (search) {
    const s = String(search).toLowerCase();
    rows = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(s));
  }

  switch (method) {
    case 'GET': {
      if (id) {
        const row = rows.find((r) => String(r.id) === String(id));
        if (!row) return send(res, 404, { error: 'Not found' });
        return send(res, 200, row);
      }
      const total = rows.length;
      let data = rows;
      if (limit > 0) {
        const start = (page - 1) * limit;
        data = rows.slice(start, start + limit);
      }
      return send(res, 200, { data, total, page, limit: limit || total });
    }
    case 'POST': {
      parseBody(req).then((body) => {
        if (!body || typeof body !== 'object') return send(res, 400, { error: 'Invalid JSON' });
        // Generate id if missing
        if (!body.id) {
          const next = rows.reduce((max, r) => (Number(r.id) > max ? Number(r.id) : max), 0) + 1;
          body.id = String(next);
        }
        rows.push(body);
        writeTable(table, rows);
        return send(res, 201, body);
      });
      break;
    }
    case 'PUT': {
      if (!id) return send(res, 400, { error: 'Missing id' });
      parseBody(req).then((body) => {
        if (!body || typeof body !== 'object') return send(res, 400, { error: 'Invalid JSON' });
        const idx = rows.findIndex((r) => String(r.id) === String(id));
        if (idx === -1) return send(res, 404, { error: 'Not found' });
        rows[idx] = { ...rows[idx], ...body, id: String(id) };
        writeTable(table, rows);
        return send(res, 200, rows[idx]);
      });
      break;
    }
    case 'PATCH': {
      if (!id) return send(res, 400, { error: 'Missing id' });
      parseBody(req).then((body) => {
        if (!body || typeof body !== 'object') return send(res, 400, { error: 'Invalid JSON' });
        const idx = rows.findIndex((r) => String(r.id) === String(id));
        if (idx === -1) return send(res, 404, { error: 'Not found' });
        rows[idx] = { ...rows[idx], ...body, id: String(id) };
        writeTable(table, rows);
        return send(res, 200, rows[idx]);
      });
      break;
    }
    case 'DELETE': {
      if (!id) return send(res, 400, { error: 'Missing id' });
      const next = rows.filter((r) => String(r.id) !== String(id));
      writeTable(table, next);
      return send(res, 200, { ok: true });
    }
    default:
      return send(res, 405, { error: 'Method not allowed' });
  }
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || '/';

  if (pathname.startsWith('/tables/')) {
    return handleApi(req, res, pathname, parsed.query || {});
  }

  return serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`Dev server running at http://localhost:${PORT}`);
  try { console.log('Tables:', Array.from(TABLES).join(',')); } catch {}
});
