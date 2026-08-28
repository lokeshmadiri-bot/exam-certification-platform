import React from 'react';
import { useExam } from '../context/ExamContext';

export default function SectionStepper() {
  const { questions, currentIdx, setCurrentIdx } = useExam();

  if (questions.length === 0) return null;

  const easyQs = questions.filter(q => {
    const d = q.difficulty ? q.difficulty.trim().toUpperCase() : 'EASY';
    return d !== 'MEDIUM' && d !== 'HARD';
  });
  const mediumQs = questions.filter(q => q.difficulty?.trim().toUpperCase() === 'MEDIUM');
  const hardQs = questions.filter(q => q.difficulty?.trim().toUpperCase() === 'HARD');

  const availableSections = [];
  if (easyQs.length > 0) availableSections.push({ key: 'EASY', label: 'Section 1' });
  if (mediumQs.length > 0) availableSections.push({ key: 'MEDIUM', label: 'Section 2' });
  if (hardQs.length > 0) availableSections.push({ key: 'HARD', label: 'Section 3' });

  const currentQuestion = questions[currentIdx];
  const qDiff = currentQuestion?.difficulty ? currentQuestion.difficulty.trim().toUpperCase() : 'EASY';
  const activeSection = qDiff === 'HARD' ? 'HARD' : (qDiff === 'MEDIUM' ? 'MEDIUM' : 'EASY');

  const handleSectionClick = (secKey) => {
    const targetIdx = questions.findIndex(q => {
      const d = q.difficulty ? q.difficulty.trim().toUpperCase() : 'EASY';
      if (secKey === 'EASY') return d !== 'MEDIUM' && d !== 'HARD';
      return d === secKey;
    });
    if (targetIdx !== -1) {
      setCurrentIdx(targetIdx);
    }
  };

  return (
    <div className="section-stepper flex flex-wrap items-center justify-center gap-3 sm:gap-6 mb-6 font-mono text-xs w-full max-w-[760px] mx-auto border-b border-white/10 pb-4">
      {availableSections.map((sec, idx) => {
        const isActive = activeSection === sec.key;
        const isPassed = availableSections.findIndex(s => s.key === activeSection) > idx;
        
        return (
          <div key={sec.key} className="flex items-center gap-2">
            <button
              onClick={() => handleSectionClick(sec.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all font-semibold ${
                isActive
                  ? 'bg-[#2F6BFF] text-white border-[#2F6BFF] shadow-[0_4px_12px_rgba(47,107,255,0.3)]'
                  : isPassed
                  ? 'bg-[#11371f] text-[#9fc4a8] border-[#1d5e34]'
                  : 'bg-white/5 text-[#9fb6d6] border-white/10 hover:bg-white/10'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                isActive ? 'bg-white text-[#2F6BFF]' : 'bg-white/10'
              }`}>
                {idx + 1}
              </span>
              <span>{sec.label}</span>
            </button>
            
            {idx < availableSections.length - 1 && (
              <div className="w-8 h-[2px] bg-white/10" />
            )}
          </div>
        );
      })}
    </div>
  );
}
