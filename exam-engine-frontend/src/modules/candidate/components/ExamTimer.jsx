import React from 'react';
import { useExamTimer } from '../hooks/useExamTimer';

export default function Timer({ durationSeconds }) {
  const { formattedTime, timeRemaining } = useExamTimer();
  const maxTime = durationSeconds || 45 * 60;
  const safeTime = Math.max(0, timeRemaining || 0);
  const circumference = 163.36; // 2 * PI * 26
  const dashOffset = circumference - (circumference * (safeTime / maxTime));

  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '14px',
        padding: '10px 14px',
        width: '100%',
        position: 'relative'
      }}
    >
      <div 
        style={{
          position: 'relative',
          width: '64px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <svg 
          width="64" 
          height="64" 
          viewBox="0 0 64 64"
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle 
            cx="32" 
            cy="32" 
            r="26" 
            fill="none" 
            stroke="rgba(255, 255, 255, 0.06)" 
            strokeWidth="4" 
          />
          <circle
            cx="32"
            cy="32"
            r="26"
            fill="none"
            stroke="#2F6BFF"
            strokeWidth="4"
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
            fontSize: '13px',
            fontWeight: '700',
            color: '#FFFFFF'
          }}
        >
          {formattedTime}
        </div>
      </div>
      <div 
        style={{
          fontSize: '9px',
          color: '#8A99AE',
          letterSpacing: '1.2px',
          textTransform: 'uppercase',
          fontFamily: 'monospace',
          marginTop: '4px',
          fontWeight: '600'
        }}
      >
        Time remaining
      </div>
    </div>
  );
}

