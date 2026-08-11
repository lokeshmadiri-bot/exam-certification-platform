import { useEffect } from 'react';

export function useVisibility(active, onViolation) {
  useEffect(() => {
    if (!active) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Distinguish between MINIMIZE and TAB_SWITCH based on window sizes
        const isMinimized = window.innerWidth === 0 || window.innerHeight === 0 ||
                            window.outerWidth === 0 || window.outerHeight === 0;
        if (isMinimized) {
          onViolation('MINIMIZE');
        } else {
          onViolation('TAB_SWITCH');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [active, onViolation]);
}
