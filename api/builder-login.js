const { dashboardPassword, isDashboardAuthorized, rejectUnauthorized } = require('./_lib/dashboard-auth');

function readBodyPassword(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch {
      body = {};
    }
  }
  if (body && typeof body === 'object' && typeof body.password === 'string') {
    return body.password.trim();
  }
  return undefined;
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    if (!dashboardPassword()) {
      res.status(200).json({ success: true, required: false });
      return;
    }

    const bodyPassword = readBodyPassword(req);

    if (isDashboardAuthorized(req, bodyPassword)) {
      res.status(200).json({ success: true, required: true });
      return;
    }

    rejectUnauthorized(res);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Login failed',
    });
  }
};
