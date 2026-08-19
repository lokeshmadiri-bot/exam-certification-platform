import React from 'react';
import { useExamTimer } from '../hooks/useExamTimer';
import { useExam } from '../context/ExamContext';

export default function Timer({ durationSeconds }) {
  const { formattedTime, timeRemaining } = useExamTimer();
  const { examDuration } = useExam();
  
  const maxTime = examDuration || durationSeconds || 45 * 60;
  const safeTime = Math.max(0, timeRemaining || 0);
  const radius = 12;
  const circumference = 2 * Math.PI * radius; // 75.4
  const dashOffset = circumference - (circumference * (safeTime / maxTime));

  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        padding: '4px 12px',
        height: '34px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
      }}
    >
      <div 
        style={{
          position: 'relative',
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <svg 
          width="28" 
          height="28" 
          viewBox="0 0 28 28"
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle 
            cx="14" 
            cy="14" 
            r={radius} 
            fill="none" 
            stroke="rgba(255, 255, 255, 0.1)" 
            strokeWidth="2" 
          />
          <circle
            cx="14"
            cy="14"
            r={radius}
            fill="none"
            stroke="#2F6BFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-1000"
          />
        </svg>
        <div 
          style={{
            position: 'absolute',
            fontFamily: 'monospace',
            fontSize: '9px',
            fontWeight: '700',
            color: '#FFFFFF'
          }}
        >
          ⏱️
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div 
          style={{
            fontFamily: 'monospace',
            fontSize: '13px',
            fontWeight: '700',
            color: '#FFFFFF',
            lineHeight: '1'
          }}
        >
          {formattedTime}
        </div>
        <div 
          style={{
            fontSize: '8px',
            color: '#8A99AE',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            fontFamily: 'monospace',
            fontWeight: '600',
            marginTop: '2px',
            lineHeight: '1'
          }}
        >
          Time left
        </div>
      </div>
    </div>
  );
}
