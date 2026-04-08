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

/* ─── Communities ─── */
export const communitiesApi = {
  list: () => api('/communities'),
  create: (body) => api('/communities', { method: 'POST', json: body }),
  getOne: (id) => api(`/communities/${id}`),
  join: (id) => api(`/communities/${id}/join`, { method: 'POST' }),
  posts: (id) => api(`/communities/${id}/posts`),
  createPost: (id, body) =>
    api(`/communities/${id}/posts`, { method: 'POST', json: body }),
}

/* ─── Posts ─── */
export const postsApi = {
  getOne: (id) => api(`/posts/${id}`),
  update: (id, body) => api(`/posts/${id}`, { method: 'PATCH', json: body }),
  remove: (id) => api(`/posts/${id}`, { method: 'DELETE' }),
  comments: (id) => api(`/posts/${id}/comments`),
  addComment: (id, body) =>
    api(`/posts/${id}/comments`, { method: 'POST', json: body }),
}

/* ─── Comments ─── */
export const commentsApi = {
  update: (id, body) =>
    api(`/comments/${id}`, { method: 'PATCH', json: body }),
  remove: (id) => api(`/comments/${id}`, { method: 'DELETE' }),
}

/* ─── Likes ─── */
export const likesApi = {
  like: (body) => api('/likes', { method: 'POST', json: body }),
  unlike: (body) => api('/likes', { method: 'DELETE', json: body }),
}

/* ─── Saved posts ─── */
export const savedPostsApi = {
  list: () => api('/saved-posts'),
  save: (postId) => api('/saved-posts', { method: 'POST', json: { postId } }),
  unsave: (postId) =>
    api('/saved-posts', { method: 'DELETE', json: { postId } }),
}

/* ─── Inventory ─── */
export const inventoryApi = {
  items: () => api('/inventory/items'),
  create: (body) => api('/inventory/items', { method: 'POST', json: body }),
  update: (id, body) =>
    api(`/inventory/items/${id}`, { method: 'PATCH', json: body }),
  remove: (id) => api(`/inventory/items/${id}`, { method: 'DELETE' }),
  logUsage: (id, body) =>
    api(`/inventory/items/${id}/usage`, { method: 'POST', json: body }),
  usageHistory: (id) => api(`/inventory/items/${id}/usage`),
  aiSummary: () => api('/inventory/summary/for-ai'),
}

/* ─── Admin ─── */
export const adminApi = {
  pendingApprovals: () => api('/admin/pending-approvals'),
  setApproval: (body) =>
    api('/admin/approvals', { method: 'PATCH', json: body }),
  moderatePost: (postId, body) =>
    api(`/admin/posts/${postId}`, { method: 'PATCH', json: body }),
}
