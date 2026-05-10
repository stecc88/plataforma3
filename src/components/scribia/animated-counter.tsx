'use client';

import { useEffect, useState, useRef } from 'react';

/**
 * AnimatedCounter — animates a number from 0 (or `from`) to `value`.
 * Uses requestAnimationFrame for a smooth ease-out effect.
 */
export function AnimatedCounter({
  value,
  from = 0,
  duration = 800,
  decimals = 1,
  delay = 0,
  className = '',
}: {
  value: number;
  from?: number;
  duration?: number;
  decimals?: number;
  delay?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(from);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    // Apply delay before starting animation
    timerRef.current = setTimeout(() => {
      startTimeRef.current = performance.now();
      const startVal = from;
      const endVal = value;

      function tick(now: number) {
        const elapsed = now - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = startVal + (endVal - startVal) * eased;
        setDisplay(current);
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick as FrameRequestCallback);
        }
      }

      rafRef.current = requestAnimationFrame(tick as FrameRequestCallback);
    }, delay);

    return () => {
      clearTimeout(timerRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, [value, from, duration, delay]);

  return <span className={className}>{display.toFixed(decimals)}</span>;
}
