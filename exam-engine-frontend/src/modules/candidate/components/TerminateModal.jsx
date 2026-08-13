import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function TerminateModal({ isOpen }) {
  if (!isOpen) return null;

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
        backdropFilter: 'blur(10px)',
        padding: '16px'
      }}
    >
      <div 
        style={{
          backgroundColor: '#0e2745',
          border: '2px solid #E04F4F',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '440px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div className="w-16 h-16 rounded-full bg-[#E04F4F]/10 border-2 border-[#E04F4F] text-[#E04F4F] flex items-center justify-center mx-auto mb-5 shadow-[0_0_15px_rgba(224,79,79,0.2)]">
          <ShieldAlert className="w-8 h-8" />
        </div>
        
        <h3 className="font-display text-white text-[22px] font-bold mb-2">
          Exam Terminated
        </h3>
        
        <p className="text-[#ffb3b3] text-[14.5px] leading-relaxed mb-4">
          Multiple Violations Detected
        </p>

        <p className="text-[#b9c9e2] text-[13px] leading-relaxed mb-6">
          Your exam session was terminated automatically. Redirecting to the termination page...
        </p>

        <div className="w-10 h-10 border-[3.5px] border-white/10 border-t-[#E04F4F] rounded-full animate-spin mx-auto" />
      </div>
    </div>
  );
}
