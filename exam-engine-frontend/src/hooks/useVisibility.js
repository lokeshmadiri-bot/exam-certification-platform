import { useEffect } from 'react';
import { useExam } from '../context/ExamContext';

export function useVisibility(onStrikeTrigger) {
  const { loading, handRaised, offline } = useExam();

  useEffect(() => {
    if (loading) return;

    const handleVisibilityChange = () => {
      if (document.hidden && !handRaised && !offline) {
        onStrikeTrigger('TAB_SWITCH', 'Window hidden / tab switched');
      }
    };

    const handleResize = () => {
      if (!handRaised && !offline) {
        onStrikeTrigger('WINDOW_RESIZE', 'Window size altered');
      }
    };

    const handleBlur = () => {
      if (!handRaised && !offline) {
        onStrikeTrigger('WINDOW_BLUR', 'Window lost focus');
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('resize', handleResize);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('blur', handleBlur);
    };
  }, [loading, handRaised, offline, onStrikeTrigger]);
}
