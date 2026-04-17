# SmartHome IoT Dashboard

A full-stack IoT control panel for your ESP32 smart home. Monitor sensors and control devices in real-time over MQTT — available as a **web dashboard** and a **React Native mobile app**.

---

## Project Structure

```
artifacts/
  smart-home/        ← Web dashboard (React + Vite, PWA-enabled)
  mobile-app/        ← Mobile app (React Native with Expo)
  api-server/        ← Shared Express API backend
```

---

## Web Dashboard

### Features
- Real-time temperature, humidity, motion monitoring
- LED and buzzer remote control
- Smart alarm system with screen flash + audio + browser notifications
- Live Chart.js dual-axis graphs
- PWA — installable on Android and iOS
- HiveMQ Cloud + Public broker support (WSS)

### Run Locally

```bash
# Install dependencies
pnpm install

# Start web dashboard
pnpm --filter @workspace/smart-home run dev
```

Open `http://localhost:<PORT>` in your browser.

---

## Mobile App (React Native / Expo)

### Features
- Dashboard: temperature, humidity, motion sensor cards
- LED toggle and buzzer control
- Alarm system with haptic feedback
- Settings screen for MQTT broker configuration (auto-saved)
- Dark neon theme matching the web dashboard

### Run on Device (Expo Go)

```bash
# Install dependencies
pnpm install

# Start Expo dev server
pnpm --filter @workspace/mobile-app run dev
```

Then in Replit: click the **QR code** icon in the URL bar → scan with your phone using **Expo Go** (iOS/Android).

### Run on iOS Simulator / Android Emulator

Use the Expo Go app on your device and scan the QR code, or use:

```bash
# iOS Simulator
npx expo run:ios

# Android Emulator  
npx expo run:android
```

---

## MQTT Configuration

### HiveMQ Public Broker (free, no auth)

```
Broker URL: wss://broker.hivemq.com:8884/mqtt
Username:   (leave blank)
Password:   (leave blank)
```

### HiveMQ Cloud (private, with auth)

1. Sign up at [hivemq.com/mqtt-cloud-broker](https://www.hivemq.com/mqtt-cloud-broker/)
2. Create a free cluster
3. Use your cluster URL:

```
Broker URL: wss://YOUR-CLUSTER.s1.eu.hivemq.cloud:8884/mqtt
Username:   your_hivemq_username
Password:   your_hivemq_password
```

### MQTT Topics

| Direction   | Topic              | Description                    |
|-------------|-------------------|--------------------------------|
| Subscribe   | `home/temp`        | Temperature (°C)               |
| Subscribe   | `home/hum`         | Humidity (%)                   |
| Subscribe   | `home/motion`      | Motion: `1` / `0`             |
| Subscribe   | `home/led/status`  | LED confirmed state: `ON`/`OFF`|
| Subscribe   | `home/buzzer/status`| Buzzer confirmed state        |
| Subscribe   | `home/alarm/status` | Alarm confirmed state         |
| Publish     | `home/led`         | Control LED: `ON` / `OFF`     |
| Publish     | `home/buzzer`      | Control buzzer: `ON` / `OFF`  |
| Publish     | `home/alarm`       | Arm/disarm alarm: `ON` / `OFF`|

---

## ESP32 Setup

Your ESP32 should connect to the same MQTT broker and:

- **Publish** sensor data every few seconds to `home/temp`, `home/hum`, `home/motion`
- **Subscribe** to `home/led`, `home/buzzer`, `home/alarm` for commands
- **Publish** confirmations back to `home/led/status`, `home/buzzer/status` after acting

---

## Install PWA on Phone (Web App)

### Android (Chrome)
1. Open the web dashboard URL in Chrome
2. Tap the **three-dot menu** (⋮) → **"Add to Home screen"**
3. Tap **Add** — the app icon appears on your home screen

### iOS (Safari)
1. Open the web dashboard URL in Safari
2. Tap the **Share button** (square with arrow)
3. Scroll down → tap **"Add to Home Screen"**
4. Tap **Add** — installed as a standalone app

---

## Deploy the Web Dashboard

In Replit, click the **Publish** button to deploy the web dashboard to a `.replit.app` URL.

---

## Download / Export the Project as ZIP

### Option A — Replit UI (Easiest)

1. In Replit, click the **three-dot menu** (⋮) next to the project name
2. Select **"Download as zip"**
3. A `.zip` file containing the full project downloads

### Option B — Shell Command

Open the Replit Shell and run:

```bash
# From the project root (/home/runner/workspace)
zip -r smarthome-project.zip . \
  --exclude="node_modules/*" \
  --exclude=".git/*" \
  --exclude="*/node_modules/*" \
  --exclude="*/.cache/*" \
  --exclude="*/dist/*"
```

The file is saved to your workspace. Download it via Files panel → right-click → Download.

### What's included in the export

```
artifacts/smart-home/     ← Full web dashboard source
  src/                    ← React components, hooks, pages
  public/                 ← manifest.json, sw.js (PWA files)
  index.html
  vite.config.ts

artifacts/mobile-app/     ← Full mobile app source
  app/                    ← Expo Router screens
  context/                ← MQTT context provider
  constants/              ← Colors and theme
  assets/                 ← App icon

artifacts/api-server/     ← Backend (Express)

README.md                 ← This file
```

---

## Tech Stack

| Layer       | Technology                           |
|-------------|--------------------------------------|
| Web frontend| React + Vite + Tailwind CSS          |
| Mobile      | React Native + Expo Router           |
| MQTT client | mqtt.js (WSS over WebSocket)         |
| Charts      | Chart.js                             |
| PWA         | Service Worker + Web App Manifest    |
| Backend     | Express + TypeScript                 |
| Monorepo    | pnpm workspaces                      |
