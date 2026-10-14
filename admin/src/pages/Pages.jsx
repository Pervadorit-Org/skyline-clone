import { lazy, Suspense, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getAllowedPagesForUser } from '../constants/routeConfig'
import { AUDIENCES, TAB_ALIASES, tabsForAllowed } from '../constants/pagesTabs'
import './Pages.css'

const BlogPosts = lazy(() => import('./BlogPosts'))
const Help = lazy(() => import('./Help'))
const LegalPageForm = lazy(() => import('./LegalPageForm'))
const HomeContent = lazy(() => import('./HomeContent'))
const FooterContent = lazy(() => import('./FooterContent'))
const LobbyContent = lazy(() => import('./LobbyContent'))

/** Public site the "View live page" links point at (local dev falls back to the user app on :5173). */
const SITE_URL = String(
  import.meta.env.VITE_PARTNER_APP_URL || (import.meta.env.DEV ? 'http://localhost:5173' : '')
).replace(/\/+$/, '')

/** Admin screens that control what the public Bonuses page shows. */
const BONUS_SCREENS = [
  { path: '/bonus', title: 'Bonus codes', text: 'Create and manage promo / bonus codes.' },
  { path: '/daily-bonus', title: 'Daily bonus', text: 'Daily reward campaigns and vouchers.' },
  { path: '/welcome-signup-bonus', title: 'Welcome signup bonus', text: 'Bonus given to new players when they register.' },
  { path: '/deposit-bonuses', title: 'Deposit bonuses', text: 'Extra coins on deposits.' },
  { path: '/spin-wheel', title: 'Spin wheel', text: 'Wheel prizes and spin rules.' },
  { path: '/vip', title: 'VIP', text: 'VIP levels and rewards.' },
  { path: '/affiliate', title: 'Refer & Earn', text: 'Referral reward settings.' },
  { path: '/activate-bonus-modal', title: 'Activate bonus popup', text: 'The popup that asks players to activate a bonus.' }
]

const SCREEN_LABELS = {
  '/help': 'Help content',
  '/support-tickets': 'Support tickets',
  '/footer': 'Footer links',
  '/social-links': 'Social media links'
}

function LiveLink({ path }) {
  if (!SITE_URL) return <code>{path}</code>
  return (
    <a className="admin-btn admin-btn-secondary" href={`${SITE_URL}${path}`} target="_blank" rel="noreferrer">
      View live page ↗
    </a>
  )
}

function InfoTab({ tab, allowed }) {
  const related = tab.related.filter((p) => allowed.has(p))
  return (
    <div className="pages-hub-card">
      <div className="pages-hub-card-head">
        <div>
          <h3>{tab.label}</h3>
          <p className="pages-hub-muted">
            {tab.summary} Public URL: <code>{tab.path}</code>
          </p>
        </div>
        <LiveLink path={tab.path} />
      </div>
      <div className="pages-hub-note" role="note">
        This page is part of the website itself, so there is no editable content for it in the admin yet.
        {related.length > 0 ? ' These related screens are available:' : ''}
      </div>
      {related.length > 0 && (
        <ul className="pages-hub-links">
          {related.map((p) => (
            <li key={p}>
              <Link to={p}>{SCREEN_LABELS[p] || p}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function BonusesTab({ tab, allowed }) {
  const screens = BONUS_SCREENS.filter((s) => allowed.has(s.path))
  return (
    <div className="pages-hub-card">
      <div className="pages-hub-card-head">
        <div>
          <h3>{tab.label}</h3>
          <p className="pages-hub-muted">
            The public Bonuses page (<code>{tab.path}</code>) shows what you set up in these screens.
          </p>
        </div>
        <LiveLink path={tab.path} />
      </div>
      {screens.length === 0 ? (
        <div className="pages-hub-note" role="note">You do not have access to any bonus screens.</div>
      ) : (
        <div className="pages-hub-grid">
          {screens.map((s) => (
            <Link key={s.path} to={s.path} className="pages-hub-tile">
              <strong>{s.title}</strong>
              <span>{s.text}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Pages() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabRefs = useRef({})

  const allowed = useMemo(() => new Set(getAllowedPagesForUser(user).map((p) => p.path)), [user])
  const allTabs = useMemo(() => tabsForAllowed(allowed), [allowed])

  const requestedRaw = searchParams.get('tab')
  const requested = TAB_ALIASES[requestedRaw] || requestedRaw
  const active = allTabs.find((t) => t.key === requested) || allTabs[0]
  // The tab strip shows the pages of one audience: guest visitors or signed-in players.
  const visibleTabs = useMemo(() => allTabs.filter((t) => t.audience === active?.audience), [allTabs, active])
  const audiences = AUDIENCES.filter((a) => allTabs.some((t) => t.audience === a.key))

  function selectTab(key) {
    const next = new URLSearchParams(searchParams)
    next.set('tab', key)
    setSearchParams(next, { replace: true })
  }

  function onKeyDown(e, index) {
    const last = visibleTabs.length - 1
    let to = null
    if (e.key === 'ArrowRight') to = index === last ? 0 : index + 1
    else if (e.key === 'ArrowLeft') to = index === 0 ? last : index - 1
    else if (e.key === 'Home') to = 0
    else if (e.key === 'End') to = last
    if (to == null) return
    e.preventDefault()
    const key = visibleTabs[to].key
    selectTab(key)
    tabRefs.current[key]?.focus()
  }

  if (!active) {
    return (
      <div className="pages-hub">
        <h2>Pages</h2>
        <p className="pages-hub-muted">You do not have access to any page content.</p>
      </div>
    )
  }

  return (
    <div className="pages-hub">
      <div className="pages-hub-header">
        <h2>Pages</h2>
        <p className="pages-hub-muted">Edit the website pages. Choose who sees them (guest visitors or signed-in players), then pick a page.</p>
      </div>

      {audiences.length > 1 && (
        <div className="pages-hub-audience" role="group" aria-label="Who sees these pages">
          {audiences.map((a) => (
            <button
              key={a.key}
              type="button"
              className={`pages-hub-audience-btn${a.key === active.audience ? ' active' : ''}`}
              aria-pressed={a.key === active.audience}
              onClick={() => selectTab(allTabs.find((t) => t.audience === a.key).key)}
            >
              {a.label} <span>{a.hint}</span>
            </button>
          ))}
        </div>
      )}

      <div className="pages-hub-tabs" role="tablist" aria-label="Website pages">
        {visibleTabs.map((t, i) => {
          const selected = t.key === active.key
          return (
            <button
              key={t.key}
              ref={(el) => { tabRefs.current[t.key] = el }}
              type="button"
              role="tab"
              id={`pages-tab-${t.key}`}
              aria-selected={selected}
              aria-controls="pages-tabpanel"
              tabIndex={selected ? 0 : -1}
              className={`pages-hub-tab${selected ? ' pages-hub-tab-active' : ''}`}
              onClick={() => selectTab(t.key)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="pages-hub-panel" role="tabpanel" id="pages-tabpanel" aria-labelledby={`pages-tab-${active.key}`}>
        <Suspense fallback={<p className="pages-hub-muted">Loading…</p>}>
          {active.kind === 'home' && <HomeContent />}
          {active.kind === 'lobby' && <LobbyContent section={active.section} />}
          {active.kind === 'footer' && <FooterContent />}
          {active.kind === 'blog' && <BlogPosts />}
          {active.kind === 'help' && <Help />}
          {active.kind === 'legal' && <LegalPageForm key={active.key} pageKey={active.key} embedded />}
          {active.kind === 'info' && <InfoTab tab={active} allowed={allowed} />}
          {active.kind === 'bonuses' && <BonusesTab tab={active} allowed={allowed} />}
        </Suspense>
      </div>
    </div>
  )
}
