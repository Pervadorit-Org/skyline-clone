import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { getLegalPage } from '../api/legal';
import { site } from '../config/site';
import { usePageContentReady } from '../context/PageReadyContext';
import { usePageSeo } from '../utils/pageSeo';
import { sanitizeHtml } from '../utils/sanitizeHtml';
import './Blog/Blog.css';
import './FooterPage/FooterPage.css';
import './legal-prose.css';

function siteOrigin() {
  const fromSite = String(site.canonicalUrl || '').trim().replace(/\/+$/, '');
  if (fromSite) return fromSite;
  const fromEnv = typeof import.meta !== 'undefined'
    ? String(import.meta.env?.VITE_SITE_ORIGIN || import.meta.env?.VITE_SITE_URL || '').trim().replace(/\/+$/, '')
    : '';
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return '';
}

const LEGAL_PAGE_META = {
  privacy: {
    pageKey: 'privacy',
    path: '/privacy',
    title: 'Privacy Policy',
    backTo: '/register',
    backLabel: 'Back to Sign Up'
  },
  terms: {
    pageKey: 'terms',
    path: '/terms',
    title: 'Terms and Conditions',
    backTo: '/register',
    backLabel: 'Back to Sign Up'
  },
  'responsible-gaming': {
    pageKey: 'responsible-gaming',
    path: '/responsible-gaming',
    title: 'Responsible Gambling',
    backTo: '/',
    backLabel: 'Back to Home'
  }
};

const SIMPLE_PAGES = {
  'about-us': { path: '/about-us', title: 'About Us' },
  'bonus-terms': { path: '/bonus-terms', title: 'Bonus Terms' },
  'sweep-policy': { path: '/sweep-policy', title: 'Sweep Policy' },
  amoe: { path: '/amoe', title: 'AMOE' },
  'aml-cft-policy': { path: '/aml-cft-policy', title: 'AML/CFT Policy' },
  'cookie-policy': { path: '/cookie-policy', title: 'Cookie Policy' },
  'ssl-encryption': { path: '/ssl-encryption', title: 'SSL Encryption' },
};
Object.entries(SIMPLE_PAGES).forEach(([key, page]) => {
  LEGAL_PAGE_META[key] = { pageKey: key, ...page, backTo: '/', backLabel: 'Back to Home' };
});

function wrapTablesForScroll(root) {
  if (!root) return;
  root.querySelectorAll('table').forEach((table) => {
    if (table.parentElement?.classList?.contains('pj-blog-table-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'pj-blog-table-wrap';
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
  });
}

function LegalPageSkeleton() {
  return (
    <div className="pj-blog-page pj-blog-detail pj-footer-page-skeleton" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading page…</span>
      <div className="pj-footer-skel-title" />
      <div className="pj-footer-skel-line pj-footer-skel-line--lg" />
      <div className="pj-footer-skel-line pj-footer-skel-line--lg" />
      <div className="pj-footer-skel-line pj-footer-skel-line--md" />
      <div className="pj-footer-skel-gap" />
      <div className="pj-footer-skel-line pj-footer-skel-line--lg" />
      <div className="pj-footer-skel-line pj-footer-skel-line--md" />
      <div className="pj-footer-skel-line pj-footer-skel-line--sm" />
    </div>
  );
}

/** Shown when the admin has not published this page (hidden, empty or failed to load): never a blank page. */
function UnavailableNotice({ meta }) {
  return (
    <div role="status">
      <p>
        This page isn't available right now. For help, contact{' '}
        <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>.
      </p>
      <p>
        <Link to={meta.backTo}>{meta.backLabel}</Link>
      </p>
    </div>
  );
}

function formatUpdated(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function htmlHasContent(html) {
  const text = String(html || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return Boolean(text);
}

export function LegalDocument({ pageKey }) {
  const meta = LEGAL_PAGE_META[pageKey] || LEGAL_PAGE_META.privacy;
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  usePageContentReady(!loading);

  const html = htmlHasContent(page?.content) ? String(page.content) : '';
  const title = page?.title || meta.title;
  const seoTitle = page?.metaTitle || page?.meta_title || (title ? `${title} | ${site.platformName}` : '');
  const seoDescription = page?.metaDescription || page?.meta_description || '';
  const seoTags = page?.metaTags || page?.meta_tags || '';
  const noIndex = page?.allowIndex === false || page?.allow_index === false;
  const origin = siteOrigin();
  const pageUrl = origin ? `${origin}${meta.path}` : meta.path;

  usePageSeo({
    ready: !loading,
    title: seoTitle,
    description: seoDescription,
    keywords: seoTags,
    noIndex,
    url: pageUrl
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getLegalPage(pageKey)
      .then((res) => {
        if (!cancelled) setPage(res?.legal_page ?? null);
      })
      .catch(() => {
        if (!cancelled) setPage(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pageKey]);

  useEffect(() => {
    if (!html) return;
    wrapTablesForScroll(document.querySelector('.pj-legal-page-content'));
  }, [html]);

  if (loading) {
    return <LegalPageSkeleton />;
  }

  // An admin hid this page (Admin → Pages): it is no longer on the website or in the footer.
  if (page && page.isActive === false) {
    return <Navigate to="/" replace />;
  }

  const updated = formatUpdated(page?.updatedAt || page?.updated_at);

  // Same look as the Responsible Gambling and FAQ pages: gold gradient title, "last updated" line, readable text.
  return (
    <main className="legal-page">
      <header className="legal-head">
        <h1>{title}</h1>
        {updated ? <p>Last updated {updated}</p> : null}
      </header>
      <article className="legal-prose">
        {html ? (
          <div className="pj-legal-page-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
        ) : (
          <UnavailableNotice meta={meta} />
        )}
      </article>
    </main>
  );
}

export function Privacy() {
  return <LegalDocument pageKey="privacy" />;
}

export function Terms() {
  return <LegalDocument pageKey="terms" />;
}

export function ResponsibleGaming() {
  return <LegalDocument pageKey="responsible-gaming" />;
}
