import type { SensorMetric } from "./types";

export function sensorTopic(deviceId: string, metric: SensorMetric): string {
  return `home/${deviceId}/${metric}`;
}

export function commandTopic(deviceId: string, command: string): string {
  return `home/${deviceId}/${command}`;
}

export function parseHomeTopic(topic: string): { deviceId: string; leaf: string } | null {
  const parts = topic.split("/");
  if (parts.length < 3) return null;
  if (parts[0] !== "home") return null;
  const deviceId = parts[1];
  const leaf = parts.slice(2).join("/");
  if (!deviceId || !leaf) return null;
  return { deviceId, leaf };
}

