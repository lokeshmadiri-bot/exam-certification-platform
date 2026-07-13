import React, { createContext, useContext, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { examService } from '../services/examService';
import { isFullscreenActive, requestFullscreen } from '../utils/fullscreen';

const IntegrityContext = createContext(null);

export function IntegrityProvider({ children }) {
  const { attemptId } = useParams();
  const [fullscreen, setFullscreen] = useState(false);
  const [watermark, setWatermark] = useState({
    candidateName: '',
    candidateId: '',
    examName: '',
    watermarkEnabled: false,
    fullscreenRequired: false
  });
  const [copyBlocked, setCopyBlocked] = useState(true);
  const [rightClickBlocked, setRightClickBlocked] = useState(true);

  useEffect(() => {
    async function loadIntegrity() {
      if (attemptId) {
        try {
          const res = await examService.getIntegritySettings(attemptId);
          setWatermark(res.data);
        } catch (err) {
          console.error('Failed to load integrity configurations:', err);
        }
      }
    }
    loadIntegrity();
  }, [attemptId]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(isFullscreenActive());
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    // Initial check
    setFullscreen(isFullscreenActive());

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const enterFullscreen = () => {
    const element = document.documentElement;
    requestFullscreen(element).then((success) => {
      setFullscreen(success);
    });
  };

  const value = {
    fullscreen,
    watermark,
    copyBlocked,
    rightClickBlocked,
    enterFullscreen
  };

  return (
    <IntegrityContext.Provider value={value}>
      {children}
    </IntegrityContext.Provider>
  );
}

export function useIntegrity() {
  const context = useContext(IntegrityContext);
  if (!context) {
    throw new Error('useIntegrity must be used within an IntegrityProvider');
  }
  return context;
}
