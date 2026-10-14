import { API_BASE } from '../config/api';
import { getRequest } from '../services/request';
import { STORE_CODE } from '../config/site';

const BASE = `${API_BASE}/api/lobby-content`;

/** Admin-managed lobby content for this store ({} when nothing is saved yet). */
export function getLobbyContentConfig(storeCode = STORE_CODE) {
  const query = storeCode ? { store_code: storeCode } : undefined;
  return getRequest(`${BASE}/config`, query).then((res) => {
    const content = res?.lobby ?? res;
    return content && typeof content === 'object' ? content : {};
  });
}

/** Game ids ranked by real play history for this store, most played first ([] when unknown). */
export function getLobbyPopular(storeCode = STORE_CODE) {
  const query = storeCode ? { store_code: storeCode } : undefined;
  return getRequest(`${BASE}/popular`, query).then((res) => (Array.isArray(res?.ids) ? res.ids.map(String) : []));
}
