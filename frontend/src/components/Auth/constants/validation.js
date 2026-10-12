import * as Yup from 'yup';

const NAME_LETTERS_ONLY = /^[a-zA-Z]+$/;
const NAME_MESSAGE = 'Only letters (a–z, A–Z) are allowed.';

const emailRule = Yup.string()
  .trim()
  .required('Email is required.')
  .email('Please enter a valid email address (e.g. name@example.com).');

const PASSWORD_MIN = 8;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
const PASSWORD_MESSAGE =
  'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.';

const passwordRule = Yup.string()
  .required('Password is required.')
  .min(PASSWORD_MIN, PASSWORD_MESSAGE)
  .matches(PASSWORD_PATTERN, PASSWORD_MESSAGE);

export const LOGIN_VALIDATION = Yup.object().shape({
  email: Yup.string().trim().required('Username or email is required.'),
  password: Yup.string().required('Password is required.')
});

export const FORGOT_PASSWORD_VALIDATION = Yup.object().shape({
  email: emailRule
});

export const RESET_PASSWORD_VALIDATION = Yup.object().shape({
  newPassword: passwordRule,
  confirmPassword: Yup.string()
    .required('Confirm new password is required.')
    .oneOf([Yup.ref('newPassword')], 'New password and confirm password do not match.')
});

export const SIGNUP_VALIDATION = Yup.object().shape({
  firstName: Yup.string()
    .trim()
    .matches(/^[a-zA-Z]*$/, NAME_MESSAGE)
    .max(100, 'First name must be at most 100 characters.'),
  lastName: Yup.string()
    .trim()
    .matches(/^[a-zA-Z]*$/, NAME_MESSAGE)
    .max(100, 'Last name must be at most 100 characters.'),
  email: emailRule,
  password: passwordRule,
  username: Yup.string()
    .trim()
    .required('Username is required.')
    .min(3, 'Username must be at least 3 characters.')
    .max(255, 'Username must be at most 255 characters.'),
  referral: Yup.string().trim().max(64, 'Referral code must be at most 64 characters.'),
  ageConfirm: Yup.boolean().oneOf([true], 'You must confirm you are at least 21 and not in a restricted state.'),
  terms: Yup.boolean().oneOf([true], 'You must accept the Terms of Use and Privacy Policy to sign up.')
});
