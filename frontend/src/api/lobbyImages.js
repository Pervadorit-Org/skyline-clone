import { API_BASE } from '../config/api';
import { getRequest } from '../services/request';
import { STORE_CODE } from '../config/site';

const BASE = `${API_BASE}/api/lobby-images`;

/** Lobby images managed from the backend for this store (empty values = built-in artwork). */
export function getLobbyImages(storeCode = STORE_CODE) {
  const query = storeCode ? { store_code: storeCode } : undefined;
  return getRequest(`${BASE}/config`, query).then((res) => {
    const images = res?.lobbyImages ?? res;
    return images && typeof images === 'object' ? images : {};
  });
}
