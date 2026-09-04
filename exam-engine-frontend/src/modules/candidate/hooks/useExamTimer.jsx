import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
    attemptId,
    submittedSections,
    setSubmittedSections
  } = useExam();

  const [expiredSections, setExpiredSections] = useState(new Set());
  const [expiredModalLabel, setExpiredModalLabel] = useState(null);
  const [sixtySecToastLabel, setSixtySecToastLabel] = useState(null);

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
      if (activeSection === 'EASY' && !submittedSections?.has('EASY')) {
        setBeginnerTimeRemaining((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      } else if (activeSection === 'MEDIUM' && !submittedSections?.has('MEDIUM')) {
        setIntermediateTimeRemaining((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      } else if (activeSection === 'HARD' && !submittedSections?.has('HARD')) {
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
  }, [loading, offline, activeSection, onTimeUp, setBeginnerTimeRemaining, setIntermediateTimeRemaining, setAdvancedTimeRemaining, submittedSections]);

  const [warnedSections, setWarnedSections] = useState(new Set());

  // Handle last minute (60 seconds) warning message
  useEffect(() => {
    if (loading) return;
    if (activeTimeRemaining === 60 && !warnedSections.has(activeSection)) {
      setWarnedSections((prev) => new Set([...prev, activeSection]));
      const label = activeSection === 'HARD' ? 'Section 3 (Advanced)' : (activeSection === 'MEDIUM' ? 'Section 2 (Intermediate)' : 'Section 1 (Beginner)');
      setSixtySecToastLabel(label);
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
      // Filter out sections that were ALREADY submitted manually
      const naturalExpirations = newExpirations.filter(sec => !submittedSections || !submittedSections.has(sec));

      if (setSubmittedSections) {
        setSubmittedSections((prev) => new Set([...prev, ...newExpirations]));
      }

      if (naturalExpirations.length > 0) {
        const lastSec = naturalExpirations[naturalExpirations.length - 1];
        const secLabel = lastSec === 'HARD' ? 'Section 3 (Advanced)' : (lastSec === 'MEDIUM' ? 'Section 2 (Intermediate)' : 'Section 1 (Beginner)');
        setExpiredModalLabel(secLabel);
      }
      setExpiredSections(expired);
    }
  }, [beginnerTimeRemaining, intermediateTimeRemaining, advancedTimeRemaining, expiredSections, loading, setSubmittedSections, submittedSections]);

  const formatTime = (secs) => {
    if (secs === null || secs === undefined) return "--:--:--";
    if (secs < 0) secs = 0;
    const h = String(Math.floor(secs / 3600)).padStart(2, '0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const portalTarget = document.fullscreenElement || document.body;

  return {
    timeRemaining: activeTimeRemaining,
    formattedTime: formatTime(activeTimeRemaining),
    activeSectionLabel,
    formatTime,
    // Custom rendered modals for time alerts
    renderTimerModals: () => (
      <>
        {/* Natural Section Time Expiration Modal */}
        {expiredModalLabel && createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 99999999,
              backgroundColor: 'rgba(4, 10, 22, 0.90)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              userSelect: 'none'
            }}
          >
            <div
              style={{
                backgroundColor: '#0c1f38',
                border: '2px solid rgba(245, 158, 11, 0.6)',
                borderRadius: '24px',
                padding: '36px 32px 32px 32px',
                maxWidth: '430px',
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.85)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative'
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  border: '2px solid #f59e0b',
                  color: '#f59e0b',
                  fontSize: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  boxShadow: '0 0 25px rgba(245, 158, 11, 0.35)',
                  flexShrink: 0
                }}
              >
                ⏱️
              </div>

              <h3
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: '22px',
                  fontWeight: '700',
                  color: '#ffffff',
                  margin: '0 0 10px 0',
                  letterSpacing: '-0.3px',
                  lineHeight: '1.3'
                }}
              >
                {expiredModalLabel} Timer Expired
              </h3>

              <p
                style={{
                  fontSize: '13.5px',
                  color: '#93c5fd',
                  lineHeight: '1.55',
                  margin: '0 0 28px 0',
                  maxWidth: '340px',
                  fontWeight: '500'
                }}
              >
                The time limit for {expiredModalLabel} has been reached. This section is now locked and you can no longer modify its questions.
              </p>

              <button
                type="button"
                onClick={() => setExpiredModalLabel(null)}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  border: '1px solid #fbbf24',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: '0 4px 18px rgba(245, 158, 11, 0.45)',
                  textAlign: 'center'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                Understand &amp; Continue
              </button>
            </div>
          </div>,
          portalTarget
        )}

        {/* 60 Seconds Remaining Warning Modal */}
        {sixtySecToastLabel && createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 99999999,
              backgroundColor: 'rgba(4, 10, 22, 0.85)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              userSelect: 'none'
            }}
          >
            <div
              style={{
                backgroundColor: '#0c1f38',
                border: '2px solid rgba(242, 169, 59, 0.6)',
                borderRadius: '24px',
                padding: '32px 28px 28px 28px',
                maxWidth: '400px',
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.85)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(242, 169, 59, 0.15)',
                  border: '2px solid #f2a93b',
                  color: '#f2a93b',
                  fontSize: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  boxShadow: '0 0 25px rgba(242, 169, 59, 0.35)',
                  flexShrink: 0
                }}
              >
                ⚡
              </div>

              <h3
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#ffffff',
                  margin: '0 0 8px 0',
                  letterSpacing: '-0.3px'
                }}
              >
                60 Seconds Remaining!
              </h3>

              <p
                style={{
                  fontSize: '13px',
                  color: '#93c5fd',
                  lineHeight: '1.5',
                  margin: '0 0 24px 0',
                  maxWidth: '320px'
                }}
              >
                You have only 60 seconds remaining to review and submit your answers for {sixtySecToastLabel}.
              </p>

              <button
                type="button"
                onClick={() => setSixtySecToastLabel(null)}
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #2F6BFF 0%, #1D4ED8 100%)',
                  border: '1px solid #3b82f6',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                Got it
              </button>
            </div>
          </div>,
          portalTarget
        )}
      </>
    )
  };
}
