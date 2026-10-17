import { useState } from 'react';
import { usePageContentReady } from '../../context/PageReadyContext';
import { site } from '../../config/site';
import { useLobbyContent } from '../../hooks/useLobbyContent';
import './faq-page.css';

const name = site.platformName;

/* Each category: title + lines of text (a question line, then its answer line, …) */
const FAQ_SECTIONS = [
  {
    title: 'Account & Registration',
    lines: [
      'a. How do I create an account?',
      'Click Sign Up, enter your details, accept the Terms & Conditions and verify your email address.',
      'b. Who can register?',
      'You must meet the minimum age requirement in the Terms & Conditions and live in an eligible location. One account per person.',
      'c. Can I have more than one account?',
      'No. Duplicate or shared accounts are not allowed and may be suspended.',
      'd. How do I update my profile details?',
      'Go to Profile, edit your information and save. Some changes may require verification.',
    ],
  },
  {
    title: 'Login and Security',
    lines: [
      'a. How do I log in?',
      'Click Login, enter your registered username or email and password, and click Log In.',
      'b. I forgot my password. What should I do?',
      'Click Forgot Password? on the Login page and follow the instructions to reset your password.',
      'c. How do I change my password?',
      'Go to Profile → Change Password, enter your current password and new password, and click Update Password.',
      'd. What should I do if I think someone accessed my account?',
      'Change your password immediately and contact Customer Support if you notice any unusual activity.',
      'e. Should I share my password with Customer Support?',
      'No. Never share your password with anyone, including Customer Support.',
    ],
  },
  {
    title: 'Gold Coins (GC) & Sweepstakes Coins (SC)',
    lines: [
      'a. What are Gold Coins?',
      'Gold Coins are for entertainment only and have no redemption value.',
      'b. What are Sweepstakes Coins?',
      'Sweepstakes Coins may be redeemable for prizes, subject to the Official Rules.',
      'c. How do I get free Sweepstakes Coins?',
      'Through the welcome bundle, daily rewards, promotions, or the Alternate Method of Entry (AMOE). No purchase is required.',
      'd. Does buying more coins improve my chances?',
      "No. Purchases don't affect outcomes. All games use randomized results.",
    ],
  },
  {
    title: 'Store & Purchases',
    lines: [
      'a. Is a purchase required to play?',
      'No purchase is necessary. Optional coin packages are available in the Store.',
      'b. Where do I buy coin packages?',
      'Open the Store from the top bar and choose a package.',
      'c. My purchase did not arrive. What should I do?',
      'Wait a few minutes and refresh. If the coins still do not appear, contact Customer Support with your order details.',
    ],
  },
  {
    title: 'Payments',
    lines: [
      'a. Which payment methods are accepted?',
      'Available methods are shown at checkout and may vary by location.',
      'b. Is my payment information safe?',
      'Payments are processed by secure third-party processors. We do not store full card details.',
      'c. Can I get a refund?',
      'Refund eligibility is described in the Terms & Conditions. Contact Customer Support for help with a specific order.',
    ],
  },
  {
    title: 'Redeeming Sweepstakes Coins',
    lines: [
      'a. How does redemption work?',
      "Eligible Sweepstakes Coin balances may be submitted for redemption, subject to verification and the platform's Official Rules.",
      'b. Do I need to verify my identity?',
      'Yes. ID verification may be required before a redemption is approved.',
      'c. How long does a redemption take?',
      'Timing depends on verification and processor windows. You can track the status in your account.',
    ],
  },
  {
    title: 'Bonuses & Promotions',
    lines: [
      'a. What bonuses are available?',
      'Welcome bundles, daily rewards, the spin wheel, VIP rewards and referral bonuses. See the Promotions page for current offers.',
      'b. How do VIP rewards work?',
      'You earn VIP Points by playing and move up ranks to unlock bigger rewards.',
      'c. How does the referral program work?',
      'Share your referral link. When a friend signs up and meets the requirements, you both get rewarded.',
    ],
  },
  {
    title: 'Responsible Play & Support',
    lines: [
      'a. How can I limit my play?',
      'Contact Customer Support to set limits or to take a break from the platform.',
      'b. How do I contact support?',
      `Use the Chat button in the corner of the screen or email ${site.supportEmail || 'our support team'}.`,
    ],
  },
];

function Chevron({ open }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : undefined }}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** Admin-managed FAQ ({ title, items: [{ q, a }] }) in the same shape the built-in list uses. */
function adminSections(faq) {
  const list = Array.isArray(faq?.sections) ? faq.sections : [];
  return list
    .filter((sec) => sec?.title && Array.isArray(sec.items) && sec.items.length)
    .map((sec) => ({
      title: sec.title,
      lines: sec.items.flatMap((it, i) => [`${String.fromCharCode(97 + (i % 26))}. ${it.q}`, it.a]),
    }));
}

export function FaqPage() {
  usePageContentReady(true);
  const { faq } = useLobbyContent();
  const custom = adminSections(faq);
  const sections = custom.length ? custom : FAQ_SECTIONS;
  const intro = faq?.intro?.trim() || `${name} is a free-to-play online platform that runs in two modes: Gold Coins for fun play and Sweepstakes Coins for prize redemptions.`;
  const [openIdx, setOpenIdx] = useState(1);

  return (
    <main className="faq-page">
      <div className="faq-wrap">
        <h1 className="faq-title">Frequently Asked Questions</h1>
        <p className="faq-lead">
          {intro}
        </p>
        <div className="faq-list">
          {sections.map((sec, i) => {
            const open = openIdx === i;
            return (
              <div key={sec.title} className={`faq-item${open ? ' is-open' : ''}`}>
                <button type="button" className="faq-q" aria-expanded={open} aria-controls={`faq-a-${i}`} onClick={() => setOpenIdx(open ? -1 : i)}>
                  <span>{i + 1}. {sec.title}</span>
                  <Chevron open={open} />
                </button>
                <div id={`faq-a-${i}`} className="faq-a-wrap" hidden={!open}>
                  <div className="faq-a">
                    {sec.lines.map((line, j) => (
                      <p key={j}>{line}</p>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
