import React from 'react';
import { useWatermark } from '../hooks/useWatermark';

export default function WatermarkOverlay() {
  const { watermarkEnabled, watermarkText } = useWatermark();

  if (!watermarkEnabled) return null;

  // Render a 6x4 repeated grid of watermark elements
  const items = Array(24).fill(watermarkText);

  return (
    <div className="watermark-overlay fixed inset-0 z-40 pointer-events-none user-select-none overflow-hidden opacity-[0.14] grid grid-cols-4 grid-rows-6 gap-y-24 gap-x-12">
      {items.map((text, idx) => (
        <div 
          key={idx} 
          className="watermark-item font-mono text-[11px] font-bold text-slate-800 whitespace-nowrap rotate-[-20deg] flex items-center justify-center tracking-wider"
        >
          {text}
        </div>
      ))}
    </div>
  );
}
