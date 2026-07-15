import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader, Check } from 'lucide-react';

import { ExamProvider, useExam } from '../../context/ExamContext';
import { IntegrityProvider, useIntegrity } from '../../context/IntegrityContext';
import { useKeyboardBlock } from '../../hooks/useKeyboardBlock';
import { useRightClick } from '../../hooks/useRightClick';
import WatermarkOverlay from '../../components/exam/WatermarkOverlay';
import FullscreenDialog from '../../components/exam/FullscreenDialog';
import Header from '../../components/exam/Header';
import Question from '../../components/exam/Question';
import Sidebar from '../../components/exam/Sidebar';
import Footer from '../../components/exam/Footer';
import WarningModal from '../../exam/components/WarningModal';
import TerminateModal from '../../exam/components/TerminateModal';
import RaiseHand from '../../components/exam/RaiseHand';
import Reconnect from '../../components/exam/Reconnect';
import SubmitConfirmation from '../../components/exam/SubmitConfirmation';
import SectionStepper from '../../components/exam/SectionStepper';

import { useRecording } from '../../hooks/useRecording';
import { useFullscreen } from '../../hooks/useFullscreen';
import { useStrikeEngine } from '../../exam/hooks/useStrikeEngine';

import { examService } from '../../services/examService';
import { useExamTimer } from '../../hooks/useExamTimer';

function ExamRunnerContent() {
  useKeyboardBlock();
  useRightClick();

  useEffect(() => {
    const handleDragStart = (e) => {
      e.preventDefault();
    };
    window.addEventListener('dragstart', handleDragStart, true);
    return () => {
      window.removeEventListener('dragstart', handleDragStart, true);
    };
  }, []);
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const {
    loading,
    setLoading,
    setQuestions,
    selectedAnswers,
    timeRemaining,
    strikes,
    setStrikes,
    setWarningToast,
    showTimeUp,
    showThanks,
    setShowThanks,
    runnerRef,
    streamRef,
    setAttemptId,
    setSections,
    setAnswers
  } = useExam();

  const [examTitle, setExamTitle] = useState('Certification Exam');
  const [examDuration, setExamDuration] = useState(45 * 60);
  const [initialStrikeCount, setInitialStrikeCount] = useState(0);

  // Initialize and load attempt data
  useEffect(() => {
    async function loadAttempt() {
      try {
        setAttemptId(attemptId);
        
        // Fetch detailed runner data (sections, questions, previously saved answers)
        const runnerRes = await examService.getRunnerData(attemptId);
        const data = runnerRes.data;

        if (data.resultStatus === 'TERMINATED') {
          navigate('/candidate/terminated');
          return;
        }
        
        setExamTitle(data.examTitle || 'Certification Exam');
        setInitialStrikeCount(data.strikeCount || 0);
        setStrikes(data.strikeCount || 0);
        
        // Assemble flat questions list from sections
        const allQuestions = [];
        const loadedSections = data.sections || [];
        loadedSections.forEach((sec) => {
          if (sec.questions) {
            sec.questions.forEach((q) => {
              q.sectionName = sec.name;
              allQuestions.push(q);
            });
          }
        });
        
        setSections(loadedSections);
        setQuestions(allQuestions);
        setAnswers(data.answers || {});
      } catch (err) {
        console.error('Failed to load runner data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAttempt();
  }, [attemptId, setQuestions, setLoading, setAttemptId, setSections, setAnswers, navigate, setStrikes]);

  const handleGradingSubmit = async () => {
    setShowThanks(true);

    try {
      const res = await examService.submitAttemptNew(attemptId);
      if (res.success) {
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        try { if (document.exitFullscreen) document.exitFullscreen(); } catch (_) {}
        setTimeout(() => {
          navigate(`/candidate/result-view/${attemptId}`);
        }, 1700);
      }
    } catch (err) {
      console.error('Failed to submit attempt:', err);
    }
  };

  useExamTimer(handleGradingSubmit);

  const isProctoringActive = !loading && !handRaised && !offline;

  const handleFrontendTerminate = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    try { if (document.exitFullscreen) document.exitFullscreen(); } catch (_) {}
    navigate('/candidate/terminated');
  };

  const {
    strikeCount,
    warningVisible,
    terminated,
    dismissWarning
  } = useStrikeEngine({
    attemptId,
    initialStrikeCount,
    active: isProctoringActive,
    onTerminate: handleFrontendTerminate
  });

  // Sync strike count back to global ExamContext so headers/indicators render it correctly
  useEffect(() => {
    setStrikes(strikeCount);
  }, [strikeCount, setStrikes]);

  const { enterFullscreenMode } = useFullscreen();

  // Request Fullscreen on launch
  useEffect(() => {
    if (!loading) {
      enterFullscreenMode();
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="text-center py-20 font-mono text-sm text-white bg-[#081627] min-h-screen flex items-center justify-center gap-2">
        <Loader className="w-5 h-5 animate-spin" />
        <span>Loading proctored exam runner...</span>
      </div>
    );
  }

  return (
    <div ref={runnerRef} className="runner fixed inset-0 z-50 bg-gradient-to-br from-[#081627] to-[#102a4d] text-[#e8eefb] flex flex-col overflow-hidden select-none">
      {/* Integrity Dialog and Watermark Overlay */}
      <FullscreenDialog />
      <WatermarkOverlay />

      {/* Warnings & Modals */}
      <WarningModal isOpen={warningVisible} strikeCount={strikeCount} onClose={dismissWarning} />
      <TerminateModal isOpen={terminated} />
      <Reconnect />
      <RaiseHand />
      <SubmitConfirmation onConfirm={handleGradingSubmit} />

      {/* Time's Up Blockout */}
      {showTimeUp && (
        <div className="run-overlay fixed inset-0 z-50 bg-[#061222]/90 backdrop-blur-md flex items-center justify-center">
          <div className="ov-card bg-[#0e2745] border border-white/10 rounded-2xl p-[34px_38px] text-center max-w-[430px] shadow-2xl">
            <h3 className="font-display text-white text-[21px] font-semibold mb-2">Time's up</h3>
            <p className="text-[#b9c9e2] text-[13.5px]">Submitting the answers you've completed. Please wait…</p>
          </div>
        </div>
      )}

      {/* Thanks Submission Blockout */}
      {showThanks && (
        <div className="run-overlay fixed inset-0 z-50 bg-[#061222]/90 backdrop-blur-md flex items-center justify-center">
          <div className="ov-card bg-[#0e2745] border border-white/10 rounded-2xl p-[34px_38px] text-center max-w-[430px] shadow-2xl">
            <div className="ov-ic w-14 h-14 rounded-2xl bg-[#0e9f6e]/20 text-[#34d27b] flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7" />
            </div>
            <h3 className="font-display text-white text-[21px] font-semibold mb-2">Submission received</h3>
            <p className="text-[#b9c9e2] text-[13.5px]">
              Thank you. Your answers have been recorded and are being scored. Your result will appear in a moment…
            </p>
          </div>
        </div>
      )}

      {/* Top Header */}
      <Header examTitle={examTitle} attemptId={attemptId} />

      {/* Main Runner Screen Layout */}
      <div className="run-body flex-1 grid grid-cols-1 lg:grid-cols-[1fr_330px] overflow-hidden">
        <div className="run-main p-[30px_38px] overflow-y-auto">
          <SectionStepper />
          <Question />
          <Footer />
        </div>

        <Sidebar durationSeconds={examDuration} />
      </div>
    </div>
  );
}

export default function ExamRunner() {
  return (
    <ExamProvider>
      <IntegrityProvider>
        <ExamRunnerContent />
      </IntegrityProvider>
    </ExamProvider>
  );
}
