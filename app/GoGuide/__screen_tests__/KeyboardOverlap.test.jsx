import { act, renderHook } from "@testing-library/react-native";
import { Keyboard, Platform } from "react-native";
import { useKeyboardOverlap } from "../hooks/useKeyboardOverlap";

let listeners;
let removed;

beforeEach(() => {
  jest.useFakeTimers();
  listeners = {};
  removed = 0;
  jest.spyOn(Keyboard, "addListener").mockImplementation((name, cb) => {
    listeners[name] = cb;
    return { remove: () => { removed += 1; } };
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// A view whose bottom edge is at y + h (window coordinates in dp)
const refWithBottom = (bottom) => ({ current: { measureInWindow: (cb) => cb(0, bottom - 600, 360, 600) } });
const showKeyboard = async (screenY = 500, height = 300) => {
  await act(async () => {
    listeners.keyboardDidShow({ endCoordinates: { screenY, height } });
    jest.advanceTimersByTime(600);
  });
};

describe("useKeyboardOverlap (Android chat-bar docking)", () => {
  it("lifts the bar by exactly the part the keyboard covers (edge-to-edge: window did not resize)", async () => {
    const { result } = await renderHook(() => useKeyboardOverlap(refWithBottom(800), { enabled: true }));
    expect(result.current.overlap).toBe(0);
    await showKeyboard(500, 300);
    expect(result.current.overlap).toBe(300);
  });

  it("adds nothing when the window already resized above the keyboard (no gap, no double spacing)", async () => {
    const { result } = await renderHook(() => useKeyboardOverlap(refWithBottom(500), { enabled: true }));
    await showKeyboard(500, 300);
    expect(result.current.overlap).toBe(0);
  });

  it("goes back to 0 when the keyboard closes", async () => {
    const { result } = await renderHook(() => useKeyboardOverlap(refWithBottom(800), { enabled: true }));
    await showKeyboard();
    expect(result.current.overlap).toBe(300);
    await act(async () => {
      listeners.keyboardDidHide({});
    });
    expect(result.current.overlap).toBe(0);
  });

  it("follows the layout when the view changes size after the keyboard opened", async () => {
    const ref = { current: { measureInWindow: (cb) => cb(0, 200, 360, 600) } }; // bottom 800
    const { result } = await renderHook(() => useKeyboardOverlap(ref, { enabled: true }));
    await showKeyboard(500, 300);
    expect(result.current.overlap).toBe(300);
    ref.current.measureInWindow = (cb) => cb(0, 0, 360, 500); // window resized: bottom 500
    await act(async () => {
      result.current.onLayout();
    });
    expect(result.current.overlap).toBe(0);
  });

  it("is off (and registers nothing) on iOS and the web", async () => {
    const { result } = await renderHook(() => useKeyboardOverlap(refWithBottom(800), { enabled: false }));
    expect(Keyboard.addListener).not.toHaveBeenCalled();
    expect(result.current.overlap).toBe(0);
    expect(result.current.onLayout).toBeUndefined();
  });

  it("cleans up its listeners", async () => {
    const { unmount } = await renderHook(() => useKeyboardOverlap(refWithBottom(800), { enabled: true }));
    await unmount();
    expect(removed).toBe(2);
  });

  it("mobile web: lifts the bar by the part of the page the visual viewport lost", async () => {
    const vvListeners = {};
    const vv = {
      height: 800, offsetTop: 0, scale: 1,
      addEventListener: (n, cb) => { vvListeners[n] = cb; },
      removeEventListener: jest.fn(),
    };
    const originalOS = Platform.OS;
    const originalVV = window.visualViewport;
    const originalInner = window.innerHeight;
    Platform.OS = "web";
    Object.defineProperty(window, "visualViewport", { value: vv, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    try {
      const { result } = await renderHook(() => useKeyboardOverlap({ current: { getBoundingClientRect: () => ({ bottom: 734 }) } }, { enabled: true }));
      expect(result.current.overlap).toBe(0);
      await act(async () => {
        vv.height = 500; // keyboard opened (Safari only shrinks the visual viewport)
        vvListeners.resize();
      });
      expect(result.current.overlap).toBe(234); // chat area ends 66px above the page bottom (tab bar)
      await act(async () => {
        vv.height = 800;
        vvListeners.resize();
      });
      expect(result.current.overlap).toBe(0);
    } finally {
      Platform.OS = originalOS;
      Object.defineProperty(window, "visualViewport", { value: originalVV, configurable: true });
      Object.defineProperty(window, "innerHeight", { value: originalInner, configurable: true });
    }
  });
});
