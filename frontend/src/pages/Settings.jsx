import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../context/AuthContext';
import { useVipStatus } from '../context/VipStatusContext';
import { useToast } from '../context/ToastContext';
import * as authApi from '../api/auth';
import * as userApi from '../api/user';
import * as kycApi from '../api/kyc';
import * as phoneApi from '../api/phone';
import { usePageContentReady, usePageReady } from '../context/PageReadyContext';
import { LockIcon, EnvelopeIcon, CameraIcon, EyeIcon, EyeOffIcon } from '../assets/icons';
import { openIntercomChat } from '../components/intercomApi';
import { PaymentAccountSection } from '../components/PaymentAccount/PaymentAccountSection';
import { KycVerificationModal } from '../components/withdraw/KycVerificationModal';
import { PhoneNumberField } from '../components/Auth/PhoneNumberField';
import { isCompleteNational, parseE164 } from '../components/Auth/phoneCountry';
import {
  isPurchaseProfileComplete,
  storeRequiresPhoneVerification
} from '../utils/purchaseProfile';
import { phoneOtpErrorMessage } from '../utils/phoneOtpErrors';
import '../components/Auth/PhoneNumberField.css';
import '../components/profile/df-profile.css';
import './account-page.css';

const inputClass = 'df-profile-input';
const inputClassError = 'df-profile-input df-profile-input--error';
const inputClassReadonly = 'df-profile-input df-profile-input--readonly';

/** Returns the profile input class with the error state applied when the field is touched and invalid. */
function fieldClass(isTouched, error) {
  return isTouched && error ? inputClassError : inputClass;
}

function ProfilePasswordField({ name, placeholder, autoComplete, className }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="df-profile-password">
      <Field
        name={name}
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={className}
      />
      <button
        type="button"
        className="df-profile-password__toggle"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        onClick={() => setVisible((open) => !open)}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function kycStatusLabel(status) {
  const s = String(status || 'not_started').toLowerCase();
  if (s === 'approved') return 'Verified';
  if (s === 'pending') return 'Pending';
  if (s === 'in_review') return 'In review';
  if (s === 'declined') return 'Declined';
  return 'Not started';
}

function kycBadgeClass(status) {
  const s = String(status || 'not_started').toLowerCase();
  if (s === 'approved') return 'dragonfury-profile-badge dragonfury-profile-badge--ok';
  if (s === 'declined') return 'dragonfury-profile-badge dragonfury-profile-badge--danger';
  return 'dragonfury-profile-badge dragonfury-profile-badge--warn';
}

const NAME_LETTERS_ONLY = /^[a-zA-Z]+$/;
const NAME_LETTERS_MSG = 'Only letters (a–z, A–Z) are allowed; no numbers, spaces, hyphens, or special characters.';

/**
 * Validates that a YYYY-MM-DD string is a real calendar date.
 * Rejects invalid dates (e.g. Feb 30, Apr 31, Feb 29 in non-leap years).
 */
function isValidCalendarDate(str) {
  if (!str || typeof str !== 'string') return false;
  const match = str.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (month < 1 || month > 12 || day < 1) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

/**
 * Converts invalid calendar date (e.g. Feb 30) to nearest valid date.
 */
function clampToValidCalendarDate(str) {
  if (!str || typeof str !== 'string') return str;
  const match = str.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return str;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (month < 1 || month > 12) return str;
  if (isValidCalendarDate(str)) return str;
  const d = new Date(year, month - 1, day);
  return `${String(d.getFullYear()).padStart(4, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DATE_MIN = '1900-01-01';

/**
 * Moves date by delta days (+1 for ArrowUp, -1 for ArrowDown). Returns YYYY-MM-DD within [min, max].
 * Example: 28-02-2026 + up -> 01-03-2026; 01-03-2026 + down -> 28-02-2026.
 */
function addDaysToDate(str, delta, maxStr) {
  const current = clampToValidCalendarDate(str || '');
  if (!current || !current.match(/^\d{4}-\d{2}-\d{2}$/)) return str;
  const d = new Date(current);
  if (Number.isNaN(d.getTime())) return str;
  d.setDate(d.getDate() + delta);
  const next = `${String(d.getFullYear()).padStart(4, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (next < DATE_MIN) return DATE_MIN;
  if (maxStr && next > maxStr) return maxStr;
  return next;
}

const PROFILE_VALIDATION = Yup.object().shape({
  firstName: Yup.string()
    .trim()
    .test('letters', NAME_LETTERS_MSG, (v) => !v || NAME_LETTERS_ONLY.test(v))
    .max(100, 'First name must be at most 100 characters.'),
  lastName: Yup.string()
    .trim()
    .test('letters', NAME_LETTERS_MSG, (v) => !v || NAME_LETTERS_ONLY.test(v))
    .max(100, 'Last name must be at most 100 characters.'),
  phone: Yup.string()
    .trim()
    .required('Phone number is required.')
    .matches(/^\+1\d{10}$/, 'Enter a valid 10-digit US phone number.'),
  dateOfBirth: Yup.string()
    .trim()
    .test('valid-calendar-date', 'Please enter a valid calendar date (e.g. Feb has 28 or 29 days, not 30 or 31).', (v) => {
      if (!v) return true;
      return isValidCalendarDate(v);
    })
    .test('year-range', 'Year must be between 1900 and the current year.', (v) => {
      if (!v || !isValidCalendarDate(v)) return true;
      const year = parseInt(String(v).slice(0, 4), 10);
      const currentYear = new Date().getFullYear();
      return year >= 1900 && year <= currentYear;
    })
    .test('not-future', 'Date of birth cannot be in the future.', (v) => {
      if (!v || !isValidCalendarDate(v)) return true;
      const today = new Date().toISOString().slice(0, 10);
      return v <= today;
    }),
  streetAddress: Yup.string().trim().max(255, 'Street address must be at most 255 characters.'),
  city: Yup.string().trim().max(100, 'City must be at most 100 characters.'),
  state: Yup.string().trim().max(100, 'State must be at most 100 characters.'),
  country: Yup.string().trim().max(100, 'Country must be at most 100 characters.'),
  zipCode: Yup.string().trim().max(20, 'Zip code must be at most 20 characters.')
});

const PASSWORD_MIN = 8;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
const PASSWORD_STRENGTH_MSG =
  'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.';

const CHANGE_PASSWORD_VALIDATION = Yup.object().shape({
  currentPassword: Yup.string().required('Current password is required.'),
  newPassword: Yup.string()
    .required('New password is required.')
    .min(PASSWORD_MIN, PASSWORD_STRENGTH_MSG)
    .matches(PASSWORD_PATTERN, PASSWORD_STRENGTH_MSG)
    .test('different', 'New password must be different from your current password.', function (value) {
      const current = this.parent.currentPassword;
      return value != null && current != null && String(value).trim() !== String(current).trim();
    }),
  confirmPassword: Yup.string()
    .required('Confirm new password is required.')
    .oneOf([Yup.ref('newPassword')], 'New password and confirm password do not match.')
});

const PROFILE_PHOTO_VALIDATION = Yup.object().shape({
  profileImageUrl: Yup.string()
    .trim()
    .required('Profile image URL is required.')
    .url('Profile image URL must be a valid URL.')
    .max(2048, 'Profile image URL must not exceed 2048 characters.')
    .test('protocol', 'Profile image URL must start with http:// or https://.', (v) => {
      if (!v) return true;
      try {
        const u = new URL(v);
        return u.protocol === 'http:' || u.protocol === 'https:';
      } catch {
        return false;
      }
    })
});

/** Default avatar URL (DiceBear) with username as seed; used when user has no custom profile image. */
function getDefaultAvatarUrl(user) {
  const seed = encodeURIComponent(user?.username || user?.email || 'user');
  return `https://api.dicebear.com/9.x/dylan/png?seed=${seed}`;
}

/** Name shown in the identity header: first+last, else username, else email. */
function getDisplayName(user) {
  const full = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  if (full) return full;
  if (user?.username) return user.username;
  return String(user?.email || '').trim() || 'Player';
}

/** Initials used when the avatar image is missing or fails to load. */
function getAvatarInitials(user) {
  const first = String(user?.firstName || '').trim();
  const last = String(user?.lastName || '').trim();
  if (first || last) return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  return String(user?.username || user?.email || 'P').trim().slice(0, 2).toUpperCase();
}

const initialProfileValues = (user) => ({
  firstName: user?.firstName ?? '',
  lastName: user?.lastName ?? '',
  phone: user?.phone ?? '',
  dateOfBirth: user?.dateOfBirth ? clampToValidCalendarDate(String(user.dateOfBirth).slice(0, 10)) || '' : '',
  streetAddress: user?.streetAddress ?? '',
  city: user?.city ?? '',
  state: user?.state ?? '',
  country: user?.country ?? '',
  zipCode: user?.zipCode ?? ''
});

const tabIcon = (d) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const ACCOUNT_TABS = [
  { id: 'profile', label: 'Profile', icon: tabIcon(<><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" /></>) },
  { id: 'verification', label: 'Verification', icon: tabIcon(<><path d="M20 13c0 5-3.500 7.500-7.660 8.950a1 1 0 0 1-.670-.010C7.500 20.500 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.500-1.200 6.240-2.720a1.170 1.170 0 0 1 1.520 0C14.510 3.810 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></>) },
  { id: 'security', label: 'Security', icon: tabIcon(<><rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>) },
  { id: 'communication', label: 'Communication', icon: tabIcon(<><path d="M10.270 21a2 2 0 0 0 3.460 0" /><path d="M6 8a6 6 0 0 1 12 0c0 4.500 1.400 6 2.740 7.330A1 1 0 0 1 20 17H4a1 1 0 0 1-.740-1.670C4.590 14 6 12.500 6 8" /></>) },
  { id: 'responsible-gaming', label: 'Responsible gaming', icon: tabIcon(<path d="M19 14c1.500-1.500 3-3.200 3-5.500a5.500 5.500 0 0 0-10-3.200A5.500 5.500 0 0 0 2 8.500c0 2.300 1.500 4 3 5.500l7 7z" />) },
];

export function Settings() {
  const { user, refreshUser } = useAuth();
  const { vipStatus } = useVipStatus();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnToDeposit = searchParams.get('returnTo') === 'deposit';
  const returnTo = searchParams.get('returnTo');
  const [loading, setLoading] = useState(true);
  const [verificationSending, setVerificationSending] = useState(false);
  const [resetEmailSending, setResetEmailSending] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const hasRefreshedForPaymentAccount = useRef(false);
  const [kyc, setKyc] = useState(null);
  const [kycStarting, setKycStarting] = useState(false);
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [kycModalUrl, setKycModalUrl] = useState('');
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [limitAmounts, setLimitAmounts] = useState({ daily: '', weekly: '', monthly: '' });
  const [breakMode, setBreakMode] = useState('cooloff');
  const [breakLength, setBreakLength] = useState('1 day');
  const [tab, setTab] = useState(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
    if (['verification', 'security', 'communication', 'responsible-gaming'].includes(hash)) return hash;
    return searchParams.get('returnTo') ? 'verification' : 'profile';
  });

  usePageContentReady(!loading);
  const { showLoader } = usePageReady();
  const didCenterPhoneRef = useRef(false);

  // After the page loader is gone, scroll phone to the center of the *visible*
  // viewport (between fixed nav and mobile bottom bar) exactly once.
  useEffect(() => {
    if (loading || showLoader || !returnToDeposit) return;
    if (didCenterPhoneRef.current) return;

    const el = document.getElementById('verify-phone');
    if (!el) return;

    const visibleRect = (node) => {
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      // display:none / md:hidden nodes report 0×0 — ignore them
      if (rect.width <= 0 || rect.height <= 0) return null;
      return rect;
    };

    const getVisibleCenterY = () => {
      const navRect = visibleRect(document.querySelector('.dash-nav'));
      const bottomRect = visibleRect(document.querySelector('.dash-bottom-wrap'));
      const topInset = navRect ? Math.max(0, navRect.bottom) : 0;
      const bottomInset = bottomRect
        ? Math.max(0, window.innerHeight - bottomRect.top)
        : 0;
      const usable = Math.max(0, window.innerHeight - topInset - bottomInset);
      return topInset + usable / 2;
    };

    const rect = el.getBoundingClientRect();
    const elCenter = rect.top + rect.height / 2;
    const visibleCenter = getVisibleCenterY();
    // Skip if already centered (e.g. React Strict Mode remount).
    if (Math.abs(elCenter - visibleCenter) < 48) {
      didCenterPhoneRef.current = true;
      return;
    }

    didCenterPhoneRef.current = true;
    const absoluteCenter = window.scrollY + elCenter;
    const top = Math.max(0, absoluteCenter - visibleCenter);
    window.scrollTo({ top, behavior: 'smooth' });
  }, [loading, showLoader, returnToDeposit]);

  const isVerified = user?.isEmailVerified === true;
  const phoneAlreadyVerified = Boolean(user?.isPhoneVerified);
  const storeRequiresPhoneOtp = storeRequiresPhoneVerification(user);
  const displayName = getDisplayName(user);
  const profileComplete = Boolean(isPurchaseProfileComplete(user) && user?.firstName && user?.lastName);
  const avatarInitials = getAvatarInitials(user);
  const avatarSrc = user?.profileImageUrl || getDefaultAvatarUrl(user);


  useEffect(() => {
    if (phoneAlreadyVerified) {
      setOtpOpen(false);
      setOtpCode('');
    }
  }, [phoneAlreadyVerified]);

  useEffect(() => {
    setLoading(!user);
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    kycApi
      .getKycStatus()
      .then((res) => {
        if (!cancelled) setKyc(res);
      })
      .catch(() => {
        if (!cancelled) setKyc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.userId]);

  // Ensure we have full user (hasPaymentAccount) so payment section shows correctly on first load.
  // Only refresh once to avoid repeated refresh loop when API omits hasPaymentAccount.
  useEffect(() => {
    if (!user || user.hasPaymentAccount !== undefined || !refreshUser || hasRefreshedForPaymentAccount.current) return;
    hasRefreshedForPaymentAccount.current = true;
    refreshUser();
  }, [user?.userId, user?.hasPaymentAccount, refreshUser]);

  async function handleSendVerification() {
    setVerificationSending(true);
    try {
      await authApi.sendVerificationEmail();
      toast.success('Verification email sent. Please check your inbox.');
      await refreshUser();
    } catch (err) {
      const msg = (err.body?.code === 'EMAIL_SERVICE_UNAVAILABLE' || err.status === 503)
        ? "Please try again later."
        : (err.message || 'Something went wrong. Please try again.');
      toast.error(msg);
    } finally {
      setVerificationSending(false);
    }
  }

  async function handleSendResetEmail() {
    if (!user?.email) {
      toast.error('No email on file.');
      return;
    }
    setResetEmailSending(true);
    try {
      await authApi.forgotPassword(user.email);
      toast.success('If an account exists with this email, you will receive a password reset link.');
    } catch (err) {
      toast.error(err.message || 'Something went wrong.');
    } finally {
      setResetEmailSending(false);
    }
  }

  const handleStartKyc = useCallback(async () => {
    setKycStarting(true);
    try {
      const res = await kycApi.startKycSession();
      if (res?.alreadyApproved) {
        setKyc((prev) => ({ ...(prev || {}), approved: true, kycStatus: 'approved', canStart: false }));
        toast.success('Identity already verified.');
        return;
      }
      if (res?.url) {
        setKycModalUrl(res.url);
        setKycModalOpen(true);
        return;
      }
      toast.error('Could not start verification. Please try again.');
    } catch (err) {
      toast.error(err.message || 'Could not start verification.');
    } finally {
      setKycStarting(false);
    }
  }, [toast]);

  const handleKycModalClose = useCallback(
    async (result) => {
      setKycModalOpen(false);
      setKycModalUrl('');
      try {
        const res = await kycApi.getKycStatus({ refresh: '1' });
        setKyc(res);
        if (res?.approved) toast.success('Identity verified.');
        else if (result?.declined || res?.kycStatus === 'declined') {
          toast.error(res?.declineReason || 'Verification was declined.');
        } else if (!result?.closed && (result?.inReview || res?.kycStatus === 'in_review' || res?.kycStatus === 'pending')) {
          toast.info('Verification submitted. Status will update when approved.');
        }
      } catch {
        /* ignore */
      }
    },
    [toast]
  );

  const requestSupport = (what) => {
    toast.info(`${what} is applied by Customer Support. Opening live chat…`);
    openIntercomChat();
  };
  const missingProfile = [
    ['Date of birth', user?.dateOfBirth],
    ['Street address', user?.streetAddress],
    ['City', user?.city],
    ['State', user?.state],
    ['ZIP code', user?.zipCode],
    ['Country', user?.country],
    ['Verified phone number', user?.isPhoneVerified]
  ].filter(([, v]) => !v).map(([label]) => label);
  const kycApproved = Boolean(kyc?.approved);
  const googleLinked = Boolean(user?.googleId || user?.authProvider === 'google' || user?.provider === 'google');

  return (
    <div className="dash-page dash-settings-page dragonfury-profile-page acct-page w-full min-w-0 max-w-full">
      <h1 className="acct-title">My Account</h1>
      <div className="acct-layout">
        <nav className="acct-nav" aria-label="Account sections">
          {ACCOUNT_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`acct-nav-item${tab === t.id ? ' is-active' : ''}`}
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => setTab(t.id)}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="acct-panel">
      <section className="dragonfury-profile-experience">
        {tab === 'profile' && (
        <header className="dragonfury-profile-identity" data-tour="profile">
          <div className="dragonfury-profile-avatar-wrap">
            {avatarSrc && !avatarFailed ? (
              <img
                src={avatarSrc}
                alt=""
                className="dragonfury-profile-avatar"
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              <span className="dragonfury-profile-avatar-initials" aria-hidden>
                {avatarInitials}
              </span>
            )}
            <span className="dragonfury-profile-avatar-camera" aria-hidden>
              <CameraIcon />
            </span>
          </div>
          <div className="acct-identity-divider" aria-hidden="true" />
          <div className="dragonfury-profile-identity-copy">
            {user?.userId != null ? <p className="acct-userid">USER ID: {String(user.userId)}</p> : null}
            <p className="acct-username-label">Username</p>
            <p className="acct-username">{user?.username || displayName}</p>
          </div>
        </header>
        )}

        {tab === 'verification' && (
          <section className="acct-block">
            <header className="acct-sec-head">
              <div className="acct-sec-title">
                <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 8c0-2.800-2.200-5-5-5S7 5.200 7 8l-2 .5h14zM3 9h18" /><circle cx="7" cy="16" r="3" /><circle cx="17" cy="16" r="3" /><path d="M10 16h4" /></svg>
                <h2>Identity</h2>
              </div>
              <span className={`acct-badge ${kycApproved ? 'is-ok' : ''}`}>
                <span className="acct-badge-ic" aria-hidden="true">{kycApproved ? '✓' : 'i'}</span>
                {kycApproved ? 'Verified' : 'Not verified'}
              </span>
            </header>
            <p className="acct-sec-copy">Verify your identity before your first redemption.</p>
            {missingProfile.length > 0 ? (
              <>
                <p className="acct-lead">Complete these profile details first — we match them against your ID:</p>
                <ul className="acct-checklist">
                  {missingProfile.map((label) => (
                    <li key={label}><span className="acct-warn" aria-hidden="true">!</span>{label}</li>
                  ))}
                </ul>
                <button type="button" className="acct-gold-btn" onClick={() => setTab('profile')}>Complete profile</button>
              </>
            ) : (
              <p className="acct-lead">Your profile details are complete.</p>
            )}
          </section>
        )}
        {tab === 'verification' && (!isVerified || kyc || storeRequiresPhoneOtp) && (
          <section className="dragonfury-profile-verification-center">
            <header className="dragonfury-profile-section-head">
              <div>
                <p className="dragonfury-profile-kicker">Account Security</p>
                <h2>Verification</h2>
              </div>
              <p className="dragonfury-profile-section-desc">
                Confirm your email, phone, and identity to unlock deposits, withdrawals and profile updates.
              </p>
            </header>

            <div className="dragonfury-profile-verification-grid">
              {/* Email verification – when not verified */}
              {!isVerified && (
                <article className="dragonfury-profile-verification-option">
                  <div className="dragonfury-profile-verification-head">
                    <span className="dragonfury-profile-verification-icon" aria-hidden>
                      <EnvelopeIcon />
                    </span>
                    <h3>Email Verification</h3>
                    <span className="dragonfury-profile-badge dragonfury-profile-badge--warn">Not Verified</span>
                  </div>
                  <p className="dragonfury-profile-verification-desc">
                    Verify your email address to update your profile. Until then, you can view your details but cannot save changes.
                  </p>
                  <div className="dragonfury-profile-verification-actions">
                    <input
                      type="text"
                      readOnly
                      value={user?.email ?? ''}
                      className={inputClassReadonly}
                      aria-label="Account email"
                    />
                    <button
                      type="button"
                      onClick={handleSendVerification}
                      disabled={verificationSending}
                      className="dragonfury-profile-btn dragonfury-profile-btn--primary"
                    >
                      <EnvelopeIcon className="dragonfury-profile-btn-icon" />
                      {verificationSending ? 'Sending…' : 'Send Verification Email'}
                    </button>
                  </div>
                </article>
              )}

              {/* Phone verification status */}
              {storeRequiresPhoneOtp && (
                <article className="dragonfury-profile-verification-option dragonfury-profile-verification-option--essential">
                  <div className="dragonfury-profile-verification-head">
                    <span className="dragonfury-profile-verification-icon" aria-hidden>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2.1Z" />
                      </svg>
                    </span>
                    <h3>Verify phone number</h3>
                    <span
                      className={
                        phoneAlreadyVerified
                          ? 'dragonfury-profile-badge dragonfury-profile-badge--ok'
                          : 'dragonfury-profile-badge dragonfury-profile-badge--warn'
                      }
                      role="status"
                    >
                      {phoneAlreadyVerified ? 'Verified' : 'Not verified'}
                    </span>
                  </div>
                  <p className="dragonfury-profile-verification-desc">
                    {phoneAlreadyVerified
                      ? 'Your phone number is verified. Purchases and withdrawals that require phone confirmation are unlocked.'
                      : 'Confirm your mobile number with a one-time code before depositing or withdrawing.'}
                  </p>
                  {!phoneAlreadyVerified && (
                    <div className="dragonfury-profile-verification-actions">
                      <button
                        type="button"
                        className="dragonfury-profile-btn dragonfury-profile-btn--primary"
                        onClick={() => {
                          const el = document.getElementById('verify-phone');
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                      >
                        Verify phone
                      </button>
                    </div>
                  )}
                </article>
              )}

              {/* KYC verification status */}
              {kyc && (
                <article className="dragonfury-profile-verification-option">
                  <div className="dragonfury-profile-verification-head">
                    <span className="dragonfury-profile-verification-icon" aria-hidden>
                      <LockIcon />
                    </span>
                    <h3>KYC Verification</h3>
                    <span className={kycBadgeClass(kyc.approved ? 'approved' : kyc.kycStatus)}>
                      {kyc.approved ? 'Verified' : kycStatusLabel(kyc.kycStatus)}
                    </span>
                  </div>
                  <p className="dragonfury-profile-verification-desc">
                    {kyc.approved
                      ? `Your identity is verified${kyc.verifiedAt ? ` (since ${new Date(kyc.verifiedAt).toLocaleDateString()})` : ''}. You can withdraw when eligible.`
                      : kyc.required
                        ? kyc.kycStatus === 'pending' || kyc.kycStatus === 'in_review'
                          ? 'Your verification is in progress. Withdrawals unlock once it’s approved.'
                          : kyc.kycStatus === 'declined'
                            ? (kyc.declineReason || 'Verification was declined. You can try again with a clear ID photo.')
                            : 'Complete a one-time identity check before you can withdraw.'
                        : 'Identity verification is not currently required for withdrawals.'}
                  </p>
                  {(kyc.canStart || kyc.kycStatus === 'declined' || (kyc.required && (kyc.kycStatus === 'not_started' || !kyc.kycStatus))) && (
                    <div className="dragonfury-profile-verification-actions">
                      <button
                        type="button"
                        onClick={handleStartKyc}
                        disabled={kycStarting}
                        className="dragonfury-profile-btn dragonfury-profile-btn--primary"
                      >
                        {kycStarting
                          ? 'Starting…'
                          : kyc.kycStatus === 'declined'
                            ? 'Retry verification'
                            : 'Verify identity'}
                      </button>
                    </div>
                  )}
                  {(kyc.kycStatus === 'pending' || kyc.kycStatus === 'in_review') && (
                    <div className="dragonfury-profile-verification-actions">
                      <button
                        type="button"
                        className="dragonfury-profile-btn dragonfury-profile-btn--ghost"
                        onClick={() => {
                          kycApi.getKycStatus({ refresh: '1' }).then(setKyc).catch(() => {});
                        }}
                      >
                        Refresh status
                      </button>
                    </div>
                  )}
                </article>
              )}
            </div>
          </section>
        )}

        {/* Profile details */}
        {tab === 'profile' && (
        <>
        <section className="dragonfury-profile-form">
          <header className="acct-sec-head">
            <div className="acct-sec-title">
              <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden="true"><ellipse cx="12" cy="6" rx="6" ry="6" /><path d="M2.650 17.750C3.570 15.030 6.270 13.500 9.140 13.500h5.720c2.870 0 5.570 1.530 6.490 4.250.520 1.550.990 3.380 1.110 5.250.040.550-.410 1-.960 1H2.500c-.550 0-1-.450-.960-1 .120-1.870.590-3.700 1.110-5.250z" /></svg>
              <h2>Profile</h2>
            </div>
            <span className={`acct-badge ${profileComplete ? 'is-ok' : ''}`}>
              <span className="acct-badge-ic" aria-hidden="true">{profileComplete ? '✓' : 'i'}</span>
              {profileComplete ? 'Complete' : 'Incomplete'}
            </span>
          </header>
          <p className="acct-sec-copy">
            Your Identity Verification is necessary in order to provide you with all services and functions of the platform.
          </p>
          <p className="acct-gold-note">Please ensure the following information is correct and matches your official ID document.</p>

          {!isVerified && (
            <div className="dragonfury-profile-notice">
              <LockIcon className="dragonfury-profile-notice-icon" />
              <span>Email verification is needed for profile update. Verify your email in the Verification tab to enable the Update Profile button.</span>
            </div>
          )}

        <Formik
          initialValues={initialProfileValues(user)}
          validationSchema={PROFILE_VALIDATION}
          enableReinitialize
          onSubmit={async (values) => {
            const payload = {
              firstName: values.firstName.trim(),
              lastName: values.lastName.trim(),
              phone: values.phone.trim(),
              dateOfBirth: values.dateOfBirth.trim()
                ? clampToValidCalendarDate(values.dateOfBirth.trim()) || values.dateOfBirth.trim()
                : '',
              streetAddress: values.streetAddress.trim(),
              city: values.city.trim(),
              state: values.state.trim(),
              country: values.country.trim(),
              zipCode: values.zipCode.trim()
            };
            const initial = initialProfileValues(user);
            const profileKeys = ['firstName', 'lastName', 'phone', 'dateOfBirth', 'streetAddress', 'city', 'state', 'country', 'zipCode'];
            const hasNoChange = profileKeys.every((k) => String(payload[k] || '') === String(initial[k] || ''));
            if (hasNoChange) return;
            try {
              const res = await userApi.updateProfile(payload);
              await refreshUser();
              if (returnToDeposit && isPurchaseProfileComplete({ ...user, ...payload, isPhoneVerified: user?.isPhoneVerified })) {
                toast.success('Profile updated. You can now complete your deposit.');
                navigate('/deposit', { replace: true });
              } else if (returnToDeposit) {
                toast.success('Profile updated. Verify your phone number to continue depositing.');
              } else if (res?.firstTimeProfileComplete) {
                toast.success('First step complete for depositing money. Complete all steps and you can deposit.');
                try {
                  window.dispatchEvent(new CustomEvent('notifications:refresh'));
                } catch (_) {}
              } else {
                toast.success('Profile updated.');
              }
            } catch (err) {
              toast.error(err.message || 'Failed to update profile.');
            }
          }}
        >
          {({ errors, touched, isSubmitting, dirty, values, setFieldValue, setFieldTouched }) => {
            const phoneParts = parseE164(values.phone);
            const phoneReady = isCompleteNational(phoneParts.countryIso, phoneParts.national);
            const phoneLocked = phoneAlreadyVerified || otpOpen;

            const handleSendPhoneOtp = async () => {
              if (sendingOtp || phoneAlreadyVerified || !storeRequiresPhoneOtp) return;
              if (!phoneReady) {
                toast.error('Enter a valid 10-digit Phone number.');
                setFieldTouched('phone', true);
                return;
              }
              setSendingOtp(true);
              try {
                const res = await phoneApi.sendPhoneOtp(String(values.phone || '').trim());
                if (res?.skipped || res?.required === false) {
                  await refreshUser();
                  return;
                }
                if (res?.phone) setFieldValue('phone', res.phone);
                setOtpOpen(true);
                setOtpCode('');
                toast.success('Verification code sent.');
              } catch (err) {
                if (err?.code === 'PHONE_NOT_REQUIRED' || err?.body?.code === 'PHONE_NOT_REQUIRED') {
                  await refreshUser();
                  return;
                }
                toast.error(phoneOtpErrorMessage(err));
              } finally {
                setSendingOtp(false);
              }
            };

            const handleConfirmPhoneOtp = async () => {
              if (verifyingOtp || phoneAlreadyVerified || !storeRequiresPhoneOtp) return;
              setVerifyingOtp(true);
              try {
                const res = await phoneApi.checkPhoneOtp(String(values.phone || '').trim(), otpCode.trim());
                if (res?.skipped || res?.required === false) {
                  setOtpOpen(false);
                  setOtpCode('');
                  await refreshUser();
                  return;
                }
                if (!res?.verified && !res?.phoneVerificationToken) {
                  toast.error('Verification failed. Please try again.');
                  return;
                }
                if (res.phone) setFieldValue('phone', res.phone);
                setOtpOpen(false);
                setOtpCode('');
                await refreshUser();
                toast.success(
                  returnToDeposit
                    ? 'Phone verified. Returning to deposit…'
                    : 'Phone verified.'
                );
                if (returnToDeposit) {
                  navigate('/deposit', { replace: true });
                }
              } catch (err) {
                if (err?.code === 'PHONE_NOT_REQUIRED' || err?.body?.code === 'PHONE_NOT_REQUIRED') {
                  setOtpOpen(false);
                  setOtpCode('');
                  await refreshUser();
                  return;
                }
                toast.error(err.message || 'Could not verify code.');
              } finally {
                setVerifyingOtp(false);
              }
            };

            return (
            <Form className="dragonfury-profile-form-body">
              <div className="dragonfury-profile-fields">
                <label className="dragonfury-profile-field dragonfury-profile-field--locked">
                  <span>User ID</span>
                  <span className="df-profile-locked-input">
                    <input
                      type="text"
                      readOnly
                      value={user?.userId != null ? String(user.userId) : ''}
                      className={inputClassReadonly}
                    />
                    <span className="df-profile-lock" title="User ID cannot be changed">
                      <LockIcon />
                    </span>
                  </span>
                  <small className="df-profile-field-hint">Use this ID when contacting support.</small>
                </label>
                <label className="dragonfury-profile-field dragonfury-profile-field--locked">
                  <span>Username</span>
                  <span className="df-profile-locked-input">
                    <input
                      type="text"
                      readOnly
                      value={user?.username ?? ''}
                      className={inputClassReadonly}
                    />
                    <span className="df-profile-lock" title="Username cannot be changed">
                      <LockIcon />
                    </span>
                  </span>
                  <small className="df-profile-field-hint">Username cannot be changed.</small>
                </label>
                <label className="dragonfury-profile-field dragonfury-profile-field--locked dragonfury-profile-field--wide">
                  <span>Email</span>
                  <span className="df-profile-locked-input">
                    <input
                      type="email"
                      readOnly
                      value={user?.email ?? ''}
                      className={inputClassReadonly}
                    />
                    <span className="df-profile-lock" title="Email cannot be changed">
                      <LockIcon />
                    </span>
                  </span>
                  <small className="df-profile-field-hint">Email cannot be changed for security reasons.</small>
                </label>

                <label className="dragonfury-profile-field">
                  <span>First name</span>
                  <Field
                    name="firstName"
                    type="text"
                    placeholder="Letters only (e.g. John)"
                    maxLength={100}
                    disabled={!isVerified}
                    className={fieldClass(touched.firstName, errors.firstName)}
                    autoComplete="given-name"
                  />
                  {touched.firstName && errors.firstName && <small className="df-profile-field-error">{errors.firstName}</small>}
                </label>
                <label className="dragonfury-profile-field">
                  <span>Last name</span>
                  <Field
                    name="lastName"
                    type="text"
                    placeholder="Letters only (e.g. Doe)"
                    maxLength={100}
                    disabled={!isVerified}
                    className={fieldClass(touched.lastName, errors.lastName)}
                    autoComplete="family-name"
                  />
                  {touched.lastName && errors.lastName && <small className="df-profile-field-error">{errors.lastName}</small>}
                </label>

                <div className="dragonfury-profile-field" id="verify-phone">
                  <span className="df-profile-field-label">Phone number *</span>
                  <div className="dash-phone-verify-row df-profile-phone-row">
                    <PhoneNumberField
                      id="settings-phone"
                      name="phone"
                      variant="gate"
                      value={values.phone ?? ''}
                      onChange={(e164) => {
                        if (phoneLocked) return;
                        setFieldValue('phone', e164);
                        if (otpOpen) {
                          setOtpOpen(false);
                          setOtpCode('');
                        }
                      }}
                      onBlur={() => setFieldTouched('phone', true)}
                      readOnly={phoneLocked}
                      disabled={!isVerified || sendingOtp || verifyingOtp}
                      inputClassName={
                        touched.phone && errors.phone
                          ? 'err'
                          : phoneAlreadyVerified
                            ? 'ok'
                            : ''
                      }
                    />
                    <div className="dash-phone-verify-side">
                      {phoneAlreadyVerified ? (
                        <span className="dragonfury-profile-badge dragonfury-profile-badge--ok" aria-label="Phone verified">
                          Verified
                        </span>
                      ) : storeRequiresPhoneOtp ? (
                        otpOpen ? (
                          <button
                            type="button"
                            className="dragonfury-profile-btn dragonfury-profile-btn--ghost df-profile-phone-btn"
                            onClick={() => {
                              setOtpOpen(false);
                              setOtpCode('');
                            }}
                            disabled={sendingOtp || verifyingOtp}
                          >
                            Edit
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="dragonfury-profile-btn dragonfury-profile-btn--primary df-profile-phone-btn"
                            onClick={handleSendPhoneOtp}
                            disabled={!isVerified || sendingOtp || !phoneReady}
                          >
                            {sendingOtp ? 'Sending…' : 'Verify'}
                          </button>
                        )
                      ) : null}
                    </div>
                  </div>
                  {otpOpen && storeRequiresPhoneOtp && !phoneAlreadyVerified ? (
                    <div className="dash-phone-otp-row df-profile-otp-row">
                      <input
                        className={inputClass}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="Enter code"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        disabled={verifyingOtp || sendingOtp}
                      />
                      <button
                        type="button"
                        className="dragonfury-profile-btn dragonfury-profile-btn--primary df-profile-phone-btn"
                        disabled={verifyingOtp || sendingOtp || otpCode.length < 4}
                        onClick={handleConfirmPhoneOtp}
                      >
                        {verifyingOtp ? 'Checking…' : 'Confirm'}
                      </button>
                      <button
                        type="button"
                        className="dragonfury-profile-btn dragonfury-profile-btn--ghost df-profile-phone-btn"
                        disabled={verifyingOtp || sendingOtp}
                        onClick={handleSendPhoneOtp}
                      >
                        {sendingOtp ? 'Sending…' : 'Resend'}
                      </button>
                    </div>
                  ) : null}
                  {phoneAlreadyVerified ? (
                    <small className="df-profile-field-hint">
                      Verified phone numbers can’t be changed for security. Contact support if you need an update.
                    </small>
                  ) : (
                    <small className="df-profile-field-hint">
                      Verify your phone to unlock purchases. You’ll receive a one-time code by SMS.
                    </small>
                  )}
                  {touched.phone && errors.phone && <small className="df-profile-field-error">{errors.phone}</small>}
                </div>

                <label className="dragonfury-profile-field">
                  <span>Date of birth</span>
                  <Field name="dateOfBirth">
                    {({ field, form }) => {
                      const maxDate = new Date().toISOString().slice(0, 10);
                      const handleChange = (e) => {
                        const corrected = clampToValidCalendarDate(e.target.value);
                        form.setFieldValue('dateOfBirth', corrected);
                      };
                      const handleBlur = (e) => {
                        const corrected = clampToValidCalendarDate(e.target.value);
                        if (corrected !== e.target.value) form.setFieldValue('dateOfBirth', corrected);
                        field.onBlur(e);
                      };
                      const handleKeyDown = (e) => {
                        const val = clampToValidCalendarDate(field.value || '') || field.value || '';
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          form.setFieldValue('dateOfBirth', val ? addDaysToDate(val, 1, maxDate) : maxDate);
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          form.setFieldValue('dateOfBirth', val ? addDaysToDate(val, -1, maxDate) : DATE_MIN);
                        }
                      };
                      const displayValue = clampToValidCalendarDate(field.value || '') || field.value || '';
                      return (
                        <input
                          type="date"
                          {...field}
                          value={displayValue}
                          min="1900-01-01"
                          max={maxDate}
                          disabled={!isVerified}
                          className={fieldClass(touched.dateOfBirth, errors.dateOfBirth)}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          onKeyDown={handleKeyDown}
                        />
                      );
                    }}
                  </Field>
                  <small className="df-profile-field-hint">Year must be between 1900 and {new Date().getFullYear()}.</small>
                  {touched.dateOfBirth && errors.dateOfBirth && <small className="df-profile-field-error">{errors.dateOfBirth}</small>}
                </label>
              </div>

              <details className="dragonfury-profile-address" open>
                <summary>Address</summary>
                <div className="dragonfury-profile-fields">
                  <label className="dragonfury-profile-field dragonfury-profile-field--wide">
                    <span>Street address</span>
                    <Field
                      name="streetAddress"
                      type="text"
                      placeholder="Enter street address"
                      maxLength={255}
                      disabled={!isVerified}
                      className={fieldClass(touched.streetAddress, errors.streetAddress)}
                    />
                    {touched.streetAddress && errors.streetAddress && (
                      <small className="df-profile-field-error">{errors.streetAddress}</small>
                    )}
                  </label>
                  <label className="dragonfury-profile-field">
                    <span>City</span>
                    <Field
                      name="city"
                      type="text"
                      placeholder="Enter city"
                      maxLength={100}
                      disabled={!isVerified}
                      className={fieldClass(touched.city, errors.city)}
                    />
                    {touched.city && errors.city && <small className="df-profile-field-error">{errors.city}</small>}
                  </label>
                  <label className="dragonfury-profile-field">
                    <span>State</span>
                    <Field
                      name="state"
                      type="text"
                      placeholder="Enter state"
                      maxLength={100}
                      disabled={!isVerified}
                      className={fieldClass(touched.state, errors.state)}
                    />
                    {touched.state && errors.state && <small className="df-profile-field-error">{errors.state}</small>}
                  </label>
                  <label className="dragonfury-profile-field">
                    <span>Zip code</span>
                    <Field
                      name="zipCode"
                      type="text"
                      placeholder="Enter zip code"
                      maxLength={20}
                      disabled={!isVerified}
                      className={fieldClass(touched.zipCode, errors.zipCode)}
                    />
                    {touched.zipCode && errors.zipCode && <small className="df-profile-field-error">{errors.zipCode}</small>}
                  </label>
                  <label className="dragonfury-profile-field">
                    <span>Country</span>
                    <Field
                      name="country"
                      type="text"
                      placeholder="Enter country"
                      maxLength={100}
                      disabled={!isVerified}
                      className={fieldClass(touched.country, errors.country)}
                    />
                    {touched.country && errors.country && <small className="df-profile-field-error">{errors.country}</small>}
                  </label>
                </div>
              </details>

              <button
                type="submit"
                disabled={!isVerified || isSubmitting || !dirty}
                className="dragonfury-profile-save"
                title={
                  !isVerified
                    ? 'Verify your email to update profile'
                    : !dirty
                      ? 'Change a field to update profile'
                      : undefined
                }
              >
                {isSubmitting ? 'Saving…' : 'Update Profile'}
              </button>
            </Form>
            );
          }}
        </Formik>
        </section>

        <section className="acct-email" id="email">
          <div className="acct-divider" />
          <header className="acct-sec-head">
            <div className="acct-sec-title">
              <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path fill="currentColor" d="M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h16q.825 0 1.413.588T22 6v12q0 .825-.587 1.413T20 20zm8-7l8-5V6l-8 5l-8-5v2z" /></svg>
              <h2>Email</h2>
            </div>
            <span className={`acct-badge ${isVerified ? 'is-ok' : ''}`}>
              <span className="acct-badge-ic" aria-hidden="true">{isVerified ? '✓' : 'i'}</span>
              {isVerified ? 'Verified' : 'Not verified'}
            </span>
          </header>
          <p className="acct-email-box">{user?.email}</p>
        </section>

        <section className="dragonfury-profile-form df-profile-payment">
          <header className="dragonfury-profile-section-head">
            <p className="dragonfury-profile-kicker">Payments</p>
            <h2>Payment Account</h2>
            <p className="dragonfury-profile-section-desc">
              Your payment account is used for deposits and redeems.
            </p>
          </header>

          <PaymentAccountSection
            user={user}
            refreshUser={refreshUser}
            toast={toast}
            returnTo={returnTo}
          />
        </section>
        </>
        )}

        {/* Password – change + reset */}
        {tab === 'security' && (
        <>
        <section className="dragonfury-profile-form dragonfury-profile-password">
          <header className="dragonfury-profile-section-head">
            <p className="dragonfury-profile-kicker">Account Access</p>
            <h2>Update Password</h2>
            <p className="dragonfury-profile-section-desc">Change your password or send a reset link to your email.</p>
          </header>

          <Formik
            initialValues={{ currentPassword: '', newPassword: '', confirmPassword: '' }}
            validationSchema={CHANGE_PASSWORD_VALIDATION}
            onSubmit={async (values, { resetForm }) => {
              try {
                await userApi.changePassword(values.currentPassword, values.newPassword);
                toast.success('Password updated successfully.');
                resetForm();
              } catch (err) {
                toast.error(err.message || 'Failed to change password.');
              }
            }}
          >
            {({ errors, touched, isSubmitting }) => (
              <Form className="dragonfury-profile-form-body">
                <div className="dragonfury-profile-fields">
                  <label className="dragonfury-profile-field">
                    <span>Current password</span>
                    <ProfilePasswordField
                      name="currentPassword"
                      placeholder="Enter current password"
                      autoComplete="current-password"
                      className={fieldClass(touched.currentPassword, errors.currentPassword)}
                    />
                    {touched.currentPassword && errors.currentPassword && (
                      <small className="df-profile-field-error">{errors.currentPassword}</small>
                    )}
                  </label>
                  <label className="dragonfury-profile-field">
                    <span>New password</span>
                    <ProfilePasswordField
                      name="newPassword"
                      placeholder="Min 8: upper, lower, number, special"
                      autoComplete="new-password"
                      className={fieldClass(touched.newPassword, errors.newPassword)}
                    />
                    {touched.newPassword && errors.newPassword && (
                      <small className="df-profile-field-error">{errors.newPassword}</small>
                    )}
                  </label>
                  <label className="dragonfury-profile-field">
                    <span>Confirm new password</span>
                    <ProfilePasswordField
                      name="confirmPassword"
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                      className={fieldClass(touched.confirmPassword, errors.confirmPassword)}
                    />
                    {touched.confirmPassword && errors.confirmPassword && (
                      <small className="df-profile-field-error">{errors.confirmPassword}</small>
                    )}
                  </label>
                </div>
                <button type="submit" disabled={isSubmitting} className="dragonfury-profile-save">
                  {isSubmitting ? 'Updating…' : 'Change Password'}
                </button>
              </Form>
            )}
          </Formik>

          <div className="dragonfury-profile-subcard">
            <h3 className="dragonfury-profile-subcard-title">
              <EnvelopeIcon className="dragonfury-profile-btn-icon" />
              Forgot password?
            </h3>
            <p className="dragonfury-profile-subcard-desc">Send a password reset link to your email address.</p>
            <button
              type="button"
              onClick={handleSendResetEmail}
              disabled={resetEmailSending}
              className="dragonfury-profile-btn dragonfury-profile-btn--ghost"
            >
              {resetEmailSending ? 'Sending…' : 'Send Reset Email'}
            </button>
          </div>
        </section>

        <section className="acct-block acct-block--div">
          <header className="acct-sec-head">
            <div className="acct-sec-title">
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.540.540l3-3a5 5 0 0 0-7.070-7.070l-1.720 1.710" /><path d="M14 11a5 5 0 0 0-7.540-.540l-3 3a5 5 0 0 0 7.070 7.070l1.710-1.710" /></svg>
              <h2>Connected accounts</h2>
            </div>
          </header>
          <p className="acct-sec-copy">Sign-in providers linked to this account.</p>
          <ul className="acct-providers">
            {[['Google', googleLinked], ['Facebook', false], ['Apple', false]].map(([name, on]) => (
              <li key={name}>
                <span>{name}</span>
                <span className={`acct-pill${on ? ' is-on' : ''}`}>{on ? 'Connected' : 'Not connected'}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="acct-block acct-block--div">
          <header className="acct-sec-head">
            <div className="acct-sec-title">
              <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden="true"><path d="M17 9V7A5 5 0 0 0 7 7v2H5v13h14V9zm-8-2a3 3 0 0 1 6 0v2H9zm4 11h-2v-4h2z" /></svg>
              <h2>Delete Account</h2>
            </div>
          </header>
          <p className="acct-sec-copy acct-sec-copy--w">If desired, you can delete your account here.</p>
          <button type="button" className="acct-danger-btn" onClick={() => requestSupport('Account deletion')}>Delete account</button>
        </section>
        </>
        )}

        {tab === 'communication' && (
          <section className="acct-block">
            <header className="acct-sec-head">
              <div className="acct-sec-title">
                <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.600 16.800a3 3 0 1 1-5.800-1.600" /></svg>
                <h2>Marketing</h2>
              </div>
            </header>
            <p className="acct-sec-copy">Promotions and rewards news. Account and security messages are always sent.</p>
            <ul className="acct-toggles">
              {[['Email', 'Offers, bonuses and new game announcements by email.'], ['SMS', 'Time-limited offers and reminders by text message.']].map(([name, desc]) => (
                <li key={name}>
                  <div>
                    <p className="acct-toggle-name">{name}</p>
                    <p className="acct-toggle-desc">{desc}</p>
                  </div>
                  <button type="button" role="switch" aria-checked="false" aria-label={`${name} marketing`} className="acct-switch" onClick={() => requestSupport('Marketing preferences')}><span /></button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {tab === 'responsible-gaming' && (
          <section className="acct-block">
            <header className="acct-sec-head">
              <div className="acct-sec-title">
                <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19.400 14.400C21 12.800 22 11.500 22 9.500a5.500 5.500 0 0 0-9.590-3.680.600.600 0 0 1-.820 0A5.500 5.500 0 0 0 2 9.500c0 2.300 1.500 4 3 5.500l5.540 5.360a2 2 0 0 0 2.880.050 2.120 2.120 0 0 0 0-3 2.120 2.120 0 1 0 3-3 2.120 2.120 0 0 0 3 0 2 2 0 0 0 0-2.830l-1.880-1.880a2.410 2.410 0 0 0-3.400 0l-1.710 1.710a2 2 0 0 1-2.830 0 2 2 0 0 1 0-2.830l2.820-2.760" /></svg>
                <h2>Responsible gameplay</h2>
              </div>
            </header>
            <p className="acct-sec-copy">Cap what you can spend, or take a break from playing.</p>
            <div className="acct-limits">
              {[['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']].map(([key, label]) => (
                <div key={key} className="acct-limit">
                  <h3>{label}</h3>
                  <p className="acct-limit-state">No limit set.</p>
                  <div className="acct-limit-form">
                    <label>
                      <span>Amount (USD)<b>*</b></span>
                      <input
                        inputMode="decimal"
                        value={limitAmounts[key]}
                        onChange={(e) => setLimitAmounts((v) => ({ ...v, [key]: e.target.value.replace(/[^0-9.]/g, '') }))}
                      />
                    </label>
                    <button
                      type="button"
                      className="acct-gold-btn"
                      disabled={!limitAmounts[key]}
                      onClick={() => requestSupport(`A ${label.toLowerCase()} limit of $${limitAmounts[key]}`)}
                    >
                      Set limit
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="acct-seg" role="tablist">
              {[['cooloff', 'Cool-off'], ['exclusion', 'Self-exclusion']].map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={breakMode === id} className={breakMode === id ? 'is-on' : ''} onClick={() => { setBreakMode(id); setBreakLength(id === 'cooloff' ? '1 day' : '6 months'); }}>{label}</button>
              ))}
            </div>
            <div className="acct-chips">
              {(breakMode === 'cooloff' ? ['1 day', '3 days', '1 week', '2 weeks', '1 month'] : ['6 months', '1 year', '5 years', 'Permanent']).map((len) => (
                <button key={len} type="button" className={`acct-chip${breakLength === len ? ' is-on' : ''}`} onClick={() => setBreakLength(len)}>{len}</button>
              ))}
            </div>
            <button type="button" className="acct-outline-danger" onClick={() => requestSupport(breakMode === 'cooloff' ? `A ${breakLength} break` : `Self-exclusion (${breakLength})`)}>
              {breakMode === 'cooloff' ? 'Start break' : 'Start self-exclusion'}
            </button>
          </section>
        )}
      </section>
        </div>
      </div>

      <KycVerificationModal
        open={kycModalOpen}
        url={kycModalUrl}
        onClose={handleKycModalClose}
      />
    </div>
  );
}
