import React, { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useExam } from '../context/ExamContext';
import { useAutoSave } from '../hooks/useAutoSave';

export default function Question() {
  const { 
    questions, 
    currentIdx, 
    setCurrentIdx,
    setVisitedQuestions, 
    markedQuestions, 
    setMarkedQuestions,
    beginnerTimeRemaining,
    intermediateTimeRemaining,
    advancedTimeRemaining,
    submittedSections,
    setSubmittedSections,
    setShowConfirmSubmit
  } = useExam();
  const { answers, saving, saveAnswer } = useAutoSave();

  const [confirmingSec, setConfirmingSec] = useState(null);

  if (questions.length === 0) {
    return <div className="text-center py-12 text-[#8A99AE]">No questions found for this exam.</div>;
  }

  const currentQuestion = questions[currentIdx];
  const qDiff = currentQuestion?.difficulty ? currentQuestion.difficulty.trim().toUpperCase() : 'EASY';
  const activeSection = qDiff === 'HARD' ? 'HARD' : (qDiff === 'MEDIUM' ? 'MEDIUM' : 'EASY');
  const secLabel = activeSection === 'HARD' ? 'Section 3 (Advanced)' : (activeSection === 'MEDIUM' ? 'Section 2 (Intermediate)' : 'Section 1 (Beginner)');
  const isExpired = activeSection === 'HARD'
    ? advancedTimeRemaining === 0
    : (activeSection === 'MEDIUM' ? intermediateTimeRemaining === 0 : beginnerTimeRemaining === 0);
  const isSectionSubmitted = submittedSections && submittedSections.has(activeSection);
  const isReadOnly = isExpired || isSectionSubmitted;

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

  // Group and count section relative indexes
  const getSectionInfo = () => {
    if (!currentQuestion) return { sectionNum: 1, localIdx: 0, totalInSection: 0 };
    const diff = currentQuestion.difficulty ? currentQuestion.difficulty.trim().toUpperCase() : 'EASY';
    
    const sameDiffQs = questions.filter(q => {
      const qDiff = q.difficulty ? q.difficulty.trim().toUpperCase() : 'EASY';
      if (diff === 'HARD') return qDiff === 'HARD';
      if (diff === 'MEDIUM') return qDiff === 'MEDIUM';
      return qDiff !== 'MEDIUM' && qDiff !== 'HARD';
    });

    const localIndex = sameDiffQs.findIndex(q => q.id === currentQuestion.id);
    const sectionNum = diff === 'HARD' ? 3 : (diff === 'MEDIUM' ? 2 : 1);
    
    return {
      sectionNum,
      localIdx: localIndex !== -1 ? localIndex + 1 : 1,
      totalInSection: sameDiffQs.length
    };
  };

  const { sectionNum, localIdx, totalInSection } = getSectionInfo();
  const progressPercent = totalInSection > 0 ? (localIdx / totalInSection) * 100 : 0;

  // Track visited questions
  useEffect(() => {
    if (currentQuestion) {
      setVisitedQuestions((prev) => {
        const updated = new Set(prev);
        updated.add(currentQuestion.id);
        return updated;
      });
    }
  }, [currentIdx, currentQuestion, setVisitedQuestions]);

  const isMarked = markedQuestions.has(currentQuestion?.id);

  const toggleMarkForReview = () => {
    if (isExpired) return;
    setMarkedQuestions((prev) => {
      const updated = new Set(prev);
      if (updated.has(currentQuestion.id)) {
        updated.delete(currentQuestion.id);
      } else {
        updated.add(currentQuestion.id);
      }
      return updated;
    });
  };

  return (
    <div className="run-q max-w-[760px] mx-auto px-2 sm:px-4">
      {/* Progress stepper */}
      <div className="qmeta flex items-center justify-between text-[#8fa9d0] text-[12.5px] font-mono mb-4">
        <div className="flex items-center gap-3 flex-1">
          <span>Section {sectionNum} - Q {String(localIdx).padStart(2, '0')} / {totalInSection}</span>
          <div className="bar flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <i
              className="block h-full bg-gradient-to-r from-[#2F6BFF] to-[#6e9bff] transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-4 ml-4">
          <button
            onClick={toggleMarkForReview}
            disabled={isReadOnly}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${
              isReadOnly
                ? 'bg-white/5 text-[#8A99AE]/40 border-white/5 cursor-not-allowed'
                : isMarked
                ? 'bg-[#854d0e] text-[#fef08a] border-[#ca8a04]'
                : 'bg-white/5 text-[#9fb6d6] border-white/10 hover:bg-white/10'
            }`}
          >
            {isMarked ? <BookmarkCheck className="w-3.5 h-3.5 text-[#fef08a]" /> : <Bookmark className="w-3.5 h-3.5" />}
            <span>{isMarked ? 'Marked' : 'Mark for Review'}</span>
          </button>
          {saving === 'Saving...' ? (
            <span className="savechip flex items-center gap-1.5 text-[#ffc58a]">
              <i className="w-1.5 h-1.5 rounded-full bg-[#F2A93B] animate-pulse" /> Saving...
            </span>
          ) : saving === 'Retrying...' ? (
            <span className="savechip flex items-center gap-1.5 text-[#ff9e9e]">
              <i className="w-1.5 h-1.5 rounded-full bg-[#ea3a3a] animate-pulse" /> Retrying...
            </span>
          ) : (
            <span className="savechip flex items-center gap-1.5 text-[#86e0b4]">
              <i className="w-1.5 h-1.5 rounded-full bg-[#34d27b] animate-pulse" /> Saved
            </span>
          )}
        </div>
      </div>

      {isReadOnly && (
        <div style={{
          backgroundColor: isSectionSubmitted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1.5px solid ${isSectionSubmitted ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
          color: isSectionSubmitted ? '#6ee7b7' : '#fca5a5',
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '12.5px',
          fontWeight: '600',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>{isSectionSubmitted ? '✓' : '⚠️'}</span>
          <span>
            {isSectionSubmitted
              ? 'Section Submitted: This section has been submitted and cannot be modified further.'
              : 'Section Time Expired: You can no longer select or modify answers in this section.'}
          </span>
        </div>
      )}

      {/* Question Details */}
      <h2 className="font-display font-semibold text-[23px] text-white leading-snug mb-2">
        {currentQuestion.questionText}
      </h2>

      {currentQuestion.codeSnippet && (
        <div className="code font-mono text-[13px] bg-[#0c2138] border border-white/10 rounded-lg p-[13px_15px] text-[#bcd0ee] my-[14px] whitespace-pre-wrap break-all">
          {currentQuestion.codeSnippet}
        </div>
      )}

      {/* Option List */}
      <div className="opts flex flex-col gap-3 mt-6">
        {[
          { key: 'A', text: currentQuestion.optionA },
          { key: 'B', text: currentQuestion.optionB },
          { key: 'C', text: currentQuestion.optionC },
          { key: 'D', text: currentQuestion.optionD }
        ].map((opt) => {
          const isSelected = answers[currentQuestion.id] === opt.key;
          return (
            <div
              key={opt.key}
              onClick={() => {
                if (isReadOnly) return;
                saveAnswer(currentQuestion.id, opt.key);
              }}
              className={`opt flex items-center gap-3.5 p-[16px_18px] border-[1.5px] rounded-xl bg-white/5 transition-all ${
                isReadOnly 
                  ? 'cursor-not-allowed opacity-60 border-white/5' 
                  : 'hover:bg-white/10 hover:border-white/20 cursor-pointer'
              } ${isSelected ? 'sel border-[#2F6BFF] bg-[#2f6bff]/10 shadow-[0_0_0_3px_rgba(47,107,255,0.13)]' : 'border-white/10'}`}
            >
              <span className={`k w-[30px] h-[30px] rounded-lg font-mono text-[13px] flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#2F6BFF] text-white' : 'bg-white/10 text-[#cdddf6]'
                }`}>{opt.key}</span>
              <p className="text-[14.5px] text-[#e3ebf8]">{opt.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
