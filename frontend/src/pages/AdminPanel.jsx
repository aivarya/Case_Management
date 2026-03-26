import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'AGENT' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleDisable(user) {
    try {
      await api.toggleDisableUser(user.id);
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeleteUser(user) {
    if (!window.confirm(`Delete ${user.name}? This cannot be undone.`)) return;
    try {
      await api.deleteUser(user.id);
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return setError('All fields are required');
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.createUser(form);
      setForm({ name: '', email: '', password: '', role: 'AGENT' });
      setSuccess(`User ${form.name} created successfully`);
      loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Admin Panel</h1>
      </div>

      <div className="admin-grid">
        <div className="admin-section">
          <h2>Team Members</h2>
          {loading ? <div className="loading">Loading...</div> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ opacity: u.disabled ? 0.5 : 1 }}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className={`role-badge role-${u.role.toLowerCase()}`}>{u.role}</span></td>
                    <td><span className={`role-badge ${u.disabled ? 'role-disabled' : 'role-active'}`}>{u.disabled ? 'Disabled' : 'Active'}</span></td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleToggleDisable(u)}>
                          {u.disabled ? 'Enable' : 'Disable'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(u)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="admin-section">
          <h2>Add Team Member</h2>
          <form onSubmit={handleCreateUser}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Temporary password" />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="AGENT">Agent</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            {error && <p className="error-text">{error}</p>}
            {success && <p className="success-text">{success}</p>}
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
