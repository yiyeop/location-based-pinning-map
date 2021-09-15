export const loadScript = async (scriptUrl) => {
  if (document.querySelector(`[src="${scriptUrl}"]`)) {
    return;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      resolve('success');
      script.onload = null;
      script.onerror = null;
    };

    script.onerror = () => {
      reject('failed');
      script.onload = null;
      script.onerror = null;
    };
    document.head.appendChild(script);
  });
};
