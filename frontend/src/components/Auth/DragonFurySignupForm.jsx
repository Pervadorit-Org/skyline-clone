import { Link } from 'react-router-dom';
import { Field } from 'formik';
import { site } from '../../config/site';
import { submitOrRevealErrors } from './submitOrRevealErrors';

function EyeIcon({ show }) {
  return show ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.940 17.940A10.070 10.070 0 0 1 12 20c-7 0-11-8-11-8a18.450 18.450 0 0 1 5.060-5.940M9.900 4.240A9.120 9.120 0 0 1 12 4c7 0 11 8 11 8a18.500 18.500 0 0 1-2.160 3.190m-6.720-1.070a3 3 0 1 1-4.240-4.240" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.750 10.750 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.750 10.750 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function TextField({ formik, id, name, label, required, type = 'text', placeholder, autoComplete, children }) {
  const { values, errors, touched, handleChange, handleBlur } = formik;
  const err = touched[name] && errors[name] ? errors[name] : '';
  return (
    <div className="am2-field">
      <label htmlFor={id}>{label}{required ? <span className="am2-req">*</span> : null}</label>
      {children || (
        <Field
          id={id}
          name={name}
          type={type}
          className="am2-input"
          value={values[name] ?? ''}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={err ? 'true' : undefined}
        />
      )}
      <p className="am2-err" role="alert">{err}</p>
    </div>
  );
}

export function DragonFurySignupForm({ formik, showPassword, togglePassword, isSubmitting, shakeBtn, onEmptySubmit }) {
  const { values, errors, touched, handleBlur, handleChange, setFieldValue } = formik;

  const onSubmit = (e) => {
    e.preventDefault();
    submitOrRevealErrors(formik, onEmptySubmit);
  };

  return (
    <form className="am2-form" onSubmit={onSubmit} noValidate>
      <TextField formik={formik} id="am2-username" name="username" label="Username" required placeholder="Choose a username" autoComplete="username" />
      <TextField formik={formik} id="am2-su-email" name="email" label="Email" required type="email" placeholder="you@example.com" autoComplete="email" />

      <div className="am2-field">
        <label htmlFor="am2-su-password">Password<span className="am2-req">*</span></label>
        <div className="am2-pass">
          <Field
            id="am2-su-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            className="am2-input"
            value={values.password ?? ''}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter your password"
            autoComplete="new-password"
            aria-invalid={touched.password && errors.password ? 'true' : undefined}
          />
          <button type="button" className="am2-eye" onClick={togglePassword} aria-label={showPassword ? 'Hide password' : 'Show password'}>
            <EyeIcon show={showPassword} />
          </button>
        </div>
        <p className="am2-hint">Use 8 or more characters with a mix of letters, numbers &amp; symbols</p>
        <p className="am2-err" role="alert">{touched.password && errors.password ? errors.password : ''}</p>
      </div>

      <TextField formik={formik} id="am2-referral" name="referral" label="Referral Code" placeholder="Enter referral code" autoComplete="off" />

      <label className="am2-check" htmlFor="am2-age">
        <input id="am2-age" type="checkbox" checked={!!values.ageConfirm} onChange={(e) => setFieldValue('ageConfirm', e.target.checked)} onBlur={handleBlur} name="ageConfirm" />
        <span>
          I am at least 21 years old and I am not a resident of the{' '}
          <Link to="/terms" target="_blank" rel="noopener noreferrer">Restricted states</Link>.<span className="am2-req">*</span>
        </span>
      </label>
      {touched.ageConfirm && errors.ageConfirm ? <p className="am2-err am2-err--check" role="alert">{errors.ageConfirm}</p> : null}

      <label className="am2-check" htmlFor="am2-terms">
        <input id="am2-terms" type="checkbox" checked={!!values.terms} onChange={(e) => setFieldValue('terms', e.target.checked)} onBlur={handleBlur} name="terms" />
        <span>
          I accept the {site.platformName}{' '}
          <Link to="/terms" target="_blank" rel="noopener noreferrer">Terms of Use</Link> and{' '}
          <Link to="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>{' '}
          (including, for the California residents the{' '}
          <Link to="/privacy" target="_blank" rel="noopener noreferrer">California Privacy Notice</Link>).<span className="am2-req">*</span>
        </span>
      </label>
      {touched.terms && errors.terms ? <p className="am2-err am2-err--check" role="alert">{errors.terms}</p> : null}

      <button type="submit" className={`am2-submit${shakeBtn ? ' shk' : ''}`} disabled={isSubmitting}>
        {isSubmitting ? 'Creating…' : 'Join Us'}
      </button>
    </form>
  );
}
