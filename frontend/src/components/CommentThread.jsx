import { useState } from 'react';
import { api } from '../api';

export default function CommentThread({ ticket, onUpdated }) {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await api.addComment(ticket.id, body.trim());
      setBody('');
      onUpdated && onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="comment-thread">
      <h4 className="section-label">Comments</h4>

      {ticket.comments?.length === 0 && (
        <p className="empty-state">No comments yet.</p>
      )}

      <div className="comment-list">
        {ticket.comments?.map(comment => (
          <div key={comment.id} className="comment-item">
            <div className="comment-meta">
              <span className="comment-author">{comment.author.name}</span>
              <span className="comment-time">{new Date(comment.createdAt).toLocaleString()}</span>
            </div>
            <div className="comment-body">{comment.body}</div>
          </div>
        ))}
      </div>

      <form className="comment-form" onSubmit={handleSubmit}>
        <textarea
          className="textarea"
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
        />
        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Posting...' : 'Post Comment'}
        </button>
      </form>

      {ticket.activityLog?.length > 0 && (
        <>
          <h4 className="section-label" style={{ marginTop: '1.5rem' }}>Activity</h4>
          <div className="activity-log">
            {ticket.activityLog.map(log => {
              const isDueDateChange = log.action.startsWith('Due date changed');
              return (
                <div key={log.id} className="activity-item" style={isDueDateChange ? { color: '#ef4444' } : undefined}>
                  <span className="activity-dot" style={isDueDateChange ? { background: '#ef4444' } : undefined} />
                  <span className="activity-text">
                    {log.performedBy.name} — {log.action}
                  </span>
                  <span className="activity-time">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
