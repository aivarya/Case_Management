const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// GET /api/tickets
router.get('/', requireAuth, async (req, res) => {
  try {
    const where = req.session.role === 'ADMIN' ? {} : { assignedToId: req.session.userId };
    const tickets = await req.prisma.ticket.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(tickets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tickets
router.post('/', requireAuth, async (req, res) => {
  const { title, description, requestor, priority, status, dueDate, assignedToId } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  try {
    const ticket = await req.prisma.ticket.create({
      data: {
        title,
        description: description || null,
        requestor: requestor || null,
        priority: priority || 'MEDIUM',
        status: status || 'TODO',
        dueDate: dueDate ? new Date(dueDate) : null,
        createdById: req.session.userId,
        assignedToId: assignedToId ? Number(assignedToId) : null,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    await req.prisma.activityLog.create({
      data: {
        action: 'Ticket created',
        ticketId: ticket.id,
        performedById: req.session.userId,
      },
    });

    res.status(201).json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tickets/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const ticket = await req.prisma.ticket.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        comments: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
        activityLog: {
          include: { performedBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/tickets/:id
router.patch('/:id', requireAuth, async (req, res) => {
  const { title, description, requestor, priority, status, resolution, dueDate, assignedToId, dueDateChangeReason } = req.body;
  const ticketId = Number(req.params.id);

  // Resolution is mandatory when closing a ticket
  if (status === 'DONE' && !resolution?.trim()) {
    return res.status(400).json({ error: 'Resolution is required when closing a ticket' });
  }

  try {
    const existing = await req.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!existing) return res.status(404).json({ error: 'Ticket not found' });

    const updated = await req.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(requestor !== undefined && { requestor }),
        ...(priority !== undefined && { priority }),
        ...(status !== undefined && { status }),
        ...(resolution !== undefined && { resolution }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(assignedToId !== undefined && { assignedToId: assignedToId ? Number(assignedToId) : null }),
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    // Log status change
    if (status && status !== existing.status) {
      await req.prisma.activityLog.create({
        data: {
          action: `Status changed from ${existing.status} to ${status}`,
          ticketId,
          performedById: req.session.userId,
        },
      });
    }

    // Log due date change
    if (dueDate !== undefined) {
      const existingDate = existing.dueDate ? existing.dueDate.toISOString().split('T')[0] : null;
      const newDate = dueDate || null;
      if (newDate !== existingDate) {
        const from = existingDate || 'none';
        const to = newDate || 'none';
        await req.prisma.activityLog.create({
          data: {
            action: `Due date changed from ${from} to ${to} — Reason: ${dueDateChangeReason || 'No reason provided'}`,
            ticketId,
            performedById: req.session.userId,
          },
        });
      }
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/tickets/:id — admin only
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await req.prisma.ticket.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
