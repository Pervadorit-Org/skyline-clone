import { lazy, Suspense, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getAllowedPagesForUser } from '../constants/routeConfig'
import './Pages.css'

const BlogPosts = lazy(() => import('./BlogPosts'))
const Help = lazy(() => import('./Help'))
const LegalPageForm = lazy(() => import('./LegalPageForm'))

/** Public site the "View live page" links point at (local dev falls back to the user app on :5173). */
const SITE_URL = String(
  import.meta.env.VITE_PARTNER_APP_URL || (import.meta.env.DEV ? 'http://localhost:5173' : '')
).replace(/\/+$/, '')

/**
 * One tab per public page. `needs` is the admin screen whose permission gates the tab
 * (a tab is hidden when the signed-in admin cannot open that screen).
 * `kind`: 'blog' | 'help' | 'legal' | 'info' | 'bonuses'.
 */
const TABS = [
  { key: 'blog', label: 'Blog', path: '/blog', kind: 'blog', needs: '/blog' },
  { key: 'help', label: 'Help Center', path: '/help', kind: 'help', needs: '/help' },
  {
    key: 'faq',
    label: 'FAQ',
    path: '/faq',
    kind: 'info',
    summary: 'Frequently Asked Questions page.',
    related: ['/help', '/support-tickets', '/footer']
  },
  {
    key: 'contact',
    label: 'Contact Us',
    path: '/contact',
    kind: 'info',
    summary: 'Contact page with live chat, support email and the help center.',
    related: ['/social-links', '/support-tickets', '/help']
  },
  { key: 'privacy', label: 'Privacy Policy', path: '/privacy', kind: 'legal', needs: '/footer' },
  { key: 'terms', label: 'Terms & Conditions', path: '/terms', kind: 'legal', needs: '/footer' },
  { key: 'responsible-gaming', label: 'Responsible Gaming', path: '/responsible-gaming', kind: 'legal', needs: '/footer' },
  { key: 'bonuses', label: 'Bonuses', path: '/bonus', kind: 'bonuses' }
]

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
  const visibleTabs = useMemo(() => TABS.filter((t) => !t.needs || allowed.has(t.needs)), [allowed])

  const requested = searchParams.get('tab')
  const active = visibleTabs.find((t) => t.key === requested) || visibleTabs[0]

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
        <p className="pages-hub-muted">Edit the content of the public website pages. Pick a page below.</p>
      </div>

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
