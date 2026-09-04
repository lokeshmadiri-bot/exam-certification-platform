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
    setBeginnerTimeRemaining,
    intermediateTimeRemaining,
    setIntermediateTimeRemaining,
    advancedTimeRemaining,
    setAdvancedTimeRemaining,
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
      <div className="qmeta flex items-center justify-between text-slate-600 text-[12.5px] font-mono mb-4">
        <div className="flex items-center gap-3 flex-1">
          <span className="font-semibold text-slate-700">Section {sectionNum} - Q {String(localIdx).padStart(2, '0')} / {totalInSection}</span>
          <div className="bar flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
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
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : isMarked
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
          >
            {isMarked ? <BookmarkCheck className="w-3.5 h-3.5 text-amber-700" /> : <Bookmark className="w-3.5 h-3.5" />}
            <span>{isMarked ? 'Marked' : 'Mark for Review'}</span>
          </button>
          {saving === 'Saving...' ? (
            <span className="savechip flex items-center gap-1.5 text-amber-600 font-semibold">
              <i className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Saving...
            </span>
          ) : saving === 'Retrying...' ? (
            <span className="savechip flex items-center gap-1.5 text-rose-600 font-semibold">
              <i className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Retrying...
            </span>
          ) : (
            <span className="savechip flex items-center gap-1.5 text-emerald-600 font-semibold">
              <i className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Saved
            </span>
          )}
        </div>
      </div>

      {isReadOnly && (
        <div style={{
          backgroundColor: isSectionSubmitted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1.5px solid ${isSectionSubmitted ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
          color: isSectionSubmitted ? '#047857' : '#b91c1c',
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
      <h2 
        style={{
          maxWidth: '100%',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          whiteSpace: 'pre-wrap'
        }}
        className="font-display font-bold text-[23px] text-slate-900 leading-snug mb-2"
      >
        {currentQuestion.questionText}
      </h2>

      {currentQuestion.codeSnippet && (
        <div 
          style={{
            maxWidth: '100%',
            width: '100%',
            boxSizing: 'border-box',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
            overflowX: 'auto'
          }}
          className="code font-mono text-[13px] bg-slate-900 border border-slate-800 rounded-lg p-[13px_15px] text-sky-200 my-[14px]"
        >
          {currentQuestion.codeSnippet}
        </div>
      )}

      {/* Option List */}
      <div className="opts flex flex-col gap-3 mt-6 w-full max-w-full">
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
              style={{ maxWidth: '100%', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
              className={`opt flex items-center gap-3.5 p-[16px_18px] border-[1.5px] rounded-xl transition-all ${
                isReadOnly 
                  ? 'cursor-not-allowed opacity-60 bg-slate-100 border-slate-200' 
                  : 'hover:bg-slate-100 hover:border-slate-300 cursor-pointer bg-slate-50 border-slate-200'
              } ${isSelected ? 'sel border-[#2F6BFF] bg-blue-50/90 shadow-[0_0_0_3px_rgba(47,107,255,0.13)]' : ''}`}
            >
              <span className={`k w-[30px] h-[30px] rounded-lg font-mono text-[13px] font-bold flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#2F6BFF] text-white' : 'bg-slate-200 text-slate-700'
                }`}>{opt.key}</span>
              <p style={{ maxWidth: '100%', wordBreak: 'break-word', overflowWrap: 'anywhere' }} className="text-[14.5px] text-slate-800 font-medium flex-1">{opt.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
