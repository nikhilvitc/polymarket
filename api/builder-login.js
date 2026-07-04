const { dashboardPassword, isDashboardAuthorized, rejectUnauthorized } = require('./_lib/dashboard-auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!dashboardPassword()) {
    res.status(200).json({ success: true, required: false });
    return;
  }

  const bodyPassword =
    typeof req.body?.password === 'string' ? req.body.password.trim() : undefined;

  if (isDashboardAuthorized(req, bodyPassword)) {
    res.status(200).json({ success: true, required: true });
    return;
  }

  rejectUnauthorized(res);
};
