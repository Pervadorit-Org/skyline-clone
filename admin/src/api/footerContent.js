import { request, baseUrl, TOKEN_KEY } from './client'

const BASE = '/api/footer-content/admin/settings'
const UPLOAD = '/api/footer-content/admin/upload-image'

/** Upload an image to S3 and get back its public URL ({ url }). */
export function uploadFooterImage(file) {
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

/** Load a store's saved footer content ({} when nothing saved yet). */
export function getFooterContent(storeCode) {
  const qs = storeCode ? `?store_code=${encodeURIComponent(storeCode)}` : ''
  return request(`${BASE}${qs}`)
}

/** Save the full footer content object for a store. */
export function updateFooterContent(storeCode, footer) {
  return request(BASE, {
    method: 'PUT',
    body: JSON.stringify({ storeCode, footer }),
  })
}

/** Clear a store's footer content (reverts the site to the built-in footer). */
export function resetFooterContent(storeCode) {
  const qs = storeCode ? `?store_code=${encodeURIComponent(storeCode)}` : ''
  return request(`${BASE}${qs}`, { method: 'DELETE' })
}
