import { useState, useEffect, useCallback, useRef } from 'react';
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

  // Track the grace period when active becomes true
  const [isGracePeriod, setIsGracePeriod] = useState(true);

  // Cooldown tracker per violation type: Mapping of type -> timestamp (ms)
  const lastViolationTimeRef = useRef({});

  useEffect(() => {
    if (active) {
      setIsGracePeriod(true);
      const timer = setTimeout(() => {
        setIsGracePeriod(false);
      }, 5000); // 5 seconds grace period to allow fullscreen transition and focusing to settle
      return () => clearTimeout(timer);
    } else {
      setIsGracePeriod(true);
    }
  }, [active]);

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

    if (isGracePeriod && (type === 'WINDOW_RESIZE' || type === 'WINDOW_BLUR')) {
      return;
    }

    // Cooldown/Debounce check: 10 seconds (10000ms) cooldown per violation type
    const nowMs = Date.now();
    const lastTime = lastViolationTimeRef.current[type] || 0;
    if (nowMs - lastTime < 10000) {
      console.log(`Violation ${type} suppressed due to 10s cooldown`);
      return;
    }
    lastViolationTimeRef.current[type] = nowMs;

    const timestamp = getLocalISOString();
    
    try {
      const res = await proctorService.reportViolation(attemptId, type, timestamp);
      const { strikeCount: serverStrikeCount, terminate: serverTerminate } = res.data;

      const isTerminated = serverTerminate || serverStrikeCount >= 4;

      setState((prev) => ({
        strikeCount: serverStrikeCount,
        violations: [...prev.violations, { type, timestamp, strikeNumber: serverStrikeCount }],
        warningVisible: !isTerminated && serverStrikeCount <= 3,
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
  }, [active, attemptId, state.terminated, onTerminate, isGracePeriod]);

  const dismissWarning = useCallback(() => {
    setState((prev) => ({
      ...prev,
      warningVisible: false
    }));
  }, []);

  const isProctoringActive = active && !state.terminated;
  const isGraceActive = isProctoringActive && !isGracePeriod;

  // Hook up event sub-hooks
  useVisibility(isProctoringActive, handleViolation);
  useWindowBlur(isGraceActive, handleViolation);
  useWindowResize(isGraceActive, handleViolation);
  useFullscreenMonitor(isProctoringActive, handleViolation);

  return {
    strikeCount: state.strikeCount,
    violations: state.violations,
    warningVisible: state.warningVisible,
    terminated: state.terminated,
    dismissWarning,
    handleViolation
  };
}
