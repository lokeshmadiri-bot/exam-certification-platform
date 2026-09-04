import React from 'react';
import { createPortal } from 'react-dom';
import { useExam } from '../context/ExamContext';
import { FileText, ArrowRight, X } from 'lucide-react';

export default function SubmitConfirmation({ onConfirm }) {
  const { showConfirmSubmit, setShowConfirmSubmit, questions, answers } = useExam();

  if (!showConfirmSubmit) return null;

  const totalQuestions = questions ? questions.length : 0;
  const answeredQuestions = answers ? Object.keys(answers).length : 0;
  const unansweredCount = totalQuestions - answeredQuestions;
  const progressPct = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  const easyQs = (questions || []).filter(q => {
    const d = q.difficulty ? q.difficulty.trim().toUpperCase() : 'EASY';
    return d !== 'MEDIUM' && d !== 'HARD';
  });
  const mediumQs = (questions || []).filter(q => q.difficulty?.trim().toUpperCase() === 'MEDIUM');
  const hardQs = (questions || []).filter(q => q.difficulty?.trim().toUpperCase() === 'HARD');

  const sectionBreakdown = [];
  if (easyQs.length > 0) {
    const unans = easyQs.filter(q => !answers || answers[q.id] === undefined || answers[q.id] === null || answers[q.id] === '').length;
    sectionBreakdown.push({ label: 'Section 1', shortLabel: 'Sec 1', unanswered: unans, total: easyQs.length });
  }
  if (mediumQs.length > 0) {
    const unans = mediumQs.filter(q => !answers || answers[q.id] === undefined || answers[q.id] === null || answers[q.id] === '').length;
    sectionBreakdown.push({ label: 'Section 2', shortLabel: 'Sec 2', unanswered: unans, total: mediumQs.length });
  }
  if (hardQs.length > 0) {
    const unans = hardQs.filter(q => !answers || answers[q.id] === undefined || answers[q.id] === null || answers[q.id] === '').length;
    sectionBreakdown.push({ label: 'Section 3', shortLabel: 'Sec 3', unanswered: unans, total: hardQs.length });
  }

  return createPortal(
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 99999999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(6, 18, 34, 0.88)',
        backdropFilter: 'blur(8px)',
        padding: '20px',
        userSelect: 'none'
      }}
    >
      <div
        style={{
          backgroundColor: '#0c1f3a',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '20px',
          padding: '0',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.65)',
          color: '#e8eefb',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Close button */}
        <button
          onClick={() => setShowConfirmSubmit(false)}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '50%',
            color: '#8A99AE',
            cursor: 'pointer',
            width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.18s ease',
            zIndex: 1
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#8A99AE'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
        >
          <X style={{ width: '14px', height: '14px' }} />
        </button>

        {/* Header band */}
        <div style={{
          padding: '32px 32px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          {/* Icon */}
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            backgroundColor: 'rgba(47, 107, 255, 0.12)',
            border: '1px solid rgba(47, 107, 255, 0.25)',
            color: '#6b9eff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '18px'
          }}>
            <FileText style={{ width: '24px', height: '24px' }} />
          </div>

          <h3 style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: '21px', fontWeight: '700',
            color: '#ffffff', margin: '0 0 8px 0', letterSpacing: '-0.3px'
          }}>
            Submit Your Exam?
          </h3>
          <p style={{
            fontSize: '13.5px', color: '#8fa9d0',
            lineHeight: '1.6', margin: 0
          }}>
            Once submitted, you cannot re-enter this session. All saved answers will be graded and sent for admin review.
          </p>
        </div>

        {/* Stats section */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Progress bar */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: '8px'
            }}>
              <span style={{ fontSize: '12px', color: '#8A99AE', fontWeight: '600', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Completion
              </span>
              <span style={{ fontSize: '13px', color: '#6b9eff', fontWeight: '700', fontFamily: 'monospace' }}>
                {progressPct}%
              </span>
            </div>
            <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '999px',
                width: `${progressPct}%`,
                background: 'linear-gradient(90deg, #2F6BFF, #6b9eff)',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          {/* Answer stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{
              padding: '14px 16px', borderRadius: '12px',
              backgroundColor: 'rgba(52, 210, 123, 0.06)',
              border: '1px solid rgba(52, 210, 123, 0.15)'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#34d27b', fontFamily: 'monospace', lineHeight: 1 }}>
                {answeredQuestions}
              </div>
              <div style={{ fontSize: '11.5px', color: '#6a9e83', fontWeight: '600', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Answered
              </div>
            </div>
            <div style={{
              padding: '14px 16px', borderRadius: '12px',
              backgroundColor: unansweredCount > 0 ? 'rgba(242, 169, 59, 0.07)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${unansweredCount > 0 ? 'rgba(242, 169, 59, 0.2)' : 'rgba(255,255,255,0.06)'}`
            }}>
              <div style={{ fontSize: '24px', fontWeight: '800', color: unansweredCount > 0 ? '#F2A93B' : '#6a7a92', fontFamily: 'monospace', lineHeight: 1 }}>
                {unansweredCount}
              </div>
              <div style={{ fontSize: '11.5px', color: unansweredCount > 0 ? '#a07432' : '#4a5a6e', fontWeight: '600', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Unanswered
              </div>
            </div>
          </div>

          {/* Section-wise Unanswered Breakdown */}
          {unansweredCount > 0 && (
            <div style={{
              marginTop: '16px',
              padding: '14px 16px',
              borderRadius: '12px',
              backgroundColor: 'rgba(242, 169, 59, 0.05)',
              border: '1px solid rgba(242, 169, 59, 0.2)'
            }}>
              <div style={{
                fontSize: '11px',
                color: '#F2A93B',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontFamily: 'monospace',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>⚠</span>
                <span>Unanswered Breakdown by Section</span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(sectionBreakdown.length, 3)}, 1fr)`,
                gap: '8px',
                marginBottom: '10px'
              }}>
                {sectionBreakdown.map((sec) => (
                  <div
                    key={sec.label}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '10px',
                      backgroundColor: sec.unanswered > 0 ? 'rgba(242, 169, 59, 0.12)' : 'rgba(16, 185, 129, 0.08)',
                      border: `1px solid ${sec.unanswered > 0 ? 'rgba(242, 169, 59, 0.3)' : 'rgba(16, 185, 129, 0.25)'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ fontSize: '11.5px', color: '#cdddf6', fontWeight: '600', marginBottom: '2px' }}>
                      {sec.shortLabel}
                    </span>
                    <span style={{ fontSize: '16px', fontWeight: '800', fontFamily: 'monospace', color: sec.unanswered > 0 ? '#F2A93B' : '#34d27b' }}>
                      {sec.unanswered} {sec.unanswered === 0 ? '✓' : ''}
                    </span>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: '12px', color: '#c49535', margin: 0, lineHeight: '1.4' }}>
                Unanswered questions will be marked as incorrect upon submission.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{
          padding: '20px 32px 28px',
          display: 'flex', gap: '12px', justifyContent: 'flex-end'
        }}>
          <button
            onClick={() => setShowConfirmSubmit(false)}
            style={{
              flex: 1,
              padding: '12px 20px', borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.12)',
              backgroundColor: 'transparent',
              color: '#b9c9e2', fontWeight: '600', fontSize: '13.5px',
              cursor: 'pointer', transition: 'all 0.18s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#b9c9e2'; }}
          >
            Keep Working
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1.5,
              padding: '12px 24px', borderRadius: '9999px',
              border: '1px solid #f7b64a',
              background: '#F5A623',
              color: '#2C1A00', fontWeight: '800', fontSize: '13.5px',
              cursor: 'pointer', transition: 'all 0.18s ease',
              boxShadow: '0 4px 16px rgba(245, 166, 35, 0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(245, 166, 35, 0.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(245, 166, 35, 0.45)'; }}
          >
            <span>Submit Exam</span>
            <ArrowRight style={{ width: '15px', height: '15px' }} />
          </button>
        </div>
      </div>
    </div>,
    document.fullscreenElement || document.body
  );
}
