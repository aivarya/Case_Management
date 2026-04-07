import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { api } from '../api';

function ChangePasswordModal({ onClose }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) return setError('New passwords do not match');
    setSaving(true);
    setError('');
    try {
      await api.changePassword(form.currentPassword, form.newPassword);
      setSuccess('Password changed successfully');
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-sm">
        <div className="modal-header">
          <h2>Change Password</h2>
          <button className="btn btn-ghost modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input type="password" className="input" value={form.currentPassword} onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input type="password" className="input" value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input type="password" className="input" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} />
          </div>
          {error && <p className="error-text">{error}</p>}
          {success && <p className="success-text">{success}</p>}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Change Password'}</button>
            <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Navbar() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await api.logout();
    setUser(null);
    navigate('/login');
  }

  function closeMenu() { setMenuOpen(false); }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">
          <span className="navbar-logo">🎫</span>
          <span className="navbar-title">IT Case Manager</span>
        </div>
        <button className="navbar-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu">
          {menuOpen ? '✕' : '☰'}
        </button>
        <div className={`navbar-links${menuOpen ? ' open' : ''}`}>
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>Dashboard</NavLink>
          <NavLink to="/kanban" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>Kanban</NavLink>
          <NavLink to="/calendar" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>Calendar</NavLink>
          <NavLink to="/list" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>List</NavLink>
          {user?.role === 'ADMIN' && (
            <NavLink to="/invoices" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>Invoices</NavLink>
          )}
          {user?.role === 'ADMIN' && (
            <NavLink to="/admin" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>Admin</NavLink>
          )}
        </div>
        <div className={`navbar-user${menuOpen ? ' open' : ''}`}>
          <span className="user-name">{user?.name}</span>
          <span className={`role-badge role-${user?.role?.toLowerCase()}`}>{user?.role}</span>
          <button className="btn btn-ghost" onClick={() => { setShowChangePassword(true); closeMenu(); }}>🔑 Password</button>
          <button className="btn btn-ghost" onClick={handleLogout}>Logout</button>
        </div>
      </nav>
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </>
  );
}
