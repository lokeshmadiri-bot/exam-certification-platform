import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Award, Clock, Eye, Calendar, ShieldAlert, FileText, CheckCircle2, TrendingUp } from 'lucide-react';
import { candidateService } from '../services/api';

export default function CandidateResults() {
  const navigate = useNavigate();
  const { searchQuery } = useOutletContext();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const attemptsRes = await candidateService.getMyAttempts();
        setAttempts(attemptsRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const getTierColor = (lvl) => {
    const colors = {
      L1: '#0E9F6E', L2: '#57B85A', L3: '#E0A500', L4: '#EA7A3B', L5: '#E04F4F'
    };
    return colors[lvl] || '#6b7a92';
  };

  const getLevelTitle = (lvl) => {
    const titles = { L1: 'Expert', L2: 'Advanced', L3: 'Intermediate', L4: 'Beginner', L5: 'Needs Training' };
    return titles[lvl] || 'Intermediate';
  };

  const getUniqueBadges = (list) => {
    const seen = new Set();
    return list.filter(a => {
      if (a.resultStatus === 'PASSED' && a.resultPublishStatus === 'PUBLISHED' && a.assignedLevel) {
        const key = `${a.stack?.toLowerCase()}-${a.assignedLevel?.toLowerCase()}`;
        if (!seen.has(key)) { seen.add(key); return true; }
      }
      return false;
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '128px 0', gap: '12px', color: '#5c6b82' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid #e4eaf2', borderTopColor: '#2F6BFF', animation: 'spin 0.75s linear infinite' }} />
        <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: '600' }}>Loading results history...</span>
      </div>
    );
  }

  const passedCount = getUniqueBadges(attempts).length;
  const underReviewCount = attempts.filter(a => a.resultPublishStatus !== 'PUBLISHED').length;

  const filtered = attempts.filter(a =>
    !searchQuery ||
    a.examTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.stack?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusChip = (attempt) => {
    const isPublished = attempt.resultPublishStatus === 'PUBLISHED';
    const isInProgress = attempt.resultStatus === 'IN_PROGRESS' || !attempt.submittedAt;

    if (attempt.resultStatus === 'TERMINATED') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: '#bb2e2e', backgroundColor: '#fde8e8', border: '1px solid #f8b4b4', padding: '4px 10px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          <ShieldAlert style={{ width: '11px', height: '11px' }} />Terminated
        </span>
      );
    }
    if (isInProgress) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: '#2F6BFF', backgroundColor: 'rgba(47,107,255,0.08)', border: '1px solid rgba(47,107,255,0.2)', padding: '4px 10px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          Active
        </span>
      );
    }
    if (!isPublished) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: '#9c7400', backgroundColor: '#fdf3da', border: '1px solid #f5e2b3', padding: '4px 10px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          <Clock style={{ width: '11px', height: '11px' }} />Pending
        </span>
      );
    }
    const color = attempt.resultStatus === 'PASSED' ? { text: '#0a7a52', bg: '#e7f7f0', border: '#c3ebd7' } :
      { text: '#bb2e2e', bg: '#fde8e8', border: '#f8b4b4' };
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: color.text, backgroundColor: color.bg, border: `1px solid ${color.border}`, padding: '4px 10px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        {attempt.resultStatus === 'PASSED' && <CheckCircle2 style={{ width: '11px', height: '11px' }} />}
        {attempt.resultStatus?.replace('_', ' ')}
      </span>
    );
  };

  const getLevelBadge = (attempt) => {
    const isPublished = attempt.resultPublishStatus === 'PUBLISHED';
    const isInProgress = attempt.resultStatus === 'IN_PROGRESS' || !attempt.submittedAt;

    if (isInProgress || attempt.resultStatus === 'TERMINATED') return <span style={{ color: '#9ca3af', fontSize: '13px' }}>—</span>;
    if (!isPublished) return (
      <span style={{ fontSize: '12px', color: '#9c7400', fontWeight: '600', fontFamily: 'monospace' }}>Under Review</span>
    );
    const color = getTierColor(attempt.assignedLevel);
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '4px 12px', borderRadius: '999px', backgroundColor: color + '18', border: `1px solid ${color}40`, color }}>
        <span style={{ fontSize: '12px', fontWeight: '800', fontFamily: 'monospace' }}>{attempt.assignedLevel}</span>
        <span style={{ fontSize: '11.5px', fontWeight: '600' }}>{attempt.assignedLevelTitle || getLevelTitle(attempt.assignedLevel)}</span>
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* ── Page Header ── */}
      <div>
        <span style={{
          display: 'inline-block',
          fontFamily: 'monospace', fontSize: '10px', fontWeight: '700',
          textTransform: 'uppercase', letterSpacing: '1.5px',
          color: '#2F6BFF', backgroundColor: 'rgba(47,107,255,0.08)',
          padding: '4px 12px', borderRadius: '999px',
          border: '1px solid rgba(47,107,255,0.18)',
          marginBottom: '12px'
        }}>
          Credentials &amp; History
        </span>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0E1B2E', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
          My Results
        </h1>
        <p style={{ fontSize: '13.5px', color: '#5C6B82', margin: 0, lineHeight: '1.6' }}>
          Review your earned certification levels, score breakdowns, and exam attempt history.
        </p>
      </div>

      {/* ── Stats Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {[
          {
            icon: <FileText style={{ width: '18px', height: '18px' }} />,
            value: attempts.length, label: 'Total Attempts',
            accent: '#2F6BFF', bg: 'rgba(47,107,255,0.06)', border: 'rgba(47,107,255,0.12)'
          },
          {
            icon: <Award style={{ width: '18px', height: '18px' }} />,
            value: passedCount, label: 'Badges Earned',
            accent: '#0E9F6E', bg: 'rgba(14,159,110,0.06)', border: 'rgba(14,159,110,0.12)'
          },
          {
            icon: <TrendingUp style={{ width: '18px', height: '18px' }} />,
            value: attempts.filter(a => a.resultStatus === 'PASSED').length, label: 'Exams Passed',
            accent: '#57B85A', bg: 'rgba(87,184,90,0.06)', border: 'rgba(87,184,90,0.12)'
          },
          {
            icon: <Clock style={{ width: '18px', height: '18px' }} />,
            value: underReviewCount, label: 'Pending Review',
            accent: '#E0A500', bg: 'rgba(224,165,0,0.06)', border: 'rgba(224,165,0,0.12)'
          },
        ].map(({ icon, value, label, accent, bg, border }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            padding: '20px 22px',
            backgroundColor: '#ffffff', border: '1px solid #E4EAF2',
            borderRadius: '16px', boxShadow: '0 1px 4px rgba(11,31,56,0.05)',
            position: 'relative', overflow: 'hidden'
          }}>
            {/* accent bar */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', backgroundColor: accent, borderRadius: '16px 0 0 16px' }} />
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
              backgroundColor: bg, border: `1px solid ${border}`,
              color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {icon}
            </div>
            <div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#0E1B2E', lineHeight: 1.1, fontFamily: 'monospace' }}>
                {value}
              </div>
              <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#5C6B82', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '3px' }}>
                {label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Results Table ── */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #E4EAF2', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(11,31,56,0.05)' }}>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.4fr 1.2fr 0.8fr', gap: '0', borderBottom: '1px solid #EEF2F8', backgroundColor: '#F8FAFC' }}>
          {['Certification', 'Date', 'Level', 'Status', 'Action'].map((h, i) => (
            <div key={h} style={{
              padding: '14px 20px', fontSize: '10.5px', fontWeight: '700', fontFamily: 'monospace',
              color: '#5C6B82', textTransform: 'uppercase', letterSpacing: '0.6px',
              textAlign: 'center'
            }}>
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {filtered.length > 0 ? filtered.map((attempt, idx) => {
          const isInProgress = attempt.resultStatus === 'IN_PROGRESS' || !attempt.submittedAt;
          return (
            <div key={attempt.attemptId}
              style={{
                display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.4fr 1.2fr 0.8fr',
                borderBottom: idx < filtered.length - 1 ? '1px solid #EEF2F8' : 'none',
                transition: 'background-color 0.15s ease',
                backgroundColor: '#fff',
                alignItems: 'center'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F9FAFC'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
            >
              {/* Certification */}
              <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontWeight: '700', fontSize: '13.5px', color: '#0E1B2E', marginBottom: '4px', textAlign: 'center' }}>
                  {attempt.examTitle}
                </div>
                <span style={{
                  display: 'inline-block', fontSize: '10px', fontWeight: '700', fontFamily: 'monospace',
                  color: '#6b7a92', backgroundColor: '#EEF2F8', padding: '2px 8px',
                  borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.5px'
                }}>
                  {attempt.stack} Stack
                </span>
              </div>

              {/* Date */}
              <div style={{ padding: '18px 20px', display: 'flex', justifyContent: 'center' }}>
                {isInProgress ? (
                  <span style={{ fontSize: '11px', color: '#2F6BFF', fontWeight: '700', fontFamily: 'monospace' }}>In Progress</span>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#5C6B82', fontSize: '12.5px', fontFamily: 'monospace' }}>
                    <Calendar style={{ width: '12px', height: '12px', color: '#8A99AE' }} />
                    <span>{new Date(attempt.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                )}
              </div>

              {/* Level */}
              <div style={{ padding: '18px 20px', display: 'flex', justifyContent: 'center' }}>
                {getLevelBadge(attempt)}
              </div>

              {/* Status */}
              <div style={{ padding: '18px 20px', display: 'flex', justifyContent: 'center' }}>
                {getStatusChip(attempt)}
              </div>

              {/* Action */}
              <div style={{ padding: '18px 20px', display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => navigate(`/candidate/result-view/${attempt.attemptId}`)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '8px 14px', borderRadius: '10px',
                    backgroundColor: 'rgba(47,107,255,0.08)',
                    border: '1px solid rgba(47,107,255,0.15)',
                    color: '#2F6BFF', fontWeight: '700', fontSize: '12px',
                    cursor: 'pointer', transition: 'all 0.18s ease',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#2F6BFF'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#2F6BFF'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(47,107,255,0.08)'; e.currentTarget.style.color = '#2F6BFF'; e.currentTarget.style.borderColor = 'rgba(47,107,255,0.15)'; }}
                >
                  <Eye style={{ width: '12px', height: '12px' }} />
                  <span>View</span>
                </button>
              </div>
            </div>
          );
        }) : (
          <div style={{ padding: '64px 20px', textAlign: 'center', color: '#8A99AE', fontSize: '14px', fontWeight: '500' }}>
            No certification attempts found.
          </div>
        )}
      </div>
    </div>
  );
}
