import DOMPurify from 'dompurify';

/**
 * Sanitize CMS / API supplied HTML before it is injected with dangerouslySetInnerHTML.
 * Strips scripts, inline event handlers and javascript: URLs; keeps normal rich-text markup,
 * images, tables and video/YouTube iframes. Links that open a new tab get rel="noopener noreferrer".
 */
const ALLOWED_IFRAME_HOSTS = [
  'www.youtube.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
];

let hooksInstalled = false;

function installHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
      node.setAttribute('rel', 'noopener noreferrer');
    }
    if (node.tagName === 'IFRAME') {
      let host = '';
      try {
        host = new URL(node.getAttribute('src') || '', window.location.origin).hostname;
      } catch {
        host = '';
      }
      if (!ALLOWED_IFRAME_HOSTS.includes(host)) {
        node.parentNode?.removeChild(node);
      } else {
        node.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        node.setAttribute('loading', 'lazy');
      }
    }
  });
}

export function sanitizeHtml(html) {
  if (html == null || html === '') return '';
  if (typeof window === 'undefined') return '';
  installHooks();
  return DOMPurify.sanitize(String(html), {
    USE_PROFILES: { html: true, svg: false, mathMl: false },
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['target', 'allow', 'allowfullscreen', 'frameborder', 'loading', 'referrerpolicy'],
    FORBID_TAGS: ['script', 'style', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'meta', 'link', 'base'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
}
