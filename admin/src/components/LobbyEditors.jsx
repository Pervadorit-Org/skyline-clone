import { useMemo, useState } from 'react'
import { Field, Txt, ImgField } from './ContentFields'
import '../pages/HomeContent.css'

/** Shared editors for the Lobby screen (Cards & text, Sidebar, Header, game picker). */

/** One text/link/image field: shows the built-in value as the placeholder; empty = built-in. */
export function TextSlot({ field, text, setText }) {
  const value = text?.[field.path] ?? ''
  if (field.type === 'image') {
    return <ImgField label={`${field.label} (empty = built-in)`} value={value} onChange={(v) => setText(field.path, v)} />
  }
  return (
    <Txt label={field.label} long={field.type === 'long'} placeholder={field.default}
      hint={field.type === 'link' ? '/path or https://…' : undefined}
      value={value} onChange={(v) => setText(field.path, v)} />
  )
}

/** A titled card of text slots with a "show on website" switch (key in `off`). */
export function TextGroupCard({ group, text, setText, off, setOff, children }) {
  const hidden = group.toggle ? off.includes(group.toggle) : false
  return (
    <div className="hc-row" style={{ opacity: hidden ? 0.6 : 1 }}>
      <div className="hc-row-fields">
        <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <strong>{group.title}</strong>
          {group.toggle ? (
            <label className="hc-switch">
              <input type="checkbox" checked={!hidden} onChange={(e) => setOff(group.toggle, !e.target.checked)} /> Show on website
            </label>
          ) : null}
        </div>
        {group.fields.map((field) => <TextSlot key={field.path} field={field} text={text} setText={setText} />)}
        {children}
      </div>
    </div>
  )
}

/** A list of menu items: rename (empty = built-in name) and show / hide each one. */
export function ItemList({ group, items, text, setText, off, setOff }) {
  return (
    <div className="hc-list" style={{ gridColumn: '1 / -1' }}>
      {items.map((it, i) => {
        if (it.section) return <strong key={`s${i}`} style={{ marginTop: 10 }}>{it.section}</strong>
        const hidden = off.includes(`${group}:${it.id}`)
        return (
          <div className="hc-row" key={it.id} style={{ opacity: hidden ? 0.55 : 1 }}>
            <div className="hc-row-fields" style={{ alignItems: 'end' }}>
              <Txt label={`Name (built-in: ${it.label})`} placeholder={it.label}
                value={text?.[`${group}.${it.id}`] ?? ''} onChange={(v) => setText(`${group}.${it.id}`, v)} />
              <label className="hc-switch">
                <input type="checkbox" checked={!hidden} onChange={(e) => setOff(`${group}:${it.id}`, !e.target.checked)} /> Show
              </label>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Game ids for one row: a text box of ids (comma / new line separated) plus a search over the game list.
 * `catalog` = [{ id, title, brand, provider }] (empty when the game list could not be loaded).
 */
export function GameIdsField({ label, hint, ids, onChange, catalog, catalogState, loadCatalog }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const byId = useMemo(() => new Map(catalog.map((g) => [g.id, g])), [catalog])
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return []
    return catalog
      .filter((g) => g.title.toLowerCase().includes(needle) || g.brand.toLowerCase().includes(needle) || g.id.toLowerCase() === needle)
      .slice(0, 12)
  }, [q, catalog])

  const add = (id) => { if (!ids.includes(id)) onChange([...ids, id]) }
  const remove = (id) => onChange(ids.filter((x) => x !== id))
  const move = (i, dir) => {
    const j = i + dir
    if (j < 0 || j >= ids.length) return
    const next = [...ids]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div style={{ gridColumn: '1 / -1' }}>
      <Field label={label} hint={hint}>
        <div>
          {ids.length === 0 ? <span className="hc-muted">Automatic — no games picked.</span> : null}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '6px 0' }}>
            {ids.map((id, i) => {
              const g = byId.get(id)
              return (
                <span key={id} className="hc-nav-tag" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  {i + 1}. {g ? g.title : `id ${id}`}
                  <button type="button" className="hc-icon-btn" title="Earlier" onClick={() => move(i, -1)} disabled={i === 0}>←</button>
                  <button type="button" className="hc-icon-btn" title="Later" onClick={() => move(i, 1)} disabled={i === ids.length - 1}>→</button>
                  <button type="button" className="hc-icon-btn hc-del" title="Remove" onClick={() => remove(id)}>✕</button>
                </span>
              )
            })}
          </div>
          <button type="button" className="admin-btn admin-btn-secondary hc-btn-sm"
            onClick={() => { setOpen((o) => !o); if (!open) loadCatalog() }}>
            {open ? 'Close game search' : 'Find games to add'}
          </button>
          {open ? (
            <div style={{ marginTop: 8 }}>
              <input type="text" value={q} placeholder="Search by game name, studio or id…" onChange={(e) => setQ(e.target.value)} style={{ width: '100%' }} />
              {catalogState === 'loading' ? <p className="hc-muted">Loading the game list…</p> : null}
              {catalogState === 'empty' ? (
                <p className="hc-muted">The game list is not available right now (provider not connected on this server). Type game ids instead: <input type="text" placeholder="id, then Enter" onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value.trim()) { add(e.currentTarget.value.trim()); e.currentTarget.value = '' } }} /></p>
              ) : null}
              {matches.map((g) => (
                <div key={`${g.provider}-${g.id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '4px 0', borderBottom: '1px solid rgba(128,128,128,.2)' }}>
                  <span>{g.title} <em className="hc-hint">— {g.brand || g.provider} · id {g.id}</em></span>
                  <button type="button" className="admin-btn admin-btn-secondary hc-btn-sm" disabled={ids.includes(g.id)} onClick={() => add(g.id)}>
                    {ids.includes(g.id) ? 'Added' : '+ Add'}
                  </button>
                </div>
              ))}
              {q.trim() && catalogState === 'ready' && !matches.length ? <p className="hc-muted">No game matches “{q}”.</p> : null}
            </div>
          ) : null}
        </div>
      </Field>
    </div>
  )
}
