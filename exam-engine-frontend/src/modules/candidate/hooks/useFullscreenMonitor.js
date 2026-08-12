import { useEffect, useRef } from 'react';

export function useFullscreenMonitor(active, onViolation) {
  const wasFullscreenRef = useRef(true);

  useEffect(() => {
    if (active) {
      const initial = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      wasFullscreenRef.current = initial;
    }
  }, [active]);

  useEffect(() => {
    if (!active) return;

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      
      // Only report violation if the candidate was previously in fullscreen and has exited
      if (wasFullscreenRef.current && !isCurrentlyFullscreen) {
        onViolation('FULLSCREEN_EXIT');
      }
      
      wasFullscreenRef.current = isCurrentlyFullscreen;
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [active, onViolation]);
}
