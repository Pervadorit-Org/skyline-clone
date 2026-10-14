import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getLegalPage } from '../api/legal';
import { site } from '../config/site';
import { usePageContentReady } from '../context/PageReadyContext';
import { sanitizeHtml } from '../utils/sanitizeHtml';
import './legal-prose.css';

const DEFAULT_UPDATED = 'Oct 8, 2026';

function formatUpdated(value) {
  if (!value) return DEFAULT_UPDATED;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? DEFAULT_UPDATED
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function htmlHasContent(html) {
  return Boolean(
    String(html || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .trim()
  );
}

function DefaultContent({ brand }) {
  return (
    <>
      <p><strong>{brand}</strong> is dedicated to providing a secure and enjoyable gaming environment for all players.</p>
      <p>Online gaming should remain an entertaining activity without negatively impacting other aspects of your life.</p>
      <p><strong>{brand}</strong> ensures this by:</p>
      <ul>
        <li>Offering players transparent information about their gameplay and spending to help them make informed decisions.</li>
        <li>Providing responsible gaming tools, such as breaks and self-exclusions, available for customers to activate at any time.</li>
        <li>Sharing information on external support services to prevent gaming harm and address problem gaming.</li>
        <li>Having a Customer Service Team available 24/7 to assist with responsible gaming inquiries.</li>
        <li>Ensuring that individuals under the age of 18 cannot create <strong>{brand}</strong> accounts.</li>
      </ul>
      <hr />
      <h2>1. Tips for Managing Your Gaming Habits</h2>
      <ul>
        <li>Ensure your gaming is balanced with other hobbies and activities.</li>
        <li>Only make purchases that fit within your financial means.</li>
        <li>Take regular breaks or stop gaming when needed.</li>
      </ul>
      <hr />
      <h2>2. House Advantage/House Edge</h2>
      <p>Games typically have a house edge, which ensures that a percentage of the total amount played is returned to the house (in this case, <strong>{brand}</strong>).</p>
      <hr />
      <h2>3. Independent Outcomes</h2>
      <p>Each game or spin is independent. Previous gameplay, whether in terms of duration or spending, does not influence the outcome.</p>
      <hr />
      <h2>4. Free Play</h2>
      <p>No purchase is required to enter sweepstakes.</p>
      <hr />
      <h2>5. Age Requirement</h2>
      <p>Participants must be at least 18 years old to engage in gaming activities.</p>
      <hr />
      <h2>6. Responsible Gaming Tools</h2>
      <p><strong>{brand}</strong> provides several tools to help you manage your gaming activities effectively.</p>
      <hr />
      <h2>7. Account Closure</h2>
      <p><strong>{brand}</strong> offers the option to close your account for any reason. If you no longer find gaming enjoyable or have other personal reasons, you can apply to permanently close your account.</p>
      <h3>Reactivation</h3>
      <p>To reactivate your account, please open a ticket to customer service.</p>
      <p><strong>Note:</strong> <strong>{brand}</strong> reserves the right to close any customer account at its discretion</p>
      <hr />
      <h2>8. Support Organizations</h2>
      <p>If your gaming has impacted your mental health, finances, or relationships, we encourage you to reach out to the following support organizations:</p>
      <ul>
        <li><strong>Gaming Addicts Anonymous (GAA):</strong> A fellowship for individuals recovering from the effects of excessive gaming.</li>
        <li><strong>Financial Counseling Association of America (FCAA):</strong> An association offering financial counseling services and debt management plans.</li>
        <li><strong>National Foundation for Credit Counseling (NFCC):</strong> A non-profit agency that provides financial counseling to help people overcome debt.</li>
      </ul>
    </>
  );
}

export function ResponsibleGaming() {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  usePageContentReady(!loading);

  useEffect(() => {
    let cancelled = false;
    getLegalPage('responsible-gaming')
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

  // Hidden by an admin (Admin → Pages): off the website and the footer.
  if (!loading && page?.isActive === false) return <Navigate to="/" replace />;

  const cmsHtml = htmlHasContent(page?.content) ? String(page.content) : '';
  const brand = String(site.platformName || 'Golden Dragon Casino').replace(/\s+/g, '');

  return (
    <main className="legal-page">
      <header className="legal-head">
        <h1>Responsible Gambling</h1>
        <p>Last updated {formatUpdated(page?.updatedAt || page?.updated_at)}</p>
      </header>
      <article className="legal-prose">
        {cmsHtml ? <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(cmsHtml) }} /> : <DefaultContent brand={brand} />}
      </article>
    </main>
  );
}
