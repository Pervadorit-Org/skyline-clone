/**
 * URL guards for values that come from the API / push payloads / query strings.
 * Only http(s) and same-site paths are allowed; javascript:, data:, protocol-relative
 * (//host) and backslash tricks are rejected.
 */
export function isSafeInternalPath(value) {
  const v = String(value ?? '').trim();
  // eslint-disable-next-line no-control-regex
  return v.startsWith('/') && !v.startsWith('//') && !v.includes('\\') && !/[\u0000-\u001f]/.test(v);
}

export function isSafeHttpUrl(value) {
  const v = String(value ?? '').trim();
  if (!/^https?:\/\//i.test(v)) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Returns the URL if it is safe to put in an href / navigate to, otherwise ''. */
export function safeHref(value) {
  return isSafeInternalPath(value) || isSafeHttpUrl(value) ? String(value).trim() : '';
}
