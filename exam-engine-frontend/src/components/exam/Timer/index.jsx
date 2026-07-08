import React from 'react';
import { useExam } from '../../../context/ExamContext';
import { useExamTimer } from '../../../hooks/useExamTimer';

export default function Timer({ durationSeconds }) {
  const { formattedTime, timeRemaining } = useExamTimer();
  const maxTime = durationSeconds || 45 * 60;
  const dashOffset = 364 - (364 * (timeRemaining / maxTime));

  return (
    <div className="ring-timer flex flex-col items-center gap-2">
      <svg width="132" height="132" viewBox="0 0 132 132">
        <circle cx="66" cy="66" r="58" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
        <circle
          cx="66"
          cy="66"
          r="58"
          fill="none"
          stroke="#2F6BFF"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray="364"
          strokeDashoffset={dashOffset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="t font-mono text-[26px] font-semibold text-white mt-[-92px]">
        {formattedTime}
      </div>
      <div className="lab text-[11px] text-[#8A99AE] tracking-widest font-mono uppercase mt-[62px]">
        Time remaining
      </div>
    </div>
  );
}
