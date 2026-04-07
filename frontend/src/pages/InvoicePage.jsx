import React, { useState, useEffect } from 'react';
import { api } from '../api';

const INVOICE_STATUSES = ['PENDING', 'SUBMITTED', 'APPROVED', 'PAID', 'REJECTED'];

const STATUS_LABELS = {
  PENDING: 'Pending',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  PAID: 'Paid',
  REJECTED: 'Rejected',
};

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString();
}

function toInputDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().slice(0, 10);
}

// ─── Supplier Master Tab ──────────────────────────────────────────────────────

function SupplierMaster() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // supplier being edited
  const [form, setForm] = useState({ name: '', address: '', paymentTerms: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setSuppliers(await api.getSuppliers());
    } finally {
      setLoading(false);
    }
  }

  function startEdit(supplier) {
    setEditing(supplier.id);
    setForm({ name: supplier.name, address: supplier.address, paymentTerms: supplier.paymentTerms });
    setError('');
    setSuccess('');
  }

  function cancelEdit() {
    setEditing(null);
    setForm({ name: '', address: '', paymentTerms: '' });
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.address.trim() || !form.paymentTerms.trim()) {
      return setError('All fields are required');
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (editing) {
        await api.updateSupplier(editing, form);
        setSuccess('Supplier updated');
        setEditing(null);
      } else {
        await api.createSupplier(form);
        setSuccess('Supplier added');
      }
      setForm({ name: '', address: '', paymentTerms: '' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(supplier) {
    if (!window.confirm(`Delete supplier "${supplier.name}"?`)) return;
    try {
      await api.deleteSupplier(supplier.id);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="invoice-split">
      <div className="invoice-main">
        <h2 className="invoice-section-title">Supplier Master</h2>
        {loading ? <div className="loading">Loading...</div> : (
          suppliers.length === 0
            ? <p className="empty-state">No suppliers added yet.</p>
            : (
              <div className="list-table-wrapper">
                <table className="list-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Supplier Name</th>
                      <th>Address</th>
                      <th>Payment Terms</th>
                      <th>Added</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map(s => (
                      <tr key={s.id}>
                        <td className="id-cell">{s.id}</td>
                        <td style={{ fontWeight: 500 }}>{s.name}</td>
                        <td style={{ whiteSpace: 'pre-line', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{s.address}</td>
                        <td><span className="inv-terms-badge">{s.paymentTerms}</span></td>
                        <td className="text-muted">{fmt(s.createdAt)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => startEdit(s)}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        )}
      </div>

      <div className="invoice-sidebar">
        <h2 className="invoice-section-title">{editing ? 'Edit Supplier' : 'Add Supplier'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Supplier Name *</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ABC Supplies Ltd." />
          </div>
          <div className="form-group">
            <label className="form-label">Address *</label>
            <textarea
              className="textarea"
              rows={3}
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              placeholder="123 Main Street, City, State - 000000"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Payment Terms *</label>
            <input className="input" value={form.paymentTerms} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))} placeholder="Net 30, Immediate, etc." />
          </div>
          {error && <p className="error-text">{error}</p>}
          {success && <p className="success-text">{success}</p>}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update Supplier' : 'Add Supplier'}
            </button>
            {editing && (
              <button className="btn btn-ghost" type="button" onClick={cancelEdit}>Cancel</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Invoice Form Modal ───────────────────────────────────────────────────────

function InvoiceFormModal({ invoice, suppliers, onClose, onSaved }) {
  const isEdit = !!invoice;
  const [form, setForm] = useState({
    supplierId: invoice?.supplierId ?? '',
    invoiceNumber: invoice?.invoiceNumber ?? '',
    invoiceDate: toInputDate(invoice?.invoiceDate),
    submittedToAccountsDate: toInputDate(invoice?.submittedToAccountsDate),
    description: invoice?.description ?? '',
    amount: invoice?.amount ?? '',
    status: invoice?.status ?? 'PENDING',
    remarksFromAccounts: invoice?.remarksFromAccounts ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.supplierId || !form.invoiceNumber || !form.invoiceDate || !form.description || form.amount === '') {
      return setError('Supplier, invoice number, invoice date, description, and amount are required');
    }
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await api.updateInvoice(invoice.id, form);
      } else {
        await api.createInvoice(form);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-sm" style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Invoice' : 'New Invoice Entry'}</h2>
          <button className="btn btn-ghost modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">Supplier *</label>
            <select className="select" value={form.supplierId} onChange={e => set('supplierId', e.target.value)}>
              <option value="">— Select Supplier —</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Invoice Number *</label>
              <input className="input" value={form.invoiceNumber} onChange={e => set('invoiceNumber', e.target.value)} placeholder="INV-2026-001" />
            </div>
            <div className="form-group">
              <label className="form-label">Invoice Date *</label>
              <input type="date" className="input" value={form.invoiceDate} onChange={e => set('invoiceDate', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Submitted to Accounts</label>
              <input type="date" className="input" value={form.submittedToAccountsDate} onChange={e => set('submittedToAccountsDate', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Amount (₹) *</label>
              <input type="number" step="0.01" min="0" className="input" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Invoice Description *</label>
            <textarea className="textarea" rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description of goods/services" />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="select" value={form.status} onChange={e => set('status', e.target.value)}>
              {INVOICE_STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Remarks from Accounts</label>
            <textarea className="textarea" rows={2} value={form.remarksFromAccounts} onChange={e => set('remarksFromAccounts', e.target.value)} placeholder="Any notes from the accounts team" />
          </div>
          {error && <p className="error-text">{error}</p>}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update Invoice' : 'Add Invoice'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Invoice Tracker Tab ──────────────────────────────────────────────────────

function InvoiceTracker({ suppliers }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editInvoice, setEditInvoice] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setInvoices(await api.getInvoices());
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(inv) {
    if (!window.confirm(`Delete invoice ${inv.invoiceNumber}?`)) return;
    try {
      await api.deleteInvoice(inv.id);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  function handleSaved() {
    setShowForm(false);
    setEditInvoice(null);
    load();
  }

  const filtered = invoices.filter(inv => {
    if (filterStatus && inv.status !== filterStatus) return false;
    if (filterSupplier && inv.supplierId !== parseInt(filterSupplier)) return false;
    return true;
  });

  const totalOutstanding = filtered
    .filter(inv => inv.status !== 'PAID' && inv.status !== 'REJECTED')
    .reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="list-filters" style={{ marginBottom: 0 }}>
          <select className="select" style={{ minWidth: 160 }} value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)}>
            <option value="">All Suppliers</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="select" style={{ minWidth: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {INVOICE_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditInvoice(null); setShowForm(true); }}>
          + New Invoice
        </button>
      </div>

      {!filterStatus && !filterSupplier && (
        <div className="inv-summary-bar">
          <span>Outstanding (excl. Paid/Rejected):</span>
          <strong style={{ color: 'var(--primary)' }}>₹ {totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
          <span className="text-muted">across {filtered.filter(i => i.status !== 'PAID' && i.status !== 'REJECTED').length} invoice(s)</span>
        </div>
      )}

      {loading ? <div className="loading">Loading...</div> : (
        filtered.length === 0
          ? <p className="empty-state">No invoices found.</p>
          : (
            <div className="list-table-wrapper">
              <table className="list-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Supplier</th>
                    <th>Invoice No.</th>
                    <th>Invoice Date</th>
                    <th>Submitted to Accounts</th>
                    <th>Description</th>
                    <th>Amount (₹)</th>
                    <th>Status</th>
                    <th>Remarks from Accounts</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inv => (
                    <tr key={inv.id} className="list-row">
                      <td className="id-cell">{inv.id}</td>
                      <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{inv.supplier?.name}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{inv.invoiceNumber}</td>
                      <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>{fmt(inv.invoiceDate)}</td>
                      <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>{fmt(inv.submittedToAccountsDate)}</td>
                      <td style={{ maxWidth: 200, fontSize: '0.85rem' }}>{inv.description}</td>
                      <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {inv.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td><span className={`inv-status-badge inv-status-${inv.status.toLowerCase()}`}>{STATUS_LABELS[inv.status]}</span></td>
                      <td style={{ maxWidth: 180, fontSize: '0.82rem', color: 'var(--text-muted)' }}>{inv.remarksFromAccounts || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setEditInvoice(inv); setShowForm(true); }}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(inv)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      )}

      {showForm && (
        <InvoiceFormModal
          invoice={editInvoice}
          suppliers={suppliers}
          onClose={() => { setShowForm(false); setEditInvoice(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InvoicePage() {
  const [tab, setTab] = useState('invoices');
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    api.getSuppliers().then(setSuppliers).catch(() => {});
  }, [tab]); // reload suppliers when switching tabs so new ones appear in invoice form

  return (
    <div className="page">
      <div className="page-header">
        <h1>Invoice Tracker</h1>
        <span className="role-badge role-admin" style={{ fontSize: '0.75rem' }}>Admin Only</span>
      </div>

      <div className="inv-tabs">
        <button
          className={`inv-tab${tab === 'invoices' ? ' inv-tab-active' : ''}`}
          onClick={() => setTab('invoices')}
        >
          Outstanding Invoices
        </button>
        <button
          className={`inv-tab${tab === 'suppliers' ? ' inv-tab-active' : ''}`}
          onClick={() => setTab('suppliers')}
        >
          Supplier Master
        </button>
      </div>

      <div className="inv-tab-content">
        {tab === 'invoices'
          ? <InvoiceTracker suppliers={suppliers} />
          : <SupplierMaster />
        }
      </div>
    </div>
  );
}
