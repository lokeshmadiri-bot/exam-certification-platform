export const sendBeacon = (url, data) => {
  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    return navigator.sendBeacon(url, blob);
  }
  
  // Fallback using synchronous XMLHttpRequests if sendBeacon is unsupported
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, false);
    xhr.setRequestHeader('Content-Type', 'application/json');
    const token = localStorage.getItem('token');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.send(JSON.stringify(data));
    return true;
  } catch (err) {
    console.error('sendBeacon fallback failed:', err);
    return false;
  }
};
