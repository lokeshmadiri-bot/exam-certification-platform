import { useEffect, useState } from 'react';
import { useExam } from '../context/ExamContext';
import { requestFullscreen, isFullscreenActive } from '../utils/fullscreen';

export function useFullscreen(onExitViolation) {
  const { loading, runnerRef } = useExam();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (loading) return;

    const handleFullscreenChange = () => {
      const active = isFullscreenActive();
      setIsFullscreen(active);
      // NOTE: Fullscreen exit violations are handled by useFullscreenMonitor
      // with proper debouncing and startup grace period. Do NOT trigger here.
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [loading]);

  const enterFullscreenMode = () => {
    if (runnerRef.current) {
      requestFullscreen(runnerRef.current).then((success) => {
        setIsFullscreen(success);
      });
    }
  };

  return {
    isFullscreen,
    enterFullscreenMode
  };
}
