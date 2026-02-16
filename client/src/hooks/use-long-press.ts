import { useCallback, useRef } from "react";

const LONG_PRESS_DURATION = 300; // ms
const MOVE_THRESHOLD = 10; // px — cancel if finger moves more than this

interface LongPressPosition {
  x: number;
  y: number;
}

interface UseLongPressOptions {
  onLongPress: (position: LongPressPosition) => void;
  duration?: number;
}

/**
 * Hook for detecting long-press (touch-hold) gestures on touch devices.
 * Returns event handlers to spread onto the target element.
 *
 * - Fires `onLongPress` after the finger is held for `duration` ms without moving.
 * - Cancels if the finger moves more than `MOVE_THRESHOLD` px.
 * - Cancels if `touchend` or `touchcancel` fires before the timer.
 * - Prevents the browser's default click after a long-press to avoid double-actions.
 */
export function useLongPress({
  onLongPress,
  duration = LONG_PRESS_DURATION,
}: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos = useRef<LongPressPosition | null>(null);
  const firedRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      firedRef.current = false;
      const touch = e.touches[0];
      if (!touch) return;
      const pos = { x: touch.clientX, y: touch.clientY };
      startPos.current = pos;

      timerRef.current = setTimeout(() => {
        firedRef.current = true;
        timerRef.current = null;
        onLongPress(pos);
      }, duration);
    },
    [onLongPress, duration],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!startPos.current) return;
      const touch = e.touches[0];
      if (!touch) return;
      const dx = touch.clientX - startPos.current.x;
      const dy = touch.clientY - startPos.current.y;
      if (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD) {
        clear();
      }
    },
    [clear],
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      clear();
      // If long-press already fired, prevent the subsequent click/tap
      if (firedRef.current) {
        e.preventDefault();
      }
    },
    [clear],
  );

  const onTouchCancel = useCallback((_e: React.TouchEvent) => {
    clear();
  }, [clear]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
    /** Whether a long-press was just fired (useful for preventing subsequent click) */
    longPressFired: firedRef,
  };
}
