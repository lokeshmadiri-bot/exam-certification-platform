import React from 'react';

export default function RecordingIndicator({ isRecording }) {
  if (!isRecording) return null;

  return (
    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#E53E3E]/15 border border-[#E53E3E]/40 text-[#E53E3E] text-xs font-mono font-semibold select-none shadow-[0_0_10px_rgba(229,62,62,0.2)]">
      <span className="w-2 h-2 rounded-full bg-[#E53E3E] animate-ping" />
      <span className="w-2 h-2 rounded-full bg-[#E53E3E] -ml-4" />
      <span>REC</span>
    </div>
  );
}
