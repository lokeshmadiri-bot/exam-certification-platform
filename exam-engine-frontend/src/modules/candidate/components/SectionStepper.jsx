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
    setShowConfirmSubmit
  } = useExam();

  const [confirmingSec, setConfirmingSec] = useState(null);

  if (questions.length === 0) return null;

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
    if (submittedSections && submittedSections.has(secKey)) return;
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
    const nextSec = availableSections.find(s => s.key !== secKey && (!submittedSections || !submittedSections.has(s.key)));
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
  const isCurrentSecSubmitted = submittedSections && submittedSections.has(activeSection);

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
            const isSub = submittedSections && submittedSections.has(sec.key);
            return (
              <option key={sec.key} value={sec.key} disabled={isSub}>
                {sec.label} {isSub ? '(Submitted ✓)' : ''}
              </option>
            );
          })}
        </select>

        {/* Section Pills */}
        <div className="hidden sm:flex items-center gap-2">
          {availableSections.map((sec) => {
            const isActive = activeSection === sec.key;
            const isSub = submittedSections && submittedSections.has(sec.key);
            return (
              <button
                key={sec.key}
                disabled={isSub}
                onClick={() => handleSectionClick(sec.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all font-semibold ${
                  isSub
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50 cursor-not-allowed opacity-80'
                    : isActive
                    ? 'bg-[#2F6BFF] text-white border-[#2F6BFF] shadow-[0_4px_12px_rgba(47,107,255,0.3)]'
                    : 'bg-white/5 text-[#9fb6d6] border-white/10 hover:bg-white/10'
                }`}
              >
                <span>{sec.shortLabel}</span>
                {isSub && <span className="text-xs">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit Section Button */}
      {!isCurrentSecSubmitted ? (
        <button
          onClick={() => setConfirmingSec(currentSecObj.key)}
          className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xs shadow-md border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
        >
          <span>Submit {currentSecObj.shortLabel}</span>
        </button>
      ) : (
        <span className="px-3 py-1 rounded-lg bg-emerald-950/80 border border-emerald-700/50 text-emerald-400 font-bold text-xs flex items-center gap-1">
          ✓ {currentSecObj.shortLabel} Submitted
        </span>
      )}

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
              Submit {availableSections.find(s => s.key === confirmingSec)?.shortLabel || 'Section'}?
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
                onClick={() => handleConfirmSectionSubmit(confirmingSec)}
                className="w-1/2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-extrabold text-xs shadow-lg transition-all border border-amber-400/50 cursor-pointer"
              >
                Confirm & Submit Section
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
