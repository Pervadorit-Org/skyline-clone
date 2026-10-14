import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getAllowedPagesForUser } from '../constants/routeConfig'
import { AUDIENCES, PAGE_TABS, TAB_ALIASES, tabsForAllowed } from '../constants/pagesTabs'

/**
 * The "Pages" item of the admin sidebar: opens a dropdown with the pages split into
 * "Guest users" (before login) and "Logged-in users" (after login).
 */
export default function PagesNavGroup({ user, label, onNavigate }) {
  const { pathname, search } = useLocation()
  const onPages = pathname === '/pages' || pathname.startsWith('/pages/')
  const [open, setOpen] = useState(onPages)

  // Opening a Pages screen from anywhere (a link, the back button) keeps the dropdown open.
  useEffect(() => { if (onPages) setOpen(true) }, [onPages])

  const tabs = useMemo(() => {
    const allowed = new Set(getAllowedPagesForUser(user).map((p) => p.path))
    return tabsForAllowed(allowed)
  }, [user])

  const raw = new URLSearchParams(search).get('tab')
  const requested = TAB_ALIASES[raw] || raw
  const activeKey = onPages ? (tabs.find((t) => t.key === requested) || tabs[0] || PAGE_TABS[0])?.key : null

  return (
    <div className="admin-sidebar-group">
      <button
        type="button"
        className={`admin-sidebar-link admin-sidebar-group-toggle${onPages ? ' active' : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{label}</span>
        <svg className={`admin-sidebar-chevron${open ? ' open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="admin-sidebar-sub">
          {AUDIENCES.map((a) => {
            const items = tabs.filter((t) => t.audience === a.key)
            if (!items.length) return null
            return (
              <div key={a.key} className="admin-sidebar-sub-section">
                <div className="admin-sidebar-sub-title">{a.label} <span>{a.hint}</span></div>
                {items.map((t) => (
                  <Link
                    key={t.key}
                    to={`/pages?tab=${t.key}`}
                    className={`admin-sidebar-sublink${t.key === activeKey ? ' active' : ''}`}
                    onClick={onNavigate}
                  >
                    {t.label}
                  </Link>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
