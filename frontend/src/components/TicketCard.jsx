import React from 'react';

const PRIORITY_COLORS = {
  LOW: '#22c55e',
  MEDIUM: '#3b82f6',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
};

export default function TicketCard({ ticket, onClick }) {
  const isOverdue = ticket.dueDate && new Date(ticket.dueDate) < new Date() && ticket.status !== 'DONE';
  const initials = ticket.assignedTo?.name
    ? ticket.assignedTo.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : null;

  return (
    <div className="ticket-card" onClick={() => onClick && onClick(ticket)}>
      <div className="ticket-card-header">
        <span
          className="priority-badge"
          style={{ backgroundColor: PRIORITY_COLORS[ticket.priority] }}
        >
          {ticket.priority}
        </span>
        {ticket._count?.comments > 0 && (
          <span className="comment-count">💬 {ticket._count.comments}</span>
        )}
      </div>
      <div className="ticket-card-title">{ticket.title}</div>
      <div className="ticket-card-footer">
        {ticket.assignedTo ? (
          <span className="assignee-avatar" title={ticket.assignedTo.name}>{initials}</span>
        ) : (
          <span className="unassigned">Unassigned</span>
        )}
        {ticket.dueDate && (
          <span className={`due-date ${isOverdue ? 'overdue' : ''}`}>
            {isOverdue ? '⚠️ ' : '📅 '}
            {new Date(ticket.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}
