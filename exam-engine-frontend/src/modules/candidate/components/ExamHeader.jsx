import React from 'react';
import { Monitor } from 'lucide-react';
import { useExam } from '../context/ExamContext';
import RecordingIndicator from './RecordingIndicator';

export default function Header({ examTitle }) {
  const { strikes } = useExam();

  return (
    <div className="run-top flex items-center justify-between px-6 py-4 border-b border-white/10 z-10 bg-[#081627]">
      <div className="x flex items-center gap-3">
        <div className="glyph w-[34px] h-[34px] rounded-lg bg-gradient-to-br from-[#2F6BFF] to-[#5b8cff] flex items-center justify-center shrink-0">
          <Monitor className="w-[18px] h-[18px] text-white" />
        </div>
        <div>
          <b className="font-display text-sm font-semibold text-white">{examTitle}</b>
        </div>
      </div>

      <div className="flex items-center gap-5 ml-auto">
        <RecordingIndicator isRecording={true} />
        <div className="run-strikes flex items-center gap-1.5 text-xs text-[#c7d6ee]" title="Tab switch warnings">
          <span>Strikes</span>
          <span className={`s w-2.5 h-2.5 rounded-full border border-white/25 ${strikes >= 1 ? 'used bg-[#F2A93B] border-none' : 'bg-white/10'}`} />
          <span className={`s w-2.5 h-2.5 rounded-full border border-white/25 ${strikes >= 2 ? 'used bg-[#F2A93B] border-none' : 'bg-white/10'}`} />
          <span className={`s w-2.5 h-2.5 rounded-full border border-white/25 ${strikes >= 3 ? 'used bg-[#F2A93B] border-none' : 'bg-white/10'}`} />
        </div>
        <div className="run-integrity flex items-center gap-2 bg-[#11371f] border border-[#1d5e34] text-[#9fc4a8] text-xs px-3.5 py-1.5 rounded-full font-medium">
          <i className="w-2.5 h-2.5 rounded-full bg-[#34d27b] shadow-[0_0_0_4px_rgba(52,210,123,0.13)]" />
          <span>Proctoring active</span>
        </div>
      </div>
    </div>
  );
}
