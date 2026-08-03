import { useEffect } from 'react';
import { useIntegrity } from '../context/IntegrityContext';

export function useKeyboardBlock() {
  const { copyBlocked } = useIntegrity();

  useEffect(() => {
    if (!copyBlocked) return;

    const handleKeyDown = (e) => {
      // Check for Ctrl/Cmd shortcuts
      const isCtrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (isCtrl && (key === 'c' || key === 'v' || key === 'x' || key === 'a')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleCopyCutPaste = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('copy', handleCopyCutPaste, true);
    window.addEventListener('cut', handleCopyCutPaste, true);
    window.addEventListener('paste', handleCopyCutPaste, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('copy', handleCopyCutPaste, true);
      window.removeEventListener('cut', handleCopyCutPaste, true);
      window.removeEventListener('paste', handleCopyCutPaste, true);
    };
  }, [copyBlocked]);
}
