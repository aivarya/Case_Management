import { useState } from 'react';
import { api } from '../api';

export default function SmartTextarea({ value, onChange, placeholder, rows = 3, className = 'textarea' }) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [hint, setHint] = useState('');

  async function handleImprove() {
    if (!value.trim()) return;
    setLoading(true);
    setHint('');
    setSuggestion(null);
    try {
      const { corrected } = await api.improveText(value);
      if (corrected && corrected !== value.trim()) {
        setSuggestion(corrected);
      } else {
        setHint('No changes suggested.');
      }
    } catch {
      setHint('AI unavailable. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="smart-textarea-wrapper">
      <textarea
        className={className}
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ fontSize: '11px', padding: '2px 10px' }}
          onClick={handleImprove}
          disabled={loading || !value.trim()}
        >
          {loading ? '...' : '✨ Improve'}
        </button>
        {hint && (
          <span style={{ fontSize: '11px', color: hint.includes('unavailable') ? '#ef4444' : '#888' }}>
            {hint}
          </span>
        )}
      </div>
      {suggestion && (
        <div className="smart-suggestion">
          <p className="smart-suggestion-label">Suggested</p>
          <p className="smart-suggestion-text">{suggestion}</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: '11px', padding: '3px 12px' }}
              onClick={() => { onChange(suggestion); setSuggestion(null); }}
            >
              Accept
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: '11px', padding: '3px 12px' }}
              onClick={() => setSuggestion(null)}
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
