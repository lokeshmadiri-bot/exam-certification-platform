import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon, HelpCircle } from 'lucide-react';

export default function CandidateTerminatedView() {
  const navigate = useNavigate();

  return (
    <div style={{ width: '100%', maxWidth: '960px', marginLeft: 'auto', marginRight: 'auto', padding: '20px 0', textAlign: 'center' }}>
      {/* Result Hero Header */}
      <div 
        className="result-hero" 
        style={{ 
          borderRadius: '24px', 
          overflow: 'hidden', 
          background: 'linear-gradient(135deg, #3a1d1d, #5a2630)', 
          color: '#ffffff', 
          padding: '40px 30px', 
          position: 'relative', 
          boxShadow: '0 10px 30px rgba(224, 79, 79, 0.08)',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 18px', display: 'grid', placeItems: 'center', backgroundColor: 'rgba(224,79,79,0.15)', border: '2px solid #ff6b6b', color: '#ff9b9b' }}>
          <AlertOctagon className="w-10 h-10" />
        </div>
        <span style={{ fontFamily: 'monospace', letterSpacing: '2.5px', textTransform: 'uppercase', fontSize: '11px', color: '#ffb3b3', fontWeight: '700' }}>Attempt ended</span>
        <h1 className="font-display font-extrabold text-[34px] mt-2 mb-2" style={{ margin: '8px 0 6px', fontWeight: '800' }}>Exam terminated</h1>
        <div style={{ color: '#e9c9c9', fontSize: '14.5px', fontWeight: '500' }}>Attempt terminated due to an integrity policy violation.</div>
        <p style={{ color: '#d9a9a9', fontSize: '13px', maxWidth: '520px', margin: '14px auto 0', lineHeight: '1.6' }}>
          Your attempt was scored from the answers submitted so far and counts as your attempt for this 30-day window.
        </p>
      </div>

      {/* Grid of info cards */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
          gap: '24px', 
          marginTop: '28px',
          marginBottom: '32px'
        }}
      >
        <div 
          className="card pad" 
          style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '16px', 
            border: '1px solid #E4EAF2', 
            padding: '24px', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'flex-start',
            textAlign: 'left',
            boxShadow: '0 4px 12px rgba(11,31,56,0.03)'
          }}
        >
          <span className="chip" style={{ backgroundColor: '#fde8e8', color: '#bb2e2e', fontSize: '11.5px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', marginBottom: '12px' }}>What happened</span>
          <p style={{ fontSize: '13px', color: '#5C6B82', lineHeight: '1.6', margin: 0 }}>
            Leaving the exam tab three times triggers automatic termination, as explained before you began.
          </p>
        </div>

        <div 
          className="card pad" 
          style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '16px', 
            border: '1px solid #E4EAF2', 
            padding: '24px', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'flex-start',
            textAlign: 'left',
            boxShadow: '0 4px 12px rgba(11,31,56,0.03)'
          }}
        >
          <span className="chip" style={{ backgroundColor: '#eef2f8', color: '#5C6B82', fontSize: '11.5px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', marginBottom: '12px' }}>Your result</span>
          <p style={{ fontSize: '13px', color: '#5C6B82', lineHeight: '1.6', margin: 0 }}>
            A level has been assigned from your partial answers. Your administrator can see the full detail.
          </p>
        </div>

        <div 
          className="card pad" 
          style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '16px', 
            border: '1px solid #E4EAF2', 
            padding: '24px', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'flex-start',
            textAlign: 'left',
            boxShadow: '0 4px 12px rgba(11,31,56,0.03)'
          }}
        >
          <span className="chip" style={{ backgroundColor: '#fdf3da', color: '#9c7400', fontSize: '11.5px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', marginBottom: '12px' }}>Next attempt</span>
          <p style={{ fontSize: '13px', color: '#5C6B82', lineHeight: '1.6', margin: 0 }}>
            You can retake this certification in 30 days. If this was a genuine technical fault, contact your administrator for an override.
          </p>
        </div>
      </div>

      {/* Spaced Action buttons */}
      <div 
        style={{ 
          display: 'flex', 
          gap: '16px', 
          justifyContent: 'center', 
          marginTop: '32px',
          paddingBottom: '20px'
        }}
      >
        <button
          onClick={() => navigate('/candidate/help')}
          className="btn"
          style={{
            backgroundColor: 'transparent',
            border: '1.5px solid #2F6BFF',
            color: '#2F6BFF',
            fontWeight: '600',
            fontSize: '13.5px',
            padding: '12px 24px',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          Read exam rules
        </button>
        <button
          onClick={() => navigate('/candidate')}
          className="btn"
          style={{
            backgroundColor: '#2F6BFF',
            color: '#ffffff',
            fontWeight: '600',
            fontSize: '13.5px',
            padding: '12px 24px',
            borderRadius: '12px',
            cursor: 'pointer',
            border: 'none',
            boxShadow: '0 4px 12px rgba(47,107,255,0.2)',
            transition: 'all 0.15s'
          }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
