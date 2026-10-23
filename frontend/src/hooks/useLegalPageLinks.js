import { useEffect, useState } from 'react';
import { getLegalPageList } from '../api/legal';

/**
 * Legal pages the footer links to (About Us, Privacy Policy, Terms…), as managed in
 * Admin → Pages. Only pages that are visible AND have content are listed; nothing is listed
 * until the list loads or if it can't be fetched.
 */
export function useLegalPageLinks() {
  const [links, setLinks] = useState([]);

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
