import { useState, useEffect, useCallback } from 'react';
import { examSyncService } from '../services/examSyncService';

export function useReconnect({ attemptId, answers, timeRemaining, setTimeRemaining, onResumed }) {
  const [statusState, setStatusState] = useState({
    online: navigator.onLine,
    syncing: false,
    reconnecting: false
  });

  const handleSyncAndResume = useCallback(async () => {
    if (!attemptId) return;
    setStatusState((prev) => ({ ...prev, syncing: true, reconnecting: true }));

    try {
      // 1. Sync pending local answers to backend
      if (answers) {
        await examSyncService.syncAnswers(attemptId, answers, timeRemaining);
      }

      // 2. Fetch updated attempt status and remaining time
      const res = await examSyncService.getAttemptStatus(attemptId);
      if (res && res.data) {
        if (setTimeRemaining && typeof res.data.remainingSeconds === 'number') {
          setTimeRemaining(res.data.remainingSeconds);
        }
      }

      if (onResumed) onResumed();
    } catch (err) {
      console.error('Failed to sync after reconnection:', err);
    } finally {
      setStatusState((prev) => ({ ...prev, syncing: false, reconnecting: false }));
    }
  }, [attemptId, answers, timeRemaining, setTimeRemaining, onResumed]);

  useEffect(() => {
    const handleOnline = () => {
      setStatusState((prev) => ({ ...prev, online: true }));
      handleSyncAndResume();
    };

    const handleOffline = () => {
      setStatusState((prev) => ({ ...prev, online: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!navigator.onLine) {
      setStatusState((prev) => ({ ...prev, online: false }));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleSyncAndResume]);

  return {
    online: statusState.online,
    syncing: statusState.syncing,
    reconnecting: statusState.reconnecting,
    triggerManualSync: handleSyncAndResume
  };
}
