import { useState, useEffect } from 'react';

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      // Check screen width
      const width = window.innerWidth;
      // Mobile breakpoint: 768px (Tailwind's md breakpoint)
      setIsMobile(width < 768);
    };

    // Check on mount
    checkIsMobile();

    // Listen for resize
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return isMobile;
};
