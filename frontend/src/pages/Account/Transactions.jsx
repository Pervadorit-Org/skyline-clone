import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';
import * as transactionsApi from '../../api/transactions';
import { usePageContentReady } from '../../context/PageReadyContext';
import { useAuth } from '../../context/AuthContext';
import { formatSc } from '../../utils/currency';
import './transactions-page.css';

const DEFAULT_LIMIT = 20;

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${dateStr} ${timeStr}`;
}

function getTransactionDate(tx) {
  return tx?.date ?? tx?.createdAt ?? tx?.created_at ?? tx?.timestamp ?? null;
}

function typeLabel(type) {
  const map = {
    deposit: 'Deposit',
    withdraw: 'Withdraw',
    spin_wheel: 'Spin Wheel',
    welcome_signup: 'Welcome Bonus',
    daily_bonus: 'Daily Reward',
    daily_bonus_spin: 'Daily Reward Spin',
    referral_friend_signup: 'Referral Bonus',
    promotion: 'Promotions',
    bonus_code: 'Deposit bonus',
    affiliate: 'Refer & Earn',
    vip_bonus: 'VIP Bonus',
    game_deposit: 'Game Deposit',
    game_withdraw: 'Game Withdraw',
    gc_purchase: 'GC Purchase',
    package_bonus: 'Free SC Bonus',
    welcome_signup_gc: 'Welcome Bonus',
    admin_add: 'Admin add',
    admin_remove: 'Admin remove'
  };
  return map[type] || type;
}

function toneForType(type) {
  const walletGains = [
    'deposit',
    'game_withdraw',
    'spin_wheel',
    'welcome_signup',
    'daily_bonus',
    'daily_bonus_spin',
    'referral_friend_signup',
    'promotion',
    'bonus_code',
    'affiliate',
    'vip_bonus',
    'gc_purchase',
    'welcome_signup_gc',
    'package_bonus',
    'admin_add'
  ].includes(type);
  const isBonus = [
    'spin_wheel',
    'welcome_signup',
    'daily_bonus',
    'daily_bonus_spin',
    'referral_friend_signup',
    'promotion',
    'bonus_code',
    'affiliate',
    'vip_bonus',
    'welcome_signup_gc',
    'package_bonus'
  ].includes(type);
  if (isBonus) return 'bonus';
  if (walletGains) return 'in';
  return 'out';
}

function CoinAmount({ icon, value }) {
  if (value == null || value === '') return <span className="tx-dash">-</span>;
  return (
    <span className="tx-coin">
      <img src={icon} alt="" aria-hidden="true" width="24" height="24" loading="lazy" />
      {value}
    </span>
  );
}

/** GC and SC never mix: a row belongs to exactly one wallet column (GC rows -> GC, USD payment rows -> neither). */
function gcValue(tx) {
  if (tx.currency_code === 'GC') return Math.abs(Number(tx.amount) || 0).toLocaleString('en-US');
  const raw = tx.gc_amount ?? tx.gcAmount ?? tx.gold_amount ?? tx.goldCoins ?? tx.gc;
  if (raw == null || raw === '') return null;
  return Math.abs(Number(raw)).toLocaleString('en-US');
}

function scValue(tx) {
  if (tx.currency_code === 'GC' || tx.currency_code === 'USD') return null;
  if (tx.amount == null || tx.amount === '') return null;
  return formatSc(Math.abs(Number(tx.amount)));
}

function detailsText(tx) {
  const base = tx.description || '-';
  if (tx.currency_code === 'USD') return `Paid $${Math.abs(Number(tx.amount) || 0).toFixed(2)} · ${base}`;
  return base;
}

function TxId({ id }) {
  if (!id) return <span className="tx-dash">-</span>;
  const text = String(id);
  return (
    <span className="tx-id" title={text}>
      {text.length > 16 ? `${text.slice(0, 16)}...` : text}
    </span>
  );
}

function actionLabel(type) {
  return toneForType(type) === 'out' ? 'Debit' : 'Credit';
}

export function AccountTransactions() {
  const { toast } = useToast();
  const { gcEnabled } = useAuth();
  const [data, setData] = useState({ transactions: [], total: 0, page: 1, limit: DEFAULT_LIMIT, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', category: '', currency: '' });
  const [page, setPage] = useState(1);

  usePageContentReady(!loading);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: DEFAULT_LIMIT };
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      if (filters.category) params.category = filters.category;
      if (gcEnabled && filters.currency) params.currency = filters.currency;
      const res = await transactionsApi.getTransactions(params);
      const total = res.total ?? 0;
      setData({
        transactions: res.transactions || [],
        total,
        page: res.page ?? page,
        limit: res.limit ?? DEFAULT_LIMIT,
        total_pages: Math.max(1, res.total_pages ?? Math.ceil(total / (res.limit ?? DEFAULT_LIMIT)))
      });
    } catch (err) {
      toast.error(err.message || 'Failed to load transactions.');
      setData((prev) => ({ ...prev, transactions: [] }));
    } finally {
      setLoading(false);
    }
  }, [page, filters, toast, gcEnabled]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const setFilter = (key, value) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };

  const { transactions, total_pages } = data;

  return (
    <main className="tx-page">
      <h1 className="tx-title">Transactions</h1>

      <div className="tx-card">
        <div className="tx-filters">
          <label className="tx-field">
            <span>Activity Type</span>
            <span className="tx-select-wrap">
              <select value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
                {transactionsApi.TRANSACTION_CATEGORIES.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </span>
          </label>
          {gcEnabled ? (
            <label className="tx-field">
              <span>Wallet</span>
              <span className="tx-select-wrap">
                <select value={filters.currency} onChange={(e) => setFilter('currency', e.target.value)}>
                  <option value="">GC &amp; SC</option>
                  <option value="GC">GC only</option>
                  <option value="SC">SC only</option>
                </select>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
              </span>
            </label>
          ) : null}
          <label className="tx-field">
            <span>From Date</span>
            <input type="date" value={filters.dateFrom} max={filters.dateTo || undefined} onChange={(e) => setFilter('dateFrom', e.target.value)} />
          </label>
          <label className="tx-field">
            <span>To Date</span>
            <input type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={(e) => setFilter('dateTo', e.target.value)} />
          </label>
        </div>

        {loading ? (
          <p className="tx-empty">Loading transactions…</p>
        ) : transactions.length === 0 ? (
          <p className="tx-empty">No transactions found.</p>
        ) : (
          <>
            <div className="tx-table-wrap">
              <table className="tx-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reason</th>
                    <th>Action Type</th>
                    <th>GC</th>
                    <th>SC</th>
                    <th>TX ID</th>
                    <th>Status</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td><time className="tx-muted">{formatDate(getTransactionDate(tx))}</time></td>
                      <td><span className="tx-reason">{typeLabel(tx.type)}</span></td>
                      <td><span className={actionLabel(tx.type) === 'Credit' ? 'tx-credit' : 'tx-debit'}>{actionLabel(tx.type)}</span></td>
                      <td><CoinAmount icon="/icons/coin.png" value={gcValue(tx)} /></td>
                      <td><CoinAmount icon="/df-online/sc-coin.webp" value={scValue(tx)} /></td>
                      <td><TxId id={tx.id} /></td>
                      <td><span className="tx-muted">{tx.status || '-'}</span></td>
                      <td><span className="tx-muted">{detailsText(tx)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="tx-cards">
              {transactions.map((tx) => (
                <div key={tx.id} className="tx-mcard">
                  <div className="tx-mcard-l">
                    <span className="tx-reason tx-mcard-title">{typeLabel(tx.type)}</span>
                    <span className="tx-muted tx-trunc">TXN: {tx.id}</span>
                    <time className="tx-muted">{formatDate(getTransactionDate(tx))}</time>
                    <span className={actionLabel(tx.type) === 'Credit' ? 'tx-credit' : 'tx-debit'}>{actionLabel(tx.type)}</span>
                  </div>
                  <div className="tx-mcard-r">
                    <CoinAmount icon="/df-online/sc-coin.webp" value={scValue(tx)} />
                    <CoinAmount icon="/icons/coin.png" value={gcValue(tx)} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="tx-pager">
          <button type="button" aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <span>Page {page}</span>
          <button type="button" aria-label="Next page" disabled={page >= total_pages || loading} onClick={() => setPage((p) => p + 1)}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
      </div>
    </main>
  );
}
