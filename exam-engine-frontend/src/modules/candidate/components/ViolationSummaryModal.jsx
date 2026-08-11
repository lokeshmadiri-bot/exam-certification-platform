import React from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

export default function ViolationSummaryModal({ isOpen, summary, onConfirmSubmit, onClose }) {
  if (!isOpen) return null;

  const warnings = summary ? summary.warnings || 0 : 0;
  const aiFlags = summary && Array.isArray(summary.aiFlags) ? summary.aiFlags : [];

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(6, 18, 34, 0.85)',
        backdropFilter: 'blur(12px)',
        padding: '24px',
        userSelect: 'none',
        animation: 'fadeIn 0.25s ease-out'
      }}
    >
      <div 
        style={{
          backgroundColor: '#0E1F38',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '36px',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'left',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            color: '#8A99AE',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '8px',
            borderRadius: '50%',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#FFFFFF';
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#8A99AE';
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
          }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon */}
        <div 
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            backgroundColor: 'rgba(242, 169, 59, 0.15)',
            border: '1px solid rgba(242, 169, 59, 0.3)',
            color: '#F2A93B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '4px'
          }}
        >
          <AlertTriangle className="w-6 h-6" />
        </div>

        {/* Header */}
        <div>
          <h3 style={{
            fontFamily: "'Sora', sans-serif",
            color: '#FFFFFF',
            fontSize: '22px',
            fontWeight: '700',
            margin: '0 0 8px 0',
            letterSpacing: '-0.3px'
          }}>
            Violation Summary
          </h3>
          <p style={{
            color: '#B9C9E2',
            fontSize: '14px',
            lineHeight: '1.6',
            margin: 0
          }}>
            Please review the session telemetry flags logged during your proctored exam before finalizing your submission.
          </p>
        </div>

        {/* Telemetry Details Card */}
        <div 
          style={{
            backgroundColor: '#081627',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: '12px'
            }}
          >
            <span style={{ color: '#8A99AE', fontSize: '13px', fontWeight: '500' }}>Warnings Issued</span>
            <span style={{ color: '#F2A93B', fontSize: '15px', fontWeight: '700', marginLeft: 'auto', fontFamily: 'monospace' }}>
              {warnings}
            </span>
          </div>

          {aiFlags.length === 0 ? (
            <div 
              style={{
                fontSize: '13px',
                color: '#34D27B',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(52, 210, 123, 0.08)',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(52, 210, 123, 0.15)'
              }}
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span style={{ fontWeight: '500' }}>No AI behavioral flags detected.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '11px', color: '#8A99AE', textTransform: 'uppercase', tracking: '1px', fontWeight: '600' }}>
                AI Flags Breakdown
              </div>
              {aiFlags.map((item, idx) => (
                <div 
                  key={idx} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    color: '#E8EEFB'
                  }}
                >
                  <span style={{ textTransform: 'capitalize' }}>
                    {item.type ? item.type.replace(/_/g, ' ') : 'Flag'}
                  </span>
                  <span style={{ fontWeight: '700', color: '#2F6BFF', marginLeft: 'auto', fontFamily: 'monospace' }}>
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '8px'
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '11px 22px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'transparent',
              color: '#B9C9E2',
              fontWeight: '600',
              fontSize: '13.5px',
              cursor: 'pointer',
              transition: 'all 0.18s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#B9C9E2';
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirmSubmit}
            style={{
              padding: '11px 24px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #2F6BFF, #1D4ED8)',
              color: '#FFFFFF',
              fontWeight: '600',
              fontSize: '13.5px',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              boxShadow: '0 4px 14px rgba(47, 107, 255, 0.25)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(47, 107, 255, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(47, 107, 255, 0.25)';
            }}
          >
            Submit Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
