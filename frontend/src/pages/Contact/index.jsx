import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLegalPage } from '../../api/legal';
import { usePageContentReady } from '../../context/PageReadyContext';
import { site } from '../../config/site';
import { openIntercomChat } from '../../components/intercomApi';
import { sanitizeHtml } from '../../utils/sanitizeHtml';
import '../Faq/faq-page.css';
import '../legal-prose.css';
import './contact-page.css';

function hasText(html) {
  return Boolean(
    String(html || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .trim()
  );
}

/** Contact Us — same look as the FAQ page. The intro text can be edited in Admin → Pages → Contact Us. */
export function ContactPage() {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  usePageContentReady(!loading);

  useEffect(() => {
    let cancelled = false;
    getLegalPage('contact-us')
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
  }, []);

  const html = hasText(page?.content) ? String(page.content) : '';
  const title = page?.title || 'Contact Us';

  return (
    <main className="faq-page">
      <div className="faq-wrap">
        <h1 className="faq-title">{title}</h1>
        {html ? (
          <div className="legal-prose contact-intro" dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
        ) : (
          <p className="faq-lead">
            Reach {site.platformName} customer support through live chat, email, or the help center. Use official
            channels only, and never share your login details.
          </p>
        )}

        <div className="contact-grid">
          <div className="contact-card">
            <h2>Email</h2>
            <p>Write to our support team and we will get back to you.</p>
            <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>
          </div>
          <div className="contact-card">
            <h2>Live chat</h2>
            <p>Chat with support from the corner of the screen at any time.</p>
            <button type="button" onClick={openIntercomChat}>Open live chat</button>
          </div>
          <div className="contact-card">
            <h2>Help Center</h2>
            <p>Step-by-step guides for accounts, recharge, redeem and rewards.</p>
            <Link to="/help">Open Help Center</Link>
          </div>
          <div className="contact-card">
            <h2>FAQ</h2>
            <p>Quick answers to the most common questions.</p>
            <Link to="/faq">Read the FAQ</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
