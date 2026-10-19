import { API_BASE } from '../config/api';
import { getRequest, postRequest } from '../services/request';

const BASE = `${API_BASE}/api/tasks`;

/** Per-task state for the signed-in user: { tasks: [{ id, group, eligible, claimed, reward_sc, reward_gc }], claimed, reset_at }. */
export function getTaskStatus() {
  return getRequest(BASE);
}

/** Claim a task reward. group is 'regular' or 'daily'. */
export function claimTask(group, taskId) {
  return postRequest(`${BASE}/${encodeURIComponent(taskId)}/claim`, { group });
}
