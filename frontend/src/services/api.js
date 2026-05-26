const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050').replace(/\/$/, '')

const SESSION_KEY = 'hci.session'
const SELECTED_CHILD_KEY = 'hci.selectedChild'

export class ApiError extends Error {
  constructor(message, status, type) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.type = type
  }
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
  } catch {
    return null
  }
}

export function setSession(payload) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(payload))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(SELECTED_CHILD_KEY)
}

export function getSessionToken() {
  return getSession()?.session?.session_token || ''
}

export function getSelectedChild() {
  try {
    return JSON.parse(localStorage.getItem(SELECTED_CHILD_KEY) || 'null')
  } catch {
    return null
  }
}

export function setSelectedChild(child) {
  if (!child) {
    localStorage.removeItem(SELECTED_CHILD_KEY)
    return
  }

  localStorage.setItem(SELECTED_CHILD_KEY, JSON.stringify(child))
}

function buildQuery(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  })

  const value = query.toString()
  return value ? `?${value}` : ''
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/pdf')) {
    return response.blob()
  }

  if (!contentType.includes('application/json')) {
    return response.text()
  }

  return response.json()
}

export async function apiRequest(path, options = {}) {
  const { query, body, headers, auth = true, ...rest } = options
  const token = getSessionToken()
  const requestHeaders = { ...(headers || {}) }
  const isFormData = body instanceof FormData

  if (auth && token) {
    requestHeaders.Authorization = `Bearer ${token}`
  }

  if (body !== undefined && !isFormData) {
    requestHeaders['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_BASE_URL}${path}${buildQuery(query)}`, {
    ...rest,
    headers: requestHeaders,
    body: body === undefined || isFormData ? body : JSON.stringify(body),
  })

  const data = await parseResponse(response)

  if (!response.ok) {
    const apiError = data?.error
    throw new ApiError(apiError?.message || 'Không thể kết nối API.', response.status, apiError?.type)
  }

  return data
}

export const authApi = {
  signIn: (payload) => apiRequest('/auth/signin', { method: 'POST', body: payload, auth: false }),
  signUp: (payload) => apiRequest('/auth/signup', { method: 'POST', body: payload, auth: false }),
  signOut: () => apiRequest('/auth/session', { method: 'DELETE' }),
  getMe: () => apiRequest('/me'),
  updateMe: (payload) => apiRequest('/me', { method: 'PATCH', body: payload }),
  changePassword: (payload) => apiRequest('/me/password', { method: 'PATCH', body: payload }),
}

export const childrenApi = {
  list: () => apiRequest('/children'),
  detail: (childId) => apiRequest(`/children/${childId}`),
  create: ({ nickname, birthYear, avatar, webcamConsent = true }) => {
    const formData = new FormData()
    formData.append('nickname', nickname)
    formData.append('birth_year', String(birthYear))
    formData.append('webcam_consent', String(webcamConsent))
    if (avatar) formData.append('avatar', avatar)
    return apiRequest('/children', { method: 'POST', body: formData })
  },
  update: (childId, payload) => {
    const formData = new FormData()
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) formData.append(key, String(value))
    })
    return apiRequest(`/children/${childId}`, { method: 'PATCH', body: formData })
  },
  remove: (childId) => apiRequest(`/children/${childId}`, {
    method: 'DELETE',
    body: { confirmation: 'DELETE' },
  }),
}

export const preferencesApi = {
  get: (childId) => apiRequest(`/children/${childId}/preferences`),
  update: (childId, payload) => apiRequest(`/children/${childId}/preferences`, {
    method: 'PATCH',
    body: payload,
  }),
}

export const trackingApi = {
  dashboard: (childId, days = 7) => apiRequest(`/children/${childId}/dashboard`, { query: { days } }),
  listEmotionLogs: (childId, query) => apiRequest(`/children/${childId}/emotion-logs`, { query }),
  recordEmotionLog: (childId, payload) => apiRequest(`/children/${childId}/emotion-logs`, {
    method: 'POST',
    body: payload,
  }),
  createAlert: (childId, reason) => apiRequest(`/children/${childId}/alerts`, {
    method: 'POST',
    body: { reason },
  }),
  downloadSummaryPdf: (childId, query = { days: 7 }) => apiRequest(`/children/${childId}/reports/summary.pdf`, {
    query,
  }),
}

export const contentApi = {
  list: (childId, query) => apiRequest(`/children/${childId}/contents`, { query }),
  listSessions: (childId, query) => apiRequest(`/children/${childId}/content-sessions`, { query }),
  recordSession: (childId, payload) => apiRequest(`/children/${childId}/content-sessions`, {
    method: 'POST',
    body: payload,
  }),
  unlock: (childId, contentId) => apiRequest(`/children/${childId}/contents/${contentId}/unlock`, {
    method: 'POST',
  }),
}

export const petsApi = {
  list: (query) => apiRequest('/pets', { query }),
  listChildPets: (childId) => apiRequest(`/children/${childId}/pets`),
  buy: (childId, petId, customName) => apiRequest(`/children/${childId}/pets`, {
    method: 'POST',
    body: { pet_id: petId, custom_name: customName },
  }),
}
