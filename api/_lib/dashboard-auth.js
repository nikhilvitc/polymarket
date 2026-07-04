function dashboardPassword() {
  return process.env.BUILDER_DASHBOARD_PASSWORD?.trim() || '';
}

function readPasswordHeader(req) {
  const raw = req.headers['x-dashboard-password'];
  if (typeof raw === 'string') return raw.trim();
  if (Array.isArray(raw) && typeof raw[0] === 'string') return raw[0].trim();
  return '';
}

function isDashboardAuthorized(req, passwordOverride) {
  const expected = dashboardPassword();
  if (!expected) return true;
  const given = passwordOverride ?? readPasswordHeader(req);
  return given === expected;
}

function rejectUnauthorized(res) {
  res.status(401).json({ success: false, error: 'Unauthorized — invalid dashboard password' });
}

module.exports = {
  dashboardPassword,
  isDashboardAuthorized,
  rejectUnauthorized,
};
