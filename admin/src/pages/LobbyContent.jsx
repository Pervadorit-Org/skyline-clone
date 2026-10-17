import { useCallback, useEffect, useMemo, useState } from 'react'
import { getStores } from '../api/admin'
import { getLobbyContent, updateLobbyContent, resetLobbyContent, uploadLobbyImage, getLobbyPopular, fetchGameCatalog } from '../api/lobbyContent'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import { ROLES } from '../constants/roles'
import {
  LOBBY_DEFAULTS, LOBBY_ROWS, KIND_HELP, POPULAR_ROWS, CARD_GROUPS, CATEGORY_PILLS, DEFAULT_PROVIDER_LOGOS,
  SIDEBAR_ITEMS, SIDEBAR_TEXT, HEADER_ITEMS,
  FAQ_DEFAULT_SECTIONS, FAQ_DEFAULT_INTRO, TASK_DEFAULTS, PROMO_CARD_DEFAULTS,
  STORE_TAB_ITEMS, STORE_TEXT_GROUPS, STORE_SECTIONS,
} from './lobbyContentDefaults'
import { Field, Txt, ImgField, ListEditor, ImageUploadProvider, SITE_URL, clone, mergeOver } from '../components/ContentFields'
import { TextGroupCard, TextSlot, ItemList, GameIdsField } from '../components/LobbyEditors'
import './HomeContent.css'

const NAV = [
  { key: 'banners', label: 'Banners' },
  { key: 'rows', label: 'Game rows' },
  { key: 'popular', label: 'Popular games (Top 10)' },
  { key: 'cards', label: 'Cards, panels & text' },
  { key: 'sidebar', label: 'Sidebar' },
  { key: 'header', label: 'Header menu' },
  { key: 'hidden', label: 'Hidden games' },
  { key: 'faq', label: 'FAQ' },
  { key: 'tasks', label: 'Task list' },
  { key: 'promotions', label: 'Promotions page' },
  { key: 'store', label: 'Store popup' },
]

/** Signed-in lobby: banners, which game rows show (order, titles, counts, picked games), hidden games. */
export default function LobbyContent({ section }) {
  const { user } = useAuth()
  const toast = useToast()
  const { confirm } = useConfirm()
  const isMaster = user?.role === ROLES.MASTER_ADMIN

  const [storeCode, setStoreCode] = useState(isMaster ? 'goldendragon' : (user?.storeCode || ''))
  const [storeOptions, setStoreOptions] = useState([])
  const [form, setForm] = useState(() => clone(LOBBY_DEFAULTS))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeLocal, setActive] = useState('banners')
  // Opened from the Pages menu: `section` says which part to show, and the inner menu is not needed.
  const controlled = Boolean(section)
  const active = section || activeLocal
  const [catalog, setCatalog] = useState([])
  const [catalogState, setCatalogState] = useState('idle') // idle | loading | ready | empty
  const [ranking, setRanking] = useState(null) // { games, source, days } | { error }
  const [rankingBusy, setRankingBusy] = useState(false)

  useEffect(() => {
    if (!isMaster) return
    getStores({ limit: 500, sortBy: 'storeCode', sortOrder: 'ASC' })
      .then((res) => setStoreOptions([...new Set((res?.list || []).map((s) => s.storeCode).filter(Boolean))]))
      .catch(() => setStoreOptions([]))
  }, [isMaster])

  const load = useCallback((code) => {
    const target = isMaster ? code : (user?.storeCode || '')
    if (isMaster && !target) { setForm(clone(LOBBY_DEFAULTS)); setLoading(false); return }
    setLoading(true)
    getLobbyContent(target)
      .then((res) => setForm(mergeOver(LOBBY_DEFAULTS, res?.lobby)))
      .catch((err) => { toast.error(err.message || 'Failed to load the lobby.'); setForm(clone(LOBBY_DEFAULTS)) })
      .finally(() => setLoading(false))
  }, [isMaster, user, toast])

  useEffect(() => { load(storeCode) }, [load, storeCode])

  const loadCatalog = useCallback(() => {
    if (catalogState === 'loading' || catalogState === 'ready') return
    setCatalogState('loading')
    fetchGameCatalog(isMaster ? storeCode.trim() : user?.storeCode)
      .then((list) => { setCatalog(list); setCatalogState(list.length ? 'ready' : 'empty') })
      .catch(() => setCatalogState('empty'))
  }, [catalogState, isMaster, storeCode, user])

  // a different store has a different game list
  useEffect(() => { setCatalog([]); setCatalogState('idle'); setRanking(null) }, [storeCode])

  const loadRanking = async () => {
    setRankingBusy(true)
    try {
      setRanking(await getLobbyPopular(isMaster ? storeCode.trim() : undefined, form.popularity?.days))
      loadCatalog()
    } catch (err) {
      setRanking({ error: err.message || 'Could not load the ranking.' })
    } finally {
      setRankingBusy(false)
    }
  }

  const setText = (path, value) => setForm((f) => {
    const text = { ...(f.text || {}) }
    if (String(value ?? '').trim()) text[path] = value; else delete text[path]
    return { ...f, text }
  })
  const setOff = (key, hide) => setForm((f) => {
    const off = (f.off || []).filter((k) => k !== key)
    if (hide) off.push(key)
    return { ...f, off }
  })
  const text = form.text || {}
  const off = form.off || []

  const sec = form.sections || {}
  const setSec = (patch) => setForm((f) => ({ ...f, sections: { ...f.sections, ...patch } }))
  const setIn = (group, id, value) => setSec({ [group]: { ...(sec[group] || {}), [id]: value } })

  /** Rows in the order the website shows them (saved order first, the rest in default order). */
  const orderedRows = useMemo(() => {
    const byId = new Map(LOBBY_ROWS.map((r) => [r.id, r]))
    const saved = (sec.order || []).filter((id) => byId.has(id))
    const rest = LOBBY_ROWS.map((r) => r.id).filter((id) => !saved.includes(id))
    return [...saved, ...rest].map((id) => byId.get(id))
  }, [sec.order])

  const move = (id, dir) => {
    const order = orderedRows.map((r) => r.id)
    const i = order.indexOf(id)
    const j = i + dir
    if (j < 0 || j >= order.length) return
    ;[order[i], order[j]] = [order[j], order[i]]
    setSec({ order })
  }

  const setPicks = (id, list) => setForm((f) => {
    const picks = { ...(f.picks || {}) }
    if (list.length) picks[id] = list; else delete picks[id]
    return { ...f, picks }
  })
  const setFeatured = (id, patch) => setForm((f) => ({ ...f, featured: { ...(f.featured || {}), [id]: { ...(f.featured?.[id] || {}), ...patch } } }))

  async function handleSave() {
    if (isMaster && !storeCode.trim()) { toast.error('Enter a store code first.'); return }
    setSaving(true)
    try {
      await updateLobbyContent(isMaster ? storeCode.trim() : undefined, form)
      toast.success('Lobby saved.')
    } catch (err) {
      toast.error(err.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    const ok = await confirm({
      title: 'Reset lobby?',
      message: 'This clears the saved lobby for this store. The website goes back to the built-in lobby.',
      confirmLabel: 'Reset',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await resetLobbyContent(isMaster ? storeCode.trim() : undefined)
      toast.success('Reset to default.')
      setForm(clone(LOBBY_DEFAULTS))
    } catch (err) {
      toast.error(err.message || 'Reset failed.')
    }
  }

  if (loading) return <div className="hc-page"><p>Loading…</p></div>

  const renderPanel = () => {
    switch (active) {
      case 'banners': return (<>
        <p className="hc-muted">
          The banners at the top of the signed-in lobby. Leave the list empty to keep the built-in slides. Upload
          a wide image for desktop and a tall one for phones.
        </p>
        <ListEditor title="Banners" rows={form.banners || []} max={12}
          makeRow={() => ({ label: '', href: '', desktop: '', mobile: '' })}
          onChange={(rows) => setForm((f) => ({ ...f, banners: rows }))}
          columns={[
            { key: 'label', label: 'Name (for screen readers)' },
            { key: 'href', label: 'Link (/path or https://…)' },
            { key: 'desktop', label: 'Desktop image', type: 'image' },
            { key: 'mobile', label: 'Phone image', type: 'image' },
          ]} />
      </>)
      case 'rows': return (<>
        <p className="hc-muted">
          Every row is filled from the game list, so new games appear on their own. Turn a row off, move it, rename
          it, change how many games it shows, or pick the games yourself by searching their name (empty = automatic).
          A row with too few games hides itself.
        </p>
        <div className="hc-list" style={{ gridColumn: '1 / -1' }}>
          {orderedRows.map((row, i) => {
            const on = sec.enabled?.[row.id] !== false
            return (
              <div className="hc-row" key={row.id} style={{ opacity: on ? 1 : 0.55 }}>
                <div className="hc-row-fields">
                  <label className="hc-check">
                    <input type="checkbox" checked={on} onChange={(e) => setIn('enabled', row.id, e.target.checked)} />
                    <strong>{row.title}</strong> <span className="hc-nav-tag">{row.type}</span>
                  </label>
                  <Txt label="Title" value={sec.titles?.[row.id] ?? ''} placeholder={row.title}
                    onChange={(v) => setIn('titles', row.id, v)} />
                  <Field label="Games shown" hint={`default ${row.count}`}>
                    <input type="number" min={1} max={60} value={sec.counts?.[row.id] ?? ''} placeholder={String(row.count)}
                      onChange={(e) => setIn('counts', row.id, e.target.value === '' ? '' : Number(e.target.value))} />
                  </Field>
                  <GameIdsField label="Games in this row" hint={KIND_HELP[row.kind]} ids={form.picks?.[row.id] || []}
                    onChange={(list) => setPicks(row.id, list)} catalog={catalog} catalogState={catalogState} loadCatalog={loadCatalog} />
                  {row.type === 'featured' ? (<>
                    <Txt label="Studio" hint="empty = automatic" value={form.featured?.[row.id]?.brand ?? ''}
                      onChange={(v) => setFeatured(row.id, { brand: v })} />
                    <ImgField label="Artwork (desktop)" value={form.featured?.[row.id]?.bgDesktop}
                      onChange={(v) => setFeatured(row.id, { bgDesktop: v })} />
                    <ImgField label="Artwork (phone)" value={form.featured?.[row.id]?.bgMobile}
                      onChange={(v) => setFeatured(row.id, { bgMobile: v })} />
                  </>) : null}
                </div>
                <div className="hc-row-actions">
                  <button type="button" className="hc-icon-btn" title="Up" onClick={() => move(row.id, -1)} disabled={i === 0}>↑</button>
                  <button type="button" className="hc-icon-btn" title="Down" onClick={() => move(row.id, 1)} disabled={i === orderedRows.length - 1}>↓</button>
                </div>
              </div>
            )
          })}
        </div>
      </>)
      case 'popular': {
        const pop = form.popularity || {}
        const titleOf = (id) => catalog.find((g) => g.id === id)?.title
        const games = ranking?.games || []
        return (<>
          <p className="hc-muted">
            Top 10, Trending and Top Games follow what players really play. The ranking is read from the existing play
            history (most players first, then most plays) — nothing is stored or changed. Games you pick by hand in
            “Game rows” always win over the ranking.
          </p>
          <Field label="Ranking">
            <select value={pop.mode || 'auto'} onChange={(e) => setForm((f) => ({ ...f, popularity: { ...f.popularity, mode: e.target.value } }))}>
              <option value="auto">Automatic — from real plays</option>
              <option value="off">Off — keep the game-list order</option>
            </select>
          </Field>
          <Field label="Look back" hint="how far back plays count">
            <select value={pop.days || 30} onChange={(e) => setForm((f) => ({ ...f, popularity: { ...f.popularity, days: Number(e.target.value) } }))}>
              {[7, 30, 90, 365].map((d) => <option key={d} value={d}>{d} days</option>)}
            </select>
          </Field>
          <div className="hc-list" style={{ gridColumn: '1 / -1' }}>
            <div className="hc-list-head">
              <strong>Live ranking</strong>
              <button type="button" className="admin-btn admin-btn-secondary hc-btn-sm" onClick={loadRanking} disabled={rankingBusy}>
                {rankingBusy ? 'Loading…' : (ranking ? 'Refresh' : 'Show ranking')}
              </button>
            </div>
            {ranking?.error ? <p className="hc-err">{ranking.error}</p> : null}
            {ranking && !ranking.error && !games.length ? (
              <p className="hc-muted">No plays in the last {ranking.days || pop.days || 30} days, so these rows use the game-list order. Try a longer look-back.</p>
            ) : null}
            {ranking && !ranking.error && games.length ? (<>
              <p className="hc-muted">
                {ranking.source === 'store' ? 'From this store’s players.' : ranking.source === 'store+shared'
                  ? 'This store has few plays, so other stores’ plays fill the rest.' : 'This store has no plays yet — using the other stores’ plays.'}
                {' '}Save the lobby after changing anything on this tab.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '6px 0 10px' }}>
                {POPULAR_ROWS.filter((r) => !r.note).map((r) => (
                  <button key={r.id} type="button" className="admin-btn admin-btn-secondary hc-btn-sm"
                    onClick={() => setPicks(r.id, games.slice(r.from, r.from + r.count).map((g) => g.id))}>
                    Lock ranks {r.from + 1}–{r.from + r.count} into “{r.title}”
                  </button>
                ))}
                {POPULAR_ROWS.filter((r) => !r.note).map((r) => (form.picks?.[r.id]?.length ? (
                  <button key={`c${r.id}`} type="button" className="admin-btn admin-btn-secondary hc-btn-sm" onClick={() => setPicks(r.id, [])}>
                    Back to automatic: {r.title}
                  </button>
                ) : null))}
              </div>
              <table className="admin-table" style={{ width: '100%' }}>
                <thead><tr><th>#</th><th>Game</th><th>Id</th><th>Players</th><th>Plays</th></tr></thead>
                <tbody>
                  {games.slice(0, 40).map((g, i) => (
                    <tr key={g.id}><td>{i + 1}</td><td>{titleOf(g.id) || '—'}</td><td>{g.id}</td><td>{g.players}</td><td>{g.plays}</td></tr>
                  ))}
                </tbody>
              </table>
            </>) : null}
          </div>
        </>)
      }
      case 'cards': return (<>
        <p className="hc-muted">
          Edit the words, links and pictures of the cards and panels on the lobby. A box left empty keeps the built-in
          text (shown grey). Switch a card or panel off to remove it from the website.
        </p>
        <div className="hc-list" style={{ gridColumn: '1 / -1' }}>
          {CARD_GROUPS.map((g) => (
            <TextGroupCard key={g.title} group={g} text={text} setText={setText} off={off} setOff={setOff}>
              {g.extra === 'providers' ? (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p className="hc-muted">
                    Provider logos. Empty = the built-in 8 logos.{' '}
                    {(form.providers || []).length === 0 ? (
                      <button type="button" className="admin-btn admin-btn-secondary hc-btn-sm"
                        onClick={() => setForm((f) => ({ ...f, providers: clone(DEFAULT_PROVIDER_LOGOS) }))}>Start from the built-in list</button>
                    ) : null}
                  </p>
                  <ListEditor title="Logos" rows={form.providers || []} max={24}
                    makeRow={() => ({ name: '', image: '' })}
                    onChange={(rows) => setForm((f) => ({ ...f, providers: rows }))}
                    columns={[{ key: 'name', label: 'Name' }, { key: 'image', label: 'Logo', type: 'image' }]} />
                </div>
              ) : null}
            </TextGroupCard>
          ))}
          <div className="hc-row">
            <div className="hc-row-fields">
              <strong style={{ gridColumn: '1 / -1' }}>Category pills (under the cards)</strong>
              {CATEGORY_PILLS.map((c, i) => {
                const hidden = off.includes(`tab:${c.id}`)
                return (
                  <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'end', opacity: hidden ? 0.55 : 1 }}>
                    <TextSlot field={{ path: `categories.${i}.label`, label: `Name (built-in: ${c.label})`, default: c.label }} text={text} setText={setText} />
                    <label className="hc-switch">
                      <input type="checkbox" checked={!hidden} onChange={(e) => setOff(`tab:${c.id}`, !e.target.checked)} /> Show
                    </label>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </>)
      case 'sidebar': return (<>
        <p className="hc-muted">
          The menu on the left of the signed-in lobby. Rename an item, hide it, change the balance card words or logo,
          or add your own links at the bottom. A box left empty keeps the built-in text.
        </p>
        {SIDEBAR_TEXT.map((field) => <TextSlot key={field.path} field={field} text={text} setText={setText} />)}
        <ListEditor title="Extra links (shown above Logout)" rows={form.sidebarLinks || []} max={10}
          makeRow={() => ({ label: '', to: '' })}
          onChange={(rows) => setForm((f) => ({ ...f, sidebarLinks: rows }))}
          columns={[{ key: 'label', label: 'Name' }, { key: 'to', label: 'Link (/path or https://…)' }]} />
        <ItemList group="sidebar" items={SIDEBAR_ITEMS} text={text} setText={setText} off={off} setOff={setOff} />
      </>)
      case 'header': return (<>
        <p className="hc-muted">The top menu for signed-in players (and the phone menu). Rename or hide an item.</p>
        <ItemList group="header" items={HEADER_ITEMS} text={text} setText={setText} off={off} setOff={setOff} />
      </>)
      case 'hidden': return (<>
        <p className="hc-muted">Games to keep out of every lobby row (they stay playable elsewhere).</p>
        <GameIdsField label="Hidden games" ids={form.hiddenGames || []}
          onChange={(list) => setForm((f) => ({ ...f, hiddenGames: list }))}
          catalog={catalog} catalogState={catalogState} loadCatalog={loadCatalog} />
      </>)
      case 'faq': {
        const faq = form.faq || { intro: '', sections: [] }
        const sections = faq.sections || []
        const setFaq = (patch) => setForm((f) => ({ ...f, faq: { ...(f.faq || {}), ...patch } }))
        const setSection = (i, patch) => setFaq({ sections: sections.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
        const moveSection = (i, dir) => {
          const j = i + dir
          if (j < 0 || j >= sections.length) return
          const next = [...sections]
          ;[next[i], next[j]] = [next[j], next[i]]
          setFaq({ sections: next })
        }
        return (<>
          <p className="hc-muted">
            The questions on the public FAQ page. Empty = the built-in FAQ. Add categories, then questions inside each one.
          </p>
          {sections.length === 0 ? (
            <button type="button" className="admin-btn admin-btn-secondary hc-btn-sm"
              onClick={() => setFaq({ intro: faq.intro || '', sections: clone(FAQ_DEFAULT_SECTIONS) })}>
              Start from the built-in FAQ
            </button>
          ) : null}
          <Txt label="Intro line (shown under the title)" long value={faq.intro ?? ''}
            placeholder={`<Platform name> ${FAQ_DEFAULT_INTRO}`} onChange={(v) => setFaq({ intro: v })} />
          <div className="hc-list" style={{ gridColumn: '1 / -1' }}>
            <div className="hc-list-head">
              <strong>Categories</strong>
              <button type="button" className="admin-btn admin-btn-secondary hc-btn-sm" disabled={sections.length >= 20}
                onClick={() => setFaq({ sections: [...sections, { title: '', items: [{ q: '', a: '' }] }] })}>+ Add category</button>
            </div>
            {sections.map((sec, i) => (
              <div className="hc-row" key={i}>
                <div className="hc-row-fields">
                  <Txt label="Category title" value={sec.title} onChange={(v) => setSection(i, { title: v })} />
                  <div style={{ gridColumn: '1 / -1' }}>
                    <ListEditor title="Questions" rows={sec.items || []} max={40}
                      makeRow={() => ({ q: '', a: '' })}
                      onChange={(rows) => setSection(i, { items: rows })}
                      columns={[{ key: 'q', label: 'Question' }, { key: 'a', label: 'Answer', long: true }]} />
                  </div>
                </div>
                <div className="hc-row-actions">
                  <button type="button" className="hc-icon-btn" title="Up" onClick={() => moveSection(i, -1)} disabled={i === 0}>↑</button>
                  <button type="button" className="hc-icon-btn" title="Down" onClick={() => moveSection(i, 1)} disabled={i === sections.length - 1}>↓</button>
                  <button type="button" className="hc-icon-btn hc-del" title="Remove" onClick={() => setFaq({ sections: sections.filter((_, j) => j !== i) })}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </>)
      }
      case 'tasks': {
        const tasks = form.tasks || { regular: [], daily: [] }
        const setGroup = (group, rows) => setForm((f) => ({ ...f, tasks: { ...(f.tasks || {}), [group]: rows } }))
        const taskColumns = [
          { key: 'title', label: 'Title' },
          { key: 'desc', label: 'Description' },
          { key: 'target', label: 'Mission target' },
          { key: 'url', label: 'Button link (https://…, empty = built-in)' },
          { key: 'to', label: 'Site link (/path)' },
          { key: 'cta', label: 'Button text' },
          { key: 'gc', label: 'GC reward (text)' },
          { key: 'sc', label: 'SC reward (text)' },
          { key: 'enabled', label: 'Show', type: 'bool' },
        ]
        return (<>
          <p className="hc-muted">
            The Task List window players open from the sidebar. Empty = the built-in tasks. Rewards are shown as text
            only; they are not paid out by this list.
          </p>
          {['regular', 'daily'].map((group) => {
            const rows = tasks[group] || []
            return (
              <div key={group} style={{ gridColumn: '1 / -1' }}>
                {rows.length === 0 ? (
                  <button type="button" className="admin-btn admin-btn-secondary hc-btn-sm" style={{ marginBottom: 8 }}
                    onClick={() => setGroup(group, clone(TASK_DEFAULTS[group]))}>
                    Start from the built-in {group === 'regular' ? 'regular' : 'daily'} tasks
                  </button>
                ) : null}
                <ListEditor title={group === 'regular' ? 'Regular tasks' : 'Daily tasks'} rows={rows} max={20}
                  makeRow={() => ({ id: '', title: '', desc: '', target: '', url: '', to: '', cta: '', gc: '', sc: '', enabled: true })}
                  onChange={(next) => setGroup(group, next.map((r) => ({ ...r, enabled: r.enabled !== false })))}
                  columns={taskColumns} />
              </div>
            )
          })}
        </>)
      }
      case 'promotions': {
        const cards = form.promoCards || []
        const setCards = (next) => setForm((f) => ({ ...f, promoCards: next }))
        const setCard = (i, patch) => setCards(cards.map((c, j) => (j === i ? { ...c, ...patch } : c)))
        const moveCard = (i, dir) => {
          const j = i + dir
          if (j < 0 || j >= cards.length) return
          const next = [...cards]
          ;[next[i], next[j]] = [next[j], next[i]]
          setCards(next)
        }
        const meta = (id) => PROMO_CARD_DEFAULTS.find((d) => d.id === id)
        const FIELD_LABELS = {
          ribbon: 'Corner ribbon', badge: 'Heading', text: 'Subtext', gold: 'Gold Coins amount', sweep: 'Free Sweep Coins amount',
          cta: 'Button text', to: 'Button link (/path or https://…)', note: 'Small note under the button',
        }
        return (<>
          <p className="hc-muted">
            The cards on the public Promotions page. Empty = the built-in cards. Change the words, amounts and links,
            reorder, or hide a card. Card artwork is fixed per card.
          </p>
          {cards.length === 0 ? (
            <button type="button" className="admin-btn admin-btn-secondary hc-btn-sm"
              onClick={() => setCards(PROMO_CARD_DEFAULTS.map(({ label, fields, ...c }) => ({ enabled: true, ...c })))}>
              Start from the built-in cards
            </button>
          ) : null}
          <div className="hc-list" style={{ gridColumn: '1 / -1' }}>
            {cards.map((c, i) => {
              const m = meta(c.id)
              if (!m) return null
              const on = c.enabled !== false
              return (
                <div className="hc-row" key={c.id} style={{ opacity: on ? 1 : 0.55 }}>
                  <div className="hc-row-fields">
                    <label className="hc-check" style={{ gridColumn: '1 / -1' }}>
                      <input type="checkbox" checked={on} onChange={(e) => setCard(i, { enabled: e.target.checked })} />
                      <strong>{m.label}</strong>
                    </label>
                    {m.fields.map((fk) => (
                      <Txt key={fk} label={FIELD_LABELS[fk]} value={c[fk] ?? ''} placeholder={m[fk] || ''}
                        onChange={(v) => setCard(i, { [fk]: v })} />
                    ))}
                  </div>
                  <div className="hc-row-actions">
                    <button type="button" className="hc-icon-btn" title="Up" onClick={() => moveCard(i, -1)} disabled={i === 0}>↑</button>
                    <button type="button" className="hc-icon-btn" title="Down" onClick={() => moveCard(i, 1)} disabled={i === cards.length - 1}>↓</button>
                  </div>
                </div>
              )
            })}
          </div>
        </>)
      }
      case 'store': return (<>
        <p className="hc-muted">
          The Store popup players open from the Store button: Buy, Redeem and Bonus. Packages, prices, free SC, badges and
          countdowns are managed in <strong>Deposit packages</strong>; here you change the words and which tabs show.
        </p>
        <div className="hc-list" style={{ gridColumn: '1 / -1' }}>
          {STORE_TEXT_GROUPS.map((g) => (
            <div className="hc-row" key={g.title}>
              <div className="hc-row-fields">
                <strong style={{ gridColumn: '1 / -1' }}>{g.title}</strong>
                {g.note ? <p className="hc-muted" style={{ gridColumn: '1 / -1', margin: 0 }}>{g.note}</p> : null}
                {g.fields.map((field) => <TextSlot key={field.path} field={field} text={text} setText={setText} />)}
              </div>
            </div>
          ))}
        </div>
        <div className="hc-row">
          <div className="hc-row-fields">
            <strong style={{ gridColumn: '1 / -1' }}>Sections (Buy tab)</strong>
            <p className="hc-muted" style={{ gridColumn: '1 / -1', margin: 0 }}>Switch a part of the Buy tab off to remove it from the website.</p>
            {STORE_SECTIONS.map((sec) => {
              const hidden = off.includes(`store:${sec.id}`)
              return (
                <label key={sec.id} className="hc-switch" style={{ gridColumn: '1 / -1', opacity: hidden ? 0.6 : 1 }}>
                  <input type="checkbox" checked={!hidden} onChange={(e) => setOff(`store:${sec.id}`, !e.target.checked)} />
                  <span><strong>{sec.label}</strong> <span className="hc-muted">{sec.hint}</span></span>
                </label>
              )
            })}
          </div>
        </div>
        <ItemList group="store" items={STORE_TAB_ITEMS} text={text} setText={setText} off={off} setOff={setOff} />
      </>)
      default: return null
    }
  }

  return (
    <ImageUploadProvider upload={uploadLobbyImage}>
      <div className="hc-page">
        <div className="hc-header">
          <div>
            <h2>Lobby</h2>
            <p className="hc-muted">The home page players see after they sign in. Anything left as default keeps the built-in lobby.</p>
          </div>
          {SITE_URL ? <a className="admin-btn admin-btn-secondary" href={SITE_URL} target="_blank" rel="noreferrer">View live page ↗</a> : null}
        </div>

        {isMaster && (
          <div className="hc-store">
            <label className="hc-field">
              <span className="hc-field-label">Store code</span>
              <input list="hc-lobby-stores" value={storeCode} onChange={(e) => setStoreCode(e.target.value)} placeholder="goldendragon" />
              <datalist id="hc-lobby-stores">{storeOptions.map((c) => <option key={c} value={c} />)}</datalist>
            </label>
          </div>
        )}

        <div className="hc-layout" style={controlled ? { gridTemplateColumns: '1fr' } : undefined}>
          {controlled ? null : (<>
          <select className="hc-nav-select" value={active} onChange={(e) => setActive(e.target.value)}>
            {NAV.map((n) => <option key={n.key} value={n.key}>{n.label}</option>)}
          </select>
          <nav className="hc-nav" aria-label="Lobby sections">
            {NAV.map((n) => (
              <button key={n.key} type="button" className={`hc-nav-item${active === n.key ? ' active' : ''}`} onClick={() => setActive(n.key)}>
                <span className="hc-nav-item-label">{n.label}</span>
              </button>
            ))}
          </nav>
          </>)}
          <div className="hc-panel">
            <div className="hc-panel-head"><h3>{NAV.find((n) => n.key === active)?.label}</h3></div>
            <div className="hc-panel-body">{renderPanel()}</div>
          </div>
        </div>

        <div className="hc-actions">
          <button type="button" className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save lobby'}
          </button>
          <button type="button" className="admin-btn admin-btn-secondary" onClick={handleReset} disabled={saving}>Reset to default</button>
        </div>
      </div>
    </ImageUploadProvider>
  )
}
