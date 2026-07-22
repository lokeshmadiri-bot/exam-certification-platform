import React from 'react';
import { ShieldAlert, Maximize } from 'lucide-react';
import { useIntegrity } from '../../../context/IntegrityContext';

export default function FullscreenDialog() {
  const { fullscreen, watermark, enterFullscreen } = useIntegrity();

  // If fullscreen is already active or not required, do not block the UI
  if (fullscreen || !watermark.fullscreenRequired) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#071324]/90 backdrop-blur-md p-6">
      <div className="bg-[#0b1c31] border border-white/10 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
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
