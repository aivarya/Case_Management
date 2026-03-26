const express = require('express');
const bcrypt = require('bcryptjs');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// GET /api/users — all authenticated users (agents need this for assignment dropdown)
router.get('/', requireAuth, async (req, res) => {
  try {
    // Agents get a minimal list for assignment; admins get full details
    const select = req.session.role === 'ADMIN'
      ? { id: true, name: true, email: true, role: true, disabled: true, createdAt: true }
      : { id: true, name: true, email: true };
    const users = await req.prisma.user.findMany({
      where: { disabled: false },
      select,
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/users/:id/disable — toggle disabled status (admin only)
router.patch('/:id/disable', requireAdmin, async (req, res) => {
  const userId = Number(req.params.id);
  if (userId === req.session.userId) {
    return res.status(400).json({ error: 'You cannot disable your own account' });
  }
  try {
    const user = await req.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = await req.prisma.user.update({
      where: { id: userId },
      data: { disabled: !user.disabled },
      select: { id: true, name: true, email: true, role: true, disabled: true },
    });
    res.json(updated);
  } catch (err) {
    console.error('Disable user error:', err.message);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// DELETE /api/users/:id — admin only
router.delete('/:id', requireAdmin, async (req, res) => {
  const userId = Number(req.params.id);
  if (userId === req.session.userId) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }
  try {
    // Unassign tickets assigned to this user
    await req.prisma.ticket.updateMany({
      where: { assignedToId: userId },
      data: { assignedToId: null },
    });
    // Reassign created tickets to admin (session user)
    await req.prisma.ticket.updateMany({
      where: { createdById: userId },
      data: { createdById: req.session.userId },
    });
    // Delete comments by this user
    await req.prisma.comment.deleteMany({ where: { authorId: userId } });
    // Delete activity logs by this user
    await req.prisma.activityLog.deleteMany({ where: { performedById: userId } });
    // Now delete the user
    await req.prisma.user.delete({ where: { id: userId } });
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete user error:', err.message);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// POST /api/users — admin only
router.post('/', requireAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }

  try {
    const existing = await req.prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await req.prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role === 'ADMIN' ? 'ADMIN' : 'AGENT',
      },
      select: { id: true, name: true, email: true, role: true },
    });

    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
