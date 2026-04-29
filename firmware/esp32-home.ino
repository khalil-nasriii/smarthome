/**
 * ESP32 + DHT11 + PIR
 * Dashboard MQTT OFF wins over motion/temp auto until PIR clears (or temp ≤ 27°C for red auto).
 *
 * Set to 0 if your LED/buzzer modules are active-HIGH (direct anode to GPIO).
 */
#define LED_ACTIVE_LOW 1
#define BUZZER_ACTIVE_LOW 1

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <DHT.h>

// ===== CONFIGURATION =====
const char* WIFI_SSID = "Khalil";
const char* WIFI_PASS = "khalil321";

const char* MQTT_HOST = "516e74c9ef2141bfbb71e74a08a4b722.s1.eu.hivemq.cloud";
const uint16_t MQTT_PORT = 8883;
const char* MQTT_USER = "pexaa";
const char* MQTT_PASS = "KHalil123@";

// ===== PINS =====
const int pirPin = 13;
const int redPin = 14;
const int buzzerPin = 26;
const int bluePin = 27;

#define DHT_PIN 33
#define DHT_TYPE DHT11
DHT dht(DHT_PIN, DHT_TYPE);

String deviceId;
WiFiClientSecure wifiClient;
PubSubClient mqtt(wifiClient);

unsigned long lastTelemetryMs = 0;
const long telemetryInterval = 5000;
int lastPirState = LOW;

bool redCommandedOn = false;
bool blueCommandedOn = false;
bool buzzerCommandedOn = false;

/* Default disarmed until dashboard syncs (avoids locking red/buzzer when MQTT went to wrong device id first). */
bool espTempAlarmRed = false;
bool espMotionAlarmLocal = false;

/** User sent OFF on blue/led — ignore motion-driven blue until PIR goes LOW once. */
bool suppressBlueFromMotionUntilPirLow = false;
/** User sent buzzer OFF — skip motion beep until PIR goes LOW once. */
bool suppressMotionBeepUntilPirLow = false;
/** User sent red OFF — ignore temp>27 auto-red until temp ≤ 27 once (or red ON). */
bool suppressTempAutoRed = false;

float lastValidTempC = NAN;

String topicTemp, topicHum, topicMotion;
String topicRedCmd, topicRedStatus;
String topicBlueCmd, topicBlueStatus;
String topicLedCmd, topicLedStatus;
String topicBuzzerCmd, topicBuzzerStatus;
String topicAlarmTemp, topicAlarmMotion;

void setupTopics() {
  topicTemp = "home/" + deviceId + "/temp";
  topicHum = "home/" + deviceId + "/hum";
  topicMotion = "home/" + deviceId + "/motion";
  topicRedCmd = "home/" + deviceId + "/red";
  topicRedStatus = "home/" + deviceId + "/red/status";
  topicBlueCmd = "home/" + deviceId + "/blue";
  topicBlueStatus = "home/" + deviceId + "/blue/status";
  topicLedCmd = "home/" + deviceId + "/led";
  topicLedStatus = "home/" + deviceId + "/led/status";
  topicBuzzerCmd = "home/" + deviceId + "/buzzer";
  topicBuzzerStatus = "home/" + deviceId + "/buzzer/status";
  topicAlarmTemp = "home/" + deviceId + "/alarm/temp";
  topicAlarmMotion = "home/" + deviceId + "/alarm/motion";
}

bool parseOn(const String& message) {
  String m = message;
  m.trim();
  m.toUpperCase();
  return m == "ON" || m == "1" || m == "TRUE";
}

static inline void writeLed(int pin, bool on) {
#if LED_ACTIVE_LOW
  digitalWrite(pin, on ? LOW : HIGH);
#else
  digitalWrite(pin, on ? HIGH : LOW);
#endif
}

static inline bool readLedOn(int pin) {
#if LED_ACTIVE_LOW
  return digitalRead(pin) == LOW;
#else
  return digitalRead(pin) == HIGH;
#endif
}

static inline void writeBuzzer(bool on) {
#if BUZZER_ACTIVE_LOW
  digitalWrite(buzzerPin, on ? LOW : HIGH);
#else
  digitalWrite(buzzerPin, on ? HIGH : LOW);
#endif
}

static inline bool readBuzzerOn() {
#if BUZZER_ACTIVE_LOW
  return digitalRead(buzzerPin) == LOW;
#else
  return digitalRead(buzzerPin) == HIGH;
#endif
}

void applyRedOutput() {
  bool tempHot = !isnan(lastValidTempC) && lastValidTempC > 27.0f;
  bool autoFromTemp = espTempAlarmRed && tempHot && !suppressTempAutoRed;
  bool on = redCommandedOn || autoFromTemp;
  writeLed(redPin, on);
}

void applyBlueOutput(bool motionHigh) {
  bool motionAuto =
      espMotionAlarmLocal && motionHigh && !suppressBlueFromMotionUntilPirLow;
  bool on = blueCommandedOn || motionAuto;
  writeLed(bluePin, on);
}

/** Motion or temp alarm armed from dashboard — block manual red OFF + buzzer ON only */
bool alarmsArmedLock() { return espMotionAlarmLocal || espTempAlarmRed; }

void mqttCallback(char* topicRaw, byte* payload, unsigned int length) {
  String message;
  for (unsigned int i = 0; i < length; i++) message += (char)payload[i];

  Serial.print("CMD ["); Serial.print(topicRaw); Serial.print("]: "); Serial.println(message);

  String tpc(topicRaw);

  if (tpc == topicRedCmd) {
    bool wantOn = parseOn(message);
    if (alarmsArmedLock() && !wantOn) {
      Serial.println("[MQTT] red OFF ignored (alarm armed)");
      return;
    }
    redCommandedOn = wantOn;
    if (!redCommandedOn) {
      suppressTempAutoRed = true;
    } else {
      suppressTempAutoRed = false;
    }
    applyRedOutput();
    mqtt.publish(topicRedStatus.c_str(), readLedOn(redPin) ? "ON" : "OFF");
  } else if (tpc == topicBlueCmd || tpc == topicLedCmd) {
    blueCommandedOn = parseOn(message);
    if (!blueCommandedOn) {
      suppressBlueFromMotionUntilPirLow = true;
    } else {
      suppressBlueFromMotionUntilPirLow = false;
    }
    applyBlueOutput(lastPirState == HIGH);
    const char* bs = readLedOn(bluePin) ? "ON" : "OFF";
    mqtt.publish(topicBlueStatus.c_str(), bs);
    mqtt.publish(topicLedStatus.c_str(), bs);
  } else if (tpc == topicBuzzerCmd) {
    bool wantBuzzOn = parseOn(message);
    if (alarmsArmedLock() && wantBuzzOn) {
      Serial.println("[MQTT] buzzer ON ignored (alarm armed)");
      return;
    }
    buzzerCommandedOn = wantBuzzOn;
    if (!buzzerCommandedOn) {
      suppressMotionBeepUntilPirLow = true;
    } else {
      suppressMotionBeepUntilPirLow = false;
    }
    writeBuzzer(buzzerCommandedOn);
    mqtt.publish(topicBuzzerStatus.c_str(), readBuzzerOn() ? "ON" : "OFF");
  } else if (tpc == topicAlarmTemp) {
    espTempAlarmRed = parseOn(message);
    applyRedOutput();
  } else if (tpc == topicAlarmMotion) {
    espMotionAlarmLocal = parseOn(message);
    applyBlueOutput(lastPirState == HIGH);
  }
}

void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected! IP: " + WiFi.localIP().toString());
}

void connectMQTT() {
  while (!mqtt.connected()) {
    Serial.print("Connecting MQTT...");
    if (mqtt.connect(deviceId.c_str(), MQTT_USER, MQTT_PASS)) {
      Serial.println("connected");
      mqtt.subscribe(topicRedCmd.c_str());
      mqtt.subscribe(topicBlueCmd.c_str());
      mqtt.subscribe(topicLedCmd.c_str());
      mqtt.subscribe(topicBuzzerCmd.c_str());
      mqtt.subscribe(topicAlarmTemp.c_str());
      mqtt.subscribe(topicAlarmMotion.c_str());
      mqtt.publish(topicRedStatus.c_str(), "OFF");
      mqtt.publish(topicBlueStatus.c_str(), "OFF");
      mqtt.publish(topicLedStatus.c_str(), "OFF");
      mqtt.publish(topicBuzzerStatus.c_str(), "OFF");
    } else {
      Serial.print("failed rc=");
      Serial.print(mqtt.state());
      Serial.println(" retrying in 5s");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(pirPin, INPUT_PULLDOWN);
  pinMode(redPin, OUTPUT);
  pinMode(bluePin, OUTPUT);
  pinMode(buzzerPin, OUTPUT);
  dht.begin();

  writeLed(redPin, false);
  writeLed(bluePin, false);
  writeBuzzer(false);

  uint64_t chipId = ESP.getEfuseMac();
  deviceId = "esp32-" + String((uint32_t)(chipId >> 32), HEX) + String((uint32_t)chipId, HEX);
  deviceId.toUpperCase();

  setupTopics();
  wifiClient.setInsecure();
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(mqttCallback);

  connectWiFi();
  connectMQTT();
  Serial.println("Device ID: " + deviceId);
}

void loop() {
  if (!mqtt.connected()) connectMQTT();
  mqtt.loop();

  if (millis() - lastTelemetryMs >= telemetryInterval) {
    lastTelemetryMs = millis();

    float t = dht.readTemperature();
    float h = dht.readHumidity();

    if (!isnan(t)) {
      lastValidTempC = t;
      char tStr[12];
      dtostrf(t, 1, 2, tStr);
      mqtt.publish(topicTemp.c_str(), tStr);
      Serial.print("Temp: ");
      Serial.println(t);
      if (lastValidTempC <= 27.0f) {
        suppressTempAutoRed = false;
      }
      applyRedOutput();
    }
    if (!isnan(h)) {
      char hStr[12];
      dtostrf(h, 1, 2, hStr);
      mqtt.publish(topicHum.c_str(), hStr);
      Serial.print("Hum: ");
      Serial.println(h);
    }
  }

  int pirValue = digitalRead(pirPin);
  if (pirValue != lastPirState) {
    lastPirState = pirValue;
    mqtt.publish(topicMotion.c_str(), pirValue == HIGH ? "1" : "0");

    if (pirValue == HIGH) {
      Serial.println("Motion detected!");
      applyBlueOutput(true);
      if (espMotionAlarmLocal && !buzzerCommandedOn && !suppressMotionBeepUntilPirLow) {
        writeBuzzer(true);
        delay(100);
        writeBuzzer(false);
      }
    } else {
      suppressBlueFromMotionUntilPirLow = false;
      suppressMotionBeepUntilPirLow = false;
      applyBlueOutput(false);
      if (!buzzerCommandedOn) writeBuzzer(false);
    }
  }
}
