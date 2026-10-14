import { API_BASE } from '../config/api';
import { getRequest } from '../services/request';
import { STORE_CODE } from '../config/site';

const BASE = `${API_BASE}/api/home-page`;

/**
 * Admin-managed home page content for this store (guest landing).
 * Returns the stored partial object, or {} when nothing is saved yet.
 * The caller merges this over the built-in homeConfig defaults.
 */
export function getHomePageContentConfig(storeCode = STORE_CODE) {
  const query = storeCode ? { store_code: storeCode } : undefined;
  return getRequest(`${BASE}/config`, query).then((res) => {
    const content = res?.homePage ?? res;
    return content && typeof content === 'object' ? content : {};
  });
}
