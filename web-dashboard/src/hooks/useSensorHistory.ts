import { useState, useCallback, useRef } from "react";

export interface DataPoint {
  time: string;
  value: number;
}

const MAX_HISTORY = 20;

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function useSensorHistory() {
  const [tempHistory, setTempHistory] = useState<DataPoint[]>([]);
  const [humHistory, setHumHistory] = useState<DataPoint[]>([]);
  const lastTempRef = useRef<number | null>(null);
  const lastHumRef = useRef<number | null>(null);

  const addTemperature = useCallback((value: number) => {
    if (value === lastTempRef.current) return;
    lastTempRef.current = value;
    const point: DataPoint = { time: formatTime(new Date()), value };
    setTempHistory((prev) => {
      const next = [...prev, point];
      return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
    });
  }, []);

  const addHumidity = useCallback((value: number) => {
    if (value === lastHumRef.current) return;
    lastHumRef.current = value;
    const point: DataPoint = { time: formatTime(new Date()), value };
    setHumHistory((prev) => {
      const next = [...prev, point];
      return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
    });
  }, []);

  return { tempHistory, humHistory, addTemperature, addHumidity };
}
