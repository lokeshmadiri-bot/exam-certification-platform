import React from 'react';
import { useExam } from '../../../context/ExamContext';
import { useAutoSave } from '../../../hooks/useAutoSave';

export default function Question() {
  const { questions, currentIdx } = useExam();
  const { selectedAnswers, saveAnswer } = useAutoSave();

  if (questions.length === 0) {
    return <div className="text-center py-12 text-[#8A99AE]">No questions found for this exam.</div>;
  }

  const currentQuestion = questions[currentIdx];
  const progressPercent = ((currentIdx + 1) / questions.length) * 100;

  return (
    <div className="run-q max-w-[760px] mx-auto">
      {/* Progress stepper */}
      <div className="qmeta flex items-center gap-3 text-[#8fa9d0] text-[12.5px] font-mono mb-4">
        <span>Q {String(currentIdx + 1).padStart(2, '0')} / {questions.length}</span>
        <div className="bar flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <i 
            className="block h-full bg-gradient-to-r from-[#2F6BFF] to-[#6e9bff] transition-all" 
            style={{ width: `${progressPercent}%` }} 
          />
        </div>
        <span className="savechip flex items-center gap-1.5 text-[#86e0b4]">
          <i className="w-1.5 h-1.5 rounded-full bg-[#34d27b] animate-pulse" /> Saved
        </span>
      </div>

      {/* Question Details */}
      <h2 className="font-display font-semibold text-[23px] text-white leading-snug mb-2">
        {currentQuestion.questionText}
      </h2>
      
      {currentQuestion.codeSnippet && (
        <div className="code font-mono text-[13px] bg-[#0c2138] border border-white/10 rounded-lg p-[13px_15px] text-[#bcd0ee] my-[14px] whitespace-pre">
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
          const isSelected = selectedAnswers[currentQuestion.id] === opt.key;
          return (
            <div
              key={opt.key}
              onClick={() => saveAnswer(currentQuestion.id, opt.key)}
              className={`opt flex items-center gap-3.5 p-[16px_18px] border-[1.5px] rounded-xl bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer ${
                isSelected ? 'sel border-[#2F6BFF] bg-[#2f6bff]/10 shadow-[0_0_0_3px_rgba(47,107,255,0.13)]' : 'border-white/10'
              }`}
            >
              <span className={`k w-[30px] h-[30px] rounded-lg font-mono text-[13px] flex items-center justify-center shrink-0 ${
                isSelected ? 'bg-[#2F6BFF] text-white' : 'bg-white/10 text-[#cdddf6]'
              }`}>{opt.key}</span>
              <p className="text-[14.5px] text-[#e3ebf8]">{opt.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
