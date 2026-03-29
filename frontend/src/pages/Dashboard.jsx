import { useState, useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import { api } from '../api';
import { useAuth } from '../App';
import TicketModal from '../components/TicketModal';
import CreateTicketForm from './CreateTicketForm';

// ─── Constants ───────────────────────────────────────────────────────────────

const PRIORITY_COLORS = {
  CRITICAL: '#E24B4A',
  HIGH:     '#EF9F27',
  MEDIUM:   '#378ADD',
  LOW:      '#639922',
};
const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const TICK   = { color: '#444', font: { size: 10 } };
const GRID   = 'rgba(255,255,255,0.04)';
const COMMON = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

const CARD_STYLE = {
  background: '#111111',
  border: '0.5px solid #222',
  borderRadius: '8px',
  padding: '12px 14px',
};

const SECTION_LABEL = {
  fontSize: '11px',
  color: '#555',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '8px',
  fontWeight: 600,
};

// ─── Shared components ────────────────────────────────────────────────────────

function ChartLegend({ items }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
      {items.map(item => (
        <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#555' }}>
          <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: item.color, display: 'inline-block', flexShrink: 0 }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function RecentTicketCard({ ticket, onClick }) {
  const initials = ticket.assignedTo?.name
    ? ticket.assignedTo.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : null;
  const dateStr = ticket.updatedAt
    ? new Date(ticket.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : '';

  return (
    <div
      onClick={onClick}
      style={{ background: '#111', border: '0.5px solid #222', borderRadius: '8px', padding: '10px 12px', cursor: 'pointer', transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#6c63ff'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#222'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
        <span style={{
          background: PRIORITY_COLORS[ticket.priority] || '#555',
          color: '#fff', fontSize: '10px', fontWeight: 700,
          padding: '2px 6px', borderRadius: '4px',
          textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0,
        }}>
          {ticket.priority}
        </span>
        <span style={{ fontSize: '13px', color: '#cccccc', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ticket.title}
        </span>
        {ticket.assignedTo?.name && (
          <span style={{ fontSize: '11px', color: '#888', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {ticket.assignedTo.name}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {initials
          ? <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#6c63ff', color: '#fff', fontSize: '9px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials}</span>
          : <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#222', flexShrink: 0 }} />
        }
        <span style={{ fontSize: '11px', color: '#444' }}>{dateStr}</span>
      </div>
    </div>
  );
}

// ─── Chart components ─────────────────────────────────────────────────────────

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
          hoverOffset: 4,
        }],
      },
      options: { ...COMMON, cutout: '35%' },
    });
    return () => chart.destroy();
  }, [tickets]);

  return (
    <div style={CARD_STYLE}>
      <p style={SECTION_LABEL}>Tickets by Priority</p>
      <ChartLegend items={PRIORITIES.map((p, i) => ({
        label: `${p.charAt(0) + p.slice(1).toLowerCase()} (${counts[i]})`,
        color: PRIORITY_COLORS[p],
      }))} />
      <div style={{ position: 'relative', height: '170px' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

function TrendLine({ tickets }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return d;
    });
    const labels   = days.map(d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
    const opened   = days.map(d => tickets.filter(t => new Date(t.createdAt).toDateString() === d.toDateString()).length);
    const resolved = days.map(d => tickets.filter(t => t.status === 'DONE' && new Date(t.updatedAt).toDateString() === d.toDateString()).length);

    const chart = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Opened',   data: opened,   borderColor: '#378ADD', backgroundColor: 'rgba(55,138,221,0.1)',  fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2 },
          { label: 'Resolved', data: resolved, borderColor: '#1D9E75', backgroundColor: 'rgba(29,158,117,0.1)', fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2 },
        ],
      },
      options: {
        ...COMMON,
        scales: {
          x: { ticks: { ...TICK, autoSkip: false, maxRotation: 30 }, grid: { color: GRID } },
          y: { min: 0, ticks: { ...TICK, stepSize: 1 }, grid: { color: GRID } },
        },
      },
    });
    return () => chart.destroy();
  }, [tickets]);

  return (
    <div style={CARD_STYLE}>
      <p style={SECTION_LABEL}>Ticket Trend — Last 7 Days</p>
      <ChartLegend items={[{ label: 'Opened', color: '#378ADD' }, { label: 'Resolved', color: '#1D9E75' }]} />
      <div style={{ position: 'relative', height: '170px' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

function AgentPerformance({ tickets }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const agentMap = {};
    tickets.forEach(t => {
      if (t.assignedTo) {
        const { id, name } = t.assignedTo;
        if (!agentMap[id]) agentMap[id] = { name, assigned: 0, resolved: 0 };
        agentMap[id].assigned++;
        if (t.status === 'DONE') agentMap[id].resolved++;
      }
    });
    const agents        = Object.values(agentMap);
    const agentNames    = agents.length ? agents.map(a => a.name)     : ['No agents'];
    const assignedData  = agents.length ? agents.map(a => a.assigned) : [0];
    const resolvedData  = agents.length ? agents.map(a => a.resolved) : [0];

    const chart = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: agentNames,
        datasets: [
          { label: 'Assigned', data: assignedData, backgroundColor: 'rgba(0,194,255,0.85)',  barPercentage: 0.6, categoryPercentage: 0.7, borderRadius: 3 },
          { label: 'Resolved', data: resolvedData, backgroundColor: 'rgba(176,68,255,0.85)', barPercentage: 0.6, categoryPercentage: 0.7, borderRadius: 3 },
        ],
      },
      options: {
        ...COMMON,
        scales: {
          x: { ticks: { ...TICK, autoSkip: false, maxRotation: 30 }, grid: { display: false } },
          y: { min: 0, ticks: { ...TICK, stepSize: 1 }, grid: { color: GRID } },
        },
      },
    });
    return () => chart.destroy();
  }, [tickets]);

  return (
    <div style={CARD_STYLE}>
      <p style={SECTION_LABEL}>Agent Performance — Assigned vs Resolved</p>
      <ChartLegend items={[{ label: 'Assigned', color: 'rgba(0,194,255,0.85)' }, { label: 'Resolved', color: 'rgba(176,68,255,0.85)' }]} />
      <div style={{ position: 'relative', height: '180px' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

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

  const isAdmin     = user?.role === 'ADMIN';
  const openTickets = tickets.filter(t => t.status !== 'DONE');
  const myTickets   = tickets.filter(t => t.assignedTo?.id === user?.id && t.status !== 'DONE');
  const recent      = [...tickets].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 7);

  if (loading) return <div className="loading">Loading...</div>;

  const metrics = [
    { value: openTickets.length,                                                               label: 'Open Tickets'   },
    { value: myTickets.length,                                                                 label: 'Assigned to Me' },
    { value: tickets.filter(t => t.status === 'DONE').length,                                 label: 'Resolved'       },
    { value: tickets.filter(t => t.priority === 'CRITICAL' && t.status !== 'DONE').length,    label: 'Critical Open'  },
  ];

  return (
    <div className="page">

      {/* Page header */}
      <div className="page-header">
        <h1>Dashboard</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Ticket</button>
      </div>

      {/* Row 1 — Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
        {metrics.map(m => (
          <div key={m.label} style={{ background: '#111111', border: '0.5px solid #222', borderRadius: '8px', padding: '14px 16px' }}>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#7b8fff', lineHeight: 1.1 }}>{m.value}</div>
            <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Row 2 — Recently updated (1fr) + Charts (2fr) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '12px' }}>

        {/* Left — recently updated */}
        <div>
          <p style={SECTION_LABEL}>Recently Updated</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {recent.length === 0
              ? <p style={{ fontSize: '13px', color: '#444' }}>No tickets yet.</p>
              : recent.map(t => (
                  <RecentTicketCard key={t.id} ticket={t} onClick={() => setSelectedTicketId(t.id)} />
                ))
            }
          </div>
        </div>

        {/* Right — Donut + Line stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <PriorityDonut tickets={tickets} />
          <TrendLine tickets={tickets} />
        </div>

      </div>

      {/* Row 3 — Agent performance (Admin only) */}
      {isAdmin && <AgentPerformance tickets={tickets} />}

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
