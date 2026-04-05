import React, { useState, useEffect } from 'react';
import { api } from '../api';
import SmartTextarea from '../components/SmartTextarea';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function CreateTicketForm({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', requestor: '', priority: 'MEDIUM', dueDate: '', assignedToId: '' });
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.getUsers().then(setUsers).catch(() => {}); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return setError('Title is required');
    setSaving(true);
    setError('');
    try {
      await api.createTicket({
        ...form,
        assignedToId: form.assignedToId || null,
        dueDate: form.dueDate || null,
      });
      onCreated();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal modal-sm">
        <div className="modal-header">
          <h2>New Ticket</h2>
          <button className="btn btn-ghost modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus placeholder="Brief description of the issue" />
          </div>
          <div className="form-group">
            <label className="form-label">Requestor *</label>
            <input className="input" value={form.requestor} onChange={e => setForm(f => ({ ...f, requestor: e.target.value }))} placeholder="Who raised this request?" required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <SmartTextarea rows={3} value={form.description} onChange={val => setForm(f => ({ ...f, description: val }))} placeholder="Details, steps to reproduce, etc." />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assign To</label>
              <select className="select" value={form.assignedToId} onChange={e => setForm(f => ({ ...f, assignedToId: e.target.value }))}>
                <option value="">Unassigned</option>
                {users.filter(u => !u.disabled).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input type="date" className="input" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          {error && <p className="error-text">{error}</p>}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Ticket'}</button>
            <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
