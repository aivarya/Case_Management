import { useState, useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import { api } from '../api';
import { useAuth } from '../App';
import TicketCard from '../components/TicketCard';
import TicketModal from '../components/TicketModal';
import CreateTicketForm from './CreateTicketForm';

const PRIORITY_COLORS = {
  CRITICAL: '#E24B4A',
  HIGH:     '#EF9F27',
  MEDIUM:   '#378ADD',
  LOW:      '#639922',
};

const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

function ChartLegend({ items }) {
  return (
    <div className="chart-legend">
      {items.map(item => (
        <span key={item.label} className="chart-legend-item">
          <span className="chart-legend-dot" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function PriorityDonut({ tickets }) {
  const canvasRef = useRef(null);
  const counts = PRIORITIES.map(p => tickets.filter(t => t.priority === p).length);

  useEffect(() => {
    if (!canvasRef.current) return;
    const chart = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: PRIORITIES,
        datasets: [{
          data: PRIORITIES.map(p => tickets.filter(t => t.priority === p).length),
          backgroundColor: PRIORITIES.map(p => PRIORITY_COLORS[p]),
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '35%',
        plugins: { legend: { display: false } },
      },
    });
    return () => chart.destroy();
  }, [tickets]);

  return (
    <div className="chart-card">
      <p className="chart-heading">Tickets by Priority</p>
      <ChartLegend items={PRIORITIES.map((p, i) => ({
        label: `${p.charAt(0) + p.slice(1).toLowerCase()} (${counts[i]})`,
        color: PRIORITY_COLORS[p],
      }))} />
      <div style={{ position: 'relative', height: '220px' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

function TrendLine({ tickets }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const todayInner = new Date();
    const daysInner = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(todayInner);
      d.setDate(todayInner.getDate() - (6 - i));
      return d;
    });
    const labelsInner = daysInner.map(d => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }));
    const opened = daysInner.map(d => tickets.filter(t => new Date(t.createdAt).toDateString() === d.toDateString()).length);
    const resolved = daysInner.map(d => tickets.filter(t => t.status === 'DONE' && new Date(t.updatedAt).toDateString() === d.toDateString()).length);

    const chart = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: labelsInner,
        datasets: [
          {
            label: 'Opened',
            data: opened,
            borderColor: '#378ADD',
            backgroundColor: 'rgba(55,138,221,0.15)',
            fill: true,
            tension: 0.4,
            pointRadius: 3,
          },
          {
            label: 'Resolved',
            data: resolved,
            borderColor: '#1D9E75',
            backgroundColor: 'rgba(29,158,117,0.15)',
            fill: true,
            tension: 0.4,
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(51,65,85,0.5)' } },
          y: { beginAtZero: true, ticks: { color: '#94a3b8', font: { size: 11 }, stepSize: 1 }, grid: { color: 'rgba(51,65,85,0.5)' } },
        },
      },
    });
    return () => chart.destroy();
  }, [tickets]);

  return (
    <div className="chart-card">
      <p className="chart-heading">Ticket Trend — Last 7 Days</p>
      <ChartLegend items={[
        { label: 'Opened', color: '#378ADD' },
        { label: 'Resolved', color: '#1D9E75' },
      ]} />
      <div style={{ position: 'relative', height: '220px' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

function AgentPerformance({ tickets }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const agentMapInner = {};
    tickets.forEach(t => {
      if (t.assignedTo) {
        const { id, name } = t.assignedTo;
        if (!agentMapInner[id]) agentMapInner[id] = { name, assigned: 0, resolved: 0 };
        agentMapInner[id].assigned++;
        if (t.status === 'DONE') agentMapInner[id].resolved++;
      }
    });
    const agentsInner = Object.values(agentMapInner);
    const agentNames = agentsInner.length ? agentsInner.map(a => a.name) : ['No agents'];
    const assignedCounts = agentsInner.length ? agentsInner.map(a => a.assigned) : [0];
    const resolvedCounts = agentsInner.length ? agentsInner.map(a => a.resolved) : [0];

    const chart = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: agentNames,
        datasets: [
          {
            label: 'Assigned',
            data: assignedCounts,
            backgroundColor: '#378ADD',
            barPercentage: 0.6,
            categoryPercentage: 0.7,
            borderRadius: 4,
          },
          {
            label: 'Resolved',
            data: resolvedCounts,
            backgroundColor: '#1D9E75',
            barPercentage: 0.6,
            categoryPercentage: 0.7,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { color: '#94a3b8', font: { size: 11 }, stepSize: 1 }, grid: { color: 'rgba(51,65,85,0.5)' } },
        },
      },
    });
    return () => chart.destroy();
  }, [tickets]);

  return (
    <div className="chart-card">
      <p className="chart-heading">Agent Performance — Assigned vs Resolved</p>
      <ChartLegend items={[
        { label: 'Assigned', color: '#378ADD' },
        { label: 'Resolved', color: '#1D9E75' },
      ]} />
      <div style={{ position: 'relative', height: '220px' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

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

  const isAdmin = user?.role === 'ADMIN';
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

        {isAdmin ? (
          <div className="charts-admin-right">
            <PriorityDonut tickets={tickets} />
            <TrendLine tickets={tickets} />
          </div>
        ) : (
          <div className="charts-panel">
            <PriorityDonut tickets={tickets} />
            <TrendLine tickets={tickets} />
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="chart-full-width">
          <AgentPerformance tickets={tickets} />
        </div>
      )}

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
