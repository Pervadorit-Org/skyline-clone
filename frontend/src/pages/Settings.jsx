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
    .test('us-phone', 'Enter a valid 10-digit US phone number.', (v) => !v || /^\+1\d{10}$/.test(v)),
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

/** Preset profile pictures (DiceBear, same host as the default avatar). */
const AVATAR_PRESETS = ['dylan', 'adventurer', 'big-ears', 'fun-emoji', 'lorelei', 'micah', 'notionists', 'bottts', 'thumbs'].map(
  (style) => `https://api.dicebear.com/9.x/${style}/png?seed=GoldenDragon`
);

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

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'District of Columbia',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine',
  'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia',
  'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

const isoToDisplayDob = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${m[2]}/${m[3]}/${m[1]}` : '';
};
const displayToIsoDob = (text) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text || '');
  return m ? `${m[3]}-${m[1]}-${m[2]}` : '';
};

/** Date of birth typed as MM/DD/YYYY (stored as YYYY-MM-DD), with a calendar button. */
function DobInput({ value, onChange, onBlur, readOnly, className, maxDate }) {
  const [text, setText] = useState(isoToDisplayDob(value));
  const pickerRef = useRef(null);
  useEffect(() => {
    if (displayToIsoDob(text) !== (value || '')) setText(isoToDisplayDob(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const handleChange = (e) => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 8);
    const t = d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    setText(t);
    onChange(displayToIsoDob(t));
  };
  return (
    <span className="acct-dob">
      <input
        type="text"
        inputMode="numeric"
        autoComplete="bday"
        placeholder="MM/DD/YYYY"
        maxLength={10}
        value={text}
        readOnly={readOnly}
        className={className}
        onChange={handleChange}
        onBlur={onBlur}
      />
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        className="acct-dob-native"
        min="1900-01-01"
        max={maxDate}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        className="acct-dob-btn"
        aria-label="Open calendar"
        disabled={readOnly}
        onClick={() => pickerRef.current?.showPicker?.()}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 2v4M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" />
        </svg>
      </button>
    </span>
  );
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
  // Communication (Email/SMS marketing) tab disabled: no table/columns for it in the final DB.
  // { id: 'communication', label: 'Communication', icon: tabIcon(<><path d="M10.270 21a2 2 0 0 0 3.460 0" /><path d="M6 8a6 6 0 0 1 12 0c0 4.500 1.400 6 2.740 7.330A1 1 0 0 1 20 17H4a1 1 0 0 1-.740-1.670C4.590 14 6 12.500 6 8" /></>) },
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
  const [profileEditing, setProfileEditing] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [otpWait, setOtpWait] = useState(0);
  const [prefSaving, setPrefSaving] = useState('');
  const [tabMenuOpen, setTabMenuOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarPick, setAvatarPick] = useState('');
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [limitAmounts, setLimitAmounts] = useState({ daily: '', weekly: '', monthly: '' });
  const [breakMode, setBreakMode] = useState('cooloff');
  const [breakLength, setBreakLength] = useState('1 day');
  const [tab, setTab] = useState(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
    if (['verification', 'security', 'responsible-gaming', 'profile'].includes(hash)) return hash;
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
    if (otpWait <= 0) return undefined;
    const t = setTimeout(() => setOtpWait((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [otpWait]);

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

  // Marketing preferences disabled (no table/columns in the final DB).
  // const handleToggleMarketing = async (key, next) => {
  //   if (prefSaving) return;
  //   setPrefSaving(key);
  //   try {
  //     await userApi.updateMarketingPrefs({ [key]: next });
  //     await refreshUser();
  //     toast.success('Your preferences have been saved.');
  //   } catch (err) {
  //     toast.error(err?.message || 'Could not save your preferences.');
  //   } finally {
  //     setPrefSaving('');
  //   }
  // };

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
  // Admin turned KYC off for this store → hide every "Government ID" prompt.
  const kycNotRequired = kyc?.required === false;
  const googleLinked = Boolean(user?.googleId || user?.authProvider === 'google' || user?.provider === 'google');

  return (
    <div className="dash-page dash-settings-page dragonfury-profile-page acct-page w-full min-w-0 max-w-full">
      <h1 className="acct-title">My Account</h1>
      <div className="acct-layout">
        <div className="acct-mselect">
          {(() => {
            const cur = ACCOUNT_TABS.find((t) => t.id === tab) || ACCOUNT_TABS[0];
            return (
              <button type="button" className="acct-mselect-btn" aria-haspopup="listbox" aria-expanded={tabMenuOpen}
                onClick={() => setTabMenuOpen((o) => !o)}>
                <span className="acct-mselect-cur">{cur.icon}<b>{cur.label}</b></span>
                <svg className={`acct-mselect-chev${tabMenuOpen ? ' is-open' : ''}`} viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
              </button>
            );
          })()}
          {tabMenuOpen && (
            <ul className="acct-mselect-list" role="listbox">
              {ACCOUNT_TABS.map((t) => (
                <li key={t.id} role="option" aria-selected={tab === t.id}>
                  <button type="button" className={tab === t.id ? 'is-active' : ''} onClick={() => { setTab(t.id); setTabMenuOpen(false); }}>
                    {t.icon}<span>{t.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
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
          <div className="dragonfury-profile-avatar-wrap" role="button" tabIndex={0} aria-label="Edit profile picture"
            onClick={() => { setAvatarPick(user?.profileImageUrl || ''); setAvatarOpen(true); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAvatarPick(user?.profileImageUrl || ''); setAvatarOpen(true); } }}>
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

        {avatarOpen && (
          <div className="avatar-modal-back" onClick={() => !avatarSaving && setAvatarOpen(false)}>
            <div className="avatar-modal" role="dialog" aria-modal="true" aria-label="Edit profile" onClick={(e) => e.stopPropagation()}>
              <h2>Edit profile</h2>
              <button type="button" className="avatar-modal-close" aria-label="Close" onClick={() => setAvatarOpen(false)}>×</button>
              <div className="avatar-grid">
                {AVATAR_PRESETS.map((url) => (
                  <button type="button" key={url} className={`avatar-opt${avatarPick === url ? ' is-selected' : ''}`}
                    onClick={() => setAvatarPick(url)} aria-pressed={avatarPick === url}>
                    <img src={url} alt="" />
                  </button>
                ))}
              </div>
              <button type="button" className="avatar-save" disabled={!avatarPick || avatarSaving}
                onClick={async () => {
                  setAvatarSaving(true);
                  try {
                    await userApi.updateProfile({ profileImageUrl: avatarPick });
                    await refreshUser();
                    setAvatarFailed(false);
                    setAvatarOpen(false);
                    toast.success('Profile picture updated.');
                  } catch (err) {
                    toast.error(err?.response?.data?.message || err?.message || 'Could not update picture.');
                  } finally {
                    setAvatarSaving(false);
                  }
                }}>
                {avatarSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {tab === 'verification' && (
          <section className="acct-block">
            <header className="acct-sec-head">
              <div className="acct-sec-title">
                <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 8c0-2.800-2.200-5-5-5S7 5.200 7 8l-2 .5h14zM3 9h18" /><circle cx="7" cy="16" r="3" /><circle cx="17" cy="16" r="3" /><path d="M10 16h4" /></svg>
                <h2>Identity</h2>
              </div>
              {kycNotRequired ? null : (
                <span className={`acct-badge ${kycApproved ? 'is-ok' : ''}`}>
                  <span className="acct-badge-ic" aria-hidden="true">{kycApproved ? '✓' : 'i'}</span>
                  {kycApproved ? 'Verified' : 'Not verified'}
                </span>
              )}
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
              <>
                <ul className="acct-steps" aria-label="Verification steps">
                  <li>{isVerified ? <span className="acct-ok" aria-hidden="true">✓</span> : <span className="acct-warn" aria-hidden="true">!</span>}Email {isVerified ? 'verified' : 'not verified yet'}</li>
                  <li><span className="acct-ok" aria-hidden="true">✓</span>Phone verified</li>
                  <li><span className="acct-ok" aria-hidden="true">✓</span>Profile details complete</li>
                  {kycNotRequired ? null : (
                    <li>
                      {kycApproved
                        ? <span className="acct-ok" aria-hidden="true">✓</span>
                        : <span className="acct-warn" aria-hidden="true">!</span>}
                      Government ID {kycApproved ? 'verified' : 'not verified yet'}
                    </li>
                  )}
                </ul>
                <p className="acct-lead">
                  {kycApproved
                    ? 'Your identity is verified. You are all set for redemptions.'
                    : ['in_review', 'pending'].includes(kyc?.kycStatus)
                      ? 'Your documents are being reviewed. This page updates once approved.'
                      : kyc?.kycStatus === 'declined'
                        ? (kyc?.declineReason || 'Your last verification was declined. Please try again.')
                        : kyc && kyc.required === false
                          ? 'Identity verification is not required for your account.'
                          : 'Your profile details are complete. Verify your ID to unlock redemptions.'}
                </p>
                {!kycApproved && kyc?.canStart ? (
                  <button type="button" className="acct-gold-btn" onClick={handleStartKyc} disabled={kycStarting}>
                    {kycStarting ? 'Starting…' : kyc?.kycStatus === 'declined' ? 'Try again' : 'Verify identity'}
                  </button>
                ) : null}
              </>
            )}
          </section>
        )}
        {/* Profile details */}
        {tab === 'profile' && (
        <>
        <Formik
          initialValues={initialProfileValues(user)}
          validationSchema={PROFILE_VALIDATION}
          enableReinitialize
          onSubmit={async (values) => {
            const payload = {
              firstName: values.firstName.trim(),
              lastName: values.lastName.trim(),
              dateOfBirth: values.dateOfBirth.trim()
                ? clampToValidCalendarDate(values.dateOfBirth.trim()) || values.dateOfBirth.trim()
                : '',
              streetAddress: values.streetAddress.trim(),
              city: values.city.trim(),
              state: values.state.trim(),
              country: values.country.trim() || (values.state.trim() ? 'United States' : ''),
              zipCode: values.zipCode.trim()
            };
            // Phone is saved by the OTP flow when the store verifies phones; otherwise it is saved with the profile.
            const savePhoneWithProfile = !storeRequiresPhoneOtp && !phoneAlreadyVerified && values.phone.trim() !== '';
            if (savePhoneWithProfile) payload.phone = values.phone.trim();
            const initial = initialProfileValues(user);
            const profileKeys = [...(savePhoneWithProfile ? ['phone'] : []), 'firstName', 'lastName', 'dateOfBirth', 'streetAddress', 'city', 'state', 'country', 'zipCode'];
            const hasNoChange = profileKeys.every((k) => String(payload[k] || '') === String(initial[k] || ''));
            if (hasNoChange) {
              setProfileEditing(false);
              return;
            }
            try {
              const res = await userApi.updateProfile(payload);
              await refreshUser();
              setProfileEditing(false);
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
          {({ errors, touched, isSubmitting, dirty, values, setFieldValue, setFieldTouched, resetForm }) => {
            const phoneParts = parseE164(values.phone);
            const phoneReady = isCompleteNational(phoneParts.countryIso, phoneParts.national);
            const phoneLocked = phoneAlreadyVerified || otpOpen;

            const handleSendPhoneOtp = async () => {
              if (sendingOtp || phoneAlreadyVerified) return;
              if (!storeRequiresPhoneOtp) {
                toast.info('Phone verification is turned off for this store.');
                return;
              }
              if (!isVerified) {
                toast.error('Verify your email address before verifying your phone.');
                return;
              }
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
                setOtpWait(60);
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

            <Form className="dragonfury-profile-form-body">
              <div className="dragonfury-profile-fields acct-fields">
                <label className="dragonfury-profile-field">
                  <span>First name</span>
                  <Field name="firstName" type="text" placeholder="Enter your first name" maxLength={100} readOnly={!profileEditing}
                    className={fieldClass(touched.firstName, errors.firstName)} autoComplete="given-name" />
                  {touched.firstName && errors.firstName && <small className="df-profile-field-error">{errors.firstName}</small>}
                </label>
                <label className="dragonfury-profile-field">
                  <span>Last name</span>
                  <Field name="lastName" type="text" placeholder="Enter your last name" maxLength={100} readOnly={!profileEditing}
                    className={fieldClass(touched.lastName, errors.lastName)} autoComplete="family-name" />
                  {touched.lastName && errors.lastName && <small className="df-profile-field-error">{errors.lastName}</small>}
                </label>
                <div className="dragonfury-profile-field">
                  <span className="df-profile-field-label">Date of birth</span>
                  <DobInput
                    value={values.dateOfBirth}
                    maxDate={new Date().toISOString().slice(0, 10)}
                    readOnly={!profileEditing}
                    className={fieldClass(touched.dateOfBirth, errors.dateOfBirth)}
                    onChange={(iso) => setFieldValue('dateOfBirth', iso)}
                    onBlur={() => setFieldTouched('dateOfBirth', true)}
                  />
                  {touched.dateOfBirth && errors.dateOfBirth && <small className="df-profile-field-error">{errors.dateOfBirth}</small>}
                </div>
                <label className="dragonfury-profile-field">
                  <span>Street address</span>
                  <Field name="streetAddress" type="text" placeholder="Enter your street" maxLength={255} readOnly={!profileEditing}
                    className={fieldClass(touched.streetAddress, errors.streetAddress)} autoComplete="street-address" />
                  {touched.streetAddress && errors.streetAddress && <small className="df-profile-field-error">{errors.streetAddress}</small>}
                </label>
                <label className="dragonfury-profile-field">
                  <span>City</span>
                  <Field name="city" type="text" placeholder="Enter your city" maxLength={100} readOnly={!profileEditing}
                    className={fieldClass(touched.city, errors.city)} autoComplete="address-level2" />
                  {touched.city && errors.city && <small className="df-profile-field-error">{errors.city}</small>}
                </label>
                <label className="dragonfury-profile-field">
                  <span>State</span>
                  <Field as="select" name="state" disabled={!profileEditing}
                    className={`${fieldClass(touched.state, errors.state)} acct-select`}>
                    <option value="">Select a state</option>
                    {values.state && !US_STATES.some((st) => st.toLowerCase() === String(values.state).toLowerCase()) ? (
                      <option value={values.state}>{values.state}</option>
                    ) : null}
                    {US_STATES.map((st) => <option key={st} value={st}>{st}</option>)}
                  </Field>
                  {touched.state && errors.state && <small className="df-profile-field-error">{errors.state}</small>}
                </label>
                <label className="dragonfury-profile-field">
                  <span>ZIP code</span>
                  <Field name="zipCode" type="text" placeholder="Enter your zip code" maxLength={20} readOnly={!profileEditing}
                    className={fieldClass(touched.zipCode, errors.zipCode)} autoComplete="postal-code" />
                  {touched.zipCode && errors.zipCode && <small className="df-profile-field-error">{errors.zipCode}</small>}
                </label>
              </div>

              <div className="acct-form-actions">
                {profileEditing ? (
                  <>
                    <button type="submit" disabled={isSubmitting || !dirty} className="dragonfury-profile-save">
                      {isSubmitting ? 'Saving…' : 'Save changes'}
                    </button>
                    <button type="button" className="acct-cancel-btn" disabled={isSubmitting}
                      onClick={() => { resetForm(); setProfileEditing(false); }}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <button type="button" className="dragonfury-profile-save" disabled={!isVerified}
                    title={!isVerified ? 'Verify your email to edit your profile' : undefined}
                    onClick={() => setProfileEditing(true)}>
                    Edit profile
                  </button>
                )}
              </div>
            </Form>
            </section>

            <div className="acct-divider-block">
              <div className="acct-divider" />
              <section className="acct-phone" id="phone">
                <header className="acct-sec-head">
                  <div className="acct-sec-title">
                    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" /></svg>
                    <h2>Phone</h2>
                  </div>
                  <span className={`acct-badge ${phoneAlreadyVerified ? 'is-ok' : ''}`}>
                    <span className="acct-badge-ic" aria-hidden="true">{phoneAlreadyVerified ? '✓' : 'i'}</span>
                    {phoneAlreadyVerified ? 'Verified' : 'Not Verified'}
                  </span>
                </header>
                <p className="acct-sec-copy">Verify your number to unlock weekly and monthly VIP bonuses.</p>
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
                      ) : (
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
                            disabled={sendingOtp}
                          >
                            {sendingOtp ? 'Sending…' : 'Send code'}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                  {otpOpen && storeRequiresPhoneOtp && !phoneAlreadyVerified ? (
                    <div className="avatar-modal-back otp-modal-back" onClick={() => !verifyingOtp && setOtpOpen(false)}>
                      <div className="avatar-modal otp-modal" role="dialog" aria-modal="true" aria-label="Check your phone" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="avatar-modal-close" aria-label="Close" onClick={() => { setOtpOpen(false); setOtpCode(''); }}>×</button>
                        <img className="otp-logo" src="/logo.webp" alt="" />
                        <h2 className="otp-title">Check your phone</h2>
                        <p className="otp-sub">Enter the verification code sent to<br /><strong>{String(values.phone || '').replace(/^\+1(\d)/, '+1 $1')}</strong></p>
                        <div className="otp-boxes" onPaste={(e) => { e.preventDefault(); setOtpCode(e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)); }}>
                          {Array.from({ length: 6 }).map((_, i) => (
                            <input
                              key={i}
                              className="otp-box"
                              type="text"
                              inputMode="numeric"
                              autoComplete={i === 0 ? 'one-time-code' : 'off'}
                              maxLength={1}
                              autoFocus={i === 0}
                              value={otpCode[i] || ''}
                              disabled={verifyingOtp}
                              onChange={(e) => {
                                const d = e.target.value.replace(/\D/g, '').slice(-1);
                                const arr = otpCode.padEnd(6, ' ').split('');
                                arr[i] = d || ' ';
                                setOtpCode(arr.join('').replace(/\s+$/, '').slice(0, 6));
                                if (d && e.target.nextElementSibling) e.target.nextElementSibling.focus();
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Backspace' && !otpCode[i] && e.currentTarget.previousElementSibling) e.currentTarget.previousElementSibling.focus();
                                if (e.key === 'Enter' && otpCode.length >= 4) handleConfirmPhoneOtp();
                              }}
                            />
                          ))}
                        </div>
                        <button type="button" className="otp-verify" disabled={verifyingOtp || otpCode.length < 4} onClick={handleConfirmPhoneOtp}>
                          {verifyingOtp ? 'Checking…' : 'Verify'}
                        </button>
                        <p className="otp-resend">
                          Didn't get a code?{' '}
                          {otpWait > 0 ? <span>Resend in {otpWait}s</span> : (
                            <button type="button" disabled={sendingOtp || verifyingOtp} onClick={handleSendPhoneOtp}>{sendingOtp ? 'Sending…' : 'Resend'}</button>
                          )}
                        </p>
                      </div>
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

              </section>
            </div>
            </>
            );
          }}
        </Formik>

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

        </>
        )}

        {/* Password – change + reset */}
        {tab === 'security' && (
        <>
        <section className="dragonfury-profile-form dragonfury-profile-password acct-password" id="password">
          <header className="acct-sec-head">
            <div className="acct-sec-title">
              <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path fill="currentColor" d="M6 22q-.825 0-1.412-.587T4 20V10q0-.825.588-1.412T6 8h1V6q0-2.075 1.463-3.537T12 1t3.538 1.463T17 6v2h1q.825 0 1.413.588T20 10v10q0 .825-.587 1.413T18 22zm6-5q.825 0 1.413-.587T14 15t-.587-1.412T12 13t-1.412.588T10 15t.588 1.413T12 17M9 8h6V6q0-1.25-.875-2.125T12 3t-2.125.875T9 6z" /></svg>
              <h2>Password</h2>
            </div>
          </header>
          <p className="acct-sec-copy acct-sec-copy--w">Changing your password signs out every other device.</p>
          {user?.hasPassword === false ? (
            <p className="acct-muted-note">You sign in with Google, so there&apos;s no password on this account.</p>
          ) : null}

          {user?.hasPassword !== false && (
          <>
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
          </>
          )}
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

        {/* Communication (Email/SMS marketing) disabled: no table/columns for it in the final DB.
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
              {[
                ['email', 'Email', 'Offers, bonuses and new game announcements by email.', Boolean(user?.marketingEmailOptIn)],
                ['sms', 'SMS', 'Time-limited offers and reminders by text message.', Boolean(user?.marketingSmsOptIn)]
              ].map(([key, name, desc, on]) => (
                <li key={key}>
                  <div>
                    <p className="acct-toggle-name">{name}</p>
                    <p className="acct-toggle-desc">{desc}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`${name} marketing`}
                    className={`acct-switch${on ? ' is-on' : ''}`}
                    disabled={prefSaving === key}
                    onClick={() => handleToggleMarketing(key, !on)}
                  ><span /></button>
                </li>
              ))}
            </ul>
          </section>
        )}
        */}

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
                      onClick={() => {
                        if (!limitAmounts[key]) {
                          toast.error('Enter an amount first.');
                          return;
                        }
                        requestSupport(`A ${label.toLowerCase()} limit of $${limitAmounts[key]}`);
                      }}
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
