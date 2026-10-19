import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { site } from '../../config/site';
import { useLobbyContent } from '../../hooks/useLobbyContent';
import { useToast } from '../../context/ToastContext';
import { useStoreSocialLinks } from '../../hooks/useStoreSocialLinks';
import { getTaskStatus, claimTask } from '../../api/tasks';
import { TASKS_CHANGED_EVENT } from './useClaimableTaskCount';
import './task-list-modal.css';

export const OPEN_TASK_LIST_EVENT = 'df:open-task-list';
export function openTaskList() {
  window.dispatchEvent(new CustomEvent(OPEN_TASK_LIST_EVENT));
}

const GC = '/icons/coin.png';
const SC = '/df-online/sc-coin.webp';
const envSocial = site?.socialLinks || {};

const buildRegular = (social) => [
  { id: 'fb', title: 'Click Link', desc: 'Follow us on Facebook', target: 'Visit the link', url: social.facebook, gc: '1,000', sc: '0.2' },
  { id: 'x', title: 'Click Link', desc: 'Follow us on X', target: 'Visit the link', url: social.twitter, gc: '10,000', sc: '0.2' },
  { id: 'phone', title: 'Verify Phone', desc: 'Verify Your Phone Number and get rewards', target: 'Verify your phone number', action: 'phone', gc: '10,000', sc: '0.5' },
  { id: 'ig', title: 'Click Link', desc: 'Follow us on Instagram', target: 'Visit the link', url: social.instagram, gc: '10,000', sc: '0.2' },
  { id: 'dc', title: 'Click Link', desc: 'Join our Discord community', target: 'Visit the link', url: social.discord, gc: '10,000', sc: '0.2' },
  { id: 'email', title: 'Setup Email Address', desc: 'Add and verify your email address', target: 'Set up your email address', action: 'email', gc: '100', sc: '1' },
];

const DAILY = [
  { id: 'purchase', title: 'Purchase Package', desc: 'Purchase a package worth $30 and get rewards.', target: 'Purchase a package worth $30', to: '/store', cta: 'Visit Store', gc: '50,000', sc: '1' },
  { id: 'referral', title: 'Referral Completed', desc: 'Refer a friend and earn bonus.', target: 'Refer a friend', to: '/account/affiliate', cta: 'Invite Friends', gc: '10,000', sc: '0.5' },
  { id: 'active', title: 'Stay Active', desc: '', target: 'Log in and stay active today', gc: '1,000', sc: '0.1' },
  { id: 'play', title: 'Play Games', desc: 'Play 5 games today', target: 'Play 5 games today', to: '/casino', cta: 'Play Games', gc: '2,500', sc: '0.25' },
];

/** Admin-managed tasks replace a built-in list; hidden ones are dropped; social tasks fall back to the site's links. */
function resolveTasks(custom, builtIn, social) {
  if (!Array.isArray(custom) || custom.length === 0) return builtIn;
  return custom
    .filter((t) => t && t.enabled !== false)
    .map((t) => ({ ...t, url: t.url || (t.social ? social[t.social] : '') || undefined, to: t.to || undefined }));
}

const CheckIcon = ({ done }) => (
  <span className={`tl-check${done ? ' is-done' : ''}`} aria-label={done ? 'Completed' : undefined}>
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="3" />
      <path d="M8 12l3.150 3.150L17.400 8.850" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
);

function TaskCard({ task, done, claimable, claiming, onClaim, onClose }) {
  const [open, setOpen] = useState(false);
  const [visited, setVisited] = useState(false);
  const cta = (() => {
    if (task.url) {
      return (
        <a href={task.url} target="_blank" rel="noopener noreferrer" className="tl-cta" onClick={() => setVisited(true)}>
          Open Link
        </a>
      );
    }
    if (task.action === 'phone' && !done) {
      return <Link to="/settings" className="tl-cta" onClick={onClose}>Verify Phone</Link>;
    }
    if (task.action === 'email' && !done) {
      return <Link to="/account/profile#profile" className="tl-cta" onClick={onClose}>Complete profile</Link>;
    }
    if (task.to) {
      return <Link to={task.to} className="tl-cta" onClick={onClose}>{task.cta}</Link>;
    }
    return null;
  })();

  return (
    <div className="tl-card">
      <button type="button" className="tl-card-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="tl-card-l">
          <img src={GC} alt="" aria-hidden="true" draggable="false" className="tl-card-icon" />
          <span className="tl-card-txt">
            <span className="tl-card-title">
              <span>{task.title}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tl-info" aria-hidden="true">
                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
              </svg>
            </span>
            <span className="tl-card-desc">{task.desc}</span>
          </span>
        </span>
        <CheckIcon done={done} />
      </button>
      <div className={`tl-collapse${open ? ' is-open' : ''}`}>
        <div className="tl-collapse-in" {...(open ? {} : { inert: '' })}>
          <div className="tl-details">
            {task.desc ? <p className="tl-d-desc">{task.desc}</p> : null}
            <div>
              <p className="tl-d-h">Mission Target</p>
              <p className="tl-d-sub">{task.target}</p>
            </div>
            {cta}
            <div className="tl-rewards">
              <p className="tl-d-h">Rewards</p>
              <div className="tl-rewards-row">
                <span className="tl-gc"><img src={GC} alt="" aria-hidden="true" />{task.gc} GC</span>
                <span className="tl-sc"><img src={SC} alt="" aria-hidden="true" />{task.sc} SC</span>
              </div>
            </div>
            <button
              type="button"
              className="tl-claim"
              disabled={done || !claimable || claiming || (task.kind === 'link' && (!task.url || !visited))}
              onClick={() => onClaim(task)}
            >
              {done ? 'Claimed' : claiming ? 'Claiming…' : 'Claim Now'}
            </button>
          </div>
        </div>
      </div>
      <button type="button" className="tl-toggle" aria-label="Toggle details" onClick={() => setOpen((o) => !o)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : undefined }} aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </div>
  );
}

function useResetCountdown(active, resetAt) {
  const calc = () => {
    const now = new Date();
    const end = resetAt ? new Date(resetAt) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const s = Math.max(0, Math.floor((end - now) / 1000));
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s`;
  };
  const [text, setText] = useState(calc);
  useEffect(() => {
    if (!active) return undefined;
    setText(calc());
    const id = setInterval(() => setText(calc()), 1000);
    return () => clearInterval(id);
  }, [active, resetAt]);
  return text;
}

export function TaskListModal() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('regular');
  const [status, setStatus] = useState({});
  const [claimedList, setClaimedList] = useState([]);
  const [resetAt, setResetAt] = useState(null);
  const [claimingId, setClaimingId] = useState(null);
  const { tasks: adminTasks } = useLobbyContent();
  const { socialLinks: adminSocial } = useStoreSocialLinks();
  // Admin-managed links (Social Links page) win over the build-time env links.
  const social = { ...envSocial };
  Object.entries(adminSocial || {}).forEach(([k, v]) => {
    if (v) social[k] = v;
  });
  const regularTasks = resolveTasks(adminTasks?.regular, buildRegular(social), social);
  const dailyTasks = resolveTasks(adminTasks?.daily, DAILY, social);
  const reset = useResetCountdown(open && tab === 'daily', resetAt);

  const loadStatus = useCallback(async () => {
    try {
      const res = await getTaskStatus();
      const map = {};
      (res?.tasks || []).forEach((t) => {
        map[`${t.group}:${t.id}`] = t;
      });
      setStatus(map);
      setClaimedList(res?.claimed || []);
      setResetAt(res?.reset_at || null);
    } catch {
      /* keep the last known state; claim buttons stay disabled until status loads */
    }
  }, []);

  useEffect(() => {
    if (open && isAuthenticated) loadStatus();
  }, [open, isAuthenticated, loadStatus]);

  const handleClaim = async (task) => {
    setClaimingId(`${task.group}:${task.id}`);
    try {
      const res = await claimTask(task.group, task.id);
      const parts = [];
      if (res?.reward_sc > 0) parts.push(`${res.reward_sc} SC`);
      if (res?.reward_gc > 0) parts.push(`${res.reward_gc.toLocaleString()} GC`);
      toast.success(parts.length ? `Reward claimed: ${parts.join(' + ')}` : 'Reward claimed.');
      window.dispatchEvent(new CustomEvent('wallet:refresh'));
    } catch (err) {
      toast.error(err?.message || 'Could not claim this reward.');
    } finally {
      setClaimingId(null);
      loadStatus();
      window.dispatchEvent(new CustomEvent(TASKS_CHANGED_EVENT));
    }
  };

  useEffect(() => {
    const onOpen = () => {
      setTab('regular');
      setOpen(true);
    };
    window.addEventListener(OPEN_TASK_LIST_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_TASK_LIST_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !isAuthenticated) return null;

  const close = () => setOpen(false);
  const stateOf = (t, group) => status[`${group}:${t.id}`] || {};
  const withReward = (t, group) => {
    const st = stateOf(t, group);
    return {
      ...t,
      group,
      kind: st.kind,
      sc: st.reward_sc != null ? String(st.reward_sc) : t.sc,
      gc: st.reward_gc != null ? Number(st.reward_gc).toLocaleString() : t.gc,
    };
  };
  const renderTask = (t, group) => {
    const st = stateOf(t, group);
    const task = withReward(t, group);
    return (
      <TaskCard
        key={t.id}
        task={task}
        done={Boolean(st.claimed)}
        claimable={Boolean(st.eligible) && !st.claimed}
        claiming={claimingId === `${group}:${t.id}`}
        onClaim={handleClaim}
        onClose={close}
      />
    );
  };
  const allTasks = [...regularTasks.map((t) => ({ ...t, group: 'regular' })), ...dailyTasks.map((t) => ({ ...t, group: 'daily' }))];
  const tabs = [['regular', 'Regular Tasks'], ['daily', 'Daily'], ['claimed', 'Claimed']];
  const heading = { regular: 'Regular Tasks', daily: 'Daily Tasks', claimed: 'Claimed Tasks' }[tab];

  return createPortal(
    <div className="tl-overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="tl-modal" role="dialog" aria-modal="true" aria-labelledby="tl-title">
        <div className="tl-top">
          <div className="tl-title-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="#d9b45a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tl-title-ic" aria-hidden="true">
              <rect x="5" y="4" width="14" height="18" rx="2.500" /><path d="M9 4V3h6v1" /><path d="M9 10h6M9 14h6M9 18h3" />
            </svg>
            <h2 id="tl-title" className="tl-title">Task List</h2>
          </div>
          <button type="button" className="tl-close" aria-label="Close" onClick={close}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="tl-tabs-wrap">
          <div className="tl-tabs" role="tablist">
            {tabs.map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={`tl-tab${tab === id ? ' is-on' : ''}`} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="tl-heading">
          <h3>{heading}</h3>
          {tab === 'daily' ? (
            <span className="tl-reset">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 2h4" /><path d="M12 14l3-3" /><circle cx="12" cy="14" r="8" />
              </svg>
              Resets in {reset}
            </span>
          ) : null}
        </div>

        <div className="tl-scroll">
          {tab === 'regular' && (
            <div className="tl-list">
              {regularTasks.map((t) => renderTask(t, 'regular'))}
            </div>
          )}
          {tab === 'daily' && (
            <div className="tl-list">
              {dailyTasks.map((t) => renderTask(t, 'daily'))}
            </div>
          )}
          {tab === 'claimed' && (
            claimedList.length === 0 ? (
              <p className="tl-empty">No claimed tasks</p>
            ) : (
              <div className="tl-list">
                {claimedList.map((c) => {
                  const base = allTasks.find((t) => t.id === c.task_id && t.group === c.group);
                  return (
                    <div key={c.task_key} className="tl-card">
                      <div className="tl-card-head">
                        <span className="tl-card-l">
                          <img src={GC} alt="" aria-hidden="true" draggable="false" className="tl-card-icon" />
                          <span className="tl-card-txt">
                            <span className="tl-card-title"><span>{base?.title || c.task_id}</span></span>
                            <span className="tl-card-desc">
                              {[c.reward_sc > 0 ? `${c.reward_sc} SC` : '', c.reward_gc > 0 ? `${Number(c.reward_gc).toLocaleString()} GC` : ''].filter(Boolean).join(' + ')}
                              {' · '}
                              {new Date(c.claimed_at).toLocaleDateString()}
                            </span>
                          </span>
                        </span>
                        <CheckIcon done />
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
