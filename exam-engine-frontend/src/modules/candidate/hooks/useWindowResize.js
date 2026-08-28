import { useEffect } from 'react';

export function useWindowResize(active, onViolation) {
  useEffect(() => {
    if (!active) return;

    const handleResize = () => {
      // Avoid triggering WINDOW_RESIZE if it's actually minimization (handled by visibilitychange)
      const isMinimized = window.innerWidth === 0 || window.innerHeight === 0 ||
                          window.outerWidth === 0 || window.outerHeight === 0;
      if (!isMinimized && document.hasFocus()) {
        onViolation('WINDOW_RESIZE');
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [active, onViolation]);
}
