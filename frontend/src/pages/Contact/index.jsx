import { Link } from 'react-router-dom';
import { usePageContentReady } from '../../context/PageReadyContext';
import { site } from '../../config/site';
import { openIntercomChat } from '../../components/intercomApi';
import '../Faq/faq-page.css';
import './contact-page.css';

/** Contact Us — same look as the FAQ page. Static support page: it does not use the legal pages API. */
export function ContactPage() {
  usePageContentReady(true);

  return (
    <main className="faq-page">
      <div className="faq-wrap">
        <h1 className="faq-title">Contact Us</h1>
        <p className="faq-lead">
          Reach {site.platformName} customer support through live chat, email, or the help center. Use official
          channels only, and never share your login details.
        </p>

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
