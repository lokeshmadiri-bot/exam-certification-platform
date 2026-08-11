import React from 'react';
import { RefreshCw } from 'lucide-react';

export default function ReconnectLoader({ isOpen }) {
  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(6, 18, 34, 0.85)',
        backdropFilter: 'blur(6px)',
        padding: '24px',
        userSelect: 'none'
      }}
    >
      <div 
        style={{
          backgroundColor: '#0e2745',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div className="w-14 h-14 rounded-2xl bg-[#2F6BFF]/20 text-[#2F6BFF] flex items-center justify-center mx-auto mb-4">
          <RefreshCw className="w-7 h-7 animate-spin" />
        </div>

        <h3 className="font-display text-white text-[20px] font-semibold mb-1">
          Syncing Answers...
        </h3>

        <p className="text-[#b9c9e2] text-[13px] leading-relaxed">
          Reconnected successfully. Synchronizing your exam state with the server. <span className="block mt-1 font-mono text-xs text-[#8A99AE]">Please Wait...</span>
        </p>
      </div>
    </div>
  );
}
