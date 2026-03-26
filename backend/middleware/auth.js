function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.session.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Admin only' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
