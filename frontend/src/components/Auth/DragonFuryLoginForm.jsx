import { Field } from 'formik';
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

export function DragonFuryLoginForm({
  formik,
  showPassword,
  togglePassword,
  forgotPasswordLink,
  isSubmitting,
  shakeBtn,
  onEmptySubmit
}) {
  const { values, errors, touched, handleChange, handleBlur } = formik;

  const onSubmit = (e) => {
    e.preventDefault();
    submitOrRevealErrors(formik, onEmptySubmit);
  };

  return (
    <form className="am2-form" onSubmit={onSubmit} noValidate>
      <div className="am2-field">
        <label htmlFor="am2-email">Username/Email<span className="am2-req">*</span></label>
        <Field
          id="am2-email"
          name="email"
          type="text"
          className="am2-input"
          value={values.email ?? ''}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Enter your username or email"
          autoComplete="username"
          aria-invalid={touched.email && errors.email ? 'true' : undefined}
        />
        <p className="am2-err" role="alert">{touched.email && errors.email ? errors.email : ''}</p>
      </div>

      <div className="am2-field">
        <label htmlFor="am2-password">Password<span className="am2-req">*</span></label>
        <div className="am2-pass">
          <Field
            id="am2-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            className="am2-input"
            value={values.password ?? ''}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter your password"
            autoComplete="current-password"
            aria-invalid={touched.password && errors.password ? 'true' : undefined}
          />
          <button type="button" className="am2-eye" onClick={togglePassword} aria-label={showPassword ? 'Hide password' : 'Show password'}>
            <EyeIcon show={showPassword} />
          </button>
        </div>
        <p className="am2-err" role="alert">{touched.password && errors.password ? errors.password : ''}</p>
      </div>

      <div className="am2-forgot">{forgotPasswordLink}</div>

      <button type="submit" className={`am2-submit${shakeBtn ? ' shk' : ''}`} disabled={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
