/**
 * Soil Sage API client.
 * Vite dev proxy forwards /api to the Express server.
 */
const API_BASE = '/api/v1'
const TOKEN_KEY = 'soil_sage_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

/**
 * JSON fetch with optional Bearer auth.
 * @param {string} path  e.g. '/auth/login'
 * @param {RequestInit & { json?: unknown }} [opts]
 */
export async function api(path, opts = {}) {
  const { json, headers: hdr, ...rest } = opts
  const headers = new Headers(hdr)
  if (json !== undefined) {
    headers.set('Content-Type', 'application/json')
    rest.body = JSON.stringify(json)
  }
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers })
  const text = await res.text()
  let data = null
  if (text) {
    try { data = JSON.parse(text) } catch { data = { raw: text } }
  }
  if (!res.ok) {
    const err = new Error(data?.error || res.statusText || 'Request failed')
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

/* ─── Auth ─── */
export const authApi = {
  login: (body) => api('/auth/login', { method: 'POST', json: body }),
  register: (body) => api('/auth/register', { method: 'POST', json: body }),
  me: () => api('/auth/me'),
}

/* ─── Users ─── */
export const usersApi = {
  updateMe: (body) => api('/users/me', { method: 'PATCH', json: body }),
}

/* ─── Lands ─── */
export const landsApi = {
  create: (body) => api('/lands', { method: 'POST', json: body }),
  mine: () => api('/lands/mine'),
  getOne: (id) => api(`/lands/${id}`),
  update: (id, body) => api(`/lands/${id}`, { method: 'PATCH', json: body }),
  remove: (id) => api(`/lands/${id}`, { method: 'DELETE' }),
  nearby: (params) => {
    const q = new URLSearchParams(params).toString()
    return api(`/lands/nearby?${q}`)
  },
}

/* ─── Rentals ─── */
export const rentalsApi = {
  create: (body) => api('/rentals/requests', { method: 'POST', json: body }),
  outgoing: () => api('/rentals/requests/mine/outgoing'),
  incoming: () => api('/rentals/requests/mine/incoming'),
  decide: (id, body) =>
    api(`/rentals/requests/${id}`, { method: 'PATCH', json: body }),
}

/* ─── Notifications ─── */
export const notificationsApi = {
  list: () => api('/notifications'),
  markRead: (id) => api(`/notifications/${id}/read`, { method: 'PATCH' }),
  readAll: () => api('/notifications/read-all', { method: 'POST' }),
}
