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
        <div className="w-16 h-16 rounded-full bg-[#F2A93B]/10 border-2 border-[#F2A93B] text-[#F2A93B] flex items-center justify-center mx-auto mb-5 shadow-[0_0_15px_rgba(242,169,59,0.2)]">
          <AlertTriangle className="w-8 h-8" />
        </div>
        
        <h3 className="font-display text-white text-[22px] font-bold mb-2">
          {title}
        </h3>
        
        <p className="text-[#b9c9e2] text-[14.5px] leading-relaxed mb-6">
          {description}
        </p>

        <div className="flex items-center justify-center gap-1.5 mb-6">
          <span className="text-xs text-[#8A99AE] uppercase tracking-wider font-semibold mr-1">
            Status:
          </span>
          <span className={`w-3 h-3 rounded-full ${strikeCount >= 1 ? 'bg-[#F2A93B]' : 'bg-white/10'}`} />
          <span className={`w-3 h-3 rounded-full ${strikeCount >= 2 ? 'bg-[#F2A93B]' : 'bg-white/10'}`} />
          <span className={`w-3 h-3 rounded-full ${strikeCount >= 3 ? 'bg-[#F2A93B]' : 'bg-white/10'}`} />
          <span className="text-xs text-[#F2A93B] font-mono font-bold ml-2">
            {strikeCount} / 3 Warnings
          </span>
        </div>

        <button
          onClick={onClose}
          className="btn w-full bg-[#F2A93B] hover:bg-[#e69f2c] hover:scale-[1.02] text-[#3a2700] justify-center py-3.5 rounded-xl font-bold text-[14px] shadow-lg shadow-[#F2A93B]/20 transition-all"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}
