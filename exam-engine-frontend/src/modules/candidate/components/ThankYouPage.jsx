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
        zIndex: 10001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(4, 10, 22, 0.96)',
        backdropFilter: 'blur(8px)',
        padding: '24px',
        userSelect: 'none'
      }}
    >
      <div 
        style={{
          backgroundColor: '#0a1628',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '40px 32px 32px 32px',
          maxWidth: '460px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)'
        }}
      >
        {/* Success Icon */}
        <div 
          style={{
            width: '76px',
            height: '76px',
            borderRadius: '50%',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '2px solid #10B981',
            color: '#10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
          }}
        >
          <CheckCircle2 style={{ width: '38px', height: '38px' }} />
        </div>

        {/* Title */}
        <h2 
          style={{
            fontFamily: 'inherit',
            color: '#ffffff',
            fontSize: '24px',
            fontWeight: '700',
            margin: '0 0 12px 0',
            letterSpacing: '-0.3px'
          }}
        >
          Exam Submitted Successfully
        </h2>

        {/* Description */}
        <p 
          style={{
            color: '#b9c9e2',
            fontSize: '14.5px',
            lineHeight: '1.6',
            margin: '0 0 16px 0'
          }}
        >
          Thank you for taking the exam. Your session recording and answers have been securely transmitted and recorded.
        </p>

        {/* Info Banner for publication notice */}
        <div 
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '10px',
            padding: '12px 16px',
            margin: '0 0 24px 0',
            color: '#8A99AE',
            fontSize: '12.5px',
            fontFamily: 'monospace',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <span>Result will be published later.</span>
        </div>

        {/* View Results Button */}
        <button
          onClick={handleContinue}
          style={{
            width: '100%',
            padding: '14px 24px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            border: 'none',
            color: '#ffffff',
            fontWeight: '600',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
            transition: 'all 0.18s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.45)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.3)';
          }}
        >
          <span>View Exam Results</span>
          <ArrowRight style={{ width: '16px', height: '16px' }} />
        </button>
      </div>
    </div>
  );
}
