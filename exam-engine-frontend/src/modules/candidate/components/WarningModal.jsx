import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function WarningModal({ isOpen, strikeCount, lastViolation, onClose }) {
  if (!isOpen) return null;

  const isFinal = strikeCount === 3;
  const title = isFinal ? 'Final Warning' : 'Proctoring Warning';
  
  let description = 'You left the exam window.';
  if (isFinal) {
    description = 'One more violation will terminate your exam immediately.';
  } else if (lastViolation) {
    const type = lastViolation.type;
    if (type === 'FULLSCREEN_EXIT') {
      description = 'You exited fullscreen mode. Fullscreen is strictly required during the proctored exam.';
    } else if (type === 'MULTIPLE_FACES') {
      description = 'Multiple faces detected in the camera feed. Please ensure you are alone in front of the webcam.';
    } else if (type === 'FACE_NOT_DETECTED') {
      description = 'Your face was not detected in the camera for 30 seconds. Please ensure you remain visible to the webcam throughout the exam.';
    } else if (type === 'MOBILE_PHONE') {
      description = 'Mobile phone detected in the camera feed. Mobile devices are not allowed during the exam.';
    } else if (type === 'TAB_SWITCH' || type === 'VISIBILITY_CHANGE') {
      description = 'You switched tabs or left the active exam window.';
    } else if (type === 'WINDOW_BLUR') {
      description = 'The exam window lost focus. Please remain focused on the exam screen.';
    } else if (type === 'WINDOW_RESIZE') {
      description = 'The exam window was resized. Resizing is flagged as suspicious activity.';
    }
  }

  const buttonText = isFinal ? 'Continue' : 'Continue Exam';

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(6, 18, 34, 0.85)',
        backdropFilter: 'blur(6px)',
        padding: '16px'
      }}
    >
      <div 
        style={{
          backgroundColor: '#0e2745',
          border: '2px solid #F2A93B',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '440px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div 
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(242, 169, 59, 0.12)',
            border: '2px solid #F2A93B',
            color: '#F2A93B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
            boxShadow: '0 0 15px rgba(242, 169, 59, 0.2)'
          }}
        >
          <AlertTriangle className="w-8 h-8" />
        </div>
        
        <h3 style={{ color: '#white', fontSize: '22px', fontWeight: '700', marginBottom: '8px', color: '#FFFFFF', fontFamily: 'sans-serif' }}>
          {title}
        </h3>
        
        <p style={{ color: '#b9c9e2', fontSize: '14.5px', lineHeight: '1.6', marginBottom: '24px', fontFamily: 'sans-serif' }}>
          {description}
        </p>

        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '24px'
          }}
        >
          <span 
            style={{
              fontSize: '12px',
              color: '#8A99AE',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: '700',
              marginRight: '4px',
              fontFamily: 'monospace'
            }}
          >
            Status:
          </span>
          <span 
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: strikeCount >= 1 ? '#F2A93B' : 'rgba(255, 255, 255, 0.1)',
              display: 'inline-block'
            }}
          />
          <span 
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: strikeCount >= 2 ? '#F2A93B' : 'rgba(255, 255, 255, 0.1)',
              display: 'inline-block'
            }}
          />
          <span 
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: strikeCount >= 3 ? '#F2A93B' : 'rgba(255, 255, 255, 0.1)',
              display: 'inline-block'
            }}
          />
          <span 
            style={{
              fontSize: '12px',
              color: '#F2A93B',
              fontFamily: 'monospace',
              fontWeight: '750',
              marginLeft: '8px'
            }}
          >
            {strikeCount} / 3 Warnings
          </span>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            backgroundColor: '#F2A93B',
            color: '#3a2700',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 24px',
            fontWeight: '700',
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 6px 16px rgba(242, 169, 59, 0.25)',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e69f2c';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#F2A93B';
            e.currentTarget.style.transform = 'none';
          }}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}
