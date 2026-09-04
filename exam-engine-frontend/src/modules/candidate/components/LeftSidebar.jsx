import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, Lock } from 'lucide-react';
import { useExam } from '../context/ExamContext';

export default function LeftSidebar() {
  const {
    questions,
    currentIdx,
    setCurrentIdx,
    answers,
    visitedQuestions,
    markedQuestions,
    submittedSections,
    setSubmittedSections,
    setShowConfirmSubmit,
    beginnerTimeRemaining,
    setBeginnerTimeRemaining,
    intermediateTimeRemaining,
    setIntermediateTimeRemaining,
    advancedTimeRemaining,
    setAdvancedTimeRemaining
  } = useExam();

  const [expandedSection, setExpandedSection] = useState(1);
  const [confirmingSec, setConfirmingSec] = useState(null);

  const isEasyLocked = (submittedSections && submittedSections.has('EASY')) || beginnerTimeRemaining === 0;
  const isMediumLocked = (submittedSections && submittedSections.has('MEDIUM')) || intermediateTimeRemaining === 0;
  const isHardLocked = (submittedSections && submittedSections.has('HARD')) || advancedTimeRemaining === 0;

  const isSecLocked = (secKey) => {
    if (secKey === 'HARD') return isHardLocked;
    if (secKey === 'MEDIUM') return isMediumLocked;
    return isEasyLocked;
  };

  // Group questions by difficulty dynamically with their original indices
  const easyQuestions = [];
  const mediumQuestions = [];
  const hardQuestions = [];

  questions.forEach((q, originalIndex) => {
    const diff = q.difficulty ? q.difficulty.trim().toUpperCase() : 'EASY';
    const questionWithIdx = { ...q, originalIndex };
    if (diff === 'HARD') {
      hardQuestions.push(questionWithIdx);
    } else if (diff === 'MEDIUM') {
      mediumQuestions.push(questionWithIdx);
    } else {
      easyQuestions.push(questionWithIdx);
    }
  });

  // Automatically expand the section containing the currently active question (if not locked)
  useEffect(() => {
    if (questions && questions[currentIdx]) {
      const q = questions[currentIdx];
      const diff = q.difficulty ? q.difficulty.trim().toUpperCase() : 'EASY';
      if (diff === 'HARD' && !isHardLocked) {
        setExpandedSection(3);
      } else if (diff === 'MEDIUM' && !isMediumLocked) {
        setExpandedSection(2);
      } else if (diff !== 'HARD' && diff !== 'MEDIUM' && !isEasyLocked) {
        setExpandedSection(1);
      } else {
        setExpandedSection(null);
      }
    }
  }, [currentIdx, questions, isEasyLocked, isMediumLocked, isHardLocked]);

  const toggleSection = (sectionNum) => {
    const locked = sectionNum === 1 ? isEasyLocked : (sectionNum === 2 ? isMediumLocked : isHardLocked);
    if (locked) return; // Do not expand locked sections
    setExpandedSection(expandedSection === sectionNum ? null : sectionNum);
  };

  const formatTime = (secs) => {
    if (secs === null || secs === undefined) return "--:--:--";
    if (secs < 0) secs = 0;
    const h = String(Math.floor(secs / 3600)).padStart(2, '0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const handleConfirmSectionSubmit = (secKey) => {
    if (setSubmittedSections) {
      setSubmittedSections(prev => new Set([...prev, secKey]));
    }

    setConfirmingSec(null);

    // Auto-navigate to first question of next available un-submitted & un-locked section
    const allSecKeys = ['EASY', 'MEDIUM', 'HARD'];
    const nextKey = allSecKeys.find(k => {
      const isLocked = (submittedSections && submittedSections.has(k)) || 
        (k === 'EASY' ? beginnerTimeRemaining === 0 : (k === 'MEDIUM' ? intermediateTimeRemaining === 0 : advancedTimeRemaining === 0));
      return k !== secKey && !isLocked && questions.some(q => {
        const d = q.difficulty ? q.difficulty.trim().toUpperCase() : 'EASY';
        if (k === 'EASY') return d !== 'MEDIUM' && d !== 'HARD';
        return d === k;
      });
    });

    if (nextKey) {
      const targetIdx = questions.findIndex(q => {
        const d = q.difficulty ? q.difficulty.trim().toUpperCase() : 'EASY';
        if (nextKey === 'EASY') return d !== 'MEDIUM' && d !== 'HARD';
        return d === nextKey;
      });
      if (targetIdx !== -1) {
        setCurrentIdx(targetIdx);
      }
    } else {
      setShowConfirmSubmit(true);
    }
  };

  const renderSectionQuestions = (sectionQs, secKey, secName) => {
    const isSub = submittedSections && submittedSections.has(secKey);
    const locked = isSecLocked(secKey);

    if (sectionQs.length === 0) {
      return (
        <div className="text-[12px] text-[#8A99AE] italic py-2 pl-4">
          No questions in this section
        </div>
      );
    }

    if (locked) {
      return (
        <div className="pt-2 pb-3 flex items-center justify-center">
          <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 flex items-center justify-center shadow-sm">
            <Lock className="w-4 h-4 text-amber-400" />
          </div>
        </div>
      );
    }

    return (
      <div className="pt-2 pb-3 flex flex-col gap-3">
        <div className="qnav transition-all duration-300">
          {sectionQs.map((q, sectionIdx) => {
            const isAnswered = answers[q.id] !== undefined;
            const isVisited = visitedQuestions.has(q.id);
            const isMarked = markedQuestions.has(q.id);
            const isActive = q.originalIndex === currentIdx;

            let btnClass;
            if (isActive) {
              btnClass = 'status-current';
            } else if (isAnswered && isMarked) {
              btnClass = 'status-answered-marked';
            } else if (isMarked) {
              btnClass = 'status-marked';
            } else if (isAnswered) {
              btnClass = 'status-answered';
            } else if (isVisited) {
              btnClass = 'status-visited';
            } else {
              btnClass = 'status-unvisited';
            }

            return (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(q.originalIndex)}
                className={`aspect-square rounded-lg font-mono text-xs flex items-center justify-center border transition-all ${btnClass}`}
              >
                {sectionIdx + 1}
              </button>
            );
          })}
        </div>

        {/* Submit Section button with larger size, vibrant color, and clear contrast */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex justify-center">
          {!isSub ? (
            <button
              onClick={() => setConfirmingSec({ key: secKey, label: secName })}
              style={{
                width: '100%',
                padding: '8px 16px',
                borderRadius: '9999px',
                background: '#F5A623',
                backgroundColor: '#F5A623',
                color: '#2C1A00',
                fontWeight: '800',
                fontSize: '12.5px',
                border: '1px solid #f7b64a',
                boxShadow: '0 3px 10px rgba(245, 166, 35, 0.4)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#e09518'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#F5A623'; }}
            >
              <span>Submit {secName}</span>
            </button>
          ) : (
            <div className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-700 flex items-center justify-center shadow-sm">
              <Lock className="w-4 h-4 text-emerald-600" />
            </div>
          )}
        </div>
      </div>
    );
  };

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

  return (
    <aside className="run-left-aside flex flex-col gap-4">
      <div className="aside-h text-[11px] text-[#8A99AE] font-semibold uppercase font-mono mb-2">
        Exam sections
      </div>

      <div className="flex flex-col gap-3 flex-1">
        {/* Section 1 Accordion */}
        {easyQuestions.length > 0 && (
          <div className="run-section-card">
            <button
              disabled={isEasyLocked}
              onClick={() => toggleSection(1)}
              className={`run-section-btn ${expandedSection === 1 ? 'active' : ''} ${isEasyLocked ? 'opacity-70 cursor-not-allowed bg-white/[0.02]' : ''}`}
            >
              <div className="text-left">
                <div style={{ fontSize: '13px', fontWeight: '700', color: isEasyLocked ? '#94a3b8' : (expandedSection === 1 ? '#2F6BFF' : '#0f172a') }}>
                  Section 1
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', lineHeight: '1.35' }}>
                  <div>Beginner Level</div>
                  <div style={{ color: '#0284c7', fontWeight: '600', marginTop: '1px' }}>MCQ - {easyQuestions.length}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    backgroundColor: isEasyLocked ? 'rgba(0, 0, 0, 0.05)' : (beginnerTimeRemaining <= 60 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(2, 132, 199, 0.1)'),
                    color: isEasyLocked ? '#94a3b8' : (beginnerTimeRemaining <= 60 ? '#dc2626' : '#0284c7'),
                    border: `1px solid ${isEasyLocked ? 'rgba(0, 0, 0, 0.1)' : (beginnerTimeRemaining <= 60 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(2, 132, 199, 0.3)')}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  ⏱ {formatTime(beginnerTimeRemaining)}
                </span>
                {isEasyLocked ? (
                  <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 border border-amber-500/30 flex items-center justify-center">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                  </span>
                ) : expandedSection === 1 ? (
                  <ChevronDown className="w-4 h-4 text-[#64748b]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#64748b]" />
                )}
              </div>
            </button>
            {expandedSection === 1 && !isEasyLocked && (
              <div className="run-section-content">
                {renderSectionQuestions(easyQuestions, 'EASY', 'Section 1')}
              </div>
            )}
          </div>
        )}

        {/* Section 2 Accordion */}
        {mediumQuestions.length > 0 && (
          <div className="run-section-card">
            <button
              disabled={isMediumLocked}
              onClick={() => toggleSection(2)}
              className={`run-section-btn ${expandedSection === 2 ? 'active' : ''} ${isMediumLocked ? 'opacity-70 cursor-not-allowed bg-slate-50' : ''}`}
            >
              <div className="text-left">
                <div style={{ fontSize: '13px', fontWeight: '700', color: isMediumLocked ? '#94a3b8' : (expandedSection === 2 ? '#2F6BFF' : '#0f172a') }}>
                  Section 2
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', lineHeight: '1.35' }}>
                  <div>Intermediate Level</div>
                  <div style={{ color: '#0284c7', fontWeight: '600', marginTop: '1px' }}>MCQ - {mediumQuestions.length}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    backgroundColor: isMediumLocked ? 'rgba(0, 0, 0, 0.05)' : (intermediateTimeRemaining <= 60 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(2, 132, 199, 0.1)'),
                    color: isMediumLocked ? '#94a3b8' : (intermediateTimeRemaining <= 60 ? '#dc2626' : '#0284c7'),
                    border: `1px solid ${isMediumLocked ? 'rgba(0, 0, 0, 0.1)' : (intermediateTimeRemaining <= 60 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(2, 132, 199, 0.3)')}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  ⏱ {formatTime(intermediateTimeRemaining)}
                </span>
                {isMediumLocked ? (
                  <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 border border-amber-500/30 flex items-center justify-center">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                  </span>
                ) : expandedSection === 2 ? (
                  <ChevronDown className="w-4 h-4 text-[#64748b]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#64748b]" />
                )}
              </div>
            </button>
            {expandedSection === 2 && !isMediumLocked && (
              <div className="run-section-content">
                {renderSectionQuestions(mediumQuestions, 'MEDIUM', 'Section 2')}
              </div>
            )}
          </div>
        )}

        {/* Section 3 Accordion */}
        {hardQuestions.length > 0 && (
          <div className="run-section-card">
            <button
              disabled={isHardLocked}
              onClick={() => toggleSection(3)}
              className={`run-section-btn ${expandedSection === 3 ? 'active' : ''} ${isHardLocked ? 'opacity-70 cursor-not-allowed bg-slate-50' : ''}`}
            >
              <div className="text-left">
                <div style={{ fontSize: '13px', fontWeight: '700', color: isHardLocked ? '#94a3b8' : (expandedSection === 3 ? '#2F6BFF' : '#0f172a') }}>
                  Section 3
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', lineHeight: '1.35' }}>
                  <div>Advanced Level</div>
                  <div style={{ color: '#0284c7', fontWeight: '600', marginTop: '1px' }}>MCQ - {hardQuestions.length}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    backgroundColor: isHardLocked ? 'rgba(0, 0, 0, 0.05)' : (advancedTimeRemaining <= 60 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(2, 132, 199, 0.1)'),
                    color: isHardLocked ? '#94a3b8' : (advancedTimeRemaining <= 60 ? '#dc2626' : '#0284c7'),
                    border: `1px solid ${isHardLocked ? 'rgba(0, 0, 0, 0.1)' : (advancedTimeRemaining <= 60 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(2, 132, 199, 0.3)')}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  ⏱ {formatTime(advancedTimeRemaining)}
                </span>
                {isHardLocked ? (
                  <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 border border-amber-500/30 flex items-center justify-center">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                  </span>
                ) : expandedSection === 3 ? (
                  <ChevronDown className="w-4 h-4 text-[#64748b]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#64748b]" />
                )}
              </div>
            </button>
            {expandedSection === 3 && !isHardLocked && (
              <div className="run-section-content">
                {renderSectionQuestions(hardQuestions, 'HARD', 'Section 3')}
              </div>
            )}
          </div>
        )}
      </div>

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
              Submit {typeof confirmingSec === 'object' ? confirmingSec.label : confirmingSec}?
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
                onClick={() => handleConfirmSectionSubmit(typeof confirmingSec === 'object' ? confirmingSec.key : confirmingSec)}
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
    </aside>
  );
}
