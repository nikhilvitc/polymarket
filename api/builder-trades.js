const { fetchBuilderTrades, fetchAllBuilderTrades, resolveBuilderCode } = require('./_lib/polymarket-builder');
const { isDashboardAuthorized, rejectUnauthorized } = require('./_lib/dashboard-auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!isDashboardAuthorized(req)) {
    rejectUnauthorized(res);
    return;
  }

  try {
    const market = typeof req.query.market === 'string' ? req.query.market : undefined;
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const all = req.query.all === '1' || req.query.all === 'true';
    const code = typeof req.query.code === 'string' ? req.query.code : undefined;
    const builderCode = resolveBuilderCode(code);

    // pages=N fetches up to N CLOB pages in one serverless call (default 1).
    const pagesRaw = Number.parseInt(String(req.query.pages ?? '1'), 10);
    const pages = Number.isFinite(pagesRaw) ? Math.min(Math.max(pagesRaw, 1), 20) : 1;

    let result;
    if (all) {
      result = await fetchAllBuilderTrades({ code: builderCode, market, maxPages: 100 });
    } else if (pages > 1) {
      result = await fetchAllBuilderTrades({
        code: builderCode,
        market,
        maxPages: pages,
        startCursor: cursor,
      });
    } else {
      result = await fetchBuilderTrades({ code: builderCode, market, cursor });
    }

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ success: true, builderCode, ...result });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch builder trades',
    });
  }
};
