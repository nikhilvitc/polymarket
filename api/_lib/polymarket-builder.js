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

function builderCode() {
  return requireEnv('POLYMARKET_BUILDER_CODE');
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

async function fetchBuilderTrades({ market, cursor, limit = 300 } = {}) {
  const params = new URLSearchParams({ builder_code: builderCode() });
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

async function fetchAllBuilderTrades({ market, maxPages = 5 } = {}) {
  const all = [];
  let cursor;
  let pages = 0;

  while (pages < maxPages) {
    const page = await fetchBuilderTrades({ market, cursor });
    all.push(...page.trades);
    if (!page.nextCursor) {
      return { trades: all, pages: pages + 1, hasMore: false, nextCursor: null };
    }
    cursor = page.nextCursor;
    pages += 1;
  }

  return { trades: all, pages, hasMore: true, nextCursor: cursor };
}

async function fetchBuilderFees() {
  const code = builderCode();
  const res = await fetch(`${CLOB_HOST}/fees/builder-fees/${code}`, {
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
  fetchBuilderTrades,
  fetchAllBuilderTrades,
  fetchBuilderFees,
};
