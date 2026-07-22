import { useEffect } from 'react';
import { useExam } from '../context/ExamContext';
import { examService } from '../services/examService';

export function useExamTimer(onTimeUp) {
  const {
    loading,
    timeRemaining,
    setTimeRemaining,
    handRaised,
    offline,
    setShowTimeUp,
    attemptId
  } = useExam();

  // Fetch timer from server
  const syncTimerWithServer = async () => {
    if (attemptId && !loading && !offline) {
      try {
        const res = await examService.getRemainingTime(attemptId);
        const remaining = res.data.remainingSeconds;
        setTimeRemaining(remaining);
        if (remaining <= 0) {
          setShowTimeUp(true);
          if (onTimeUp) onTimeUp();
        }
      } catch (err) {
        console.error('Failed to sync timer with server:', err);
      }
    }
  };

  // Sync on load, periodically, and on focus/visibility change
  useEffect(() => {
    syncTimerWithServer();

    const intervalId = setInterval(syncTimerWithServer, 60000);

    const handleFocus = () => {
      syncTimerWithServer();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [attemptId, loading, offline]);

  // Local second-by-second countdown
  useEffect(() => {
    if (loading || handRaised || offline || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowTimeUp(true);
          if (onTimeUp) {
            onTimeUp();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, handRaised, offline, timeRemaining, setTimeRemaining, setShowTimeUp, onTimeUp]);

  const formatTime = (secs) => {
    if (secs < 0) secs = 0;
    const h = String(Math.floor(secs / 3600)).padStart(2, '0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return {
    timeRemaining,
    formattedTime: formatTime(timeRemaining),
    formatTime
  };
}
