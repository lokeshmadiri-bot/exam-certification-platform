import React, { useEffect } from 'react';
import { Check } from 'lucide-react';

export default function Toast({ message, show, onClose }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 2600);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0B1F38] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-[13.5px] font-medium transition-all duration-300 transform translate-y-0"
    >
      <div className="bg-[#34d27b]/20 p-1 rounded-full text-[#34d27b]">
        <Check className="w-4.5 h-4.5" />
      </div>
      <span>{message}</span>
    </div>
  );
}
