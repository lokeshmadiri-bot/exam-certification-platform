import { useEffect, useRef } from 'react';

export function useFullscreenMonitor(active, onViolation) {
  // Start as false — on exam load the browser is NOT yet in fullscreen.
  // We only flag an exit when the candidate was confirmed to be IN fullscreen
  // and then leaves it. This prevents the initial fullscreen entry from
  // being incorrectly counted as an exit.
  const wasFullscreenRef = useRef(false);
  const lastExitTimeRef = useRef(0);
  // readyRef prevents any violation from firing during the startup grace window
  const readyRef = useRef(false);

  useEffect(() => {
    if (active) {
      // Sync current fullscreen state when proctoring becomes active
      wasFullscreenRef.current = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      readyRef.current = false;
      // Allow 6 seconds for the initial fullscreen transition to complete
      // before we start treating exits as violations.
      const startupTimer = setTimeout(() => {
        readyRef.current = true;
      }, 6000);
      return () => clearTimeout(startupTimer);
    } else {
      readyRef.current = false;
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

      if (isCurrentlyFullscreen) {
        readyRef.current = false;
        setTimeout(() => {
          readyRef.current = true;
        }, 6000);
      }

      // Only report a violation when:
      // 1. Monitoring is ready (startup grace period passed)
      // 2. The candidate was confirmed to be in fullscreen
      // 3. They have now exited it
      // 4. Enough time has passed since the last exit event (debounce)
      if (readyRef.current && wasFullscreenRef.current && !isCurrentlyFullscreen) {
        const now = Date.now();
        if (now - lastExitTimeRef.current > 3000) {
          lastExitTimeRef.current = now;
          onViolation('FULLSCREEN_EXIT');
        }
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
