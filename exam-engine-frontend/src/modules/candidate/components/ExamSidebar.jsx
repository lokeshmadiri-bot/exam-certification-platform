import React from 'react';
import Timer from './ExamTimer';
import Navigator from './Navigator';
import { useExam } from '../context/ExamContext';

export default function Sidebar({ durationSeconds }) {
  const { videoRef, setShowConfirmSubmit } = useExam();

  return (
    <aside className="run-aside border-l border-white/10 p-[18px] flex flex-col gap-4 overflow-y-auto bg-[#081627]/60">
      {/* Timer Component */}
      <Timer durationSeconds={durationSeconds} />

      {/* Camera PIP View - Larger & prominent feed */}
      <div className="cam-pip rounded-2xl w-full h-[220px] bg-gradient-to-t from-[#0b2038] to-[#1c3c66] flex items-center justify-center border border-white/15 relative overflow-hidden shadow-xl shrink-0">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform -scale-x-100 min-h-[220px]"
        />
        <div className="rec absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/70 text-white font-mono text-[10px] px-2.5 py-1 rounded-full border border-white/10 shadow-sm backdrop-blur-sm z-10">
          <i className="w-2 h-2 rounded-full bg-[#E04F4F] animate-pulse" />
          <span className="font-semibold tracking-wider">REC</span>
        </div>
      </div>

      {/* Question Navigator */}
      <Navigator />

      {/* Action Row */}
      <div className="flex flex-col gap-2.5 mt-auto pt-1">
        <button
          onClick={() => setShowConfirmSubmit(true)}
          className="btn bg-[#F2A93B] hover:bg-[#e69f2c] text-[#3a2700] flex items-center justify-center py-3 rounded-xl font-semibold text-[13.5px] shadow-md transition-all active:scale-[0.99]"
        >
          Submit exam
        </button>
      </div>
    </aside>
  );
}

