const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// GET /api/invoices — list all invoices with supplier info
router.get('/', requireAdmin, async (req, res) => {
  try {
    const invoices = await req.prisma.invoice.findMany({
      include: { supplier: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invoices — create invoice
router.post('/', requireAdmin, async (req, res) => {
  const {
    supplierId,
    invoiceNumber,
    invoiceDate,
    submittedToAccountsDate,
    description,
    amount,
    currency,
    status,
    remarksFromAccounts,
  } = req.body;

  if (!supplierId || !invoiceNumber || !invoiceDate || !description || amount == null) {
    return res.status(400).json({ error: 'Supplier, invoice number, invoice date, description, and amount are required' });
  }

  try {
    const invoice = await req.prisma.invoice.create({
      data: {
        supplierId: parseInt(supplierId),
        invoiceNumber,
        invoiceDate: new Date(invoiceDate),
        submittedToAccountsDate: submittedToAccountsDate ? new Date(submittedToAccountsDate) : null,
        description,
        amount: parseFloat(amount),
        currency: currency || 'AED',
        status: status || 'PENDING',
        remarksFromAccounts: remarksFromAccounts || null,
      },
      include: { supplier: true },
    });
    res.status(201).json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/invoices/:id — update invoice
router.patch('/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const {
    supplierId,
    invoiceNumber,
    invoiceDate,
    submittedToAccountsDate,
    description,
    amount,
    currency,
    status,
    remarksFromAccounts,
  } = req.body;

  try {
    const data = {};
    if (supplierId !== undefined) data.supplierId = parseInt(supplierId);
    if (invoiceNumber !== undefined) data.invoiceNumber = invoiceNumber;
    if (invoiceDate !== undefined) data.invoiceDate = new Date(invoiceDate);
    if (submittedToAccountsDate !== undefined) data.submittedToAccountsDate = submittedToAccountsDate ? new Date(submittedToAccountsDate) : null;
    if (description !== undefined) data.description = description;
    if (amount !== undefined) data.amount = parseFloat(amount);
    if (currency !== undefined) data.currency = currency;
    if (status !== undefined) data.status = status;
    if (remarksFromAccounts !== undefined) data.remarksFromAccounts = remarksFromAccounts || null;

    const invoice = await req.prisma.invoice.update({
      where: { id },
      data,
      include: { supplier: true },
    });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/invoices/:id — delete invoice
router.delete('/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await req.prisma.invoice.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
