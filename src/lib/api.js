/**
 * Soil Sage API client.
 * Vite dev proxy forwards /api to the Express server.
 */
const API_BASE = '/api/v1'
const TOKEN_KEY = 'soil_sage_token'

/** True when fetch() failed before any HTTP response (server down, restart, CORS, DNS). */
function isLikelyNetworkFailure(err) {
  if (!err || typeof err !== 'object') return false
  if (err instanceof TypeError) return true
  const msg = String(err.message || '')
  return /network|failed to fetch|load failed|ecconn/i.test(msg)
}

/**
 * fetch with one retry after a short delay — covers dev `node --watch` restarts where the
 * TCP connection resets (Vite proxy reports ECONNRESET) between teardown and listen.
 * @param {string} url
 * @param {RequestInit} init
 */
async function fetchWithNetworkRetry(url, init) {
  try {
    return await fetch(url, init)
  } catch (first) {
    if (!isLikelyNetworkFailure(first)) throw first
    await new Promise((r) => setTimeout(r, 450))
    return await fetch(url, init)
  }
}

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

  let res
  try {
    res = await fetchWithNetworkRetry(`${API_BASE}${path}`, { ...rest, headers })
  } catch (err) {
    if (isLikelyNetworkFailure(err)) {
      throw new Error(
        'Could not reach the server. If the API just restarted, wait a moment and try again.'
      )
    }
    throw err
  }
  const text = await res.text()
  let data = null
  if (text) {
    try { data = JSON.parse(text) } catch { data = { raw: text } }
  }
  if (!res.ok) {
    const msg = [data?.error, data?.detail].filter(Boolean).join(' — ')
    const err = new Error(msg || res.statusText || 'Request failed')
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

/**
 * Multipart POST (e.g. diagnosis images). Do not set Content-Type — browser sets boundary.
 * @param {string} path
 * @param {FormData} formData
 */
export async function apiForm(path, formData) {
  const headers = new Headers()
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let res
  try {
    res = await fetchWithNetworkRetry(`${API_BASE}${path}`, {
      method: 'POST',
      body: formData,
      headers,
    })
  } catch (err) {
    if (isLikelyNetworkFailure(err)) {
      throw new Error(
        'Could not reach the server. If the API just restarted, wait a moment and try again.'
      )
    }
    throw err
  }
  const text = await res.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { raw: text }
    }
  }
  if (!res.ok) {
    const msg = [data?.error, data?.detail].filter(Boolean).join(' — ')
    const err = new Error(msg || res.statusText || 'Request failed')
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
  /** Public profile card (no email) */
  publicProfile: (userId) => api(`/users/public/${userId}`),
  /** List all approved specialists */
  specialists: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return api(q ? `/users/specialists?${q}` : '/users/specialists')
  },
}

/* ─── Appointments ─── */
export const appointmentsApi = {
  create: (body) => api('/appointments', { method: 'POST', json: body }),
  outgoing: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return api(q ? `/appointments/outgoing?${q}` : '/appointments/outgoing')
  },
  incoming: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return api(q ? `/appointments/incoming?${q}` : '/appointments/incoming')
  },
  updateStatus: (id, body) =>
    api(`/appointments/${id}/status`, { method: 'PATCH', json: body }),
  remove: (id) => api(`/appointments/${id}`, { method: 'DELETE' }),
}

/* ─── Lands ─── */
export const landsApi = {
  create: (body) => api('/lands', { method: 'POST', json: body }),
  mine: () => api('/lands/mine'),
  getOne: (id) => api(`/lands/${id}`),
  update: (id, body) => api(`/lands/${id}`, { method: 'PATCH', json: body }),
  remove: (id) => api(`/lands/${id}`, { method: 'DELETE' }),
  /** All active parcels listed for rent (browse); optional filters on the client. */
  forRent: () => api('/lands/for-rent'),
  nearby: (params) => {
    const q = new URLSearchParams(params).toString()
    return api(`/lands/nearby?${q}`)
  },
  /** Distinct owners with land in radius */
  nearbyOwners: (params) => {
    const q = new URLSearchParams(params).toString()
    return api(`/lands/nearby-owners?${q}`)
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
  mine: () => api('/communities/mine'),
  create: (body) => api('/communities', { method: 'POST', json: body }),
  getOne: (id) => api(`/communities/${id}`),
  join: (id) => api(`/communities/${id}/join`, { method: 'POST' }),
  leave: (id) => api(`/communities/${id}/leave`, { method: 'DELETE' }),
  posts: (id) => api(`/communities/${id}/posts`),
  createPost: (id, body) =>
    api(`/communities/${id}/posts`, { method: 'POST', json: body }),
}

/* ─── Posts ─── */
export const postsApi = {
  /** Posts from followed users in communities you belong to */
  followingFeed: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return api(q ? `/posts/following-feed?${q}` : '/posts/following-feed')
  },
  getOne: (id) => api(`/posts/${id}`),
  update: (id, body) => api(`/posts/${id}`, { method: 'PATCH', json: body }),
  remove: (id) => api(`/posts/${id}`, { method: 'DELETE' }),
  comments: (id) => api(`/posts/${id}/comments`),
  addComment: (id, body) =>
    api(`/posts/${id}/comments`, { method: 'POST', json: body }),
}

/* ─── Solution providers ─── */
export const providersApi = {
  list: () => api('/providers'),
  nearby: (params) => {
    const q = new URLSearchParams(params).toString()
    return api(`/providers/nearby?${q}`)
  },
}

/* ─── Follow graph ─── */
export const followsApi = {
  follow: (userId) => api(`/follows/users/${userId}`, { method: 'POST' }),
  unfollow: (userId) => api(`/follows/users/${userId}`, { method: 'DELETE' }),
  status: (userId) => api(`/follows/users/${userId}/status`),
  followers: (userId, params = {}) => {
    const q = new URLSearchParams(params).toString()
    return api(q ? `/follows/users/${userId}/followers?${q}` : `/follows/users/${userId}/followers`)
  },
  following: (userId, params = {}) => {
    const q = new URLSearchParams(params).toString()
    return api(q ? `/follows/users/${userId}/following?${q}` : `/follows/users/${userId}/following`)
  },
}

/* ─── Discovery (admin science feed) ─── */
export const discoveryApi = {
  articles: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return api(q ? `/discovery/articles?${q}` : '/discovery/articles')
  },
  article: (id) => api(`/discovery/articles/${id}`),
  comments: (id) => api(`/discovery/articles/${id}/comments`),
  addComment: (id, body) =>
    api(`/discovery/articles/${id}/comments`, { method: 'POST', json: body }),
  react: (id, body) =>
    api(`/discovery/articles/${id}/react`, { method: 'POST', json: body }),
}

export const discoveryCommentsApi = {
  update: (id, body) =>
    api(`/discovery-comments/${id}`, { method: 'PATCH', json: body }),
  remove: (id) => api(`/discovery-comments/${id}`, { method: 'DELETE' }),
}

/**
 * POST chat SSE — reads `data: {"delta":"..."}\n\n` until `data: [DONE]\n\n`.
 * No fetch retry (would duplicate the stream).
 *
 * @param {{ messages: Array<{ role: string; content: string }>; signal?: AbortSignal; onDelta?: (chunk: string) => void }} opts
 * @returns {Promise<string>} full assistant text (trimmed)
 */
async function readChatMessageStream({ messages, signal, onDelta }) {
  const headers = new Headers()
  headers.set('Content-Type', 'application/json')
  headers.set('Accept', 'text/event-stream')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${API_BASE}/chat/messages/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages }),
    signal,
  })

  if (!res.ok) {
    const text = await res.text()
    let data = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = { raw: text }
      }
    }
    const msg = [data?.error, data?.detail].filter(Boolean).join(' — ') || res.statusText || 'Request failed'
    const err = new Error(msg)
    err.status = res.status
    err.data = data
    throw err
  }

  if (!res.body) throw new Error('No response body')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''
  let sawDone = false

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      for (;;) {
        const sep = buffer.indexOf('\n\n')
        if (sep === -1) break
        const rawEvent = buffer.slice(0, sep)
        buffer = buffer.slice(sep + 2)

        for (const line of rawEvent.split('\n')) {
          const trimmed = line.replace(/\r$/, '')
          if (!trimmed.startsWith('data:')) continue
          const payload = trimmed.slice(5).trim()
          if (payload === '[DONE]') {
            sawDone = true
            break
          }
          try {
            const j = JSON.parse(payload)
            if (j.error) throw new Error(j.error)
            if (typeof j.delta === 'string' && j.delta) {
              full += j.delta
              onDelta?.(j.delta)
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue
            throw e
          }
        }
        if (sawDone) return full.trim()
      }
    }
  } finally {
    reader.releaseLock()
  }

  if (!full.trim()) {
    throw new Error('Stream ended unexpectedly')
  }
  return full.trim()
}

/* ─── AI assistant (inventory-aware chat) ─── */
export const chatApi = {
  send: (body) => api('/chat/messages', { method: 'POST', json: body }),
  /** Streaming turn — progressive deltas via `onDelta`; returns final trimmed text. */
  stream: (opts) => readChatMessageStream(opts),
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

/* ─── Diagnoses (farmer, multipart create) ─── */
export const diagnosesApi = {
  create: (formData) => apiForm('/diagnoses', formData),
  mine: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return api(q ? `/diagnoses/mine?${q}` : '/diagnoses/mine')
  },
  getOne: (id) => api(`/diagnoses/${id}`),
  monthlyStats: () => api('/diagnoses/monthly-stats'),
}

/* ─── Admin ─── */
export const adminApi = {
  stats: () => api('/admin/stats'),
  usersList: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return api(q ? `/admin/users?${q}` : '/admin/users')
  },
  pendingApprovals: () => api('/admin/pending-approvals'),
  setApproval: (body) =>
    api('/admin/approvals', { method: 'PATCH', json: body }),
  moderatePost: (postId, body) =>
    api(`/admin/posts/${postId}`, { method: 'PATCH', json: body }),
  providersList: () => api('/admin/providers'),
  providerCreate: (body) =>
    api('/admin/providers', { method: 'POST', json: body }),
  providerUpdate: (id, body) =>
    api(`/admin/providers/${id}`, { method: 'PATCH', json: body }),
  providerDelete: (id) => api(`/admin/providers/${id}`, { method: 'DELETE' }),
  discoveryArticles: () => api('/admin/discovery/articles'),
  discoveryArticleCreate: (body) =>
    api('/admin/discovery/articles', { method: 'POST', json: body }),
  discoveryArticleUpdate: (id, body) =>
    api(`/admin/discovery/articles/${id}`, { method: 'PATCH', json: body }),
  discoveryArticleDelete: (id) =>
    api(`/admin/discovery/articles/${id}`, { method: 'DELETE' }),
}

/* ─── Specialist reviews ─── */
export const reviewsApi = {
  list: (specialistId, params = {}) => {
    const q = new URLSearchParams(params).toString()
    return api(q ? `/reviews/specialists/${specialistId}?${q}` : `/reviews/specialists/${specialistId}`)
  },
  create: (specialistId, body) =>
    api(`/reviews/specialists/${specialistId}`, { method: 'POST', json: body }),
  remove: (specialistId) =>
    api(`/reviews/specialists/${specialistId}`, { method: 'DELETE' }),
}

/* ─── Crop recommendations ─── */
export const recommendationsApi = {
  create: (body) => api('/recommendations', { method: 'POST', json: body }),
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return api(q ? `/recommendations?${q}` : '/recommendations')
  },
  get: (id) => api(`/recommendations/${id}`),
}
