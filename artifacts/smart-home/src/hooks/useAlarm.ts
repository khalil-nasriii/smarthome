import { useEffect, useRef, useCallback } from "react";

export function useAlarmSound(): {
  play: () => void;
  stop: () => void;
} {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPlayingRef = useRef(false);

  const createBeep = useCallback((ctx: AudioContext, freq: number, startTime: number, duration: number) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(freq, startTime);
    gainNode.gain.setValueAtTime(0.3, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }, []);

  const play = useCallback(() => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioCtxRef.current;

      const playAlarmPattern = () => {
        if (!isPlayingRef.current) return;
        const now = ctx.currentTime;
        createBeep(ctx, 880, now, 0.15);
        createBeep(ctx, 660, now + 0.2, 0.15);
        createBeep(ctx, 880, now + 0.4, 0.15);
        createBeep(ctx, 660, now + 0.6, 0.15);
      };

      playAlarmPattern();
      intervalRef.current = setInterval(playAlarmPattern, 900);
    } catch (e) {
      console.warn("Audio context error:", e);
    }
  }, [createBeep]);

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stop();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, [stop]);

  return { play, stop };
}

export function useBrowserNotifications(): {
  requestPermission: () => Promise<boolean>;
  notify: (title: string, body: string) => void;
} {
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }, []);

  const notify = useCallback((title: string, body: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
      });
    }
  }, []);

  return { requestPermission, notify };
}
