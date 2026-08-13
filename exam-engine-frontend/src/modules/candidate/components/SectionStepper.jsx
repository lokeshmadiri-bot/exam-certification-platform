import React from 'react';
import { useExam } from '../context/ExamContext';

export default function SectionStepper() {
  const { questions, currentIdx, setCurrentIdx } = useExam();

  if (questions.length === 0) return null;

  // Determine sections present in the questions list (custom sectionName or difficulty fallback)
  const availableSections = [];
  questions.forEach(q => {
    const name = q.sectionName || q.difficulty?.toUpperCase();
    if (name && !availableSections.includes(name)) {
      availableSections.push(name);
    }
  });

  const currentQuestion = questions[currentIdx];
  const activeSection = currentQuestion?.sectionName || currentQuestion?.difficulty?.toUpperCase() || 'General';

  const handleSectionClick = (section) => {
    // Find the first question index belonging to the selected section
    const targetIdx = questions.findIndex(q => (q.sectionName || q.difficulty?.toUpperCase()) === section);
    if (targetIdx !== -1) {
      setCurrentIdx(targetIdx);
    }
  };

  return (
    <div className="section-stepper flex items-center justify-center gap-6 mb-6 font-mono text-xs w-full max-w-[760px] mx-auto border-b border-white/10 pb-4">
      {availableSections.map((sec, idx) => {
        const isActive = activeSection === sec;
        const isPassed = availableSections.indexOf(activeSection) > idx;
        
        return (
          <div key={sec} className="flex items-center gap-2">
            <button
              onClick={() => handleSectionClick(sec)}
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
              <span>{sec}</span>
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
