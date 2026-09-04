import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useExam } from '../context/ExamContext';

export default function SectionStepper() {
  const {
    questions,
    currentIdx,
    setCurrentIdx,
    submittedSections,
    setSubmittedSections,
    setShowConfirmSubmit,
    beginnerTimeRemaining,
    setBeginnerTimeRemaining,
    intermediateTimeRemaining,
    setIntermediateTimeRemaining,
    advancedTimeRemaining,
    setAdvancedTimeRemaining,
    answers
  } = useExam();

  const [confirmingSec, setConfirmingSec] = useState(null);

  if (questions.length === 0) return null;

  const getSectionStats = (secKey) => {
    if (!questions) return { totalSecQs: 0, answeredSecQs: 0, unansweredSecQs: 0 };
    const secQuestions = questions.filter(q => {
      const d = q.difficulty ? q.difficulty.trim().toUpperCase() : 'EASY';
      if (secKey === 'HARD') return d === 'HARD';
      if (secKey === 'MEDIUM') return d === 'MEDIUM';
      return d !== 'MEDIUM' && d !== 'HARD';
    });

    const totalSecQs = secQuestions.length;
    const answeredSecQs = secQuestions.filter(q => answers && answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== '').length;
    const unansweredSecQs = totalSecQs - answeredSecQs;

    return { totalSecQs, answeredSecQs, unansweredSecQs };
  };

  const isSecLocked = (secKey) => {
    const isSub = submittedSections && submittedSections.has(secKey);
    const isExpired = secKey === 'HARD'
      ? advancedTimeRemaining === 0
      : (secKey === 'MEDIUM' ? intermediateTimeRemaining === 0 : beginnerTimeRemaining === 0);
    return isSub || isExpired;
  };

  const easyQs = questions.filter(q => {
    const d = q.difficulty ? q.difficulty.trim().toUpperCase() : 'EASY';
    return d !== 'MEDIUM' && d !== 'HARD';
  });
  const mediumQs = questions.filter(q => q.difficulty?.trim().toUpperCase() === 'MEDIUM');
  const hardQs = questions.filter(q => q.difficulty?.trim().toUpperCase() === 'HARD');

  const availableSections = [];
  if (easyQs.length > 0) availableSections.push({ key: 'EASY', label: 'Section 1 (Beginner)', shortLabel: 'Section 1' });
  if (mediumQs.length > 0) availableSections.push({ key: 'MEDIUM', label: 'Section 2 (Intermediate)', shortLabel: 'Section 2' });
  if (hardQs.length > 0) availableSections.push({ key: 'HARD', label: 'Section 3 (Advanced)', shortLabel: 'Section 3' });

  const currentQuestion = questions[currentIdx];
  const qDiff = currentQuestion?.difficulty ? currentQuestion.difficulty.trim().toUpperCase() : 'EASY';
  const activeSection = qDiff === 'HARD' ? 'HARD' : (qDiff === 'MEDIUM' ? 'MEDIUM' : 'EASY');

  const handleSectionClick = (secKey) => {
    if (isSecLocked(secKey)) return;
    const targetIdx = questions.findIndex(q => {
      const d = q.difficulty ? q.difficulty.trim().toUpperCase() : 'EASY';
      if (secKey === 'EASY') return d !== 'MEDIUM' && d !== 'HARD';
      return d === secKey;
    });
    if (targetIdx !== -1) {
      setCurrentIdx(targetIdx);
    }
  };

  const handleConfirmSectionSubmit = (secKey) => {
    if (setSubmittedSections) {
      setSubmittedSections(prev => new Set([...prev, secKey]));
    }

    setConfirmingSec(null);

    // Auto-navigate to first question of next available un-submitted section
    const nextSec = availableSections.find(s => s.key !== secKey && !isSecLocked(s.key));
    if (nextSec) {
      const targetIdx = questions.findIndex(q => {
        const d = q.difficulty ? q.difficulty.trim().toUpperCase() : 'EASY';
        if (nextSec.key === 'EASY') return d !== 'MEDIUM' && d !== 'HARD';
        return d === nextSec.key;
      });
      if (targetIdx !== -1) {
        setCurrentIdx(targetIdx);
      }
    } else {
      // If all sections submitted, trigger final submit prompt
      setShowConfirmSubmit(true);
    }
  };

  const currentSecObj = availableSections.find(s => s.key === activeSection) || availableSections[0];
  const isCurrentSecLocked = isSecLocked(activeSection);

  return (
    <div className="section-stepper flex flex-wrap items-center justify-between gap-4 mb-6 font-mono text-xs w-full max-w-[850px] mx-auto border-b border-white/10 pb-4 px-2 select-none">
      {/* Section Dropdown & Stepper Pills */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[#8A99AE] font-semibold text-[11px] uppercase tracking-wider">Select Section:</span>
        <select
          value={activeSection}
          onChange={(e) => handleSectionClick(e.target.value)}
          className="bg-[#0c1e38] text-white border border-white/20 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none cursor-pointer hover:border-sky-400 transition-colors"
        >
          {availableSections.map((sec) => {
            const isLocked = isSecLocked(sec.key);
            const isSub = submittedSections && submittedSections.has(sec.key);
            return (
              <option key={sec.key} value={sec.key} disabled={isLocked}>
                {sec.label} {isSub ? '(Submitted ✓)' : (isLocked ? '(Locked 🔒)' : '')}
              </option>
            );
          })}
        </select>

        {/* Section Pills */}
        <div className="hidden sm:flex items-center gap-2">
          {availableSections.map((sec) => {
            const isActive = activeSection === sec.key;
            const isLocked = isSecLocked(sec.key);
            const isSub = submittedSections && submittedSections.has(sec.key);
            return (
              <button
                key={sec.key}
                disabled={isLocked}
                onClick={() => handleSectionClick(sec.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all font-semibold ${
                  isLocked
                    ? 'bg-amber-950/40 text-amber-300 border-amber-800/50 cursor-not-allowed opacity-80'
                    : isActive
                    ? 'bg-[#2F6BFF] text-white border-[#2F6BFF] shadow-[0_4px_12px_rgba(47,107,255,0.3)]'
                    : 'bg-white/5 text-[#9fb6d6] border-white/10 hover:bg-white/10'
                }`}
              >
                <span>{sec.shortLabel}</span>
                {isSub ? <span className="text-xs">✓</span> : (isLocked ? <span className="text-xs">🔒</span> : null)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit Section Button */}
      {!isCurrentSecLocked ? (
        <button
          onClick={() => setConfirmingSec(currentSecObj.key)}
          className="px-4 py-2 rounded-full bg-[#F5A623] hover:bg-[#e09518] text-[#2C1A00] font-extrabold text-xs shadow-[0_4px_14px_rgba(245,166,35,0.4)] border border-[#f7b64a] transition-all cursor-pointer flex items-center gap-1.5"
        >
          <span>Submit {currentSecObj.shortLabel}</span>
        </button>
      ) : (
        <span className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-700/50 text-emerald-400 flex items-center justify-center">
          🔒
        </span>
      )}

      {/* Confirmation Modal for Section Submission */}
      {confirmingSec && createPortal(
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
              border: '2px solid rgba(245, 158, 11, 0.55)',
              borderRadius: '24px',
              padding: '36px 32px 36px 32px',
              maxWidth: '440px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.85)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative'
            }}
          >
            {/* Warning Icon Badge */}
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
                marginBottom: '16px',
                boxShadow: '0 0 25px rgba(245, 158, 11, 0.3)',
                flexShrink: 0
              }}
            >
              ⚠️
            </div>

            {/* Title */}
            <h3
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: '22px',
                fontWeight: '700',
                color: '#ffffff',
                margin: '0 0 8px 0',
                letterSpacing: '-0.3px',
                lineHeight: '1.3'
              }}
            >
              Submit {availableSections.find(s => s.key === confirmingSec)?.shortLabel || 'Section'}?
            </h3>

            {/* Subtitle */}
            <p
              style={{
                fontSize: '13.5px',
                color: '#93c5fd',
                lineHeight: '1.5',
                margin: '0 0 20px 0',
                maxWidth: '340px',
                fontWeight: '500'
              }}
            >
              After submitting, you can't get back to this section.
            </p>

            {/* Section Stats & Unanswered Warning */}
            {(() => {
              const targetKey = typeof confirmingSec === 'object' ? confirmingSec.key : confirmingSec;
              const { totalSecQs, answeredSecQs, unansweredSecQs } = getSectionStats(targetKey);
              return (
                <div style={{ width: '100%', marginBottom: '24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: unansweredSecQs > 0 ? '12px' : '0' }}>
                    <div style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(52, 210, 123, 0.08)',
                      border: '1px solid rgba(52, 210, 123, 0.25)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontSize: '20px', fontWeight: '800', color: '#34d27b', fontFamily: 'monospace', lineHeight: 1 }}>
                        {answeredSecQs} / {totalSecQs}
                      </span>
                      <span style={{ fontSize: '11px', color: '#6a9e83', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>
                        Answered
                      </span>
                    </div>

                    <div style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      backgroundColor: unansweredSecQs > 0 ? 'rgba(242, 169, 59, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${unansweredSecQs > 0 ? 'rgba(242, 169, 59, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontSize: '20px', fontWeight: '800', color: unansweredSecQs > 0 ? '#F2A93B' : '#8A99AE', fontFamily: 'monospace', lineHeight: 1 }}>
                        {unansweredSecQs}
                      </span>
                      <span style={{ fontSize: '11px', color: unansweredSecQs > 0 ? '#d97706' : '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>
                        Unanswered
                      </span>
                    </div>
                  </div>

                  {unansweredSecQs > 0 && (
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      color: '#fbbf24',
                      fontSize: '12px',
                      fontWeight: '600',
                      lineHeight: '1.45',
                      textAlign: 'center'
                    }}>
                      ⚠ {unansweredSecQs} question{unansweredSecQs > 1 ? 's' : ''} in this section {unansweredSecQs > 1 ? 'are' : 'is'} unanswered.
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Action Buttons Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px',
                width: '100%'
              }}
            >
              <button
                type="button"
                onClick={() => setConfirmingSec(null)}
                style={{
                  flex: 1,
                  padding: '13px 16px',
                  borderRadius: '12px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  textAlign: 'center'
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#334155'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#1e293b'; }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmSectionSubmit(confirmingSec)}
                style={{
                  flex: 1,
                  padding: '13px 16px',
                  borderRadius: '9999px',
                  background: '#F5A623',
                  border: '1px solid #f7b64a',
                  color: '#2C1A00',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: '0 4px 18px rgba(245, 166, 35, 0.45)',
                  textAlign: 'center'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                Confirm & Submit Section
              </button>
            </div>
          </div>
        </div>,
        document.fullscreenElement || document.body
      )}
    </div>
  );
}
