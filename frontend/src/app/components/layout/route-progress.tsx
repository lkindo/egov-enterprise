'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Start loading on path/params change
    setLoading(true);
    
    // Simulate end of transition (since Next.js 13+ doesn't have route change events easily accessible)
    // In a real scenario, we'd use a more robust way to detect transition completion,
    // but for instant feedback, a short pulse or timeout is effective for UX perceived performance.
    const timer = setTimeout(() => {
      setLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ width: '0%', opacity: 1 }}
          animate={{ width: '100%', opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "circIn" }}
          className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/80"
          style={{ originX: 0 }}
        />
      )}
    </AnimatePresence>
  );
}
