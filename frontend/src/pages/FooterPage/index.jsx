import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { getFooterPage } from '../../api/footer';
import { usePageContentReady } from '../../context/PageReadyContext';
import { site } from '../../config/site';
import { applyManagedSchema } from '../../utils/managedSchema';
import { applySitewideSchema } from '../../utils/schemaOrg';
import { usePageSeo } from '../../utils/pageSeo';
import { sanitizeHtml } from '../../utils/sanitizeHtml';
import { FooterPageLayout, hasFooterLayout } from './FooterPageLayout';
import '../Blog/Blog.css';
import './FooterPage.css';
import '../df-content-pages.css';
import '../legal-prose.css';

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

function formatUpdated(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function FooterPageSkeleton() {
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

function FooterPageEmpty({ code, title, message }) {
  const brand = site.platformName || 'Home';
  return (
    <div className="pj-footer-empty" role="status">
      <div className="pj-footer-empty__card">
        <div className="pj-footer-empty__logo">
          <img src={site.logoUrl} alt={brand} decoding="async" />
        </div>
        {code ? <p className="pj-footer-empty__code" aria-hidden="true">{code}</p> : null}
        <h1 className="pj-footer-empty__title">{title}</h1>
        <p className="pj-footer-empty__copy">{message}</p>
        <div className="pj-footer-empty__actions">
          <Link to="/" className="pj-footer-empty__cta">
            Back to home
          </Link>
          <Link to="/contact" className="pj-footer-empty__cta pj-footer-empty__cta--ghost">
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}

function friendlyFooterError(err) {
  const status = err?.status || err?.statusCode;
  if (status === 404 || /not found/i.test(String(err?.message || ''))) {
    return {
      code: '404',
      title: 'Page not found',
      message: 'Sorry — this link doesn’t exist or was removed. You can continue from the home page.'
    };
  }
  return {
    title: 'Page unavailable',
    message: 'Something went wrong while opening this page. Please try again shortly, or go back home.'
  };
}

export function FooterPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [hop, setHop] = useState('');
  const [loading, setLoading] = useState(true);
  const [emptyState, setEmptyState] = useState(null);

  usePageContentReady(!loading);

  useEffect(() => {
    if (!page || page.redirectPath || page.schema === undefined) return undefined;
    applyManagedSchema(page.schema);
    return () => {
      applyManagedSchema(null);
      applySitewideSchema();
    };
  }, [page]);

  const seoTitle = page?.metaTitle || page?.meta_title || (page?.title ? `${page.title} | ${site.platformName}` : '');
  const seoDescription = page?.metaDescription || page?.meta_description || '';
  const seoTags = page?.metaTags || page?.meta_tags || '';
  const noIndex = page?.allowIndex === false || page?.allow_index === false;
  usePageSeo({
    ready: Boolean(page) && !loading && !page.redirectPath,
    title: seoTitle,
    description: seoDescription,
    keywords: seoTags,
    noIndex
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setEmptyState(null);
    setPage(null);
    setHop('');
    getFooterPage(slug)
      .then((res) => {
        if (cancelled) return;
        if (res?.redirect) {
          setHop(res.redirect);
          return;
        }
        setPage(res?.footer_page ?? null);
      })
      .catch((err) => {
        if (!cancelled) {
          setPage(null);
          setEmptyState(friendlyFooterError(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!page?.content || page.redirectPath || hasFooterLayout(page.sections)) return;
    const root = document.querySelector('.pj-footer-page-content');
    wrapTablesForScroll(root);
  }, [page?.content, page?.redirectPath, page?.sections]);

  useEffect(() => {
    const dest = page?.redirectPath;
    if (!dest || !/^https?:\/\//i.test(dest)) return;
    window.location.replace(dest);
  }, [page?.redirectPath]);

  if (hop) {
    if (/^https?:\/\//i.test(hop)) {
      window.location.replace(hop);
      return null;
    }
    return <Navigate to={hop} replace />;
  }

  if (loading) {
    return <FooterPageSkeleton />;
  }

  if (emptyState || !page) {
    return (
      <FooterPageEmpty
        code={emptyState ? emptyState.code : '404'}
        title={emptyState?.title || 'Page not found'}
        message={
          emptyState?.message
          || 'Sorry — this link doesn’t exist or was removed. You can continue from the home page.'
        }
      />
    );
  }

  if (page.redirectPath) {
    if (/^https?:\/\//i.test(page.redirectPath)) {
      return <FooterPageSkeleton />;
    }
    return <Navigate to={page.redirectPath} replace />;
  }

  const useLayout = hasFooterLayout(page.sections);

  if (!useLayout) {
    // Same look as the Privacy / Terms pages: gold title, "last updated" line, readable text.
    const updated = formatUpdated(page.updatedAt || page.updated_at);
    return (
      <main className="legal-page">
        <header className="legal-head">
          <h1>{page.title}</h1>
          {updated ? <p>Last updated {updated}</p> : null}
        </header>
        <article className="legal-prose">
          <div
            className="pj-legal-page-content pj-footer-page-content"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content || '') }}
          />
        </article>
      </main>
    );
  }

  return (
    <div className="pj-blog-page pj-blog-detail df-content-skin pj-footer-layout-page df-content-page--wide">
      <article className="pj-blog-article">
        <FooterPageLayout sections={page.sections} fallbackTitle={page.title} />
      </article>
    </div>
  );
}
