import React from 'react';
import { RefreshCw } from 'lucide-react';

export default function ReconnectLoader({ isOpen }) {
  if (!isOpen) return null;

  return (
    <div className="run-overlay fixed inset-0 z-[9998] bg-[#061222]/85 backdrop-blur-md flex items-center justify-center p-6 select-none">
      <div className="ov-card bg-[#0e2745] border border-white/10 rounded-2xl p-[32px_36px] text-center max-w-[400px] w-full shadow-2xl relative">
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
