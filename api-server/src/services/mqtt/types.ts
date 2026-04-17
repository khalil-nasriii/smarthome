export type SensorMetric = "temp" | "hum" | "motion";

export type MqttSensorMessage = {
  deviceId: string;
  metric: SensorMetric;
  topic: string;
  payload: Buffer;
  receivedAt: Date;
};

