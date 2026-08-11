import { useEffect } from 'react';
import { useIntegrity } from '../context/IntegrityContext';

export function useRightClick() {
  const { rightClickBlocked } = useIntegrity();

  useEffect(() => {
    if (!rightClickBlocked) return;

    const handleContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [rightClickBlocked]);
}
