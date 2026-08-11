import { useEffect, useRef } from 'react';
import { examSyncService } from '../services/examSyncService';

export function useUnload({ attemptId, answersRef, timeRemainingRef, active }) {
  const isNavigatingAwayRef = useRef(false);

  useEffect(() => {
    if (!active || !attemptId) return;

    // 1. Send beacon on refresh / close
    const handleBeforeUnload = (e) => {
      const answers = answersRef.current || {};
      const remainingSeconds = timeRemainingRef.current || 0;

      // Transmit state via sendBeacon (non-blocking async beacon)
      examSyncService.sendBeaconData(attemptId, answers, remainingSeconds);

      // standard browser prompt on tab close / reload
      e.preventDefault();
      e.returnValue = 'You have an active exam in progress. Are you sure you want to leave?';
      return e.returnValue;
    };

    // 2. Intercept back button via popstate
    const handlePopState = (e) => {
      const confirmLeave = window.confirm(
        'Warning: Leaving the exam tab using the back button is not allowed and will terminate your exam attempt. Are you sure you want to leave?'
      );

      if (!confirmLeave) {
        // Push current state back to lock navigation
        window.history.pushState(null, '', window.location.href);
      } else {
        isNavigatingAwayRef.current = true;
        // Trigger beacon transmission before exiting
        const answers = answersRef.current || {};
        const remainingSeconds = timeRemainingRef.current || 0;
        examSyncService.sendBeaconData(attemptId, answers, remainingSeconds);
      }
    };

    // Push initial history state to capture back button
    window.history.pushState(null, '', window.location.href);

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [attemptId, active, answersRef, timeRemainingRef]);

  return {
    isNavigatingAway: isNavigatingAwayRef.current
  };
}
