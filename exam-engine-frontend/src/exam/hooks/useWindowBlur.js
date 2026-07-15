import { useEffect } from 'react';

export function useWindowBlur(active, onViolation) {
  useEffect(() => {
    if (!active) return;

    const handleBlur = () => {
      onViolation('WINDOW_BLUR');
    };

    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, [active, onViolation]);
}
