const express = require('express');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// POST /api/tickets/:id/comments
router.post('/:id/comments', requireAuth, async (req, res) => {
  const { body } = req.body;
  const ticketId = Number(req.params.id);

  if (!body || !body.trim()) {
    return res.status(400).json({ error: 'Comment body is required' });
  }

  try {
    const ticket = await req.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const comment = await req.prisma.comment.create({
      data: {
        body: body.trim(),
        ticketId,
        authorId: req.session.userId,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
