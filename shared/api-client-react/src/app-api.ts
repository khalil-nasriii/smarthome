import { customFetch } from "./custom-fetch";

export type AuthUser = {
  id: number;
  email: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type Device = {
  id: number;
  name: string;
  createdAt: string;
};

export type UserSettings = {
  id: number;
  userId: number;
  alarmEnabled: boolean;
  notificationsEnabled: boolean;
  pushEnabled: boolean;
  expoPushToken: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationEvent = {
  id: number;
  userId: number;
  deviceId: number;
  kind: "motion_alarm" | "temp_threshold" | "ml_anomaly" | string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  createdAt: string;
};

export type Rule = {
  id: number;
  userId: number;
  deviceId: number;
  type: "motion_night_buzzer" | "temp_threshold_alert" | "anomaly_alert" | string;
  enabled: boolean;
  config: Record<string, unknown>;
  createdAt: string;
};

export async function register(body: { email: string; password: string }) {
  return customFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
    responseType: "json",
  });
}

export async function login(body: { email: string; password: string }) {
  return customFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
    responseType: "json",
  });
}

export async function getMe() {
  return customFetch<{ user: AuthUser & { createdAt: string } }>("/api/me", {
    method: "GET",
    responseType: "json",
  });
}

export async function listDevices() {
  return customFetch<{ devices: Device[] }>("/api/devices", {
    method: "GET",
    responseType: "json",
  });
}

export async function createDevice(body: { name: string }) {
  return customFetch<{ device: Device }>("/api/devices", {
    method: "POST",
    body: JSON.stringify(body),
    responseType: "json",
  });
}

export async function getSettings() {
  return customFetch<{ settings: UserSettings }>("/api/settings", {
    method: "GET",
    responseType: "json",
  });
}

export async function updateSettings(body: Partial<Pick<UserSettings, "alarmEnabled" | "notificationsEnabled" | "pushEnabled">>) {
  return customFetch<{ settings: UserSettings }>("/api/settings", {
    method: "PUT",
    body: JSON.stringify(body),
    responseType: "json",
  });
}

export async function registerPushToken(body: { expoPushToken: string }) {
  return customFetch<{ ok: boolean; expoPushToken: string | null }>("/api/settings/push-token", {
    method: "POST",
    body: JSON.stringify(body),
    responseType: "json",
  });
}

export async function listNotifications(params?: { deviceId?: number; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.deviceId) query.set("deviceId", String(params.deviceId));
  if (params?.limit) query.set("limit", String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : "";

  return customFetch<{ events: NotificationEvent[] }>(`/api/notifications${suffix}`, {
    method: "GET",
    responseType: "json",
  });
}

export async function listRules() {
  return customFetch<{ rules: Rule[] }>("/api/rules", {
    method: "GET",
    responseType: "json",
  });
}

export async function createRule(body: Record<string, unknown>) {
  return customFetch<{ rule: Rule }>("/api/rules", {
    method: "POST",
    body: JSON.stringify(body),
    responseType: "json",
  });
}

export async function deleteRule(ruleId: number) {
  return customFetch<{ ok: boolean }>(`/api/rules/${ruleId}`, {
    method: "DELETE",
    responseType: "json",
  });
}

export async function getHistory(params: { deviceId: number | string; range: "daily" | "weekly" }) {
  const query = new URLSearchParams({
    deviceId: String(params.deviceId),
    range: params.range,
  });

  return customFetch<{
    deviceId: string;
    range: "daily" | "weekly";
    series: {
      temp: Array<{ t: string; v: number }>;
      hum: Array<{ t: string; v: number }>;
      motion: Array<{ t: string; v: number }>;
    };
  }>(`/api/data/history?${query.toString()}`, {
    method: "GET",
    responseType: "json",
  });
}

