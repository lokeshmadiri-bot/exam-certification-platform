import React from 'react';
import { useExam } from '../context/ExamContext';

export default function Reconnect() {
  const { offline } = useExam();

  if (!offline) return null;

  return (
    <div className="run-overlay fixed inset-0 z-50 bg-[#061222]/90 backdrop-blur-md flex items-center justify-center">
      <div className="ov-card bg-[#0e2745] border border-white/10 rounded-2xl p-[34px_38px] text-center max-w-[430px] shadow-2xl">
        <div className="ov-spin w-11 h-11 border-[3.5px] border-white/10 border-t-[#F2A93B] rounded-full animate-spin mx-auto mb-4" />
        <h3 className="font-display text-white text-[21px] font-semibold mb-2">Connection lost — reconnecting</h3>
        <p className="text-[#b9c9e2] text-[13.5px] leading-relaxed">
          Your answers are saved automatically. The timer keeps running, so stay on this screen — we'll restore your exam the moment you're back online.
        </p>
      </div>
    </div>
  );
}
