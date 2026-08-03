import React from 'react';
import Timer from '../Timer';
import Navigator from '../Navigator';
import { useExam } from '../../../context/ExamContext';
import { useRaiseHand } from '../../../hooks/useRaiseHand';

export default function Sidebar({ durationSeconds }) {
  const { videoRef, setShowConfirmSubmit } = useExam();
  const { raiseCount, raiseHand } = useRaiseHand();

  return (
    <aside className="run-aside border-l border-white/10 p-[22px] flex flex-col gap-5 overflow-y-auto bg-[#081627]/60">
      {/* Timer Component */}
      <Timer durationSeconds={durationSeconds} />

      {/* Camera PIP View */}
      <div className="cam-pip rounded-2xl aspect-[4/3] bg-gradient-to-t from-[#0b2038] to-[#1c3c66] flex items-center justify-center border border-white/10 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform -scale-x-100"
        />
        <div className="rec absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 text-white font-mono text-[10px] px-2 py-0.5 rounded-full">
          <i className="w-1.5 h-1.5 rounded-full bg-[#E04F4F]" />
          <span>REC</span>
        </div>
      </div>

      {/* Question Navigator */}
      <Navigator />

      {/* Action Row */}
      <div className="flex flex-col gap-2.5 mt-auto">
        <button
          onClick={raiseHand}
          className="btn ghost flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-[#cdddf6] hover:bg-white/10 py-3 rounded-xl font-semibold text-[13.5px]"
        >
          <span>Raise hand</span>
          <span className="font-mono text-xs text-[#8A99AE]">{raiseCount}/5</span>
        </button>
        
        <button
          onClick={() => setShowConfirmSubmit(true)}
          className="btn bg-[#F2A93B] hover:bg-[#e69f2c] text-[#3a2700] flex items-center justify-center py-3 rounded-xl font-semibold text-[13.5px] shadow-md"
        >
          Submit exam
        </button>
      </div>
    </aside>
  );
}
