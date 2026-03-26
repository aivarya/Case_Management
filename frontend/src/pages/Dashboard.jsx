import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../App';
import TicketCard from '../components/TicketCard';
import TicketModal from '../components/TicketModal';
import CreateTicketForm from './CreateTicketForm';

export default function Dashboard() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { loadTickets(); }, []);

  async function loadTickets() {
    try {
      const data = await api.getTickets();
      setTickets(data);
    } finally {
      setLoading(false);
    }
  }

  const openTickets = tickets.filter(t => t.status !== 'DONE');
  const myTickets = tickets.filter(t => t.assignedTo?.id === user?.id && t.status !== 'DONE');
  const recent = [...tickets].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Ticket</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{openTickets.length}</div>
          <div className="stat-label">Open Tickets</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{myTickets.length}</div>
          <div className="stat-label">Assigned to Me</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{tickets.filter(t => t.status === 'DONE').length}</div>
          <div className="stat-label">Resolved</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{tickets.filter(t => t.priority === 'CRITICAL' && t.status !== 'DONE').length}</div>
          <div className="stat-label">Critical Open</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <h2>Recently Updated</h2>
          <div className="ticket-list">
            {recent.length === 0 && <p className="empty-state">No tickets yet.</p>}
            {recent.map(t => (
              <TicketCard key={t.id} ticket={t} onClick={t => setSelectedTicketId(t.id)} />
            ))}
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Assigned to Me</h2>
          <div className="ticket-list">
            {myTickets.length === 0 && <p className="empty-state">No tickets assigned to you.</p>}
            {myTickets.map(t => (
              <TicketCard key={t.id} ticket={t} onClick={t => setSelectedTicketId(t.id)} />
            ))}
          </div>
        </div>
      </div>

      {showCreate && (
        <CreateTicketForm
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadTickets(); }}
        />
      )}

      {selectedTicketId && (
        <TicketModal
          ticketId={selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
          onUpdated={loadTickets}
        />
      )}
    </div>
  );
}
