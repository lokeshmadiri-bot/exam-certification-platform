import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
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
    setShowConfirmSubmit
  } = useExam();

  const [expandedSection, setExpandedSection] = useState(1);
  const [confirmingSec, setConfirmingSec] = useState(null);

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

  // Automatically expand the section containing the currently active question
  useEffect(() => {
    if (questions && questions[currentIdx]) {
      const q = questions[currentIdx];
      const diff = q.difficulty ? q.difficulty.trim().toUpperCase() : 'EASY';
      if (diff === 'HARD') {
        setExpandedSection(3);
      } else if (diff === 'MEDIUM') {
        setExpandedSection(2);
      } else {
        setExpandedSection(1);
      }
    }
  }, [currentIdx, questions]);

  const toggleSection = (sectionNum) => {
    setExpandedSection(expandedSection === sectionNum ? null : sectionNum);
  };

  const handleConfirmSectionSubmit = (secKey) => {
    if (setSubmittedSections) {
      setSubmittedSections(prev => new Set([...prev, secKey]));
    }
    setConfirmingSec(null);

    // Auto-navigate to first question of next available un-submitted section
    const allSecKeys = ['EASY', 'MEDIUM', 'HARD'];
    const nextKey = allSecKeys.find(k => k !== secKey && (!submittedSections || !submittedSections.has(k)) && questions.some(q => {
      const d = q.difficulty ? q.difficulty.trim().toUpperCase() : 'EASY';
      if (k === 'EASY') return d !== 'MEDIUM' && d !== 'HARD';
      return d === k;
    }));

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
    if (sectionQs.length === 0) {
      return (
        <div className="text-[12px] text-[#8A99AE] italic py-2 pl-4">
          No questions in this section
        </div>
      );
    }

    const isSub = submittedSections && submittedSections.has(secKey);

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
        <div className="mt-4 pt-3 border-t border-white/10 flex justify-center">
          {!isSub ? (
            <button
              onClick={() => setConfirmingSec({ key: secKey, label: secName })}
              className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-extrabold text-sm shadow-[0_4px_18px_rgba(234,179,8,0.45)] border border-yellow-300/60 tracking-wide transition-all duration-200 active:scale-[0.97] cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Submit {secName}</span>
            </button>
          ) : (
            <div className="w-full py-2.5 px-4 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 font-extrabold text-xs flex items-center justify-center gap-1.5 font-mono shadow-sm">
              <span>✓ {secName} Submitted</span>
            </div>
          )}
        </div>
      </div>
    );
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
              onClick={() => toggleSection(1)}
              className={`run-section-btn ${expandedSection === 1 ? 'active' : ''}`}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: expandedSection === 1 ? '#2F6BFF' : '#FFFFFF' }}>
                  Section 1
                </div>
                <div style={{ fontSize: '11px', color: '#8A99AE', marginTop: '2px' }}>
                  Beginner Level – MCQ ({easyQuestions.length})
                </div>
              </div>
              {expandedSection === 1 ? (
                <ChevronDown className="w-4 h-4 text-[#8A99AE]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#8A99AE]" />
              )}
            </button>
            {expandedSection === 1 && (
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
              onClick={() => toggleSection(2)}
              className={`run-section-btn ${expandedSection === 2 ? 'active' : ''}`}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: expandedSection === 2 ? '#2F6BFF' : '#FFFFFF' }}>
                  Section 2
                </div>
                <div style={{ fontSize: '11px', color: '#8A99AE', marginTop: '2px' }}>
                  Intermediate Level – MCQ ({mediumQuestions.length})
                </div>
              </div>
              {expandedSection === 2 ? (
                <ChevronDown className="w-4 h-4 text-[#8A99AE]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#8A99AE]" />
              )}
            </button>
            {expandedSection === 2 && (
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
              onClick={() => toggleSection(3)}
              className={`run-section-btn ${expandedSection === 3 ? 'active' : ''}`}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: expandedSection === 3 ? '#2F6BFF' : '#FFFFFF' }}>
                  Section 3
                </div>
                <div style={{ fontSize: '11px', color: '#8A99AE', marginTop: '2px' }}>
                  Advanced Level – MCQ ({hardQuestions.length})
                </div>
              </div>
              {expandedSection === 3 ? (
                <ChevronDown className="w-4 h-4 text-[#8A99AE]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#8A99AE]" />
              )}
            </button>
            {expandedSection === 3 && (
              <div className="run-section-content">
                {renderSectionQuestions(hardQuestions, 'HARD', 'Section 3')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Section Submission */}
      {confirmingSec && createPortal(
        <div className="fixed inset-0 z-[99999999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
          <div className="bg-[#111c2e] border-2 border-amber-500/40 rounded-2xl p-6 max-w-[400px] w-full text-center shadow-2xl relative flex flex-col items-center animate-in fade-in zoom-in-95 duration-150">
            {/* Warning Icon Badge */}
            <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-2xl flex items-center justify-center mb-4 shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              ⚠️
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-white mb-2 font-display">
              Submit {confirmingSec.label}?
            </h3>

            {/* Subtitle */}
            <p className="text-sky-200/80 text-xs leading-relaxed mb-6 font-medium max-w-[300px]">
              After submitting, you can't get back to this section.
            </p>

            {/* Action Buttons Row */}
            <div className="flex items-center justify-center gap-3 w-full">
              <button
                type="button"
                onClick={() => setConfirmingSec(null)}
                className="w-1/2 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-all border border-white/15 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmSectionSubmit(confirmingSec.key)}
                className="w-1/2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-extrabold text-xs shadow-lg transition-all border border-amber-400/50 cursor-pointer"
              >
                Confirm & Submit Section
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </aside>
  );
}
