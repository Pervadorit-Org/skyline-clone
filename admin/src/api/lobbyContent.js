import { request, baseUrl, TOKEN_KEY } from './client'

const BASE = '/api/lobby-content/admin/settings'
const UPLOAD = '/api/lobby-content/admin/upload-image'

/** Upload an image to S3 and get back its public URL ({ url }). */
export function uploadLobbyImage(file) {
  if (!file) return Promise.reject(new Error('No image file selected.'))
  if (file.size > 5 * 1024 * 1024) return Promise.reject(new Error('Image is too large. Maximum size is 5MB.'))
  const token = localStorage.getItem(TOKEN_KEY)
  const form = new FormData()
  form.append('file', file)
  return fetch(`${baseUrl}${UPLOAD}`, {
    method: 'POST',
    headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    body: form,
  }).then(async (res) => {
    const raw = await res.text().catch(() => '')
    let data = {}
    try { data = raw ? JSON.parse(raw) : {} } catch { data = {} }
    if (!res.ok) {
      const err = new Error(data?.message || 'Upload failed. Please try again.')
      err.status = res.status
      throw err
    }
    return data
  })
}

/** Load a store's saved lobby content ({} when nothing saved yet). */
export function getLobbyContent(storeCode) {
  const qs = storeCode ? `?store_code=${encodeURIComponent(storeCode)}` : ''
  return request(`${BASE}${qs}`)
}

/** Save the full lobby content object for a store. */
export function updateLobbyContent(storeCode, lobby) {
  return request(BASE, {
    method: 'PUT',
    body: JSON.stringify({ storeCode, lobby }),
  })
}

/** Clear a store's content (reverts the site to the built-in lobby). */
export function resetLobbyContent(storeCode) {
  const qs = storeCode ? `?store_code=${encodeURIComponent(storeCode)}` : ''
  return request(`${BASE}${qs}`, { method: 'DELETE' })
}

/** Most-played games (real play history) for a store: { games: [{ id, plays, players }], source, days }. */
export function getLobbyPopular(storeCode, days) {
  const params = new URLSearchParams()
  if (storeCode) params.set('store_code', storeCode)
  if (days) params.set('days', String(days))
  const qs = params.toString()
  return request(`/api/lobby-content/admin/popular${qs ? `?${qs}` : ''}`)
}

/**
 * The game list (titles, studios) for the game picker, straight from the public game-list endpoints the
 * website uses. Best effort: a provider that is not set up for this store simply adds no games.
 */
export async function fetchGameCatalog(storeCode) {
  const qs = storeCode ? `?store_code=${encodeURIComponent(storeCode)}` : ''
  const sources = [['onegamehub', '/api/onegamehub/games'], ['gitslotpark', '/api/gitslotpark/games']]
  const out = []
  for (const [provider, path] of sources) {
    try {
      const res = await fetch(`${baseUrl}${path}${qs}`)
      const data = await res.json().catch(() => ({}))
      const list = Array.isArray(data?.games) ? data.games : []
      for (const g of list) {
        const id = g.gameid ?? g.gameId ?? g.id
        if (id == null || String(id).trim() === '') continue
        out.push({
          id: String(id).trim(),
          title: g.name || g.title || g.alias || String(id),
          brand: g.brand || '',
          provider,
          categories: Array.isArray(g.categories) ? g.categories : [],
        })
      }
    } catch {
      /* provider unavailable */
    }
  }
  return out
}
