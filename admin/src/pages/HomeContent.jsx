import { useCallback, useEffect, useMemo, useState } from 'react'
import { getStores } from '../api/admin'
import { getHomePageContent, updateHomePageContent, resetHomePageContent, uploadHomePageImage } from '../api/homePageContent'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import { ROLES } from '../constants/roles'
import { HOME_DEFAULTS, SECTION_LABELS, SECTION_ORDER } from './homeContentDefaults'
import { Field, Txt, Lnk, ImgField, ListEditor, ImageUploadProvider, SITE_URL, clone, mergeOver } from '../components/ContentFields'
import './HomeContent.css'

export default function HomeContent() {
  const { user } = useAuth()
  const toast = useToast()
  const { confirm } = useConfirm()
  const isMaster = user?.role === ROLES.MASTER_ADMIN

  const [storeCode, setStoreCode] = useState(isMaster ? 'goldendragon' : (user?.storeCode || ''))
  const [storeOptions, setStoreOptions] = useState([])
  const [form, setForm] = useState(() => clone(HOME_DEFAULTS))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [active, setActive] = useState('hero1')

  useEffect(() => {
    if (!isMaster) return
    getStores({ limit: 500, sortBy: 'storeCode', sortOrder: 'ASC' })
      .then((res) => {
        const codes = (res?.list || []).map((s) => s.storeCode).filter(Boolean)
        setStoreOptions([...new Set(codes)])
      })
      .catch(() => setStoreOptions([]))
  }, [isMaster])

  const load = useCallback((code) => {
    const target = isMaster ? code : (user?.storeCode || '')
    if (isMaster && !target) { setForm(clone(HOME_DEFAULTS)); setLoading(false); return }
    setLoading(true)
    getHomePageContent(target)
      .then((res) => setForm(mergeOver(HOME_DEFAULTS, res?.homePage)))
      .catch((err) => { toast.error(err.message || 'Failed to load home page.'); setForm(clone(HOME_DEFAULTS)) })
      .finally(() => setLoading(false))
  }, [isMaster, user, toast])

  useEffect(() => { load(storeCode) }, [load, storeCode])

  /* immutable section updaters */
  const patchSection = (key, patch) => setForm((f) => ({ ...f, [key]: { ...f[key], ...patch } }))
  const setList = (key, listKey, rows) => setForm((f) => ({ ...f, [key]: { ...f[key], [listKey]: rows } }))
  const setEnabled = (key, on) => setForm((f) => ({ ...f, sections: { ...f.sections, enabled: { ...f.sections.enabled, [key]: on } } }))
  const moveSection = (key, dir) => setForm((f) => {
    const order = [...(f.sections.order || SECTION_ORDER)]
    const i = order.indexOf(key); const j = i + dir
    if (i < 0 || j < 0 || j >= order.length) return f
    ;[order[i], order[j]] = [order[j], order[i]]
    return { ...f, sections: { ...f.sections, order } }
  })

  const order = useMemo(() => {
    const o = form.sections?.order || SECTION_ORDER
    return [...o, ...SECTION_ORDER.filter((k) => !o.includes(k))]
  }, [form.sections])

  async function handleSave() {
    if (isMaster && !storeCode.trim()) { toast.error('Enter a store code first.'); return }
    setSaving(true)
    try {
      await updateHomePageContent(isMaster ? storeCode.trim() : undefined, form)
      toast.success('Home page saved.')
    } catch (err) {
      toast.error(err.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    const ok = await confirm({
      title: 'Reset home page?',
      message: 'This clears saved content for this store. The website goes back to the built-in default design.',
      confirmLabel: 'Reset',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await resetHomePageContent(isMaster ? storeCode.trim() : undefined)
      toast.success('Reset to default.')
      setForm(clone(HOME_DEFAULTS))
    } catch (err) {
      toast.error(err.message || 'Reset failed.')
    }
  }

  if (loading) return <div className="hc-page"><p>Loading…</p></div>

  const s = form

  const renderFields = (k) => {
    switch (k) {
      case 'hero1': return (<>
        <ImgField label="Background (desktop)" value={s.hero1.bgDesktop} onChange={(v) => patchSection('hero1', { bgDesktop: v })} />
        <ImgField label="Background (mobile)" value={s.hero1.bgMobile} onChange={(v) => patchSection('hero1', { bgMobile: v })} />
        <Txt label="Small title" value={s.hero1.eyebrow} onChange={(v) => patchSection('hero1', { eyebrow: v })} />
        <Txt label="Offer text" value={s.hero1.offer} onChange={(v) => patchSection('hero1', { offer: v })} />
        <Txt label="Button label" value={s.hero1.ctaLabel} onChange={(v) => patchSection('hero1', { ctaLabel: v })} />
        <Lnk label="Button link" value={s.hero1.ctaHref} onChange={(v) => patchSection('hero1', { ctaHref: v })} />
      </>)
      case 'hero2': return (<>
        <ImgField label="Image (desktop)" value={s.hero2.imageDesktop} onChange={(v) => patchSection('hero2', { imageDesktop: v })} />
        <ImgField label="Image (mobile)" value={s.hero2.imageMobile} onChange={(v) => patchSection('hero2', { imageMobile: v })} />
        <Txt label="Alt text" value={s.hero2.alt} onChange={(v) => patchSection('hero2', { alt: v })} />
        <Lnk label="Click link" value={s.hero2.href} onChange={(v) => patchSection('hero2', { href: v })} />
      </>)
      case 'intro': return (<>
        <Txt label="Line 1" value={s.intro.line1} onChange={(v) => patchSection('intro', { line1: v })} />
        <Txt label="Highlighted word" value={s.intro.highlight} onChange={(v) => patchSection('intro', { highlight: v })} />
        <Txt label="Connector" value={s.intro.line1b} onChange={(v) => patchSection('intro', { line1b: v })} />
        <Txt label="Line 2" value={s.intro.line2} onChange={(v) => patchSection('intro', { line2: v })} />
        <Txt label="Subtitle" value={s.intro.subtitle} onChange={(v) => patchSection('intro', { subtitle: v })} />
      </>)
      case 'categoryStrip': return (
        <ListEditor title="Category pills" rows={s.categoryStrip.items || []} max={20}
          makeRow={() => ({ label: '', emoji: '', href: '/casino' })}
          onChange={(rows) => setList('categoryStrip', 'items', rows)}
          columns={[{ key: 'label', label: 'Label' }, { key: 'emoji', label: 'Emoji' }, { key: 'href', label: 'Link', type: 'link' }]} />
      )
      case 'topGames': return (<>
        <Txt label="Section title" value={s.topGames.title} onChange={(v) => patchSection('topGames', { title: v })} />
        <Lnk label="Tile click link" value={s.topGames.gameHref} onChange={(v) => patchSection('topGames', { gameHref: v })} />
        <ListEditor title="Game tiles" rows={s.topGames.games || []} max={30}
          makeRow={() => ({ name: '', image: '' })}
          onChange={(rows) => setList('topGames', 'games', rows)}
          columns={[{ key: 'name', label: 'Name' }, { key: 'image', label: 'Image', type: 'image' }]} />
      </>)
      case 'platforms': return (<>
        <Txt label="Section title" value={s.platforms.title} onChange={(v) => patchSection('platforms', { title: v })} />
        <Field label="Max tiles"><input type="number" min={1} max={60} value={s.platforms.limit ?? 15} onChange={(e) => patchSection('platforms', { limit: Number(e.target.value) })} /></Field>
        <p className="hc-muted">
          The tiles are your platforms (the same list as the footer Platforms links). Add, hide or edit a platform in
          Pages → Footer → Platforms, and each tile opens that platform&apos;s page.
        </p>
      </>)
      case 'reasons': return (<>
        <Txt label="Title lead" value={s.reasons.titleLead} onChange={(v) => patchSection('reasons', { titleLead: v })} />
        <Txt label="Title" value={s.reasons.title} onChange={(v) => patchSection('reasons', { title: v })} />
        <ListEditor title="Cards" rows={s.reasons.cards || []} max={6}
          makeRow={() => ({ icon: '', title: '', body: '' })}
          onChange={(rows) => setList('reasons', 'cards', rows)}
          columns={[{ key: 'icon', label: 'Icon', type: 'image' }, { key: 'title', label: 'Title' }, { key: 'body', label: 'Text', long: true }]} />
      </>)
      case 'providers': return (<>
        <Txt label="Section title" value={s.providers.title} onChange={(v) => patchSection('providers', { title: v })} />
        <ListEditor title="Provider logos" rows={s.providers.logos || []} max={30}
          makeRow={() => ({ name: '', image: '' })}
          onChange={(rows) => setList('providers', 'logos', rows)}
          columns={[{ key: 'name', label: 'Name' }, { key: 'image', label: 'Logo', type: 'image' }]} />
      </>)
      case 'testimonials': return (<>
        <Txt label="Title" value={s.testimonials.title} onChange={(v) => patchSection('testimonials', { title: v })} />
        <Txt label="Subtitle" value={s.testimonials.subtitle} onChange={(v) => patchSection('testimonials', { subtitle: v })} />
        <ListEditor title="Reviews" rows={s.testimonials.items || []} max={12}
          makeRow={() => ({ name: '', quote: '', stars: 5 })}
          onChange={(rows) => setList('testimonials', 'items', rows)}
          columns={[{ key: 'name', label: 'Name' }, { key: 'quote', label: 'Quote', long: true }, { key: 'stars', label: 'Stars', type: 'number', min: 1, max: 5 }]} />
      </>)
      case 'banner1': return (<>
        <ImgField label="Background" value={s.banner1.bg} onChange={(v) => patchSection('banner1', { bg: v })} />
        <ImgField label="Character (desktop)" value={s.banner1.character} onChange={(v) => patchSection('banner1', { character: v })} />
        <ImgField label="Character (mobile)" value={s.banner1.characterMobile} onChange={(v) => patchSection('banner1', { characterMobile: v })} />
        <Txt label="Title" value={s.banner1.title} onChange={(v) => patchSection('banner1', { title: v })} />
        <Txt label="Body" long value={s.banner1.body} onChange={(v) => patchSection('banner1', { body: v })} />
        <Txt label="Button label" value={s.banner1.ctaLabel} onChange={(v) => patchSection('banner1', { ctaLabel: v })} />
        <Lnk label="Button link" value={s.banner1.ctaHref} onChange={(v) => patchSection('banner1', { ctaHref: v })} />
        <Field label="Character side"><select value={s.banner1.characterSide || 'right'} onChange={(e) => patchSection('banner1', { characterSide: e.target.value })}><option value="right">Right</option><option value="left">Left</option></select></Field>
      </>)
      case 'featureCards': return (
        <ListEditor title="Feature cards" rows={Array.isArray(s.featureCards) ? s.featureCards : []} max={6}
          makeRow={() => ({ icon: '', title: '', body: '' })}
          onChange={(rows) => setForm((f) => ({ ...f, featureCards: rows }))}
          columns={[{ key: 'icon', label: 'Emoji' }, { key: 'title', label: 'Title' }, { key: 'body', label: 'Text', long: true }]} />
      )
      case 'noPurchase': return (<>
        <Txt label="Title" value={s.noPurchase.title} onChange={(v) => patchSection('noPurchase', { title: v })} />
        <Txt label="Body" long value={s.noPurchase.body} onChange={(v) => patchSection('noPurchase', { body: v })} />
        <ImgField label="Character" value={s.noPurchase.character} onChange={(v) => patchSection('noPurchase', { character: v })} />
        <Txt label="Button label" value={s.noPurchase.ctaLabel} onChange={(v) => patchSection('noPurchase', { ctaLabel: v })} />
        <Txt label="Button label (mobile)" value={s.noPurchase.ctaLabelMobile} onChange={(v) => patchSection('noPurchase', { ctaLabelMobile: v })} />
        <Lnk label="Button link" value={s.noPurchase.ctaHref} onChange={(v) => patchSection('noPurchase', { ctaHref: v })} />
      </>)
      case 'banner2': return (<>
        <Field label="Background colour"><input type="text" value={s.banner2.bgColor || ''} onChange={(e) => patchSection('banner2', { bgColor: e.target.value })} placeholder="#2F6B2F" /></Field>
        <ImgField label="Character" value={s.banner2.character} onChange={(v) => patchSection('banner2', { character: v })} />
        <Txt label="Title" value={s.banner2.title} onChange={(v) => patchSection('banner2', { title: v })} />
        <Txt label="Body" long value={s.banner2.body} onChange={(v) => patchSection('banner2', { body: v })} />
        <Txt label="Button label" value={s.banner2.ctaLabel} onChange={(v) => patchSection('banner2', { ctaLabel: v })} />
        <Lnk label="Button link" value={s.banner2.ctaHref} onChange={(v) => patchSection('banner2', { ctaHref: v })} />
        <Field label="Character side"><select value={s.banner2.characterSide || 'left'} onChange={(e) => patchSection('banner2', { characterSide: e.target.value })}><option value="left">Left</option><option value="right">Right</option></select></Field>
      </>)
      default: return null
    }
  }

  const activeIdx = order.indexOf(active)
  const activeEnabled = form.sections?.enabled?.[active] !== false
  return (
    <ImageUploadProvider upload={uploadHomePageImage}>
    <div className="hc-page">
      <div className="hc-header">
        <div>
          <h2>Home page</h2>
          
        </div>
        {SITE_URL ? <a className="admin-btn admin-btn-secondary" href={SITE_URL} target="_blank" rel="noreferrer">View live page ↗</a> : null}
      </div>

      {isMaster && (
        <div className="hc-store">
          <label className="hc-field">
            <span className="hc-field-label">Store code</span>
            <input list="hc-stores" value={storeCode} onChange={(e) => setStoreCode(e.target.value)} placeholder="goldendragon" />
            <datalist id="hc-stores">{storeOptions.map((c) => <option key={c} value={c} />)}</datalist>
          </label>
        </div>
      )}

      <div className="hc-layout">
        <select className="hc-nav-select" value={active} onChange={(e) => setActive(e.target.value)}>
          {order.map((k) => (
            <option key={k} value={k}>
              {SECTION_LABELS[k]}{form.sections?.enabled?.[k] === false ? ' (hidden)' : ''}
            </option>
          ))}
        </select>

        <nav className="hc-nav" aria-label="Home page sections">
          {order.map((k) => {
            const enabled = form.sections?.enabled?.[k] !== false
            return (
              <button
                key={k}
                type="button"
                className={`hc-nav-item${active === k ? ' active' : ''}`}
                onClick={() => setActive(k)}
              >
                <span className="hc-nav-item-label">{SECTION_LABELS[k]}</span>
                {!enabled ? <span className="hc-nav-tag">Hidden</span> : null}
              </button>
            )
          })}
        </nav>

        <div className="hc-panel">
          <div className="hc-panel-head">
            <h3>{SECTION_LABELS[active]}</h3>
            <div className="hc-panel-tools">
              <button type="button" className="hc-icon-btn" title="Move up" onClick={() => moveSection(active, -1)} disabled={activeIdx <= 0}>↑</button>
              <button type="button" className="hc-icon-btn" title="Move down" onClick={() => moveSection(active, 1)} disabled={activeIdx === order.length - 1}>↓</button>
              <label className="hc-switch" title="Show on website">
                <input type="checkbox" checked={activeEnabled} onChange={(e) => setEnabled(active, e.target.checked)} /> Show on website
              </label>
            </div>
          </div>
          <div className="hc-panel-body">{renderFields(active)}</div>
        </div>
      </div>

      <div className="hc-actions">
        <button type="button" className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save home page'}
        </button>
        <button type="button" className="admin-btn admin-btn-secondary" onClick={handleReset} disabled={saving}>Reset to default</button>
      </div>
    </div>
    </ImageUploadProvider>
  )
}
