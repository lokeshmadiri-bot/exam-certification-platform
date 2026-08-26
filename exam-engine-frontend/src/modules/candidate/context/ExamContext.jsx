import React, { createContext, useContext, useState, useRef } from 'react';

const ExamContext = createContext(null);

export function ExamProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  
  const [beginnerTimeRemaining, setBeginnerTimeRemaining] = useState(null);
  const [intermediateTimeRemaining, setIntermediateTimeRemaining] = useState(null);
  const [advancedTimeRemaining, setAdvancedTimeRemaining] = useState(null);
  const timeRemaining = (beginnerTimeRemaining || 0) + (intermediateTimeRemaining || 0) + (advancedTimeRemaining || 0);

  const [strikes, setStrikes] = useState(0);
  const [offline, setOffline] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [raiseCount, setRaiseCount] = useState(0);
  
  const [sections, setSections] = useState([]);
  const [answers, setAnswers] = useState({});
  const [visitedQuestions, setVisitedQuestions] = useState(new Set());
  const [markedQuestions, setMarkedQuestions] = useState(new Set());
  const [attemptId, setAttemptId] = useState(null);
  const [saving, setSaving] = useState('Saved');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examDuration, setExamDuration] = useState(45 * 60);
  
  // Modals & Warnings
  const [warningToast, setWarningToast] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [toastShow, setToastShow] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showTimeUp, setShowTimeUp] = useState(false);
  const [showThanks, setShowThanks] = useState(false);
  
  // Media streams & element references
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const runnerRef = useRef(null);

  const value = {
    loading, setLoading,
    questions, setQuestions,
    currentIdx, setCurrentIdx,
    selectedAnswers, setSelectedAnswers,
    timeRemaining, setTimeRemaining: () => {},
    beginnerTimeRemaining, setBeginnerTimeRemaining,
    intermediateTimeRemaining, setIntermediateTimeRemaining,
    advancedTimeRemaining, setAdvancedTimeRemaining,
    strikes, setStrikes,
    offline, setOffline,
    handRaised, setHandRaised,
    raiseCount, setRaiseCount,
    sections, setSections,
    answers, setAnswers,
    visitedQuestions, setVisitedQuestions,
    markedQuestions, setMarkedQuestions,
    attemptId, setAttemptId,
    saving, setSaving,
    isSubmitting, setIsSubmitting,
    examDuration, setExamDuration,
    warningToast, setWarningToast,
    toastMsg, setToastMsg,
    toastShow, setToastShow,
    showConfirmSubmit, setShowConfirmSubmit,
    showTimeUp, setShowTimeUp,
    showThanks, setShowThanks,
    videoRef, streamRef, runnerRef
  };

  return (
    <ExamContext.Provider value={value}>
      {children}
    </ExamContext.Provider>
  );
}

export function useExam() {
  const context = useContext(ExamContext);
  if (!context) {
    throw new Error('useExam must be used within an ExamProvider');
  }
  return context;
}
