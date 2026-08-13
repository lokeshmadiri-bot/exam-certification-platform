import React from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ThankYouPage({ isOpen, attemptId }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleContinue = () => {
    if (attemptId) {
      navigate(`/candidate/result-view/${attemptId}`);
    } else {
      navigate('/candidate/dashboard');
    }
  };

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
        backgroundColor: 'rgba(6, 18, 34, 0.95)',
        backdropFilter: 'blur(6px)',
        padding: '24px',
        userSelect: 'none'
      }}
    >
      <div 
        style={{
          backgroundColor: '#0e2745',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '460px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div className="w-20 h-20 rounded-full bg-[#0e9f6e]/20 border-2 border-[#34d27b] text-[#34d27b] flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(52,210,123,0.3)]">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <h2 className="font-display text-white text-[25px] font-bold mb-3">
          Exam Submitted Successfully
        </h2>

        <p className="text-[#b9c9e2] text-[14.5px] leading-relaxed mb-6">
          Thank you for taking the exam. Your session recording and answers have been securely transmitted and recorded.
          <span className="block mt-2 text-xs font-mono text-[#8A99AE]">Result will be published later.</span>
        </p>

        <button
          onClick={handleContinue}
          className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-[#0e9f6e] to-[#057a55] hover:from-[#098259] hover:to-[#046c4b] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#0e9f6e]/25 transition-all"
        >
          <span>View Exam Results</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
