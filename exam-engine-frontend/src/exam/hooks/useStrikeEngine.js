import { useState, useEffect, useCallback } from 'react';
import { proctorService } from '../services/proctorService';
import { useVisibility } from './useVisibility';
import { useWindowBlur } from './useWindowBlur';
import { useWindowResize } from './useWindowResize';
import { useFullscreenMonitor } from './useFullscreenMonitor';

const getLocalISOString = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export function useStrikeEngine({ attemptId, initialStrikeCount, active, onTerminate }) {
  const [state, setState] = useState({
    strikeCount: 0,
    violations: [],
    warningVisible: false,
    terminated: false
  });

  // Sync initial strike count from backend
  useEffect(() => {
    if (initialStrikeCount !== undefined) {
      setState((prev) => ({
        ...prev,
        strikeCount: initialStrikeCount
      }));
    }
  }, [initialStrikeCount]);

  const handleViolation = useCallback(async (type) => {
    if (!active || state.terminated) return;

    const timestamp = getLocalISOString();
    
    try {
      const res = await proctorService.reportViolation(attemptId, type, timestamp);
      const { strikeCount: serverStrikeCount, terminate: serverTerminate } = res.data;

      const isTerminated = serverTerminate || serverStrikeCount >= 3;

      setState((prev) => ({
        strikeCount: serverStrikeCount,
        violations: [...prev.violations, { type, timestamp, strikeNumber: serverStrikeCount }],
        warningVisible: !isTerminated && (serverStrikeCount === 1 || serverStrikeCount === 2),
        terminated: isTerminated
      }));

      if (isTerminated) {
        if (onTerminate) {
          onTerminate();
        }
      }
    } catch (err) {
      console.error('Error reporting proctoring violation:', err);
    }
  }, [active, attemptId, state.terminated, onTerminate]);

  const dismissWarning = useCallback(() => {
    setState((prev) => ({
      ...prev,
      warningVisible: false
    }));
  }, []);

  // Hook up event sub-hooks
  useVisibility(active && !state.terminated, handleViolation);
  useWindowBlur(active && !state.terminated, handleViolation);
  useWindowResize(active && !state.terminated, handleViolation);
  useFullscreenMonitor(active && !state.terminated, handleViolation);

  return {
    strikeCount: state.strikeCount,
    violations: state.violations,
    warningVisible: state.warningVisible,
    terminated: state.terminated,
    dismissWarning
  };
}
