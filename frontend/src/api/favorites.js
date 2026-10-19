import { API_BASE } from '../config/api';
import { getRequest, postRequest } from '../services/request';

const BASE = `${API_BASE}/api/favorites`;

/** Saved favorite game ids for the signed-in user: { ids: ['platform:12', 'slot:abc'] }. */
export function getFavoriteGameIds() {
  return getRequest(BASE).then((res) => (Array.isArray(res?.ids) ? res.ids : []));
}

/** Add and/or remove ids; the server merges the change into the saved list and returns it. */
export function updateFavoriteGameIds({ add = [], remove = [] }) {
  return postRequest(BASE, { add, remove }).then((res) => (Array.isArray(res?.ids) ? res.ids : []));
}
