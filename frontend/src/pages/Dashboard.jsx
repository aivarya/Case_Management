import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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

// ─── Invoice helpers (shared with InvoicePage) ────────────────────────────────
const USD_TO_AED = 3.6725;
function toAED(amount, currency) { return currency === 'USD' ? amount * USD_TO_AED : amount; }
function fmtAED(amount) { return 'AED ' + amount.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function parseTermsDays(pt) {
  if (!pt) return null;
  const lower = pt.toLowerCase().trim();
  if (lower === 'immediate' || lower === 'cod') return 0;
  const m = lower.match(/\d+/);
  return m ? parseInt(m[0]) : null;
}

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
      className="recent-ticket-card"
    >
      {/* Row 1: priority badge + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
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
        <span style={{ fontSize: '12px', color: '#555', flexShrink: 0 }}>›</span>
      </div>
      {/* Row 2: calendar date (left) + avatar+name (right) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '11px', color: '#555' }}>📅</span>
          <span style={{ fontSize: '11px', color: '#555' }}>{dateStr}</span>
        </div>
        {ticket.assignedTo?.name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {initials
              ? <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#6c63ff', color: '#fff', fontSize: '9px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials}</span>
              : null
            }
            <span style={{ fontSize: '11px', color: '#666' }}>{ticket.assignedTo.name}</span>
          </div>
        )}
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

function PerformanceKPIs({ tickets }) {
  const now = new Date();
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
  const monthAgo = new Date(now); monthAgo.setDate(now.getDate() - 30);

  const weeklyOpened   = tickets.filter(t => new Date(t.createdAt) >= weekAgo).length;
  const weeklyResolved = tickets.filter(t => t.status === 'DONE' && new Date(t.updatedAt) >= weekAgo).length;
  const monthlyOpened  = tickets.filter(t => new Date(t.createdAt) >= monthAgo).length;
  const monthlyRes     = tickets.filter(t => t.status === 'DONE' && new Date(t.updatedAt) >= monthAgo).length;
  const monthlyRate    = monthlyOpened > 0 ? Math.round((monthlyRes / monthlyOpened) * 100) : 0;

  const kpis = [
    { value: weeklyOpened,       label: 'Weekly Opened',          accent: '#6c63ff' },
    { value: weeklyResolved,     label: 'Weekly Resolved',        accent: '#00c2ff' },
    { value: monthlyOpened,      label: 'Monthly Opened',         accent: '#b044ff' },
    { value: `${monthlyRate}%`,  label: 'Monthly Resolution Rate', accent: '#22c55e' },
  ];

  return (
    <div className="dashboard-metrics" style={{ marginTop: '10px' }}>
      {kpis.map(k => (
        <div key={k.label} className="metric-card" style={{ '--metric-accent': k.accent }}>
          <div style={{ fontSize: '26px', fontWeight: 700, color: k.accent, lineHeight: 1.1 }}>{k.value}</div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{k.label}</div>
        </div>
      ))}
    </div>
  );
}

function WeeklyTrend({ tickets }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const now = new Date();
    const weeks = Array.from({ length: 4 }, (_, i) => {
      const end = new Date(now); end.setDate(now.getDate() - i * 7);
      const start = new Date(end); start.setDate(end.getDate() - 6);
      return { start, end, label: `Wk ${4 - i}` };
    }).reverse();

    const opened   = weeks.map(w => tickets.filter(t => { const d = new Date(t.createdAt); return d >= w.start && d <= w.end; }).length);
    const resolved = weeks.map(w => tickets.filter(t => { const d = new Date(t.updatedAt); return t.status === 'DONE' && d >= w.start && d <= w.end; }).length);

    const chart = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: weeks.map(w => w.label),
        datasets: [
          { label: 'Opened',   data: opened,   borderColor: '#378ADD', backgroundColor: 'rgba(55,138,221,0.1)',  fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2 },
          { label: 'Resolved', data: resolved, borderColor: '#1D9E75', backgroundColor: 'rgba(29,158,117,0.1)', fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2 },
        ],
      },
      options: {
        ...COMMON,
        scales: {
          x: { ticks: TICK, grid: { color: GRID } },
          y: { min: 0, ticks: { ...TICK, stepSize: 1 }, grid: { color: GRID } },
        },
      },
    });
    return () => chart.destroy();
  }, [tickets]);

  return (
    <div style={CARD_STYLE}>
      <p style={SECTION_LABEL}>Weekly Trend — Last 4 Weeks</p>
      <ChartLegend items={[{ label: 'Opened', color: '#378ADD' }, { label: 'Resolved', color: '#1D9E75' }]} />
      <div style={{ position: 'relative', height: '180px' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

function MonthlyTrend({ tickets }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) };
    });

    const opened   = months.map(m => tickets.filter(t => { const d = new Date(t.createdAt); return d.getFullYear() === m.year && d.getMonth() === m.month; }).length);
    const resolved = months.map(m => tickets.filter(t => { const d = new Date(t.updatedAt); return t.status === 'DONE' && d.getFullYear() === m.year && d.getMonth() === m.month; }).length);

    const chart = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: months.map(m => m.label),
        datasets: [
          { label: 'Opened',   data: opened,   backgroundColor: 'rgba(55,138,221,0.85)',  barPercentage: 0.6, categoryPercentage: 0.7, borderRadius: 3 },
          { label: 'Resolved', data: resolved, backgroundColor: 'rgba(29,158,117,0.85)', barPercentage: 0.6, categoryPercentage: 0.7, borderRadius: 3 },
        ],
      },
      options: {
        ...COMMON,
        scales: {
          x: { ticks: TICK, grid: { display: false } },
          y: { min: 0, ticks: { ...TICK, stepSize: 1 }, grid: { color: GRID } },
        },
      },
    });
    return () => chart.destroy();
  }, [tickets]);

  return (
    <div style={CARD_STYLE}>
      <p style={SECTION_LABEL}>Monthly Trend — Last 6 Months</p>
      <ChartLegend items={[{ label: 'Opened', color: 'rgba(55,138,221,0.85)' }, { label: 'Resolved', color: 'rgba(29,158,117,0.85)' }]} />
      <div style={{ position: 'relative', height: '180px' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

// ─── Supplier Invoice Summary (admin only) ───────────────────────────────────

function SupplierInvoiceSummary({ invoices, suppliers, onNavigate }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const rowMap = {};
  suppliers.forEach(s => {
    rowMap[s.id] = { supplier: s, outstanding: 0, totalAED: 0, overdueAED: 0 };
  });

  invoices.forEach(inv => {
    if (inv.status === 'PAID' || inv.status === 'REJECTED') return;
    const row = rowMap[inv.supplierId];
    if (!row) return;
    const amtAED = toAED(inv.amount, inv.currency);
    row.outstanding++;
    row.totalAED += amtAED;
    const termsDays = parseTermsDays(row.supplier.paymentTerms);
    if (termsDays !== null) {
      const due = new Date(inv.invoiceDate);
      due.setDate(due.getDate() + termsDays);
      due.setHours(0, 0, 0, 0);
      if (today > due) row.overdueAED += amtAED;
    }
  });

  const rows = Object.values(rowMap)
    .filter(r => r.outstanding > 0)
    .sort((a, b) => b.totalAED - a.totalAED);

  if (rows.length === 0) return null;

  const totalInv    = rows.reduce((s, r) => s + r.outstanding, 0);
  const grandTotal  = rows.reduce((s, r) => s + r.totalAED, 0);
  const grandOverdue = rows.reduce((s, r) => s + r.overdueAED, 0);

  return (
    <div style={{ ...CARD_STYLE, marginTop: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <p style={{ ...SECTION_LABEL, marginBottom: 0 }}>Supplier Invoice Summary</p>
        <button className="btn btn-ghost btn-sm" onClick={onNavigate} style={{ fontSize: '11px' }}>View All →</button>
      </div>
      <div className="list-table-wrapper">
        <table className="list-table" style={{ fontSize: '12px' }}>
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Payment Terms</th>
              <th style={{ textAlign: 'right' }}>Outstanding Inv.</th>
              <th style={{ textAlign: 'right' }}>Total Due (AED)</th>
              <th style={{ textAlign: 'right' }}>Overdue (AED)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.supplier.id}>
                <td style={{ fontWeight: 500 }}>{row.supplier.name}</td>
                <td><span className="inv-terms-badge">{row.supplier.paymentTerms}</span></td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.outstanding}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--primary)' }}>{fmtAED(row.totalAED)}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {row.overdueAED > 0
                    ? <span style={{ color: '#ef4444', fontWeight: 600 }}>{fmtAED(row.overdueAED)}</span>
                    : <span style={{ color: '#444' }}>—</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '1px solid #222' }}>
              <td colSpan={2} style={{ fontWeight: 600, color: '#666', fontSize: '11px', paddingTop: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</td>
              <td style={{ textAlign: 'right', fontWeight: 700, paddingTop: '8px' }}>{totalInv}</td>
              <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)', paddingTop: '8px' }}>{fmtAED(grandTotal)}</td>
              <td style={{ textAlign: 'right', fontWeight: 700, color: grandOverdue > 0 ? '#ef4444' : '#444', paddingTop: '8px' }}>
                {grandOverdue > 0 ? fmtAED(grandOverdue) : '—'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {grandOverdue > 0 && (
        <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>⚠</span>
          <span>{fmtAED(grandOverdue)} requires immediate settlement</span>
        </p>
      )}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => { loadTickets(); }, []);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    Promise.all([api.getInvoices(), api.getSuppliers()])
      .then(([invs, sups]) => { setInvoices(invs); setSuppliers(sups); })
      .catch(() => {});
  }, [user]);

  async function loadTickets() {
    try {
      const data = await api.getTickets();
      setTickets(data);
    } finally {
      setLoading(false);
    }
  }

  const today     = new Date();
  today.setHours(0, 0, 0, 0);

  const isAdmin      = user?.role === 'ADMIN';
  const openTickets  = tickets.filter(t => t.status !== 'DONE');
  const overdueTickets = tickets.filter(t => t.dueDate && new Date(t.dueDate) < today && t.status !== 'DONE');
  const recent       = [...tickets].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 7);

  if (loading) return <div className="loading">Loading...</div>;

  const metrics = [
    { value: openTickets.length,                                                              label: 'Open Tickets',    filter: 'open',     accent: '#7b8fff' },
    { value: overdueTickets.length,                                                           label: 'Overdue Tickets', filter: 'overdue',  accent: '#ef4444' },
    { value: tickets.filter(t => t.status === 'DONE').length,                                label: 'Resolved',        filter: 'resolved', accent: '#22c55e' },
    { value: tickets.filter(t => t.priority === 'CRITICAL' && t.status !== 'DONE').length,   label: 'Critical Open',   filter: 'critical', accent: '#f97316' },
  ];

  return (
    <div className="page">

      {/* Page header */}
      <div className="page-header">
        <h1>Dashboard</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Ticket</button>
      </div>

      {/* Row 1 — Metric cards */}
      <div className="dashboard-metrics">
        {metrics.map(m => (
          <div
            key={m.label}
            className="metric-card"
            onClick={() => navigate(`/list?filter=${m.filter}`)}
            style={{ '--metric-accent': m.accent }}
          >
            <div style={{ fontSize: '26px', fontWeight: 700, color: m.accent, lineHeight: 1.1 }}>{m.value}</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Row 2 — Recently updated (1fr) + Charts (2fr) */}
      <div className="dashboard-main">

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

      {/* Row 3 — Performance KPIs (all users) */}
      <PerformanceKPIs tickets={tickets} />

      {/* Row 4 — Admin only: 3 charts */}
      {isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
          <AgentPerformance tickets={tickets} />
          <WeeklyTrend tickets={tickets} />
          <MonthlyTrend tickets={tickets} />
        </div>
      )}

      {/* Row 5 — Admin only: Supplier Invoice Summary */}
      {isAdmin && (
        <SupplierInvoiceSummary
          invoices={invoices}
          suppliers={suppliers}
          onNavigate={() => navigate('/invoices')}
        />
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
