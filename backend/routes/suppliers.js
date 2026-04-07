const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// GET /api/suppliers — list all suppliers
router.get('/', requireAdmin, async (req, res) => {
  try {
    const suppliers = await req.prisma.supplier.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/suppliers — create supplier
router.post('/', requireAdmin, async (req, res) => {
  const { name, address, paymentTerms } = req.body;
  if (!name || !address || !paymentTerms) {
    return res.status(400).json({ error: 'Name, address, and payment terms are required' });
  }
  try {
    const supplier = await req.prisma.supplier.create({
      data: { name, address, paymentTerms },
    });
    res.status(201).json(supplier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/suppliers/:id — update supplier
router.patch('/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, address, paymentTerms } = req.body;
  try {
    const supplier = await req.prisma.supplier.update({
      where: { id },
      data: { name, address, paymentTerms },
    });
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/suppliers/:id — delete supplier (only if no invoices)
router.delete('/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const invoiceCount = await req.prisma.invoice.count({ where: { supplierId: id } });
    if (invoiceCount > 0) {
      return res.status(400).json({ error: `Cannot delete: supplier has ${invoiceCount} invoice(s) linked` });
    }
    await req.prisma.supplier.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
