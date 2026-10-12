import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Formik } from 'formik';
import { AuthModalShell } from './AuthModalShell';
import { site } from '../../config/site';
import { DragonFuryLoginForm } from './DragonFuryLoginForm';
import { DragonFurySSOButtons } from './DragonFurySSOButtons';
import { EmailVerificationModal } from './EmailVerificationModal';
import { LOGIN_VALIDATION } from './constants/validation';

const LOGIN_FORM_INITIAL = { email: '', password: '', terms: false };

export function DragonFuryLoginPage({
  querySuffix,
  onLoginSubmit,
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
      <AuthModalShell title="Welcome back!">
        <img className="am2-logo" src={site.logoUrl} alt={site.platformName} width={290} height={108} decoding="async" />
        <div className="am2-tagline">
          <p>Login Daily for best promos &amp;</p>
          <p className="am2-gold">Free Rewards</p>
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
        <Formik initialValues={LOGIN_FORM_INITIAL} validationSchema={LOGIN_VALIDATION} onSubmit={onLoginSubmit}>
          {(formik) => (
            <DragonFuryLoginForm
              formik={formik}
              showPassword={showPassword}
              togglePassword={() => setShowPassword((s) => !s)}
              isSubmitting={formik.isSubmitting}
              shakeBtn={shakeBtn}
              onEmptySubmit={triggerShake}
              forgotPasswordLink={
                <Link to="/forgot-password" className="am2-link-gold">
                  Forgot Password?
                </Link>
              }
            />
          )}
        </Formik>
        <p className="am2-switch">
          <span>Don&apos;t have an account?</span>
          <Link to={`/register${querySuffix}`}>Sign Up</Link>
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
