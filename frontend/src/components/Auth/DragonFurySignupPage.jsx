import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Formik } from 'formik';
import { AuthModalShell } from './AuthModalShell';
import { site } from '../../config/site';
import { DragonFurySignupForm } from './DragonFurySignupForm';
import { DragonFurySSOButtons } from './DragonFurySSOButtons';
import { EmailVerificationModal } from './EmailVerificationModal';
import { SIGNUP_VALIDATION } from './constants/validation';

const SIGNUP_FORM_INITIAL = {
  firstName: '',
  lastName: '',
  email: '',
  username: '',
  password: '',
  referral: '',
  terms: false,
  ageConfirm: false
};

export function DragonFurySignupPage({
  querySuffix,
  initialReferral = '',
  onSignupSubmit,
  onGoogleSuccess,
  onFacebookSuccess,
  googleAuthOptions,
  ssoLoading = false,
  unverifiedEmail,
  onCloseVerification,
  onResendVerification,
  resendLoading
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [shakeBtn, setShakeBtn] = useState(false);

  const triggerShake = () => {
    setShakeBtn(true);
    setTimeout(() => setShakeBtn(false), 450);
  };

  return (
    <>
      <AuthModalShell title="Welcome To">
        <img className="am2-logo" src={site.logoUrl} alt={site.platformName} width={290} height={108} decoding="async" />
        <div className="am2-tagline">
          <p>Register Now and collect</p>
          <p className="am2-coin"><img src="/icons/coin.png" alt="" width={32} height={32} />150,000</p>
        </div>
        <div className="am2-sso">
          <DragonFurySSOButtons
            onGoogleSuccess={onGoogleSuccess}
            onFacebookSuccess={onFacebookSuccess}
            googleAuthOptions={googleAuthOptions}
            disabled={ssoLoading}
            googleLabel="Google"
          />
        </div>
        <div className="am2-or"><span>or</span></div>
        <Formik
          initialValues={{ ...SIGNUP_FORM_INITIAL, referral: initialReferral }}
          validationSchema={SIGNUP_VALIDATION}
          onSubmit={onSignupSubmit}
        >
          {(formik) => (
            <DragonFurySignupForm
              formik={formik}
              showPassword={showPassword}
              togglePassword={() => setShowPassword((s) => !s)}
              isSubmitting={formik.isSubmitting}
              shakeBtn={shakeBtn}
              onEmptySubmit={triggerShake}
            />
          )}
        </Formik>
        <p className="am2-switch">
          <span>Already have an account?</span>
          <Link to={`/login${querySuffix}`}>Login</Link>
        </p>
      </AuthModalShell>

      <EmailVerificationModal
        open={!!unverifiedEmail}
        email={unverifiedEmail}
        onClose={onCloseVerification}
        onResend={onResendVerification}
        resendLoading={resendLoading}
      />
    </>
  );
}
