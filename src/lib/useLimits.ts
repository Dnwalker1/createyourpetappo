import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { api, Limits } from '../api';
import { useAppState } from '../state/AppState';
import { formatClockTime } from './limits';

// Current limits from the backend, refreshed whenever the screen is shown.
export function useLimits(): { limits: Limits | null; line: string | null } {
  const { deviceId } = useAppState();
  const [limits, setLimits] = useState<Limits | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!deviceId) return;
      let live = true;
      api
        .getLimits(deviceId)
        .then((l) => live && setLimits(l))
        .catch(() => undefined);
      return () => {
        live = false;
      };
    }, [deviceId]),
  );

  let line: string | null = null;
  if (limits) {
    line = `${limits.available} of ${limits.limit} designs available`;
    if (limits.available < limits.limit && limits.nextDesignAt) {
      line += ` · next one unlocks at ${formatClockTime(limits.nextDesignAt)}`;
    }
  }
  return { limits, line };
}
