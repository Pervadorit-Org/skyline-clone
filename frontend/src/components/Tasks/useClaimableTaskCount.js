import { useCallback, useEffect, useState } from 'react';
import { getTaskStatus } from '../../api/tasks';

export const TASKS_CHANGED_EVENT = 'df:tasks-changed';

/**
 * Number of tasks the signed-in user can claim right now (drives the Task List badge).
 * Follow-a-link tasks are left out: they only become claimable after the user opens the link.
 */
export function useClaimableTaskCount(enabled) {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await getTaskStatus();
      setCount((res?.tasks || []).filter((t) => t.eligible && !t.claimed && t.kind !== 'link').length);
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return undefined;
    }
    load();
    window.addEventListener(TASKS_CHANGED_EVENT, load);
    return () => window.removeEventListener(TASKS_CHANGED_EVENT, load);
  }, [enabled, load]);

  return count;
}
