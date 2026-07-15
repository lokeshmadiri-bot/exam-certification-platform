import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function WarningModal({ isOpen, strikeCount, onClose }) {
  if (!isOpen) return null;

  const isFinal = strikeCount === 2;
  const title = isFinal ? 'Final Warning' : 'Warning';
  const description = isFinal
    ? 'One more violation will terminate your exam.'
    : 'You left the exam window.';
  const buttonText = isFinal ? 'Continue' : 'Continue Exam';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#061222]/80 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-[#0e2745] border-2 border-[#F2A93B] rounded-2xl p-[34px_38px] text-center max-w-[440px] w-full shadow-2xl relative animate-[scaleIn_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
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
