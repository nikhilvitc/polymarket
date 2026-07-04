const { fetchBuilderFees, builderCode } = require('./_lib/polymarket-builder');
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
    const fees = await fetchBuilderFees();
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ success: true, builderCode: builderCode(), fees });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch builder fees',
    });
  }
};
