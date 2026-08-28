import React from 'react';
import { ShieldAlert, Maximize } from 'lucide-react';
import { useIntegrity } from '../context/IntegrityContext';

export default function FullscreenDialog() {
  const { fullscreen, watermark, enterFullscreen } = useIntegrity();

  // If fullscreen is already active or not required, do not block the UI
  if (fullscreen || !watermark.fullscreenRequired) return null;

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
        backgroundColor: 'rgba(7, 19, 36, 0.95)',
        backdropFilter: 'blur(6px)',
        padding: '24px'
      }}
    >
      <div 
        style={{
          backgroundColor: '#0b1c31',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div className="w-16 h-16 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="font-display font-bold text-2xl text-white mb-3">Fullscreen Required</h2>
        <p className="text-sm text-[#8fa9d0] leading-relaxed mb-8">
          To ensure the integrity of this examination, you are required to remain in fullscreen mode. 
          Leaving fullscreen blocks all actions and logs security alerts.
        </p>
        <button
          onClick={enterFullscreen}
          className="w-full flex items-center justify-center gap-2 bg-[#2F6BFF] hover:bg-[#2256d6] text-white font-semibold text-sm py-3.5 px-6 rounded-xl shadow-lg transition-all"
        >
          <Maximize className="w-4 h-4" />
          <span>Enter Fullscreen Mode</span>
        </button>
      </div>
    </div>
  );
}
