import { useEffect, useState } from 'react';
import { getLegalPageList } from '../api/legal';

/** Used until the list loads, or if it can't be fetched: every page, in footer order. */
export const BUILT_IN_LEGAL_LINKS = [
  { to: '/about-us', label: 'About Us' },
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms & Conditions' },
  { to: '/bonus-terms', label: 'Bonus Terms' },
  { to: '/sweep-policy', label: 'Sweep Policy' },
  { to: '/responsible-gaming', label: 'Responsible Gambling' },
  { to: '/amoe', label: 'AMOE' },
  { to: '/aml-cft-policy', label: 'AML/CFT Policy' },
  { to: '/cookie-policy', label: 'Cookie Policy' },
  { to: '/ssl-encryption', label: 'SSL Encryption' },
];

/**
 * Legal pages the footer links to (About Us, Privacy Policy, Terms…), as managed in
 * Admin → Pages (pages an admin hid are left out). Falls back to every page when the list
 * can't be fetched.
 */
export function useLegalPageLinks() {
  const [links, setLinks] = useState(BUILT_IN_LEGAL_LINKS);

  useEffect(() => {
    let cancelled = false;
    getLegalPageList()
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res?.legal_pages) ? res.legal_pages : [];
        setLinks(list.filter((p) => p.visible).map((p) => ({ to: p.path, label: p.title })));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return links;
}
