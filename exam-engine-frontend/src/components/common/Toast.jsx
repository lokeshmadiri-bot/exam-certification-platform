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
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        backgroundColor: '#0B1F38',
        color: '#FFFFFF',
        padding: '12px 20px',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '13.5px',
        fontWeight: '500',
        pointerEvents: 'none'
      }}
    >
      <div 
        style={{
          backgroundColor: 'rgba(52, 210, 123, 0.15)',
          padding: '6px',
          borderRadius: '50%',
          color: '#34d27b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Check style={{ width: '18px', height: '18px' }} />
      </div>
      <span style={{ color: '#FFFFFF' }}>{message}</span>
    </div>
  );
}
