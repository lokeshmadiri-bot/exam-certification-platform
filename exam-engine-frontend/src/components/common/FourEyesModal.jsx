import React from 'react';
import { UserCheck } from 'lucide-react';

export default function FourEyesModal({ show, title, description, confirmText, onConfirm, onCancel }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0b1f38]/60 backdrop-blur-[3px] flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl max-w-[460px] w-full p-[26px] shadow-2xl animate-[pop_0.25s_ease]">
        <div className="w-12 h-12 rounded-[13px] bg-[#fff3df] text-[#c9831a] flex items-center justify-center mb-[14px]">
          <UserCheck className="w-6 h-6" />
        </div>
        <h3 className="font-display text-[19px] font-semibold text-[#0E1B2E] mb-2">{title}</h3>
        <p className="text-[13.5px] text-[#5C6B82] mb-[18px] leading-relaxed">{description}</p>
        <div className="flex gap-2.5 justify-end">
          <button
            className="px-[18px] py-[11px] rounded-xl border border-[#E4EAF2] hover:bg-[#F4F7FC] hover:border-[#cdd8e8] font-semibold text-[13.5px] text-[#0E1B2E] transition-all"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-[18px] py-[11px] rounded-xl bg-[#2F6BFF] hover:bg-[#2256d6] text-white font-semibold text-[13.5px] shadow-[0_6px_16px_rgba(47,107,255,0.2)] transition-all"
            onClick={onConfirm}
          >
            {confirmText || 'Send for approval'}
          </button>
        </div>
      </div>
    </div>
  );
}
