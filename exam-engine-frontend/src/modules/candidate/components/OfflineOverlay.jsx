import React from 'react';
import { WifiOff, Loader } from 'lucide-react';

export default function OfflineOverlay({ isOpen }) {
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
        backdropFilter: 'blur(6px)',
        padding: '24px',
        userSelect: 'none',
        pointerEvents: 'auto'
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
          <WifiOff className="w-8 h-8" />
        </div>

        <h3 className="font-display text-white text-[23px] font-bold mb-2">
          Connection Lost
        </h3>

        <div className="flex items-center justify-center gap-2 text-[#F2A93B] font-mono text-sm font-semibold mb-3">
          <Loader className="w-4 h-4 animate-spin" />
          <span>Trying to reconnect...</span>
        </div>

        <p className="text-[#b9c9e2] text-[13.5px] leading-relaxed">
          Your answers are saved locally. Interaction is disabled until connectivity is restored. 
          <b className="block text-white mt-2 font-semibold">Please do not close your browser.</b>
        </p>
      </div>
    </div>
  );
}
