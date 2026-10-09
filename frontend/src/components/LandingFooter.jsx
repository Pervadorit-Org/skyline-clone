import { Link } from 'react-router-dom';
import { site } from '../config/site';
import { openSupportWidget } from './intercomApi';
import { SiteLogo } from './SiteLogo';
import { LandingSocialLinks } from './LandingSocialLinks';
import { useStoreFooter } from '../hooks/useStoreFooter';
import { useGamePageLinks } from '../hooks/useGamePageLinks';
import '../styles/site-footer.css';

function footerPageHref(page) {
  if (page?.redirectPath) return page.redirectPath;
  return `/${encodeURIComponent(page.slug)}`;
}

function isExternalHref(href) {
  return /^https?:\/\//i.test(String(href || ''));
}

function FooterNavLink({ to, children, onClick }) {
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="site-footer__link">
        {children}
      </button>
    );
  }
  return (
    <Link to={to} className="site-footer__link">
      {children}
    </Link>
  );
}

function TrustIcon({ children }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      {children}
    </svg>
  );
}

/** Drop CMS links that collide with built-in footer destinations. */
function filterCmsPages(pages, reservedPaths) {
  return (pages || []).filter((page) => {
    const href = footerPageHref(page);
    if (isExternalHref(href)) return true;
    const path = String(href).replace(/\/+$/, '') || '/';
    return !reservedPaths.has(path.toLowerCase());
  });
}

export function LandingFooter() {
  const { menus, showDefaultMenus } = useStoreFooter();
  const gameLinksRaw = useGamePageLinks();
  // Dedupe (the hook can emit each platform twice) and cap so the footer stays tidy.
  const gameLinks = (() => {
    const seen = new Set();
    const out = [];
    for (const link of gameLinksRaw || []) {
      const key = String(link?.to || link?.label || link?.key || '').toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(link);
      if (out.length >= 12) break;
    }
    return out;
  })();
  const reservedPaths = new Set([
    '/',
    '/contact',
    '/help',
    '/faq',
    '/login',
    '/register',
    '/bonus',
    '/casino',
    '/blog',
    '/privacy',
    '/terms',
    '/responsible-gaming',
  ]);
  const cmsMenus = menus
    .map((m) => ({
      ...m,
      pages: filterCmsPages(m.pages, reservedPaths),
    }))
    .filter((m) => Array.isArray(m.pages) && m.pages.length > 0);
  const brandCopy =
    site.seoDescription ||
    `${site.platformName} brings supported games, account tools, transfers and rewards together. Availability and eligibility depend on current rules. No purchase necessary where provided by the Sweepstakes Rules.`;

  const renderCol = (id, title, label, links) => (
    <section className="site-footer__col" aria-labelledby={id} key={id}>
      <h3 id={id}>{title}</h3>
      <nav aria-label={label}>{links}</nav>
    </section>
  );

  return (
    <footer className="site-footer" aria-label={`${site.platformName} site footer`}>
      <div className="site-footer__inner">
        <div className="site-footer__top">
          <section className="site-footer__brand" aria-labelledby="site-footer-title">
            <h2 className="site-footer__sr-only" id="site-footer-title">
              {site.platformName}
            </h2>
            <Link to="/" className="site-footer__logo" aria-label={`${site.platformName} home`}>
              <SiteLogo variant="footer" className="site-footer__logo-img" />
            </Link>
            <p>{brandCopy}</p>
            <div className="site-footer__social">
              <span className="site-footer__social-label" id="site-footer-social">Follow us</span>
              <LandingSocialLinks variant="inline" className="site-footer__social-list" />
            </div>
          </section>

          <div className="site-footer__cols">
            {showDefaultMenus ? (
              <>
                {renderCol('site-footer-company', 'Company', 'Company information', [
                  <FooterNavLink key="contact" to="/contact">Contact Us</FooterNavLink>,
                  <FooterNavLink key="help" to="/help">Help Center</FooterNavLink>,
                  <FooterNavLink key="support" onClick={openSupportWidget}>Support</FooterNavLink>,
                  <FooterNavLink key="faq" to="/faq">FAQ</FooterNavLink>,
                ])}
                {renderCol('site-footer-explore', 'Explore', `Explore ${site.platformName}`, [
                  <FooterNavLink key="home" to="/">{site.platformName}</FooterNavLink>,
                  <FooterNavLink key="login" to="/login">Login</FooterNavLink>,
                  <FooterNavLink key="register" to="/register">Create an Account</FooterNavLink>,
                  <FooterNavLink key="bonus" to="/bonus">Bonuses</FooterNavLink>,
                  <FooterNavLink key="casino" to="/casino">Casino</FooterNavLink>,
                  <FooterNavLink key="blog" to="/blog">Blog</FooterNavLink>,
                ])}
                {renderCol('site-footer-legal', 'Legal', 'Legal information', [
                  <FooterNavLink key="privacy" to="/privacy">Privacy Policy</FooterNavLink>,
                  <FooterNavLink key="terms" to="/terms">Terms &amp; Conditions</FooterNavLink>,
                  <FooterNavLink key="rg" to="/responsible-gaming">Responsible Gaming</FooterNavLink>,
                ])}
              </>
            ) : null}

            {gameLinks.length > 0 &&
              renderCol(
                'site-footer-games',
                'Games',
                'Game pages',
                gameLinks.map((link) => (
                  <FooterNavLink key={link.key} to={link.to}>{link.label}</FooterNavLink>
                )),
              )}

            {cmsMenus.map((menu) =>
              renderCol(
                `site-footer-cms-${menu.id || menu.label}`,
                menu.label,
                menu.label,
                (menu.pages || []).map((page) => {
                  const href = footerPageHref(page);
                  if (isExternalHref(href)) {
                    return (
                      <a
                        key={page.id || page.slug}
                        href={href}
                        className="site-footer__link"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {page.title}
                      </a>
                    );
                  }
                  return (
                    <Link key={page.id || page.slug} to={href} className="site-footer__link">
                      {page.title}
                    </Link>
                  );
                }),
              ),
            )}
          </div>
        </div>

        <ul className="site-footer__trust" aria-label="Platform trust information">
          <li>
            <span className="site-footer__age">18+</span>
            <span>Adults Only</span>
          </li>
          <li>
            <TrustIcon>
              <path d="M12 3 4.5 6v5.3c0 4.7 3.1 8.2 7.5 9.7 4.4-1.5 7.5-5 7.5-9.7V6L12 3Z" />
              <path d="m8.5 12 2.2 2.2 4.8-5" />
            </TrustIcon>
            <span>Responsible Social Gaming</span>
          </li>
          <li>
            <TrustIcon>
              <rect x="5" y="10" width="14" height="10" rx="3" />
              <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
              <circle cx="12" cy="15" r="1.2" />
            </TrustIcon>
            <span>Secure Platform</span>
          </li>
          <li>
            <TrustIcon>
              <rect x="5" y="10" width="14" height="10" rx="3" />
              <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
              <path d="M12 14v2.5" />
            </TrustIcon>
            <span>Encrypted Payments</span>
          </li>
        </ul>

        <div className="site-footer__bottom" aria-label="Copyright and platform notice">
          <div className="site-footer__bottom-row">
            <p className="site-footer__copy">
              © {site.year} {site.platformName}. All Rights Reserved.
            </p>
            <nav className="site-footer__mini" aria-label="Footer legal shortcuts">
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
              <Link to="/responsible-gaming">Responsible Gaming</Link>
            </nav>
          </div>
          <p className="site-footer__note">
            {site.platformName} is a social casino account platform. Eligibility, purchases and redemptions are
            subject to the current Terms and Sweepstakes Rules.
          </p>
          <p className="site-footer__note" role="note">
            <strong>Disclaimer.</strong> {site.platformName} is a website for playing supported games. All game
            titles, logos, characters, artwork and other elements shown on this site are the material and property
            of their respective third-party owners and are used for identification only. Play is subject to the
            game provider&apos;s own terms and to our Terms of Service.
          </p>
        </div>
      </div>
    </footer>
  );
}
