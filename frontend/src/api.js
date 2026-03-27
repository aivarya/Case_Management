const BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (res.status === 401) {
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    return;
  }

  if (!res.ok) {
    const text = await res.text();
    let message = 'Request failed';
    try { message = JSON.parse(text).error || message; } catch { message = text || message; }
    throw new Error(message);
  }

  return res.json();
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  changePassword: (currentPassword, newPassword) => request('/auth/password', { method: 'PATCH', body: JSON.stringify({ currentPassword, newPassword }) }),

  // Tickets
  getTickets: () => request('/tickets'),
  getTicket: (id) => request(`/tickets/${id}`),
  createTicket: (data) => request('/tickets', { method: 'POST', body: JSON.stringify(data) }),
  updateTicket: (id, data) => request(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTicket: (id) => request(`/tickets/${id}`, { method: 'DELETE' }),

  // Comments
  addComment: (ticketId, body) => request(`/tickets/${ticketId}/comments`, { method: 'POST', body: JSON.stringify({ body }) }),

  // Users
  getUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  toggleDisableUser: (id) => request(`/users/${id}/disable`, { method: 'PATCH' }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
};
