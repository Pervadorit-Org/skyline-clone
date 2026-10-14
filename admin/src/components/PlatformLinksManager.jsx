import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createAdminGameSeoPage, getAdminGameSeoPages, setAdminGameSeoPageVisibility } from '../api/admin'
import { useToast } from '../context/ToastContext'
import { SITE_URL } from './ContentFields'
import '../pages/HomeContent.css'

const GAME_STORES = ['playjuwa', 'dragonfury', 'goldendragon']
const slugOf = (name) => String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

/**
 * Footer "Platforms" panel: every platform is one page (/platform-games/<slug>). The footer links come
 * from this list, so adding a platform here creates its page and its footer link together.
 */
export default function PlatformLinksManager({ storeCode }) {
  const toast = useToast()
  const navigate = useNavigate()
  const store = String(storeCode || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  const supported = GAME_STORES.includes(store)
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState('')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')

  const load = useCallback(() => {
    if (!supported) { setPages([]); return }
    setLoading(true)
    getAdminGameSeoPages({ storeCode: store })
      .then((res) => setPages(res?.game_pages || []))
      .catch((err) => { toast.error(err.message || 'Failed to load platforms.'); setPages([]) })
      .finally(() => setLoading(false))
  }, [store, supported, toast])

  useEffect(() => { load() }, [load])

  async function toggle(page) {
    setBusy(page.slug)
    try {
      await setAdminGameSeoPageVisibility(page.slug, { storeCode: store, isActive: page.isActive === false })
      load()
    } catch (err) {
      toast.error(err.message || 'Could not update this platform.')
    } finally {
      setBusy('')
    }
  }

  async function add() {
    if (!name.trim()) { toast.error('Enter the platform name.'); return }
    setBusy('__add')
    try {
      const res = await createAdminGameSeoPage({ storeCode: store, name: name.trim(), slug: slug.trim() || undefined })
      toast.success(`${name.trim()} added. Now fill in its page.`)
      setName(''); setSlug('')
      navigate(`/footer/games/${res.game_page.slug}?storeCode=${encodeURIComponent(store)}`)
    } catch (err) {
      toast.error(err.message || 'Could not add this platform.')
    } finally {
      setBusy('')
    }
  }

  if (!supported) {
    return <p className="hc-muted">Platform pages are available for the Golden Dragon, Dragon Fury and PlayJuwa stores. Enter one of those store codes above.</p>
  }

  return (
    <div className="hc-list">
      <div className="hc-list-head"><strong>Platforms (footer links and pages)</strong></div>
      <p className="hc-muted">
        Each platform is one page at <code>/platform-games/&lt;name&gt;</code>, and the footer links to it automatically.
        Hide removes it from the footer and games page. Edit changes its content.
      </p>

      <div className="hc-row">
        <div className="hc-row-fields">
          <label className="hc-field">
            <span className="hc-field-label">New platform name</span>
            <input type="text" value={name} placeholder="e.g. Cash Machine" onChange={(e) => { setName(e.target.value); }} />
          </label>
          <label className="hc-field">
            <span className="hc-field-label">Page address <em className="hc-hint">— optional, /platform-games/…</em></span>
            <input type="text" value={slug} placeholder={slugOf(name) || 'cash-machine'} onChange={(e) => setSlug(e.target.value)} />
          </label>
        </div>
        <div className="hc-row-actions">
          <button type="button" className="admin-btn admin-btn-primary hc-btn-sm" disabled={busy === '__add'} onClick={add}>
            {busy === '__add' ? 'Adding…' : '+ Add platform'}
          </button>
        </div>
      </div>

      {loading ? <p className="hc-muted">Loading…</p> : null}
      {!loading && pages.length === 0 ? <p className="hc-muted">No platforms yet.</p> : null}
      {pages.map((page) => (
        <div className="hc-row" key={page.slug}>
          <div className="hc-row-fields">
            <strong>{page.name}</strong>{' '}
            <code>/platform-games/{page.slug}</code>{' '}
            <span className="hc-nav-tag">{page.isActive === false ? 'Hidden' : 'Live'}</span>
          </div>
          <div className="hc-row-actions" style={{ gap: '0.4rem' }}>
            {SITE_URL && page.isActive !== false
              ? <a className="admin-btn admin-btn-secondary hc-btn-sm" href={`${SITE_URL}/platform-games/${page.slug}`} target="_blank" rel="noreferrer">View ↗</a>
              : null}
            <button type="button" className="admin-btn admin-btn-secondary hc-btn-sm" disabled={busy === page.slug} onClick={() => toggle(page)}>
              {page.isActive === false ? 'Show' : 'Hide'}
            </button>
            <Link className="admin-btn admin-btn-secondary hc-btn-sm" to={`/footer/games/${page.slug}?storeCode=${encodeURIComponent(store)}`}>Edit content</Link>
          </div>
        </div>
      ))}
    </div>
  )
}
