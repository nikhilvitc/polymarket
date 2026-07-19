const {
  fetchAllBuilderTrades,
  resolveBuilderCode,
  summarizeBuilderTrades,
} = require('./_lib/polymarket-builder');
const { isDashboardAuthorized, rejectUnauthorized } = require('./_lib/dashboard-auth');

/**
 * Aggregated all-time totals, computed server-side.
 * Returns a small payload so the dashboard stat cards can fill
 * without downloading the full trade list.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  if (!isDashboardAuthorized(req)) {
    rejectUnauthorized(res);
    return;
  }

  try {
    const market = typeof req.query.market === 'string' ? req.query.market : undefined;
    const code = typeof req.query.code === 'string' ? req.query.code : undefined;
    const builderCode = resolveBuilderCode(code);

    const { trades, pages, hasMore } = await fetchAllBuilderTrades({
      code: builderCode,
      market,
      maxPages: 100,
    });
    const summary = summarizeBuilderTrades(trades);

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ success: true, builderCode, summary, pages, hasMore });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to summarize builder trades',
    });
  }
};
