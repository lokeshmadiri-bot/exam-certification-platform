import { useEffect } from 'react';
import { useExam } from '../context/ExamContext';

export function useExamTimer(onTimeUp) {
  const {
    loading,
    timeRemaining,
    setTimeRemaining,
    handRaised,
    offline,
    setShowTimeUp
  } = useExam();

  useEffect(() => {
    if (loading || handRaised || offline) return;

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
  }, [loading, handRaised, offline, setTimeRemaining, setShowTimeUp, onTimeUp]);

  const formatTime = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  return {
    timeRemaining,
    formattedTime: formatTime(timeRemaining),
    formatTime
  };
}
