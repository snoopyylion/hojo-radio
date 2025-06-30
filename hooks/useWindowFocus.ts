// hooks/useWindowFocus.ts
import { useState, useEffect } from 'react';

export const useWindowFocus = () => {
  const [isWindowFocused, setIsWindowFocused] = useState(true);

  useEffect(() => {
    // Set initial state
    setIsWindowFocused(document.hasFocus());

    const handleFocus = () => {
      setIsWindowFocused(true);
    };

    const handleBlur = () => {
      setIsWindowFocused(false);
    };

    const handleVisibilityChange = () => {
      setIsWindowFocused(!document.hidden);
    };

    // Add event listeners
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isWindowFocused;
};