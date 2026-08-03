import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useExam } from '../../../context/ExamContext';

export default function WarningModal() {
  const { warningToast } = useExam();

  if (!warningToast) return null;

  return (
    <div className="warn-toast fixed top-[78px] left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-[#3a2410] border border-[#F2A93B] text-[#ffd79a] px-[18px] py-3 rounded-xl shadow-2xl animate-[drop_0.3s_ease] max-w-[560px] w-full">
      <AlertTriangle className="w-5 h-5 text-[#F2A93B]" />
      <div>
        <b className="text-white text-[13.5px] block">{warningToast}</b>
        <span className="text-[12px] block">
          Leaving the exam tab again will lead to automatic termination.
        </span>
      </div>
    </div>
  );
}
