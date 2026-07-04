const { fetchBuilderTrades, fetchAllBuilderTrades } = require('./_lib/polymarket-builder');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const market = typeof req.query.market === 'string' ? req.query.market : undefined;
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const all = req.query.all === '1' || req.query.all === 'true';

    const result = all
      ? await fetchAllBuilderTrades({ market, maxPages: 5 })
      : await fetchBuilderTrades({ market, cursor });

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch builder trades',
    });
  }
};
