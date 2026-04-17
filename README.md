# Enterprise Smart Home IoT Platform (Academic-Grade)

A production-ready, secure, and scalable IoT ecosystem featuring real-time telemetry, automation rules, machine learning anomaly detection, and cross-platform control (Web + Mobile).

## 🏗 System Architecture

The project follows a modular micro-service architecture using a Monorepo structure managed by `pnpm`:

- **`/web-dashboard`**: React + Vite + Tailwind + Chart.js. High-performance, real-time dashboard with WSS MQTT integration.
- **`/mobile-app`**: Expo (React Native). Native mobile experience with push notifications and haptic feedback.
- **`/api-server`**: Node.js + Express + PostgreSQL (Drizzle ORM). Central coordinator for Auth, Rules, and Data.
- **`/ml-service`**: Python FastAPI + Scikit-Learn. Advanced anomaly detection using Isolation Forests.
- **`/shared`**: Common TypeScript logic including DB schemas, API specs, and shared client libraries.

## 🎓 Academic Compliance & Production Features

- **Security**: JWT-based authentication, Bcrypt password hashing (12 rounds), and protected API middleware.
- **Time-Series Data**: Specialized InfluxDB integration for historical sensor data storage and retrieval.
- **MQTT Pattern**: Dynamic topic scoping (`home/{deviceId}/{metric}`) allowing multi-user and multi-device isolation.
- **Machine Learning**: Intentional use of Isolation Forest for unsupervised outlier detection in temperature/humidity streams.
- **Automation Engine**: Rule-based logic engine with persistence, enabling IF-THEN behaviors (e.g., Night Mode Security).
- **Resilience**: Full MQTT reconnect management, persistent local state on mobile, and robust error handling.

## 📊 Topic Contract

Topic pattern: `home/{deviceId}/{leaf}`

| Direction | Topic Leaf | Content | Description |
|-----------|------------|---------|-------------|
| Publish | `temp` | Float | Temperature readings (°C) |
| Publish | `hum` | Float | Humidity readings (%) |
| Publish | `motion` | 0/1 | PIR Motion state |
| Publish | `led/status` | ON/OFF | Confirmed LED state from hardware |
| Command | `led` | ON/OFF | Control the LED |
| Command | `buzzer` | ON/OFF | Control the Buzzer |
| Command | `alarm` | ON/OFF | Arm/Disarm the security system |

## 🚀 Getting Started

### 1. Prerequisite Setup
- **PostgreSQL**: Primary data store for users, devices, and rules.
- **InfluxDB**: Time-series store for sensor logs.
- **MQTT Broker**: HiveMQ Cloud (recommended) or any WSS-compatible broker.

### 2. Environment Configuration
Create a `.env` file in the root based on the template:
```bash
cp .env.example .env
```
Ensure all credentials for MQTT, InfluxDB, and Postgres are filled in.

### 3. Installation & Database
```bash
# Install dependencies
pnpm install

# Push database schema
pnpm --filter @workspace/db run push
```

### 4. Running the Ecosystem

| Service | Command |
|---------|---------|
| **Backend API** | `pnpm --filter api-server dev` |
| **Web Dashboard** | `pnpm --filter web-dashboard dev` |
| **ML Service** | `cd ml-service && uvicorn app.main:app --port 8000` |
| **Mobile App** | `pnpm --filter mobile-app dev` |

## 🛠 Deployment

- **Web**: Optimized for Vercel/Netlify.
- **Backend / ML**: Optimized for Docker, Render, or Railway.
- **Mobile**: Built with Expo EAS for iOS and Android.

---
*Developed as a production-grade IoT reference architecture.*
