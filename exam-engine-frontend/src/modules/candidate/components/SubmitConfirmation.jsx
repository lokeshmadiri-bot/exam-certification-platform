import React from 'react';
import { useExam } from '../context/ExamContext';

export default function SubmitConfirmation({ onConfirm }) {
  const { showConfirmSubmit, setShowConfirmSubmit, questions, answers } = useExam();

  if (!showConfirmSubmit) return null;

  const totalQuestions = questions ? questions.length : 0;
  const answeredQuestions = answers ? Object.keys(answers).length : 0;

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
        backdropFilter: 'blur(4px)',
        padding: '20px'
      }}
    >
      <div 
        style={{
          backgroundColor: '#0e2745',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '460px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          color: '#e8eefb'
        }}
      >
        <h3 className="font-display text-[21px] font-bold text-white mb-2">Submit Exam</h3>
        
        <p className="text-[14.5px] text-[#b9c9e2] mb-3 leading-relaxed">
          You have answered <strong className="text-white font-bold">{answeredQuestions}</strong> of <strong className="text-white font-bold">{totalQuestions}</strong> questions.
        </p>
        
        <p className="text-[13.5px] text-[#b9c9e2]/80 mb-6 leading-relaxed">
          Are you sure you want to finalize and submit your exam? You won't be able to re-enter this exam session.
        </p>
        
        <div className="flex gap-3 justify-end">
          <button
            className="px-5 py-2.5 rounded-xl border border-white/10 text-[#cdddf6] bg-white/5 hover:bg-white/10 font-semibold text-[13.5px] transition-all cursor-pointer"
            onClick={() => setShowConfirmSubmit(false)}
          >
            Keep working
          </button>
          
          <button
            className="px-5 py-2.5 rounded-xl bg-[#2F6BFF] hover:bg-[#2256d6] text-white font-semibold text-[13.5px] shadow-lg shadow-[#2F6BFF]/25 transition-all cursor-pointer"
            onClick={onConfirm}
          >
            Submit exam
          </button>
        </div>
      </div>
    </div>
  );
}
