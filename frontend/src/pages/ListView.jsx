import React, { useState, useEffect } from 'react';
import { api } from '../api';
import TicketModal from '../components/TicketModal';
import CreateTicketForm from './CreateTicketForm';

const PRIORITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const PRIORITY_COLORS = { LOW: '#22c55e', MEDIUM: '#3b82f6', HIGH: '#f97316', CRITICAL: '#ef4444' };
const STATUS_LABELS = { TODO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', DONE: 'Done' };

function exportCSV(tickets) {
  const headers = ['Ticket ID', 'Title', 'Requestor', 'Description', 'Priority', 'Status', 'Assigned To', 'Created By', 'Start Date', 'Due Date', 'Resolution'];
  const rows = tickets.map(t => [
    t.id,
    t.title,
    t.requestor || '',
    t.description || '',
    t.priority,
    STATUS_LABELS[t.status],
    t.assignedTo?.name || '',
    t.createdBy?.name || '',
    new Date(t.createdAt).toLocaleDateString(),
    t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '',
    t.resolution || '',
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tickets-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportXLSX(tickets) {
  // Build an HTML table and use data URI — works without any library
  const headers = ['Ticket ID', 'Title', 'Requestor', 'Description', 'Priority', 'Status', 'Assigned To', 'Created By', 'Start Date', 'Due Date', 'Resolution'];
  const rows = tickets.map(t => [
    t.id,
    t.title,
    t.requestor || '',
    t.description || '',
    t.priority,
    STATUS_LABELS[t.status],
    t.assignedTo?.name || '',
    t.createdBy?.name || '',
    new Date(t.createdAt).toLocaleDateString(),
    t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '',
    t.resolution || '',
  ]);

  const table = `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${
    rows.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join('')}</tr>`).join('')
  }</tbody></table>`;
  const xls = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body>${table}</body></html>`;
  const blob = new Blob([xls], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tickets-${new Date().toISOString().split('T')[0]}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ListView() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
  const [sortBy, setSortBy] = useState({ field: 'createdAt', dir: 'desc' });

  useEffect(() => { loadTickets(); }, []);

  async function loadTickets() {
    try {
      const data = await api.getTickets();
      setTickets(data);
    } finally {
      setLoading(false);
    }
  }

  function handleSort(field) {
    setSortBy(s => ({ field, dir: s.field === field && s.dir === 'asc' ? 'desc' : 'asc' }));
  }

  function sortIcon(field) {
    if (sortBy.field !== field) return ' ↕';
    return sortBy.dir === 'asc' ? ' ↑' : ' ↓';
  }

  const filtered = tickets
    .filter(t => {
      if (filters.status && t.status !== filters.status) return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        return t.title.toLowerCase().includes(q) || (t.requestor || '').toLowerCase().includes(q) || (t.assignedTo?.name || '').toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      let av, bv;
      if (sortBy.field === 'priority') { av = PRIORITY_ORDER[a.priority]; bv = PRIORITY_ORDER[b.priority]; }
      else if (sortBy.field === 'createdAt') { av = new Date(a.createdAt); bv = new Date(b.createdAt); }
      else if (sortBy.field === 'dueDate') { av = a.dueDate ? new Date(a.dueDate) : Infinity; bv = b.dueDate ? new Date(b.dueDate) : Infinity; }
      else { av = (a[sortBy.field] || '').toString().toLowerCase(); bv = (b[sortBy.field] || '').toString().toLowerCase(); }
      if (av < bv) return sortBy.dir === 'asc' ? -1 : 1;
      if (av > bv) return sortBy.dir === 'asc' ? 1 : -1;
      return 0;
    });

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>All Tickets <span className="ticket-count">({filtered.length})</span></h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={() => exportCSV(filtered)}>⬇ CSV</button>
          <button className="btn btn-ghost" onClick={() => exportXLSX(filtered)}>⬇ Excel</button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Ticket</button>
        </div>
      </div>

      <div className="list-filters">
        <input
          className="input"
          style={{ maxWidth: 260 }}
          placeholder="Search title, requestor, assignee..."
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
        />
        <select className="select" style={{ width: 'auto' }} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Statuses</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="DONE">Done</option>
        </select>
        <select className="select" style={{ width: 'auto' }} value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
          <option value="">All Priorities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        {(filters.status || filters.priority || filters.search) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ status: '', priority: '', search: '' })}>✕ Clear</button>
        )}
      </div>

      <div className="list-table-wrapper">
        <table className="list-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('id')} className="sortable">ID{sortIcon('id')}</th>
              <th onClick={() => handleSort('title')} className="sortable">Title{sortIcon('title')}</th>
              <th onClick={() => handleSort('requestor')} className="sortable">Requestor{sortIcon('requestor')}</th>
              <th onClick={() => handleSort('priority')} className="sortable">Priority{sortIcon('priority')}</th>
              <th onClick={() => handleSort('status')} className="sortable">Status{sortIcon('status')}</th>
              <th>Assigned To</th>
              <th onClick={() => handleSort('createdAt')} className="sortable">Created{sortIcon('createdAt')}</th>
              <th onClick={() => handleSort('dueDate')} className="sortable">Due Date{sortIcon('dueDate')}</th>
              <th>Resolution</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No tickets found</td></tr>
            )}
            {filtered.map(t => {
              const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE';
              return (
                <tr key={t.id} className="list-row" onClick={() => setSelectedTicketId(t.id)}>
                  <td className="id-cell">#{t.id}</td>
                  <td className="title-cell">{t.title}</td>
                  <td>{t.requestor || <span className="text-muted">—</span>}</td>
                  <td>
                    <span className="priority-badge" style={{ backgroundColor: PRIORITY_COLORS[t.priority] }}>{t.priority}</span>
                  </td>
                  <td>
                    <span className={`status-badge status-${t.status.toLowerCase()}`}>{STATUS_LABELS[t.status]}</span>
                  </td>
                  <td>{t.assignedTo?.name || <span className="text-muted">Unassigned</span>}</td>
                  <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td className={isOverdue ? 'overdue' : ''}>
                    {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : <span className="text-muted">—</span>}
                  </td>
                  <td className="resolution-cell">{t.resolution || <span className="text-muted">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateTicketForm onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); loadTickets(); }} />
      )}
      {selectedTicketId && (
        <TicketModal ticketId={selectedTicketId} onClose={() => setSelectedTicketId(null)} onUpdated={loadTickets} />
      )}
    </div>
  );
}
