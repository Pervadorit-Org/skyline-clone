import { createContext, useContext, useEffect, useState } from 'react'
import '../pages/HomeContent.css'

/**
 * Shared field widgets for the website content editors (Home page, Footer).
 * Styles live in pages/HomeContent.css (hc-* classes).
 */

/** Public site the previews resolve site-relative paths (/static_image/…) against. */
export const SITE_URL = String(
  import.meta.env.VITE_PARTNER_APP_URL || (import.meta.env.DEV ? 'http://localhost:5173' : ''),
).replace(/\/+$/, '')

/** Deep clone so editing never mutates the defaults. */
export const clone = (v) => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)))

/** Defaults deep-merged with saved content (saved wins; arrays replace). */
export function mergeOver(defaults, saved) {
  const base = clone(defaults)
  if (!saved || typeof saved !== 'object') return base
  const merge = (b, o) => {
    if (Array.isArray(o)) return clone(o)
    if (o && typeof o === 'object' && b && typeof b === 'object' && !Array.isArray(b)) {
      const out = { ...b }
      for (const k of Object.keys(o)) out[k] = merge(b[k], o[k])
      return out
    }
    return o === undefined ? b : clone(o)
  }
  return merge(base, saved)
}

/** Each editor provides its own upload function (file -> Promise<{ url }>). */
const UploadContext = createContext(null)
export function ImageUploadProvider({ upload, children }) {
  return <UploadContext.Provider value={upload}>{children}</UploadContext.Provider>
}

export function Field({ label, hint, children }) {
  return (
    <label className="hc-field">
      <span className="hc-field-label">{label}{hint ? <em className="hc-hint"> — {hint}</em> : null}</span>
      {children}
    </label>
  )
}

export function Txt({ label, hint, value, onChange, long, placeholder }) {
  return (
    <Field label={label} hint={hint}>
      {long ? (
        <textarea rows={3} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type="text" value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  )
}

export function Lnk({ label, value, onChange, placeholder = '/register' }) {
  return (
    <Field label={label} hint="/path or https://…">
      <input type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </Field>
  )
}

/** Image field: upload to S3 (returns a URL that is stored), with preview + remove. */
export function ImgField({ label, value, onChange }) {
  const upload = useContext(UploadContext)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [broken, setBroken] = useState(false)
  useEffect(() => { setBroken(false) }, [value])

  async function pick(file) {
    if (!file) return
    if (!upload) { setErr('Image upload is not available here.'); return }
    setBusy(true); setErr('')
    try {
      const res = await upload(file)
      if (res?.url) onChange(res.url)
      else throw new Error('Upload did not return a URL.')
    } catch (e) {
      setErr(e?.message || 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  // Site-relative defaults (/static_image/…) live on the frontend origin, so resolve
  // them against the live site for the preview (the stored value stays as-is).
  const previewSrc = value && value.startsWith('/') && SITE_URL ? `${SITE_URL}${value}` : value
  return (
    <Field label={label} hint="JPG / PNG / WEBP, up to 5MB">
      <div className="hc-img">
        <div className="hc-img-preview">
          {value && !broken
            ? <img className="hc-thumb" src={previewSrc} alt={label} onError={() => setBroken(true)} />
            : <span className="hc-img-empty">{value && broken ? 'Image unavailable' : 'No image'}</span>}
        </div>
        <div className="hc-img-controls">
          <label className="admin-btn admin-btn-secondary hc-btn-sm hc-upload">
            {busy ? 'Uploading…' : (value ? 'Change image' : 'Upload image')}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden disabled={busy}
              onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
          </label>
          {value ? <button type="button" className="hc-icon-btn hc-del" title="Remove image" onClick={() => onChange('')}>✕</button> : null}
        </div>
      </div>
      {err ? <span className="hc-err">{err}</span> : null}
    </Field>
  )
}

/** Add / edit / reorder / remove rows. column.type: text (default) | image | number | bool. */
export function ListEditor({ title, rows, columns, onChange, makeRow, max = 30 }) {
  const setRow = (i, key, val) => onChange(rows.map((r, j) => (i === j ? { ...r, [key]: val } : r)))
  const move = (i, dir) => {
    const j = i + dir
    if (j < 0 || j >= rows.length) return
    const next = [...rows]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  return (
    <div className="hc-list">
      <div className="hc-list-head">
        <strong>{title}</strong>
        <button type="button" className="admin-btn admin-btn-secondary hc-btn-sm" disabled={rows.length >= max}
          onClick={() => onChange([...rows, makeRow()])}>+ Add</button>
      </div>
      {rows.length === 0 ? <p className="hc-muted">None yet.</p> : null}
      {rows.map((row, i) => (
        <div className="hc-row" key={i}>
          <div className="hc-row-fields">
            {columns.map((c) => (
              c.type === 'image'
                ? <ImgField key={c.key} label={c.label} value={row[c.key]} onChange={(v) => setRow(i, c.key, v)} />
                : c.type === 'number'
                  ? <Field key={c.key} label={c.label}><input type="number" min={c.min ?? 1} max={c.max ?? 5} value={row[c.key] ?? ''} onChange={(e) => setRow(i, c.key, Number(e.target.value))} /></Field>
                  : c.type === 'bool'
                    ? <label key={c.key} className="hc-check"><input type="checkbox" checked={Boolean(row[c.key])} onChange={(e) => setRow(i, c.key, e.target.checked)} /> {c.label}</label>
                    : <Txt key={c.key} label={c.label} long={c.long} value={row[c.key]} onChange={(v) => setRow(i, c.key, v)} />
            ))}
          </div>
          <div className="hc-row-actions">
            <button type="button" className="hc-icon-btn" title="Up" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
            <button type="button" className="hc-icon-btn" title="Down" onClick={() => move(i, 1)} disabled={i === rows.length - 1}>↓</button>
            <button type="button" className="hc-icon-btn hc-del" title="Remove" onClick={() => onChange(rows.filter((_, j) => j !== i))}>✕</button>
          </div>
        </div>
      ))}
    </div>
  )
}
