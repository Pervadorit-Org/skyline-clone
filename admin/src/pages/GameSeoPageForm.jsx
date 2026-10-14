import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getAdminGameSeoPage, updateAdminGameSeoPage, uploadAdminFooterImage } from '../api/admin'
import { SeoMetaFields } from '../components/SeoMetaFields'
import { SchemaEditor, schemaErrorFor } from '../components/SchemaEditor'
import { gameSchemaAuto, originForStore } from '../utils/pageSchema'
import { PermanentRedirectField } from '../components/RecordActivity'
import { FooterPageLayoutEditor } from '../components/FooterPageLayoutEditor'
import { emptySections } from '../components/footerPageLayoutDefaults'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { Txt, Lnk, ImgField, ListEditor, ImageUploadProvider, SITE_URL } from '../components/ContentFields'
import { mergePlatformContent } from './platformPageDefaults'
import './BlogPosts.css'
import './FooterPages.css'

export default function GameSeoPageForm() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const storeCode = searchParams.get('storeCode') || user?.storeCode || 'dragonfury'
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    setLoading(true)
    getAdminGameSeoPage(slug, { storeCode })
      .then((res) => {
        const page = res.game_page || {}
        setForm({
          name: page.name || '',
          genre: page.genre || '',
          imageUrl: page.imageUrl || '',
          defaultImage: page.defaultImage || '',
          heroLead: page.heroLead || '',
          heroBlurb: page.heroBlurb || '',
          buttons: Array.isArray(page.buttons) && page.buttons.length
            ? page.buttons
            : [{ label: '', href: '' }],
          sections: {
            ...(page.sections && (page.sections.hero || page.sections.blocks)
              ? page.sections
              : emptySections()),
            platform: mergePlatformContent(page.name, page.sections?.platform)
          },
          metaTitle: page.metaTitle || '',
          metaDescription: page.metaDescription || '',
          metaTags: page.metaTags || '',
          canonicalUrl: page.canonicalUrl || '',
          permanentRedirect: page.permanentRedirect || '',
          allowIndex: page.allowIndex !== false,
          isActive: page.isActive !== false,
          schemaEnabled: page.schemaEnabled !== false,
          schemaType: page.schemaType || 'WebPage',
          schemaFields: page.schemaFields || {},
          schemaCustom: page.schemaCustom || '',
          createdAt: page.createdAt || '',
          updatedAt: page.updatedAt || ''
        })
      })
      .catch((err) => {
        toast.error(err.message || 'Could not load this game page.')
        setForm(null)
      })
      .finally(() => setLoading(false))
  }, [slug, storeCode, toast])

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  const platform = form?.sections?.platform || {}
  const setPlatform = (patch) => setForm((prev) => ({
    ...prev,
    sections: { ...prev.sections, platform: { ...prev.sections.platform, ...patch } }
  }))
  const patchPlatform = (key, patch) => setPlatform({ [key]: { ...platform[key], ...patch } })

  const uploadHero = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const res = await uploadAdminFooterImage(file)
      if (!res?.url) throw new Error('Upload failed.')
      setField('imageUrl', res.url)
      toast.success('Image uploaded.')
    } catch (err) {
      toast.error(err.message || 'Image upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form) return
    const schemaError = schemaErrorFor(
      { ...form, slug },
      gameSchemaAuto({ ...form, slug }, originForStore(storeCode))
    )
    if (schemaError) {
      toast.error(schemaError)
      return
    }
    setSaving(true)
    try {
      await updateAdminGameSeoPage(slug, {
        storeCode,
        name: form.name.trim(),
        genre: form.genre.trim(),
        imageUrl: form.imageUrl.trim() || null,
        heroLead: form.heroLead,
        heroBlurb: form.heroBlurb,
        buttons: form.buttons.filter((button) => button.label.trim() && button.href.trim()),
        sections: form.sections,
        metaTitle: form.metaTitle.trim() || null,
        metaDescription: form.metaDescription.trim() || null,
        metaTags: form.metaTags.trim() || null,
        canonicalUrl: form.canonicalUrl.trim() || null,
        permanentRedirect: form.permanentRedirect.trim(),
        allowIndex: form.allowIndex !== false,
        isActive: form.isActive !== false,
        schemaEnabled: form.schemaEnabled !== false,
        schemaType: form.schemaType || 'WebPage',
        schemaFields: form.schemaFields || {},
        schemaCustom: form.schemaCustom || ''
      })
      toast.success('Game page saved.')
      navigate('/footer')
    } catch (err) {
      toast.error(err.message || 'Could not save this game page.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="blog-admin-page"><p>Loading game page…</p></div>
  if (!form) return <div className="blog-admin-page"><p>Game page not found.</p></div>

  const rawPreview = form.imageUrl || form.defaultImage
  const preview = rawPreview && rawPreview.startsWith('/')
    ? `${SITE_URL || 'https://dragonfury.online'}${rawPreview}`
    : rawPreview

  return (
    <form className="blog-admin-page blog-admin-form-page footer-admin-page footer-form-page" onSubmit={save}>
      <div className="footer-admin-hero">
        <div>
          <p className="footer-admin-hero-sub"><Link to="/footer">← Footer links</Link></p>
          <h2>Edit {form.name || 'game page'}</h2>
          <p className="footer-admin-hero-sub">Platform page at /platform-games/{slug}</p>
        </div>
        <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      <div className="blog-admin-form footer-form-steps">

      <section className="footer-form-panel">
          <label className="blog-admin-field">
            <span>Name</span>
            <input type="text" value={form.name} onChange={(e) => setField('name', e.target.value)} maxLength={255} required />
          </label>
          <label className="blog-admin-field">
            <span>Label above the title</span>
            <input type="text" value={form.genre} onChange={(e) => setField('genre', e.target.value)} maxLength={128} placeholder="Fish & Slots" />
          </label>
          <label className="blog-admin-field">
            <span>Hero image</span>
            {preview ? <img src={preview} alt="" style={{ display: 'block', width: 140, margin: '0.4rem 0' }} /> : null}
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                uploadHero(file)
              }}
            />
            <span className="blog-admin-hint">
              {form.imageUrl
                ? 'A custom image is set. Remove it to use the default platform image.'
                : 'No custom image. The default platform image is shown.'}
            </span>
            {form.imageUrl ? (
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setField('imageUrl', '')}>
                Use default image
              </button>
            ) : null}
          </label>
          <label className="blog-admin-field">
            <span>Hero text</span>
            <textarea rows={3} value={form.heroLead} onChange={(e) => setField('heroLead', e.target.value)} />
          </label>
          <label className="blog-admin-field">
            <span>Second line</span>
            <textarea rows={2} value={form.heroBlurb} onChange={(e) => setField('heroBlurb', e.target.value)} />
          </label>
          <div className="blog-admin-field">
            <span>Buttons</span>
            {form.buttons.map((button, index) => (
              <div key={index} className="game-seo-button-row">
                <input
                  type="text"
                  value={button.label}
                  placeholder="Button label"
                  onChange={(e) => {
                    const buttons = form.buttons.slice()
                    buttons[index] = { ...button, label: e.target.value }
                    setField('buttons', buttons)
                  }}
                />
                <input
                  type="text"
                  value={button.href}
                  placeholder="/register or https://..."
                  onChange={(e) => {
                    const buttons = form.buttons.slice()
                    buttons[index] = { ...button, href: e.target.value }
                    setField('buttons', buttons)
                  }}
                />
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setField('buttons', form.buttons.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              style={{ marginTop: '0.5rem' }}
              onClick={() => setField('buttons', [...form.buttons, { label: '', href: '' }])}
            >
              Add button
            </button>
            <span className="blog-admin-hint">Use a site path such as /register or /games, or a full https link.</span>
          </div>
          <label className="blog-admin-field-toggle">
            <input
              type="checkbox"
              checked={form.isActive !== false}
              onChange={(e) => setField('isActive', e.target.checked)}
            />
            <span>Show this game on the games page</span>
          </label>
      </section>

      <section className="footer-form-panel">
        <p className="footer-form-panel-title">Platform page content</p>
        <p className="blog-admin-hint">
          Shown on the public page /platform-games/{slug}. The title, main image, text and buttons are set above;
          the feature sections (image + title + text) are in Page layout below.
        </p>
        <ImageUploadProvider upload={uploadAdminFooterImage}>
          <div className="hc-panel-body" style={{ padding: 0 }}>
            <ImgField
              label="Background image (behind the main image)"
              value={platform.overlayImage}
              onChange={(v) => setPlatform({ overlayImage: v })}
            />
            <Txt label="Steps heading" value={platform.journey?.title} onChange={(v) => patchPlatform('journey', { title: v })} />
            <Txt label="Steps intro line" value={platform.journey?.intro} onChange={(v) => patchPlatform('journey', { intro: v })} />
            <ListEditor
              title="Steps (numbered)"
              rows={(platform.journey?.steps || []).map((text) => ({ text }))}
              max={12}
              makeRow={() => ({ text: '' })}
              onChange={(rows) => patchPlatform('journey', { steps: rows.map((r) => r.text) })}
              columns={[{ key: 'text', label: 'Step text', long: true }]}
            />
            <Txt label="“Play …” heading" hint="empty = hidden" value={platform.playTitle} onChange={(v) => setPlatform({ playTitle: v })} />
            <Txt label="Play button label" hint="empty = no button" value={platform.playButton?.label} onChange={(v) => patchPlatform('playButton', { label: v })} />
            <Lnk label="Play button link" value={platform.playButton?.url} onChange={(v) => patchPlatform('playButton', { url: v })} />
            <Txt label="“Download links” heading" hint="empty = hidden" value={platform.downloadTitle} onChange={(v) => setPlatform({ downloadTitle: v })} />
            <Txt label="Download button label" hint="empty = no button" value={platform.downloadButton?.label} onChange={(v) => patchPlatform('downloadButton', { label: v })} />
            <Lnk label="Download button link" value={platform.downloadButton?.url} onChange={(v) => patchPlatform('downloadButton', { url: v })} />
            <Txt label="Features heading" hint="empty = hidden" value={platform.featureTitle} onChange={(v) => setPlatform({ featureTitle: v })} />
            <Txt label="Left column heading" value={platform.setup?.title} onChange={(v) => patchPlatform('setup', { title: v })} />
            <ListEditor
              title="Left column lines (setting up)"
              rows={(platform.setup?.lines || []).map((text) => ({ text }))}
              max={20}
              makeRow={() => ({ text: '' })}
              onChange={(rows) => patchPlatform('setup', { lines: rows.map((r) => r.text) })}
              columns={[{ key: 'text', label: 'Line', long: true }]}
            />
            <Txt label="Right column heading" value={platform.tips?.title} onChange={(v) => patchPlatform('tips', { title: v })} />
            <ListEditor
              title="Right column lines (tips)"
              rows={(platform.tips?.lines || []).map((text) => ({ text }))}
              max={20}
              makeRow={() => ({ text: '' })}
              onChange={(rows) => patchPlatform('tips', { lines: rows.map((r) => r.text) })}
              columns={[{ key: 'text', label: 'Line', long: true }]}
            />
          </div>
        </ImageUploadProvider>
      </section>

      <FooterPageLayoutEditor
        value={form.sections}
        onChange={(sections) => setForm((prev) => ({ ...prev, sections: { ...prev.sections, blocks: sections.blocks || [] } }))}
        allowFaq
        hideHero
      />

      <SeoMetaFields
        form={form}
        setField={setField}
        showIndexControl
        showCanonical
        indexNoun="game page"
        indexControlName="game-page-google-index"
      />
      <PermanentRedirectField
        value={form.permanentRedirect}
        onChange={(value) => setField('permanentRedirect', value)}
      />
      <div className="footer-form-panel">
        <p className="footer-form-panel-title">Schema</p>
        <SchemaEditor
          value={form}
          auto={gameSchemaAuto({ ...form, slug }, originForStore(storeCode))}
          defaultType="WebPage"
          onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        />
      </div>
      </div>
    </form>
  )
}
