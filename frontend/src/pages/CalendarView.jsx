import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { api } from '../api';
import TicketModal from '../components/TicketModal';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { 'en-US': enUS },
});

const PRIORITY_COLORS = {
  LOW: '#22c55e',
  MEDIUM: '#3b82f6',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
};

function eventStyleGetter(event) {
  return {
    style: {
      backgroundColor: PRIORITY_COLORS[event.priority] || '#3b82f6',
      borderRadius: '4px',
      color: '#fff',
      border: 'none',
      fontSize: '0.8rem',
    },
  };
}

export default function CalendarView() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  useEffect(() => { loadTickets(); }, []);

  async function loadTickets() {
    try {
      const data = await api.getTickets();
      setTickets(data);
    } finally {
      setLoading(false);
    }
  }

  const events = tickets
    .filter(t => t.dueDate)
    .map(t => ({
      id: t.id,
      title: `[${t.priority}] ${t.title}`,
      start: new Date(t.dueDate),
      end: new Date(t.dueDate),
      allDay: true,
      priority: t.priority,
    }));

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Calendar View</h1>
        {events.length === 0 && (
          <span className="hint-text">Tickets with due dates will appear here</span>
        )}
      </div>

      <div className="calendar-legend">
        {Object.entries(PRIORITY_COLORS).map(([p, color]) => (
          <span key={p} className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: color }} />
            {p}
          </span>
        ))}
      </div>

      <div className="calendar-container">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={event => setSelectedTicketId(event.id)}
          views={['month', 'week', 'agenda']}
          defaultView="month"
          popup
        />
      </div>

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
