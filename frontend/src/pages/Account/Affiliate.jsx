import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import * as affiliateApi from '../../api/affiliate';
import { usePageContentReady } from '../../context/PageReadyContext';
import { ReferralShareModal } from '../../components/ReferralShareModal';
import { formatSc } from '../../utils/currency';
import { buildReferralLink } from '../../utils/referralLink';
import { shareOptionsFromAffiliateStats } from '../../utils/socialShare';
import './refer-page.css';

const PAGE_SIZE = 10;

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function statusLabel(status) {
  switch (status) {
    case 'awaiting_playthrough':
      return 'Pending';
    case 'scheduled':
      return 'Pending';
    case 'signed_up':
      return 'Pending';
    case 'earning':
      return 'Earning';
    case 'paid':
    case 'complete':
      return 'Completed';
    case 'capped':
      return 'Weekly cap';
    default:
      return status || '—';
  }
}

function statusKey(status) {
  const l = statusLabel(status);
  return l === 'Pending' ? 'pending' : l === 'Earning' ? 'earning' : l === 'Completed' ? 'completed' : 'other';
}

const UsersSvg = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="ref-shrink">
    <circle cx="9" cy="8.5" r="4" stroke="#fff" strokeWidth="2" />
    <path d="M2 20c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    <path d="M15 4.7a4 4 0 0 1 0 7.6M18 13.4c2.6 1 4.3 3.4 4.3 6.1" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const GiftSvg = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="#fff" aria-hidden="true">
    <path d="M15 3.2c-3 0-6.200 3-4.700 6.800H5a3.300 3.300 0 0 0-3.300 3.300v3.300c0 .9.7 1.700 1.700 1.700h15v-5h3.300v5h15c.9 0 1.700-.8 1.700-1.700v-3.300A3.300 3.300 0 0 0 35 10h-5.300c2-5.500-5.400-9.300-8.800-4.600L20 6.700l-1-1.300c-1-1.500-2.500-2.200-4-2.200zm0 3.500c1.500 0 2.200 1.800 1.200 2.800s-2.900.3-2.900-1.200a1.700 1.700 0 0 1 1.700-1.600zm10 0c1.500 0 2.200 1.800 1.200 2.800s-2.900.3-2.900-1.200a1.700 1.700 0 0 1 1.700-1.600zM3.300 20v13.300A3.300 3.300 0 0 0 6.700 36.700h26.600a3.300 3.300 0 0 0 3.400-3.400V20h-15v13.300h-3.400V20z" />
  </svg>
);
const ShieldSvg = () => (
  <svg width="13" height="15" viewBox="0 0 24 28" fill="none" aria-hidden="true" className="ref-shrink">
    <path d="M12 2l9 3.500v8c0 6-4 10.500-9 12.500-5-2-9-6.500-9-12.500v-8z" stroke="#9ca3af" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);
const CopySvg = () => (
  <svg width="25" height="25" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M4.333 4.144V2.604c0-.518.420-.937.938-.937h8.125c.518 0 .937.419.937.937v8.125c0 .518-.419.938-.937.938h-1.557" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.729 4.333H2.604a.937.937 0 0 0-.937.938v8.125c0 .518.420.937.937.937h8.125c.518 0 .937-.419.937-.937V5.271a.937.937 0 0 0-.937-.938z" stroke="currentColor" strokeLinejoin="round" />
  </svg>
);
const LinkSvg = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M10.880 8.186l4.570-4.570a3.100 3.100 0 0 1 4.380 4.380l-3.400 3.400M7.550 11.500l-3.970 3.970a3.100 3.100 0 0 0 4.380 4.380l5.140-5.140M10.950 13.070a3.100 3.100 0 0 1-.070-4.890M13.100 10.900a3.100 3.100 0 0 1 .070 4.890" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const SearchSvg = () => (
  <svg width="25" height="24" viewBox="0 0 25 24" fill="none" aria-hidden="true" className="ref-search-ic">
    <circle cx="10.700" cy="10.500" r="8.500" stroke="#fff" strokeWidth="2" />
    <path d="M16.800 16.600l4.200 4.200" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const FilterSvg = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="ref-shrink">
    <path d="M3 4.500l7.200 8.400v6.300l3.600 1.800v-8.100L21 4.500z" stroke="#838789" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);
const ArrowSvg = ({ flip }) => (
  <svg width="16" height="16" viewBox="30 30 125 125" aria-hidden="true" style={flip ? { transform: 'rotate(180deg)' } : undefined}>
    <path fill="currentColor" d="M51.707 185.343a10.700 10.700 0 0 1-7.593-3.149c-4.194-4.194-4.194-10.981 0-15.175l74.352-74.347L44.114 18.320c-4.194-4.194-4.194-10.987 0-15.175 4.194-4.194 10.987-4.194 15.180 0l81.934 81.934c4.194 4.194 4.194 10.987 0 15.175l-81.934 81.939a10.700 10.700 0 0 1-7.587 3.150z" />
  </svg>
);

function StatCard({ icon, label, value }) {
  return (
    <div className="ref-stat">
      <div className="ref-stat-in">
        <div className="ref-stat-label">
          {icon}
          <span>{label}</span>
        </div>
        <p className="ref-stat-value">{value}</p>
      </div>
    </div>
  );
}

export function AccountAffiliate() {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  usePageContentReady(!(loading && !data));

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      setData(await affiliateApi.getAffiliateStats());
    } catch (err) {
      toast.error(err.message || 'Failed to load referral data.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const referralLink = buildReferralLink(data?.referral_code);
  const shareOpts = shareOptionsFromAffiliateStats(data);
  const rewardPct = Number(data?.reward_percentage ?? data?.rewardPercentage);
  const pct = Number.isFinite(rewardPct) && rewardPct > 0 ? rewardPct : 10;
  const maxRaw = Number(data?.max_rewarded_purchases ?? data?.maxRewardedPurchases);
  const maxPurchases = Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : 3;

  const friendBonusSc = Number(data?.friend_signup_bonus_sc) || 0;
  const referred = data?.referred_users || [];
  const totalReferrals = data?.total_referrals ?? referred.length ?? 0;
  const completed = referred.filter((u) => statusKey(u.qualification_status) === 'completed').length;
  const scEarned = data?.total_earned_sc ?? 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return referred.filter((u) => {
      if (statusFilter !== 'all' && statusKey(u.qualification_status) !== statusFilter) return false;
      if (!q) return true;
      return `${u.username || ''} ${u.email || ''}`.toLowerCase().includes(q);
    });
  }, [referred, query, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const copyLink = () => {
    if (!referralLink) {
      toast.error('Referral link is not ready yet.');
      return;
    }
    navigator.clipboard.writeText(referralLink).then(
      () => toast.success('Referral link copied.'),
      () => toast.error('Could not copy.')
    );
  };

  const share = () => {
    if (!referralLink) {
      toast.error('Referral link is not ready yet.');
      return;
    }
    setShareModalOpen(true);
  };

  const pager = (cls) => (
    <div className={`ref-pager ${cls}`}>
      <button type="button" className="ref-ctrl-btn" disabled={current <= 1} onClick={() => setPage(current - 1)}>
        <ArrowSvg flip />
        <span>Previous</span>
      </button>
      <button type="button" className="ref-ctrl-btn" disabled={current >= pageCount} onClick={() => setPage(current + 1)}>
        <span>Next</span>
        <ArrowSvg />
      </button>
    </div>
  );

  return (
    <main className="ref-page">
      <h1 className="ref-title">Referrals</h1>

      <div className="ref-top">
        <div>
          <h2 className="ref-h2">Invite Friends &amp; Earn</h2>
          <p className="ref-lead">
            Share Your Link. When A Friend Signs Up And Completes The Requirements, Both Of You Get Rewarded.
          </p>
        </div>
        <div className="ref-stats">
          <StatCard icon={<UsersSvg />} label="Total Referrals" value={totalReferrals} />
          <StatCard icon={<UsersSvg />} label="Completed" value={completed} />
          <StatCard
            icon={<img src="/df-online/sc-coin.webp" alt="" aria-hidden="true" className="ref-coin" />}
            label="SC Earned"
            value={formatSc(scEarned)}
          />
        </div>
      </div>

      <section className="ref-card">
        <div className="ref-card-head">
          <div className="ref-card-head-l">
            <div className="ref-gift">
              <GiftSvg />
            </div>
            <div className="ref-card-text">
              <p>Invite Friends Program</p>
              <p>Earn up to {pct}% on each friend&apos;s first {maxPurchases} purchases</p>
            </div>
          </div>
          <div className="ref-fraud">
            <ShieldSvg />
            <span>Anti-fraud protected · KYC required</span>
          </div>
        </div>

        <div className="ref-link-row">
          <div className="ref-link-col">
            <h4 className="ref-link-label">Your referral link</h4>
            <div className="ref-link-controls">
              <input
                readOnly
                aria-label="Your referral link"
                className="ref-input"
                type="text"
                value={referralLink || (loading ? 'Loading…' : '')}
              />
              <div className="ref-btns">
                <button type="button" className="ref-btn ref-btn-accent" onClick={copyLink}>
                  <CopySvg />
                  Copy
                </button>
                <button type="button" className="ref-btn ref-btn-light" onClick={share}>
                  <LinkSvg />
                  Share
                </button>
              </div>
            </div>
          </div>
          <div className="ref-tiles">
            <div className="ref-tile">
              <div className="ref-tile-h">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="9" cy="9" r="6" stroke="#9ca3af" strokeWidth="2" />
                  <circle cx="15" cy="15" r="6" stroke="#9ca3af" strokeWidth="2" />
                </svg>
                <span>Referrer</span>
              </div>
              <p className="ref-tile-pct">{pct}%</p>
              <p className="ref-tile-sub">On their first {maxPurchases} purchases</p>
            </div>
            <div className="ref-tile">
              <div className="ref-tile-h">
                <svg width="14" height="14" viewBox="0 0 40 40" fill="#9ca3af" aria-hidden="true">
                  <path d="M3.300 20v13.300a3.300 3.300 0 0 0 3.400 3.400h26.600a3.300 3.300 0 0 0 3.400-3.400V20H21.700v13.300h-3.400V20zM2 10h36v8H2z" />
                </svg>
                <span>Referee</span>
              </div>
              <p className="ref-tile-pct">{friendBonusSc > 0 ? `${formatSc(friendBonusSc)} SC` : '—'}</p>
              <p className="ref-tile-sub">Welcome bonus on signup</p>
            </div>
          </div>
        </div>

        <div className="ref-info">
          <div className="ref-box">
            <h3>How it works</h3>
            <ol>
              <li>Share your link with friends.</li>
              <li>They sign up and verify their account.</li>
              <li>They get a welcome bonus, and you earn a share of what they receive on their first purchases.</li>
              <li>Rewards are credited automatically on their first qualifying purchases, up to the program&apos;s limit.</li>
            </ol>
          </div>
          <div className="ref-box">
            <h3>Eligibility highlights</h3>
            <ul>
              <li>No self-referrals, duplicate or fake accounts.</li>
              <li>Referees must complete within 30 days of clicking your link.</li>
              <li>Rewards apply to each of a referee&apos;s first qualifying purchases, up to the program&apos;s purchase limit.</li>
              <li>We may revoke rewards for fraud or reversed accounts.</li>
            </ul>
            <Link to="/terms" className="ref-terms-link">Read full Terms &amp; Conditions</Link>
          </div>
        </div>
      </section>

      <section className="ref-card ref-card-table">
        <div className="ref-filters">
          <div className="ref-search">
            <SearchSvg />
            <input
              type="search"
              placeholder="Search username/email..."
              aria-label="Search username/email..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <FilterSvg />
          <select
            aria-label="Status"
            className="ref-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="earning">Earning</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="ref-table-wrap">
          <table className="ref-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Status</th>
                <th>Signed Up Date</th>
                <th>Rewarded Purchases</th>
                <th>Reward</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="ref-empty">No referrals yet</td>
                </tr>
              ) : (
                rows.map((u) => (
                  <tr key={u.user_id}>
                    <td>{u.username || '—'}</td>
                    <td>{statusLabel(u.qualification_status)}</td>
                    <td>{formatDate(u.joined_at)}</td>
                    <td>{u.rewarded_purchases ?? 0} / {maxPurchases}</td>
                    <td>{u.reward_sc != null ? `${formatSc(u.reward_sc)} SC` : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="ref-mobile-list">
          {rows.length === 0 && <p className="ref-empty">No referrals yet</p>}
          {rows.map((u) => (
            <div key={u.user_id} className="ref-mobile-row">
              <b>{u.username || '—'}</b>
              <span>{statusLabel(u.qualification_status)} · {formatDate(u.joined_at)}</span>
            </div>
          ))}
          <div className="ref-mobile-foot">
            <span>Page {current} of {pageCount}</span>
            {pager('')}
          </div>
        </div>
        {pager('ref-pager-desktop')}
      </section>

      <section className="ref-terms">
        <h3>Referral Terms (Summary)</h3>
        <ul>
          <li>Logged-in, verified users can share referral links; referees must be new users.</li>
          <li>The referrer and the referee each earn a percentage of the coins from the referee&apos;s qualifying purchases, up to the program&apos;s purchase limit. Rewards are credited automatically once each purchase completes.</li>
          <li>Self-referrals, duplicate accounts, and abuse are prohibited. We may delay, deny, or revoke rewards for suspected fraud or reversed accounts.</li>
          <li>Caps may apply (e.g., monthly limit). Program may change or pause during maintenance or for compliance reasons.</li>
        </ul>
        <Link to="/terms" className="ref-terms-full">See the full Terms &amp; Conditions for complete rules.</Link>
      </section>

      <ReferralShareModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        referralLink={referralLink}
        shareOptions={shareOpts}
      />
    </main>
  );
}
