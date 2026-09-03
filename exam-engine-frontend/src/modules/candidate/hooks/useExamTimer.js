import { useEffect, useState } from 'react';
import { useExam } from '../context/ExamContext';
import { examService } from '../services/examService';

export function useExamTimer(onTimeUp) {
  const {
    loading,
    timeRemaining,
    beginnerTimeRemaining,
    setBeginnerTimeRemaining,
    intermediateTimeRemaining,
    setIntermediateTimeRemaining,
    advancedTimeRemaining,
    setAdvancedTimeRemaining,
    questions,
    currentIdx,
    offline,
    setShowTimeUp,
    attemptId
  } = useExam();

  const [expiredSections, setExpiredSections] = useState(new Set());

  // Determine active section difficulty
  const currentQuestion = questions && questions[currentIdx];
  const diff = currentQuestion?.difficulty ? currentQuestion.difficulty.trim().toUpperCase() : 'EASY';
  const activeSection = diff === 'HARD' ? 'HARD' : (diff === 'MEDIUM' ? 'MEDIUM' : 'EASY');
  const activeSectionLabel = activeSection === 'HARD' ? 'Advanced' : (activeSection === 'MEDIUM' ? 'Intermediate' : 'Beginner');

  const activeTimeRemaining = activeSection === 'HARD'
    ? advancedTimeRemaining
    : (activeSection === 'MEDIUM' ? intermediateTimeRemaining : beginnerTimeRemaining);

  // Check timer expiry without overwriting active local section timers
  const syncTimerWithServer = async () => {
    if (!onTimeUp) return;
    if (attemptId && !loading && !offline) {
      try {
        const total = (beginnerTimeRemaining || 0) + (intermediateTimeRemaining || 0) + (advancedTimeRemaining || 0);
        if (total <= 0 && beginnerTimeRemaining !== null && beginnerTimeRemaining !== undefined) {
          setShowTimeUp(true);
          if (onTimeUp) onTimeUp();
        }
      } catch (err) {
        console.error('Failed to sync timer with server:', err);
      }
    }
  };

  // Periodically check expiration
  useEffect(() => {
    if (!onTimeUp) return;
    syncTimerWithServer();

    const intervalId = setInterval(syncTimerWithServer, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [attemptId, loading, offline, onTimeUp, beginnerTimeRemaining, intermediateTimeRemaining, advancedTimeRemaining]);

  // Local second-by-second countdown for the active section
  useEffect(() => {
    if (!onTimeUp || loading || offline) return;

    const interval = setInterval(() => {
      if (activeSection === 'EASY') {
        setBeginnerTimeRemaining((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      } else if (activeSection === 'MEDIUM') {
        setIntermediateTimeRemaining((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      } else if (activeSection === 'HARD') {
        setAdvancedTimeRemaining((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, offline, activeSection, onTimeUp, setBeginnerTimeRemaining, setIntermediateTimeRemaining, setAdvancedTimeRemaining]);

  const [warnedSections, setWarnedSections] = useState(new Set());

  // Handle last minute (60 seconds) warning message
  useEffect(() => {
    if (loading) return;
    if (activeTimeRemaining === 60 && !warnedSections.has(activeSection)) {
      setWarnedSections((prev) => new Set([...prev, activeSection]));
      alert("You have only 60 seconds to submit the answers for this section.");
    }
  }, [activeTimeRemaining, activeSection, warnedSections, loading]);

  // Handle section expiration alerts
  useEffect(() => {
    if (loading) return;
    const expired = new Set();
    if (beginnerTimeRemaining === 0) expired.add('EASY');
    if (intermediateTimeRemaining === 0) expired.add('MEDIUM');
    if (advancedTimeRemaining === 0) expired.add('HARD');

    const newExpirations = Array.from(expired).filter((sec) => !expiredSections.has(sec));
    if (newExpirations.length > 0) {
      newExpirations.forEach((sec) => {
        const secLabel = sec === 'HARD' ? 'Advanced' : (sec === 'MEDIUM' ? 'Intermediate' : 'Beginner');
        alert(`${secLabel} section's timer has expired! You can no longer answer or modify questions in this section.`);
      });
      setExpiredSections(expired);
    }
  }, [beginnerTimeRemaining, intermediateTimeRemaining, advancedTimeRemaining, expiredSections, loading]);

  const formatTime = (secs) => {
    if (secs === null || secs === undefined) return "--:--:--";
    if (secs < 0) secs = 0;
    const h = String(Math.floor(secs / 3600)).padStart(2, '0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return {
    timeRemaining: activeTimeRemaining,
    formattedTime: formatTime(activeTimeRemaining),
    activeSectionLabel,
    formatTime
  };
}
