import { useState, useEffect } from 'react';
import { api } from '../api';
import CommentThread from './CommentThread';
import SmartTextarea from './SmartTextarea';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

export default function TicketModal({ ticketId, onClose, onUpdated }) {
  const [ticket, setTicket] = useState(null);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [dueDateReason, setDueDateReason] = useState('');

  useEffect(() => {
    if (!ticketId) return;
    loadTicket();
    api.getUsers().then(setUsers).catch(() => {});
  }, [ticketId]);

  async function loadTicket() {
    try {
      const t = await api.getTicket(ticketId);
      setTicket(t);
      setForm({
        title: t.title,
        description: t.description || '',
        requestor: t.requestor || '',
        priority: t.priority,
        status: t.status,
        resolution: t.resolution || '',
        assignedToId: t.assignedTo?.id || '',
        dueDate: t.dueDate ? t.dueDate.split('T')[0] : '',
      });
      setDueDateReason('');
    } catch (err) {
      setError('Failed to load ticket');
    }
  }

  async function handleSave() {
    if (form.status === 'DONE' && !form.resolution?.trim()) {
      return setError('Resolution is required when closing a ticket');
    }
    const originalDueDate = ticket.dueDate ? ticket.dueDate.split('T')[0] : '';
    const dueDateChanged = form.dueDate !== originalDueDate;
    if (dueDateChanged && !dueDateReason.trim()) {
      return setError('A reason is required when changing the due date');
    }
    setSaving(true);
    setError('');
    try {
      await api.updateTicket(ticketId, {
        ...form,
        assignedToId: form.assignedToId || null,
        dueDate: form.dueDate || null,
        resolution: form.resolution || null,
        ...(dueDateChanged && { dueDateChangeReason: dueDateReason.trim() }),
      });
      onUpdated && onUpdated();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this ticket? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.deleteTicket(ticketId);
      onUpdated && onUpdated();
      onClose();
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  if (!ticketId) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Ticket #{ticketId}</h2>
          <button className="btn btn-ghost modal-close" onClick={onClose}>✕</button>
        </div>

        {!ticket ? (
          <div className="loading">Loading...</div>
        ) : (
          <div className="modal-body">
            <div className="modal-form">
              <div className="ticket-meta-info">
                <span>Ticket #{ticketId}</span>
                <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>

              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  className="input"
                  value={form.title || ''}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Requestor</label>
                <input
                  className="input"
                  value={form.requestor || ''}
                  onChange={e => setForm(f => ({ ...f, requestor: e.target.value }))}
                  placeholder="Who raised this request?"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <SmartTextarea
                  rows={4}
                  value={form.description || ''}
                  onChange={val => setForm(f => ({ ...f, description: val }))}
                  placeholder="Add a description..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="select" value={form.priority || ''} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="select" value={form.status || ''} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Assigned To</label>
                  <select className="select" value={form.assignedToId || ''} onChange={e => setForm(f => ({ ...f, assignedToId: e.target.value }))}>
                    <option value="">Unassigned</option>
                    {users.filter(u => !u.disabled).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    className="input"
                    value={form.dueDate || ''}
                    onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  />
                </div>
              </div>

              {ticket && form.dueDate !== (ticket.dueDate ? ticket.dueDate.split('T')[0] : '') && (
                <div className="form-group">
                  <label className="form-label" style={{ color: '#f97316' }}>Reason for due date change *</label>
                  <SmartTextarea
                    rows={2}
                    value={dueDateReason}
                    onChange={val => setDueDateReason(val)}
                    placeholder="Why is the due date being changed?"
                    className={`textarea${!dueDateReason.trim() ? ' input-error' : ''}`}
                  />
                </div>
              )}

              {form.status === 'DONE' && (
                <div className="form-group">
                  <label className="form-label" style={{ color: '#f97316' }}>Resolution / Action Taken *</label>
                  <SmartTextarea
                    rows={3}
                    value={form.resolution || ''}
                    onChange={val => setForm(f => ({ ...f, resolution: val }))}
                    placeholder="What was done to resolve this ticket? (required to close)"
                    className={`textarea${!form.resolution?.trim() ? ' input-error' : ''}`}
                  />
                </div>
              )}

              {error && <p className="error-text">{error}</p>}

              <div className="modal-actions">
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete Ticket'}
                </button>
              </div>
            </div>

            <div className="modal-sidebar">
              <CommentThread ticket={ticket} onUpdated={loadTicket} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
