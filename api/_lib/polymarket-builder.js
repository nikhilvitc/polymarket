const crypto = require('crypto');

const CLOB_HOST = (process.env.POLYMARKET_CLOB_BASE_URL || 'https://clob.polymarket.com').replace(
  /\/$/,
  '',
);

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function buildHmacSignature(secret, timestamp, method, requestPath, body) {
  let message = `${timestamp}${method}${requestPath}`;
  if (body !== undefined) message += body;
  const base64Secret = Buffer.from(secret, 'base64');
  const sig = crypto.createHmac('sha256', base64Secret).update(message).digest('base64');
  return sig.replace(/\+/g, '-').replace(/\//g, '_');
}

function builderHeaders(method, requestPath) {
  const key = requireEnv('POLYMARKET_BUILDER_API_KEY');
  const secret = requireEnv('POLYMARKET_BUILDER_API_SECRET');
  const passphrase = requireEnv('POLYMARKET_BUILDER_API_PASSPHRASE');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  return {
    POLY_BUILDER_API_KEY: key,
    POLY_BUILDER_PASSPHRASE: passphrase,
    POLY_BUILDER_SIGNATURE: buildHmacSignature(secret, timestamp, method, requestPath),
    POLY_BUILDER_TIMESTAMP: timestamp,
  };
}

function normalizeBuilderCode(raw) {
  const trimmed = String(raw ?? '').trim();
  const hex = trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`;
  if (!/^0x[a-fA-F0-9]{64}$/.test(hex)) {
    throw new Error('Invalid builder code (expected 0x + 64 hex chars)');
  }
  return hex;
}

function builderCode() {
  return normalizeBuilderCode(requireEnv('POLYMARKET_BUILDER_CODE'));
}

function shortenBuilderCode(code) {
  return `${code.slice(0, 10)}…${code.slice(-6)}`;
}

/** Primary + optional extra builder codes to track in the dashboard. */
function listTrackedBuilders() {
  const primaryLabel = process.env.POLYMARKET_BUILDER_LABEL?.trim() || 'Yeno (canonical)';
  const primary = {
    id: 'primary',
    label: primaryLabel,
    code: builderCode(),
  };

  const extraCodes = (process.env.POLYMARKET_EXTRA_BUILDER_CODES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const extraLabels = (process.env.POLYMARKET_EXTRA_BUILDER_LABELS || '')
    .split('|')
    .map((s) => s.trim());

  const extras = extraCodes.map((raw, index) => {
    const code = normalizeBuilderCode(raw);
    return {
      id: `extra-${index}`,
      label: extraLabels[index] || shortenBuilderCode(code),
      code,
    };
  });

  const seen = new Set();
  return [primary, ...extras].filter((entry) => {
    const key = entry.code.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function resolveBuilderCode(requested) {
  if (!requested) return builderCode();
  const normalized = normalizeBuilderCode(requested);
  const allowed = listTrackedBuilders().some((b) => b.code.toLowerCase() === normalized.toLowerCase());
  if (!allowed) throw new Error('Builder code is not in tracked accounts');
  return normalized;
}

async function clobGet(requestPath) {
  const headers = builderHeaders('GET', requestPath);
  const res = await fetch(`${CLOB_HOST}${requestPath}`, {
    headers,
    signal: AbortSignal.timeout(25_000),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`CLOB ${requestPath} → HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return JSON.parse(text);
}

async function fetchBuilderTrades({ code, market, cursor, limit = 300 } = {}) {
  const params = new URLSearchParams({ builder_code: resolveBuilderCode(code) });
  if (market) params.set('market', market);
  if (cursor) params.set('next_cursor', cursor);

  const path = `/builder/trades?${params.toString()}`;
  const body = await clobGet(path);
  return {
    trades: body.data ?? [],
    count: body.count ?? (body.data?.length ?? 0),
    nextCursor: body.next_cursor && body.next_cursor !== 'LTE=' ? body.next_cursor : null,
    limit,
  };
}

async function fetchAllBuilderTrades({ code, market, maxPages = 100 } = {}) {
  const all = [];
  let cursor;
  let pages = 0;

  while (pages < maxPages) {
    const page = await fetchBuilderTrades({ code, market, cursor });
    all.push(...page.trades);
    pages += 1;
    if (!page.nextCursor) {
      return { trades: all, pages, hasMore: false, nextCursor: null };
    }
    cursor = page.nextCursor;
  }

  return { trades: all, pages, hasMore: true, nextCursor: cursor };
}

async function fetchBuilderFees(code) {
  const resolved = resolveBuilderCode(code);
  const res = await fetch(`${CLOB_HOST}/fees/builder-fees/${resolved}`, {
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Invalid builder code or fees unavailable (HTTP ${res.status})`);
  }
  return JSON.parse(text);
}

module.exports = {
  builderCode,
  listTrackedBuilders,
  resolveBuilderCode,
  fetchBuilderTrades,
  fetchAllBuilderTrades,
  fetchBuilderFees,
};
