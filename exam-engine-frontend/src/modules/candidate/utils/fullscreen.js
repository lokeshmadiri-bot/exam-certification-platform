export const requestFullscreen = async (element) => {
  if (!element) return false;
  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen();
      return true;
    } else if (element.webkitRequestFullscreen) {
      await element.webkitRequestFullscreen();
      return true;
    } else if (element.msRequestFullscreen) {
      await element.msRequestFullscreen();
      return true;
    }
  } catch (err) {
    console.error('Fullscreen request failed:', err);
  }
  return false;
};

export const exitFullscreen = async () => {
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
      return true;
    } else if (document.webkitExitFullscreen) {
      await document.webkitExitFullscreen();
      return true;
    } else if (document.msExitFullscreen) {
      await document.msExitFullscreen();
      return true;
    }
  } catch (err) {
    console.error('Exit fullscreen failed:', err);
  }
  return false;
};

export const isFullscreenActive = () => {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement
  );
};
