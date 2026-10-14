import { API_BASE } from '../config/api';
import { getRequest } from '../services/request';
import { STORE_CODE } from '../config/site';

const BASE = `${API_BASE}/api/footer-content`;

/**
 * Admin-managed footer content for this store.
 * Returns the stored partial object, or {} when nothing is saved yet.
 * The caller merges it over the built-in footerConfig defaults.
 */
export function getFooterContentConfig(storeCode = STORE_CODE) {
  const query = storeCode ? { store_code: storeCode } : undefined;
  return getRequest(`${BASE}/config`, query).then((res) => {
    const content = res?.footer ?? res;
    return content && typeof content === 'object' ? content : {};
  });
}
