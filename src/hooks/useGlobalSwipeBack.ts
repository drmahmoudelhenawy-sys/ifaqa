import { useEffect, useRef } from 'react';
import { backNavigationService } from '../services/backNavigationService';

interface SwipeBackOptions {
  edgeThreshold?: number; // Distance in pixels from edge to consider as edge swipe (default 40px)
  minDistance?: number;   // Minimum distance in px to trigger back (default 50px)
  disabled?: boolean;
}

export function useGlobalSwipeBack(options: SwipeBackOptions = {}) {
  const { edgeThreshold = 45, minDistance = 55, disabled = false } = options;
  const touchStartRef = useRef<{ x: number; y: number; isEdge: boolean; time: number } | null>(null);

  useEffect(() => {
    if (disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        touchStartRef.current = null;
        return;
      }

      const touch = e.touches[0];
      const screenWidth = window.innerWidth;
      const x = touch.clientX;
      const y = touch.clientY;

      // Check if touch starts near the right edge (RTL swipe back) or left edge (LTR swipe back)
      const isRightEdge = x >= screenWidth - edgeThreshold;
      const isLeftEdge = x <= edgeThreshold;

      if (isRightEdge || isLeftEdge) {
        touchStartRef.current = {
          x,
          y,
          isEdge: true,
          time: Date.now(),
        };
      } else {
        touchStartRef.current = null;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current || !touchStartRef.current.isEdge) {
        touchStartRef.current = null;
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const duration = Date.now() - touchStartRef.current.time;
      const screenWidth = window.innerWidth;
      const startX = touchStartRef.current.x;

      touchStartRef.current = null;

      // Ensure horizontal swipe is dominant (not vertical scrolling)
      if (Math.abs(deltaX) < minDistance || Math.abs(deltaX) < Math.abs(deltaY) * 1.3) {
        return;
      }

      // Max swipe duration: 600ms to avoid slow drags
      if (duration > 700) {
        return;
      }

      const isRightEdge = startX >= screenWidth - edgeThreshold;
      const isLeftEdge = startX <= edgeThreshold;

      // Swipe inwards from right edge (in RTL Arabic, swipe leftwards <-)
      const swipedInwardsFromRight = isRightEdge && deltaX < -minDistance;

      // Swipe inwards from left edge (in LTR or Android default, swipe rightwards ->)
      const swipedInwardsFromLeft = isLeftEdge && deltaX > minDistance;

      if (swipedInwardsFromRight || swipedInwardsFromLeft) {
        // Trigger global back navigation
        backNavigationService.handleBack();
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [edgeThreshold, minDistance, disabled]);
}
