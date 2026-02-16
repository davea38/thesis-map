import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLongPress } from "./use-long-press";

function createTouchEvent(
  clientX: number,
  clientY: number,
): React.TouchEvent {
  return {
    touches: [{ clientX, clientY }] as unknown as React.TouchList,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as React.TouchEvent;
}

describe("useLongPress", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires onLongPress after holding for the default duration", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => {
      result.current.onTouchStart(createTouchEvent(100, 200));
    });

    expect(onLongPress).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onLongPress).toHaveBeenCalledOnce();
    expect(onLongPress).toHaveBeenCalledWith({ x: 100, y: 200 });
  });

  it("fires onLongPress after custom duration", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ onLongPress, duration: 500 }),
    );

    act(() => {
      result.current.onTouchStart(createTouchEvent(50, 60));
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onLongPress).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onLongPress).toHaveBeenCalledOnce();
  });

  it("does not fire if touchend occurs before duration", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => {
      result.current.onTouchStart(createTouchEvent(100, 200));
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    act(() => {
      result.current.onTouchEnd(createTouchEvent(100, 200));
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("does not fire if finger moves beyond threshold", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => {
      result.current.onTouchStart(createTouchEvent(100, 200));
    });

    act(() => {
      // Move 15px horizontally — beyond 10px threshold
      result.current.onTouchMove(createTouchEvent(115, 200));
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("fires if finger moves within threshold", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => {
      result.current.onTouchStart(createTouchEvent(100, 200));
    });

    act(() => {
      // Move 5px — within 10px threshold
      result.current.onTouchMove(createTouchEvent(105, 203));
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onLongPress).toHaveBeenCalledOnce();
  });

  it("does not fire if touchcancel occurs", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => {
      result.current.onTouchStart(createTouchEvent(100, 200));
    });

    act(() => {
      result.current.onTouchCancel();
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("prevents default on touchend after long-press fires", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => {
      result.current.onTouchStart(createTouchEvent(100, 200));
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const touchEndEvent = createTouchEvent(100, 200);
    act(() => {
      result.current.onTouchEnd(touchEndEvent);
    });

    expect(touchEndEvent.preventDefault).toHaveBeenCalled();
  });

  it("does not prevent default on touchend if long-press did not fire", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => {
      result.current.onTouchStart(createTouchEvent(100, 200));
    });

    const touchEndEvent = createTouchEvent(100, 200);
    act(() => {
      // End before duration
      result.current.onTouchEnd(touchEndEvent);
    });

    expect(touchEndEvent.preventDefault).not.toHaveBeenCalled();
  });

  it("resets fired state on new touchstart", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    // First long-press
    act(() => {
      result.current.onTouchStart(createTouchEvent(100, 200));
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onLongPress).toHaveBeenCalledOnce();

    // Second touch — should start fresh
    act(() => {
      result.current.onTouchStart(createTouchEvent(50, 50));
    });

    const touchEndEvent = createTouchEvent(50, 50);
    act(() => {
      result.current.onTouchEnd(touchEndEvent);
    });

    // Should not prevent default since new touch didn't fire long-press
    expect(touchEndEvent.preventDefault).not.toHaveBeenCalled();
  });
});
