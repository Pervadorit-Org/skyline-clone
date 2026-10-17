import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getStores } from '../api/admin'
import { getFooterContent, updateFooterContent, resetFooterContent, uploadFooterImage } from '../api/footerContent'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import { ROLES } from '../constants/roles'
import { FOOTER_DEFAULTS, SECTION_LABELS, SECTION_ORDER } from './footerContentDefaults'
import PlatformLinksManager from '../components/PlatformLinksManager'
import { Field, Txt, Lnk, ImgField, ListEditor, ImageUploadProvider, SITE_URL, clone, mergeOver } from '../components/ContentFields'
import './HomeContent.css'

export default function FooterContent() {
  const { user } = useAuth()
  const toast = useToast()
  const { confirm } = useConfirm()
  const isMaster = user?.role === ROLES.MASTER_ADMIN

  const [storeCode, setStoreCode] = useState(isMaster ? 'goldendragon' : (user?.storeCode || ''))
  const [storeOptions, setStoreOptions] = useState([])
  const [form, setForm] = useState(() => clone(FOOTER_DEFAULTS))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [active, setActive] = useState(SECTION_ORDER[0])

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
    if (isMaster && !target) { setForm(clone(FOOTER_DEFAULTS)); setLoading(false); return }
    setLoading(true)
    getFooterContent(target)
      .then((res) => setForm(mergeOver(FOOTER_DEFAULTS, res?.footer)))
      .catch((err) => { toast.error(err.message || 'Failed to load the footer.'); setForm(clone(FOOTER_DEFAULTS)) })
      .finally(() => setLoading(false))
  }, [isMaster, user, toast])

  useEffect(() => { load(storeCode) }, [load, storeCode])

  /* immutable updaters */
  const patch = (key, p) => setForm((f) => ({ ...f, [key]: { ...f[key], ...p } }))
  const setShow = (key, on) => setForm((f) => ({ ...f, show: { ...f.show, [key]: on } }))
  const patchSocial = (net, v) => setForm((f) => ({ ...f, contact: { ...f.contact, socials: { ...f.contact.socials, [net]: v } } }))

  async function handleSave() {
    if (isMaster && !storeCode.trim()) { toast.error('Enter a store code first.'); return }
    setSaving(true)
    try {
      await updateFooterContent(isMaster ? storeCode.trim() : undefined, form)
      toast.success('Footer saved.')
    } catch (err) {
      toast.error(err.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    const ok = await confirm({
      title: 'Reset footer?',
      message: 'This clears the saved footer for this store. The website goes back to the built-in footer.',
      confirmLabel: 'Reset',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await resetFooterContent(isMaster ? storeCode.trim() : undefined)
      toast.success('Reset to default.')
      setForm(clone(FOOTER_DEFAULTS))
    } catch (err) {
      toast.error(err.message || 'Reset failed.')
    }
  }

  if (loading) return <div className="hc-page"><p>Loading…</p></div>

  const s = form
  const isBrandStore = ['dragonfury', 'goldendragon'].includes(String(storeCode || '').toLowerCase().replace(/[^a-z0-9]/g, ''))
  // Brand stores manage the Pages column in "Footer links", so the panel is not shown here.
  const sections = isBrandStore ? SECTION_ORDER.filter((k) => k !== 'pages') : SECTION_ORDER
  const current = sections.includes(active) ? active : sections[0]

  const renderFields = (k) => {
    switch (k) {
      case 'payments': return (<>
        <Txt label="Accessible label" hint="read by screen readers" value={s.payments.title} onChange={(v) => patch('payments', { title: v })} />
        <p className="hc-muted">The row of payment logos at the top of the footer. Upload PNG / WEBP logos.</p>
        <ListEditor title="Payment icons" rows={s.payments.items || []} max={20}
          makeRow={() => ({ name: '', image: '' })}
          onChange={(rows) => patch('payments', { items: rows })}
          columns={[{ key: 'name', label: 'Name' }, { key: 'image', label: 'Logo', type: 'image' }]} />
      </>)
      case 'brand': return (<>
        <ImgField label="Footer logo" value={s.brand.logo} onChange={(v) => patch('brand', { logo: v })} />
        <p className="hc-muted">No logo uploaded = the website's normal logo.</p>
        <Txt label="About text" long hint="empty = the site description" value={s.brand.text} onChange={(v) => patch('brand', { text: v })} />
      </>)
      case 'platforms': return (<>
        <Txt label="Panel title" value={s.platforms.title} onChange={(v) => patch('platforms', { title: v })} />
        <Field label="Max links"><input type="number" min={2} max={40} value={s.platforms.max ?? 14} onChange={(e) => patch('platforms', { max: Number(e.target.value) })} /></Field>
        <PlatformLinksManager storeCode={storeCode} />
        <p className="hc-muted">
          Need a platform link that is not one of the pages above? Add it here with a label and a link. These show after
          the platform pages in the footer and on the home page "Our Exclusive Platforms" section.
        </p>
        <ListEditor title="Extra platform links (label + link)" rows={s.platforms.items || []} max={40}
          makeRow={() => ({ label: '', href: '', image: '' })}
          onChange={(rows) => patch('platforms', { items: rows })}
          columns={[{ key: 'label', label: 'Label' }, { key: 'href', label: 'Link' }, { key: 'image', label: 'Tile image (home page)', type: 'image' }]} />
      </>)
      case 'pages': return (<>
        <Txt label="Panel title" value={s.pages.title} onChange={(v) => patch('pages', { title: v })} />
        <label className="hc-check">
          <input type="checkbox" checked={s.pages.includeCmsPages !== false} onChange={(e) => patch('pages', { includeCmsPages: e.target.checked })} />
          Also list pages created in <Link to="/footer">Footer links</Link>
        </label>
        <ListEditor title="Page links" rows={s.pages.items || []} max={40}
          makeRow={() => ({ label: '', href: '/' })}
          onChange={(rows) => patch('pages', { items: rows })}
          columns={[{ key: 'label', label: 'Label' }, { key: 'href', label: 'Link' }]} />
      </>)
      case 'contact': return (<>
        <Txt label="Panel title" value={s.contact.title} onChange={(v) => patch('contact', { title: v })} />
        <Txt label="Support email" hint="empty = site default" value={s.contact.email} onChange={(v) => patch('contact', { email: v })} placeholder="support@yourdomain.com" />
        <Txt label="Chat button label" value={s.contact.chatLabel} onChange={(v) => patch('contact', { chatLabel: v })} />
        <p className="hc-muted">Social icons always show; each becomes a link once its URL is set.</p>
        <Lnk label="Instagram" placeholder="https://instagram.com/yourpage" value={s.contact.socials.instagram} onChange={(v) => patchSocial('instagram', v)} />
        <Lnk label="X (Twitter)" placeholder="https://x.com/yourpage" value={s.contact.socials.twitter} onChange={(v) => patchSocial('twitter', v)} />
        <Lnk label="Facebook" placeholder="https://facebook.com/yourpage" value={s.contact.socials.facebook} onChange={(v) => patchSocial('facebook', v)} />
        <Lnk label="Discord" placeholder="https://discord.gg/yourinvite" value={s.contact.socials.discord} onChange={(v) => patchSocial('discord', v)} />
      </>)
      case 'compliance': return (<>
        <p className="hc-muted">
          In the text you can use <code>{'{platform}'}</code> and <code>{'{year}'}</code>, <code>**bold**</code>,
          and links like <code>[Terms](/terms)</code>.
        </p>
        <ListEditor title="Legal notes" rows={(s.compliance.notes || []).map((text) => ({ text }))} max={12}
          makeRow={() => ({ text: '' })}
          onChange={(rows) => patch('compliance', { notes: rows.map((r) => r.text) })}
          columns={[{ key: 'text', label: 'Text', long: true }]} />
        <Txt label="Copyright line" value={s.compliance.copyright} onChange={(v) => patch('compliance', { copyright: v })} />
      </>)
      default: return null
    }
  }

  const activeShown = form.show?.[current] !== false
  return (
    <ImageUploadProvider upload={uploadFooterImage}>
      <div className="hc-page">
        <div className="hc-header">
          <div>
            <h2>Footer</h2>
            <p className="hc-muted">Edit the website footer. Anything left as default keeps the built-in footer. Footer pages (custom slugs) are managed in <Link to="/footer">Footer links</Link>.</p>
          </div>
          {SITE_URL ? <a className="admin-btn admin-btn-secondary" href={SITE_URL} target="_blank" rel="noreferrer">View live page ↗</a> : null}
        </div>

        {isMaster && (
          <div className="hc-store">
            <label className="hc-field">
              <span className="hc-field-label">Store code</span>
              <input list="hc-footer-stores" value={storeCode} onChange={(e) => setStoreCode(e.target.value)} placeholder="goldendragon" />
              <datalist id="hc-footer-stores">{storeOptions.map((c) => <option key={c} value={c} />)}</datalist>
            </label>
          </div>
        )}

        <div className="hc-layout">
          <select className="hc-nav-select" value={current} onChange={(e) => setActive(e.target.value)}>
            {sections.map((k) => (
              <option key={k} value={k}>{SECTION_LABELS[k]}{form.show?.[k] === false ? ' (hidden)' : ''}</option>
            ))}
          </select>

          <nav className="hc-nav" aria-label="Footer sections">
            {sections.map((k) => (
              <button key={k} type="button" className={`hc-nav-item${current === k ? ' active' : ''}`} onClick={() => setActive(k)}>
                <span className="hc-nav-item-label">{SECTION_LABELS[k]}</span>
                {form.show?.[k] === false ? <span className="hc-nav-tag">Hidden</span> : null}
              </button>
            ))}
          </nav>

          <div className="hc-panel">
            <div className="hc-panel-head">
              <h3>{SECTION_LABELS[current]}</h3>
              <div className="hc-panel-tools">
                <label className="hc-switch" title="Show on website">
                  <input type="checkbox" checked={activeShown} onChange={(e) => setShow(current, e.target.checked)} /> Show on website
                </label>
              </div>
            </div>
            <div className="hc-panel-body">{renderFields(current)}</div>
          </div>
        </div>

        <div className="hc-actions">
          <button type="button" className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save footer'}
          </button>
          <button type="button" className="admin-btn admin-btn-secondary" onClick={handleReset} disabled={saving}>Reset to default</button>
        </div>
      </div>
    </ImageUploadProvider>
  )
}
