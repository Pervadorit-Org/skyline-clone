import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { usePageContentReady } from '../../context/PageReadyContext';
import { useAuth } from '../../context/AuthContext';
import { getGamePage } from '../../api/gamePages';
import { mergePlatformContent } from '../../config/platformPageDefaults';
import { getGameCategoryBySlug, getGameCategoryRedirect, resolveGameCategorySlug } from '../../config/seoPages';
import { site } from '../../config/site';
import { applyManagedSchema } from '../../utils/managedSchema';
import { applySitewideSchema } from '../../utils/schemaOrg';
import { usePageSeo } from '../../utils/pageSeo';
import './platform-game.css';

const BREADCRUMB_ID = 'pg-breadcrumb-schema';

/** Site paths use the router; full URLs open in a new tab. */
function ActionLink({ href, className, children, isAuthenticated }) {
  const next = href === '/register' && isAuthenticated ? '/#games' : href;
  if (/^https?:\/\//i.test(next || '')) {
    return (
      <a href={next} className={className} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return <Link to={next || '/games'} className={className}>{children}</Link>;
}

/** Plain text with the admin's inline links applied (never HTML). */
function TextWithLinks({ text, links }) {
  const valid = (Array.isArray(links) ? links : []).filter((l) => l?.text && l?.url);
  if (!valid.length) return text;
  const nodes = [];
  let rest = String(text || '');
  let key = 0;
  while (rest) {
    let best = null;
    let at = -1;
    for (const l of valid) {
      const i = rest.indexOf(l.text);
      if (i !== -1 && (at === -1 || i < at)) {
        best = l;
        at = i;
      }
    }
    if (!best) {
      nodes.push(rest);
      break;
    }
    if (at > 0) nodes.push(rest.slice(0, at));
    nodes.push(
      <ActionLink key={key++} href={best.url} className="pg-inline-link">{best.text}</ActionLink>
    );
    rest = rest.slice(at + best.text.length);
  }
  return nodes;
}

/** The rounded gold "Play" / "Download" buttons under their headings; hidden without a label and link. */
function PillButton({ button, isAuthenticated }) {
  if (!button?.label || !button?.url) return null;
  return (
    <ActionLink href={button.url} isAuthenticated={isAuthenticated} className="pg-pill">
      {button.label}
    </ActionLink>
  );
}

function Hero({ page, platform, isAuthenticated }) {
  const buttons = Array.isArray(page.buttons) ? page.buttons.filter((b) => b?.label && b?.href) : [];
  const text = [page.heroLead, page.heroBlurb].filter(Boolean).join('\n');
  const mainImage = page.image;
  return (
    <section className="pg-hero" aria-label={page.name}>
      <h1 className="pg-hero__mobile-title">{page.name}</h1>
      <div className="pg-hero__grid">
        <div className="pg-hero__copy">
          <h2 className="pg-hero__title">{page.name}</h2>
          {text ? <p className="pg-hero__text">{text}</p> : null}
          {buttons.length > 0 && (
            <div className="pg-hero__actions">
              {buttons.map((b, i) => (
                <ActionLink
                  key={`${b.label}-${b.href}`}
                  href={b.href}
                  isAuthenticated={isAuthenticated}
                  className={`pg-btn${i === 0 ? '' : ' pg-btn--ghost'}`}
                >
                  {b.label}
                </ActionLink>
              ))}
            </div>
          )}
        </div>
        <div className="pg-visual">
          {mainImage ? (
            <div className="pg-visual__main">
              <img src={mainImage} alt={page.name} width="508" height="374" loading="eager" fetchpriority="high" />
            </div>
          ) : null}
          <div className="pg-visual__overlay">
            {platform.overlayImage ? (
              <img src={platform.overlayImage} alt="" width="595" height="639" loading="eager" />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function Journey({ journey }) {
  const steps = Array.isArray(journey?.steps) ? journey.steps : [];
  if (!journey?.title && !journey?.intro && !steps.length) return null;
  return (
    <section className="pg-journey">
      <div className="pg-journey__inner">
        {journey.title ? <h2 className="pg-journey__title">{journey.title}</h2> : null}
        {journey.intro ? <p className="pg-journey__intro">{journey.intro}</p> : null}
        {steps.length > 0 && (
          <ol className="pg-steps">
            {steps.map((step, i) => (
              <li key={i} className="pg-step">
                <span className="pg-step__num" aria-hidden="true">{i + 1}</span>
                <div className="pg-step__body">
                  <div className="pg-step__head">
                    <h3>Step</h3>
                    <span>#{i + 1}</span>
                  </div>
                  <p>{step}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function Features({ title, blocks, isAuthenticated }) {
  const items = blocks.filter((b) => b && b.type !== 'faq' && (b.title || b.body || b.imageUrl));
  if (!items.length) return null;
  return (
    <section className="pg-features">
      {title ? <h2 className="pg-features__title">{title}</h2> : null}
      <div className="pg-features__list">
        {items.map((block, i) => (
          <article
            key={block.id || i}
            className={`pg-feature${block.imageUrl ? '' : ' is-text-only'}${block.imagePosition === 'left' ? ' is-image-left' : ' is-image-right'}`}
          >
            {block.imageUrl ? (
              <div className={`pg-feature__media${block.imageFit === 'contain' ? ' is-contain' : ''}`}>
                <img src={block.imageUrl} alt={block.imageAlt || block.title || ''} width="707" height="472" loading="lazy" />
              </div>
            ) : null}
            <div className="pg-feature__copy">
              {block.title ? <h3>{block.title}</h3> : null}
              {block.body ? <p><TextWithLinks text={block.body} links={block.links} /></p> : null}
              {block.showButton && block.buttonUrl ? (
                <ActionLink href={block.buttonUrl} isAuthenticated={isAuthenticated} className="pg-btn">
                  {block.buttonText || 'Play Now'}
                </ActionLink>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Lists({ setup, tips }) {
  const columns = [setup, tips].filter((c) => c && (c.title || (c.lines || []).length));
  if (!columns.length) return null;
  return (
    <section className="pg-lists">
      {columns.map((col, i) => (
        <div key={i} className="pg-lists__col">
          {col.title ? <h2>{col.title}</h2> : null}
          {(col.lines || []).map((line, j) => <p key={j}>{line}</p>)}
        </div>
      ))}
    </section>
  );
}

function Faq({ blocks }) {
  const faqs = blocks.filter((b) => b?.type === 'faq' && Array.isArray(b.items) && b.items.some((it) => it?.question));
  if (!faqs.length) return null;
  return (
    <>
      {faqs.map((block, i) => (
        <section key={block.id || i} className="pg-faq" aria-label={block.title || 'FAQ'}>
          {block.title ? <h2>{block.title}</h2> : null}
          {block.items.filter((it) => it?.question).map((it) => (
            <details key={it.question} className="pg-faq__item">
              <summary>{it.question}</summary>
              <p>{it.answer}</p>
            </details>
          ))}
        </section>
      ))}
    </>
  );
}

/** The built-in page for a platform, shaped like a managed game page (used when none is saved). */
function builtInPage(staticPage) {
  return {
    slug: staticPage.slug,
    name: staticPage.name,
    catalogName: staticPage.catalogName || staticPage.name,
    image: staticPage.image,
    heroLead: staticPage.description,
    heroBlurb: staticPage.blurb,
    buttons: [
      { label: `Play ${staticPage.name}`, href: '/register' },
      { label: 'All games', href: '/games' },
    ],
    sections: { blocks: [] },
    metaTitle: staticPage.title,
    metaDescription: staticPage.description,
    allowIndex: true,
  };
}

/** /platform-games/:slug — one platform's page, managed from Admin → Footer links → game page. */
export function PlatformGamePage() {
  const { slug: rawSlug } = useParams();
  const { isAuthenticated } = useAuth();
  // Old audit aliases (fire-kirin) collapse to the real slug; fake audit slugs go to /games.
  const slug = resolveGameCategorySlug(rawSlug) || rawSlug;
  const staticPage = getGameCategoryBySlug(slug);
  const staticRedirect = getGameCategoryRedirect(rawSlug);
  const [state, setState] = useState({ loading: true, page: null, redirect: '', hidden: false });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, page: null, redirect: '', hidden: false });
    window.scrollTo(0, 0);
    getGamePage(slug)
      .then((res) => {
        if (cancelled) return;
        if (res?.redirect) setState({ loading: false, page: null, redirect: res.redirect, hidden: false });
        else if (res?.hidden) setState({ loading: false, page: null, redirect: '', hidden: true }); // hidden by an admin
        else if (res?.game_page) setState({ loading: false, page: res.game_page, redirect: '', hidden: false });
        else setState({ loading: false, page: null, redirect: '', hidden: false }); // nothing saved: built-in page
      })
      .catch(() => {
        // Game pages unavailable (API down / not set up): fall back to the built-in page.
        if (!cancelled) setState({ loading: false, page: null, redirect: '', hidden: false });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const { page: savedPage, loading, redirect, hidden } = state;
  const page = useMemo(
    () => savedPage || (staticPage && !hidden ? builtInPage(staticPage) : null),
    [savedPage, staticPage, hidden]
  );
  const platform = useMemo(
    () => (page ? mergePlatformContent(page.name, page.sections?.platform) : null),
    [page]
  );
  const blocks = Array.isArray(page?.sections?.blocks) ? page.sections.blocks : [];
  // A page with no feature sections of its own still shows the default ones, like every other platform.
  const hasOwnFeatures = blocks.some((b) => b && b.type !== 'faq' && (b.title || b.body || b.imageUrl));
  const featureBlocks = hasOwnFeatures
    ? blocks
    : [
        ...(platform?.features || []).map((f, i) => ({ id: `default-${i}`, title: f.title, body: f.body, imagePosition: i % 2 ? 'right' : 'left', imageUrl: page.image || '', imageAlt: f.title, imageFit: 'contain' })),
        ...blocks,
      ];

  usePageContentReady(!loading);

  usePageSeo({
    ready: !loading && Boolean(page),
    title: page?.metaTitle || (page ? `${page.name} Online | ${site.platformName}` : ''),
    description: page?.metaDescription || page?.heroLead || '',
    keywords: page?.metaTags || '',
    noIndex: page ? page.allowIndex === false : false,
    canonical: String(page?.canonicalUrl || '').trim(),
  });

  // Managed (admin-edited) schema, same as the other game pages.
  useEffect(() => {
    if (!page || page.schema === undefined) return undefined;
    applyManagedSchema(page.schema);
    return () => {
      applyManagedSchema(null);
      applySitewideSchema();
    };
  }, [page]);

  // Breadcrumb structured data: Home > Platform Games > <this platform>.
  useEffect(() => {
    if (!page) return undefined;
    const origin = window.location.origin;
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = BREADCRUMB_ID;
    el.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Platform Games', item: `${origin}/platform-games` },
        { '@type': 'ListItem', position: 3, name: page.name, item: `${origin}/platform-games/${page.slug}` },
      ],
    });
    document.head.appendChild(el);
    return () => el.remove();
  }, [page]);

  if (staticRedirect) return <Navigate to={staticRedirect} replace />;
  if (rawSlug !== slug) return <Navigate to={`/platform-games/${slug}`} replace />;
  if (redirect) {
    if (/^https?:\/\//i.test(redirect)) {
      window.location.replace(redirect);
      return null;
    }
    return <Navigate to={redirect} replace />;
  }
  if (loading) {
    return (
      <div className="pg">
        <p className="pg-loading">Loading…</p>
      </div>
    );
  }
  if (hidden || !page) return <Navigate to="/games" replace />;

  return (
    <div className="pg">
      <div className="pg-wrap">
        <Hero page={page} platform={platform} isAuthenticated={isAuthenticated} />
        <Journey journey={platform.journey} />
        {(platform.playTitle || platform.downloadTitle) && (
          <div className="pg-headings">
            {platform.playTitle ? (
              <div className="pg-headings__item">
                <h2>{platform.playTitle}</h2>
                <PillButton button={platform.playButton} isAuthenticated={isAuthenticated} />
              </div>
            ) : null}
            {platform.downloadTitle ? (
              <div className="pg-headings__item">
                <h3>{platform.downloadTitle}</h3>
                <PillButton button={platform.downloadButton} isAuthenticated={isAuthenticated} />
              </div>
            ) : null}
          </div>
        )}
        <Features title={platform.featureTitle} blocks={featureBlocks} isAuthenticated={isAuthenticated} />
        <Lists setup={platform.setup} tips={platform.tips} />
        <Faq blocks={blocks} />
      </div>
    </div>
  );
}

export default PlatformGamePage;
