import { Link } from 'react-router-dom';
import { site } from '../config/site';
import { openSupportWidget } from './intercomApi';
import { SiteLogo } from './SiteLogo';
import { useGamePageLinks } from '../hooks/useGamePageLinks';
import { useLegalPageLinks } from '../hooks/useLegalPageLinks';
import { useFooterContent } from '../hooks/useFooterContent';
import { useStoreFooter } from '../hooks/useStoreFooter';
import { useStoreSocialLinks } from '../hooks/useStoreSocialLinks';
import { GAME_CATEGORY_PAGES } from '../config/seoPages';
import '../styles/site-footer.css';

const LEGAL_PATHS = ['/about-us', '/privacy', '/terms', '/bonus-terms', '/sweep-policy', '/responsible-gaming', '/amoe', '/aml-cft-policy', '/cookie-policy', '/ssl-encryption'];

/** Split a list into two balanced columns (matches the reference's 2-col panels). */
function splitTwo(arr) {
  const half = Math.ceil(arr.length / 2);
  return [arr.slice(0, half), arr.slice(half)];
}

function FooterLink({ to, children }) {
  return (
    <li>
      <Link to={to} className="site-footer__link">
        {children}
      </Link>
    </li>
  );
}

function TrustIcon({ children }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      {children}
    </svg>
  );
}

// Contact-panel social icons (same 2-col grid design as the reference) using
// standard brand glyphs, linked to DragonFury's OWN configured social URLs
// (src/config/site.js → socialLinks). Icons always render so the layout is
// present; each becomes a real external link once its URL is set.
const FOOTER_SOCIALS = [
  {
    id: 'instagram',
    label: 'Instagram',
    path: 'M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.42.37 1.06.42 2.23.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.05 1.17-.25 1.8-.42 2.23a3.7 3.7 0 0 1-.9 1.38c-.42.42-.82.68-1.38.9-.42.17-1.06.37-2.23.42-1.27.06-1.65.07-4.85.07s-3.58 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.42a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.17-.42-.37-1.06-.42-2.23C2.21 15.58 2.2 15.2 2.2 12s0-3.58.07-4.85c.05-1.17.25-1.8.42-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.17 1.06-.37 2.23-.42C8.42 2.21 8.8 2.2 12 2.2Zm0 1.95c-3.15 0-3.52.01-4.76.07-.9.04-1.39.2-1.72.32-.43.17-.74.37-1.06.69-.32.32-.52.63-.69 1.06-.12.33-.28.82-.32 1.72-.06 1.24-.07 1.61-.07 4.76s.01 3.52.07 4.76c.04.9.2 1.39.32 1.72.17.43.37.74.69 1.06.32.32.63.52 1.06.69.33.12.82.28 1.72.32 1.24.06 1.61.07 4.76.07s3.52-.01 4.76-.07c.9-.04 1.39-.2 1.72-.32.43-.17.74-.37 1.06-.69.32-.32.52-.63.69-1.06.12-.33.28-.82.32-1.72.06-1.24.07-1.61.07-4.76s-.01-3.52-.07-4.76c-.04-.9-.2-1.39-.32-1.72a2.85 2.85 0 0 0-.69-1.06 2.85 2.85 0 0 0-1.06-.69c-.33-.12-.82-.28-1.72-.32-1.24-.06-1.61-.07-4.76-.07Zm0 3.32a4.53 4.53 0 1 1 0 9.06 4.53 4.53 0 0 1 0-9.06Zm0 1.95a2.58 2.58 0 1 0 0 5.16 2.58 2.58 0 0 0 0-5.16Zm4.74-1.11a1.06 1.06 0 1 1-2.12 0 1.06 1.06 0 0 1 2.12 0Z',
  },
  {
    id: 'twitter',
    label: 'X',
    path: 'M17.53 3h3.08l-6.73 7.69L21.75 21h-6.19l-4.85-6.34L5.16 21H2.08l7.2-8.23L1.5 3h6.34l4.38 5.79L17.53 3Zm-1.08 16.17h1.7L7.09 4.74H5.26l11.19 14.43Z',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    path: 'M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.02 4.39 11.01 10.12 11.92v-8.43H7.08v-3.49h3.04V9.41c0-3.01 1.79-4.68 4.53-4.68 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8v8.43C19.61 23.08 24 18.09 24 12.07Z',
  },
  {
    id: 'discord',
    label: 'Discord',
    path: 'M20.32 4.37A19.8 19.8 0 0 0 15.44 3c-.21.38-.46.9-.63 1.31a18.3 18.3 0 0 0-5.62 0C9.02 3.9 8.76 3.38 8.56 3a19.74 19.74 0 0 0-4.89 1.37C.56 9 .06 13.5.31 17.95a19.9 19.9 0 0 0 6.06 3.06c.49-.67.93-1.38 1.3-2.13-.71-.27-1.4-.6-2.04-.99.17-.13.34-.26.5-.4a14.2 14.2 0 0 0 12.14 0c.17.14.34.27.5.4-.65.39-1.33.72-2.05.99.38.75.81 1.46 1.3 2.13a19.9 19.9 0 0 0 6.07-3.06c.3-5.15-.51-9.6-3.37-13.58ZM8.02 15.33c-1.18 0-2.15-1.09-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.2 0 2.17 1.1 2.15 2.42 0 1.33-.95 2.42-2.15 2.42Zm7.96 0c-1.18 0-2.15-1.09-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.2 0 2.17 1.1 2.15 2.42 0 1.33-.95 2.42-2.15 2.42Z',
  },
];

function FooterSocials({ links = {} }) {
  return (
    <ul className="site-footer__socials" aria-label={`${site.platformName} social media`}>
      {FOOTER_SOCIALS.map(({ id, label, path }) => {
        const href = links[id];
        const icon = (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="site-footer__social-glyph">
            <path fill="currentColor" d={path} />
          </svg>
        );
        return (
          <li key={id}>
            {href ? (
              <a href={href} target="_blank" rel="noreferrer noopener" aria-label={label} className="site-footer__social-btn">
                {icon}
              </a>
            ) : (
              <span className="site-footer__social-btn" aria-label={label} role="img" title={label}>
                {icon}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Replace {platform} / {year} tokens in admin-entered footer text. */
function fillTokens(text) {
  return String(text || '').replace(/\{platform\}/g, site.platformName).replace(/\{year\}/g, String(site.year));
}

// Notes support **bold** and [label](/path or https://…). Everything is rendered as
// React nodes (never HTML), and only site paths / http(s) URLs become links.
const NOTE_TOKEN = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g;

function NoteText({ text }) {
  return fillTokens(text)
    .split(NOTE_TOKEN)
    .map((part, i) => {
      if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
      const m = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (!m) return part;
      const [, label, href] = m;
      if (href.startsWith('/') && !href.startsWith('//')) {
        return <Link key={i} to={href} className="site-footer__note-link">{label}</Link>;
      }
      if (/^https?:\/\//i.test(href)) {
        return <a key={i} href={href} target="_blank" rel="noreferrer noopener" className="site-footer__note-link">{label}</a>;
      }
      return label;
    });
}

export function LandingFooter() {
  const cfg = useFooterContent();
  const { menus } = useStoreFooter();
  const { socialLinks } = useStoreSocialLinks();
  const gameLinksRaw = useGamePageLinks();
  const legalLinks = useLegalPageLinks();
  const show = cfg.show || {};

  // Platforms: the store's managed platform pages (Admin → Pages → Footer → Platforms), otherwise
  // the built-in platform pages. One platform = one page, and each link opens its own page.
  // "Max links" limits the platform pages; extra links the admin added are always listed after them.
  // Deduped so the panel stays tidy.
  const platformMax = cfg.platforms?.max || 14;
  const platformLinks = (() => {
    const seen = new Set();
    const out = [];
    for (const link of gameLinksRaw || []) {
      const key = String(link?.to || link?.label || link?.key || '').toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({ to: link.to, label: link.label });
      if (out.length >= platformMax) break;
    }
    // Extra links the admin added (label + link) follow the platform pages.
    for (const l of cfg.platforms?.items || []) {
      if (!l?.label || !l?.href || seen.has(String(l.href).toLowerCase())) continue;
      seen.add(String(l.href).toLowerCase());
      out.push({ to: l.href, label: l.label });
    }
    if (out.length > 0) return out;
    // No managed game pages yet: still link every platform to its own page (built-in copy).
    return GAME_CATEGORY_PAGES.slice(0, platformMax).map((p) => ({ to: `/platform-games/${p.slug}`, label: p.name }));
  })();
  const [platformsA, platformsB] = splitTwo(platformLinks);

  // Pages: the admin's list, plus pages created in admin "Footer links" (unless turned off).
  const pageLinks = (() => {
    const seen = new Set();
    const out = [];
    const add = (to, label) => {
      if (!to || !label || seen.has(to)) return;
      seen.add(to);
      out.push({ to, label });
    };
    // Legal pages (About Us, Privacy, Terms, Bonus Terms…) come from Admin → Pages so they can be
    // edited and hidden there. They are listed right after Blog; the other links (Help, FAQ…) follow.
    const legalPaths = new Set([...LEGAL_PATHS, '/bonus']);
    const staticItems = (cfg.pages?.items || []).filter(
      (l) => !(legalLinks && legalPaths.has(String(l.href || '').replace(/\/+$/, '')))
    );
    const blogAt = staticItems.findIndex((l) => String(l.href || '').replace(/\/+$/, '') === '/blog');
    const before = blogAt >= 0 ? staticItems.slice(0, blogAt + 1) : [];
    const after = blogAt >= 0 ? staticItems.slice(blogAt + 1) : staticItems;
    before.forEach((l) => add(l.href, l.label));
    (legalLinks || []).forEach((l) => add(l.to, l.label));
    after.forEach((l) => add(l.href, l.label));
    if (cfg.pages?.includeCmsPages !== false) {
      menus.forEach((menu) =>
        (menu.pages || []).forEach((page) => add(`/${encodeURIComponent(page.slug)}`, page.title))
      );
    }
    return out;
  })();
  const [pagesA, pagesB] = splitTwo(pageLinks);

  const brandCopy =
    cfg.brand?.text ||
    site.seoDescription ||
    `${site.platformName} brings supported games, account tools, transfers and rewards together. Availability and eligibility depend on current rules. No purchase necessary where provided by the Sweepstakes Rules.`;

  const supportEmail = cfg.contact?.email || site.supportEmail;
  const socials = cfg.contact?.socials || {};
  const socialHrefs = {
    instagram: socials.instagram || site.socialLinks.instagram,
    twitter: socials.twitter || site.socialLinks.twitter,
    // Facebook also honours the existing admin "Social links" setting.
    facebook: socials.facebook || socialLinks.facebook || site.socialLinks.facebook,
    discord: socials.discord || site.socialLinks.discord,
  };
  const notes = cfg.compliance?.notes || [];

  return (
    <footer className="site-footer" aria-label={`${site.platformName} site footer`}>
      <div className="site-footer__inner">
        {show.payments !== false && (cfg.payments?.items || []).length > 0 && (
          <ul className="site-footer__payments" aria-label={cfg.payments?.title || 'Accepted payment methods'}>
            {cfg.payments.items.map((icon, i) => (
              <li key={`${icon.name}-${i}`}>
                <img src={icon.image} alt={icon.name} width={32} height={20} loading="lazy" decoding="async" />
              </li>
            ))}
          </ul>
        )}

        <div className="site-footer__panels">
          {show.brand !== false && (
            <div className="site-footer__brandcol">
              <Link to="/" className="site-footer__logo" aria-label={`${site.platformName} home`}>
                {cfg.brand?.logo ? (
                  <img src={cfg.brand.logo} alt={site.platformName} className="site-footer__logo-img" />
                ) : (
                  <SiteLogo variant="footer" className="site-footer__logo-img" />
                )}
              </Link>
              <p className="site-footer__brand-copy">{brandCopy}</p>
            </div>
          )}

          {show.platforms !== false && (
          <section className="site-footer__panel" aria-labelledby="ft-platforms">
            <h3 id="ft-platforms">{cfg.platforms?.title || 'Platforms'}</h3>
            <div className="site-footer__panel-cols">
              <ul>
                {platformsA.map((l, i) => (
                  <FooterLink key={`pa-${i}`} to={l.to}>{l.label}</FooterLink>
                ))}
              </ul>
              <ul>
                {platformsB.map((l, i) => (
                  <FooterLink key={`pb-${i}`} to={l.to}>{l.label}</FooterLink>
                ))}
              </ul>
            </div>
          </section>
          )}

          {show.pages !== false && (
          <section className="site-footer__panel" aria-labelledby="ft-pages">
            <h3 id="ft-pages">{cfg.pages?.title || 'Pages'}</h3>
            <div className="site-footer__panel-cols">
              <ul>
                {pagesA.map((l) => (
                  <FooterLink key={l.to} to={l.to}>{l.label}</FooterLink>
                ))}
              </ul>
              <ul>
                {pagesB.map((l) => (
                  <FooterLink key={l.to} to={l.to}>{l.label}</FooterLink>
                ))}
              </ul>
            </div>
          </section>
          )}

          {show.contact !== false && (
          <section className="site-footer__panel" aria-labelledby="ft-contact">
            <h3 id="ft-contact">{cfg.contact?.title || 'Contact'}</h3>
            <div className="site-footer__contact">
              <ul className="site-footer__contact-list">
                <li>
                  <a href={`mailto:${supportEmail}`} className="site-footer__contact-mail">
                    {supportEmail}
                  </a>
                </li>
                <li>
                  <button type="button" onClick={openSupportWidget} className="site-footer__contact-chat">
                    {cfg.contact?.chatLabel || 'Chat Now'}
                  </button>
                </li>
              </ul>
              <FooterSocials links={socialHrefs} />
            </div>
          </section>
          )}
        </div>

        {show.compliance !== false && (
        <div className="site-footer__bottom" aria-label="Compliance and platform notice">
          <ul className="site-footer__trust" aria-label="Platform trust and compliance">
            <li>
              <span className="site-footer__age">18+</span>
              <span className="site-footer__sr-only">18+ only</span>
            </li>
            <li>
              <TrustIcon>
                <path d="M12 3 4.5 6v5.3c0 4.7 3.1 8.2 7.5 9.7 4.4-1.5 7.5-5 7.5-9.7V6L12 3Z" />
                <path d="m8.5 12 2.2 2.2 4.8-5" />
              </TrustIcon>
              <span className="site-footer__sr-only">Safe gambling</span>
            </li>
            <li>
              <TrustIcon>
                <circle cx="12" cy="12" r="8.5" />
                <path d="m8.5 12 2.2 2.2 4.8-5" />
              </TrustIcon>
              <span className="site-footer__sr-only">Verified</span>
            </li>
            <li>
              <TrustIcon>
                <rect x="5" y="10" width="14" height="10" rx="3" />
                <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
                <circle cx="12" cy="15" r="1.2" />
              </TrustIcon>
              <span className="site-footer__sr-only">Intellectual property protected</span>
            </li>
            <li>
              <TrustIcon>
                <path d="M12 3 4.5 6v5.3c0 4.7 3.1 8.2 7.5 9.7 4.4-1.5 7.5-5 7.5-9.7V6L12 3Z" />
                <path d="M12 8v4" />
                <path d="M12 15.5v.5" />
              </TrustIcon>
              <span className="site-footer__sr-only">Certified</span>
            </li>
            <li>
              <TrustIcon>
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 7.5V12l3 2" />
              </TrustIcon>
              <span className="site-footer__sr-only">24/7 customer service</span>
            </li>
            <li>
              <TrustIcon>
                <rect x="5" y="10" width="14" height="10" rx="3" />
                <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
                <path d="M12 14v2.5" />
              </TrustIcon>
              <span className="site-footer__sr-only">Play safe</span>
            </li>
            <li>
              <TrustIcon>
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 7.5V12l3 2" />
                <circle cx="12" cy="10.5" r="2" />
              </TrustIcon>
              <span className="site-footer__sr-only">ID verified</span>
            </li>
          </ul>

          {notes.map((note, i) => (
            <p key={i} className="site-footer__note" role={note.startsWith('**') ? 'note' : undefined}>
              <NoteText text={note} />
            </p>
          ))}
          {cfg.compliance?.copyright ? (
            <p className="site-footer__copy">{fillTokens(cfg.compliance.copyright)}</p>
          ) : null}
        </div>
        )}
      </div>
    </footer>
  );
}
