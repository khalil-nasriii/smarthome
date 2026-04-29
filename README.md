# Smart Home IoT Platform

Production-ready and academically compliant Smart Home IoT system with:

- Web dashboard (`React + Vite + Tailwind + Chart.js`)
- Mobile app (`Expo React Native`)
- API server (`Node.js + Express + Drizzle + PostgreSQL`)
- ML service (`FastAPI + scikit-learn`)
- Time-series analytics (`InfluxDB`)
- Real-time messaging (`MQTT / HiveMQ Cloud`)

## Monorepo Structure

- `web-dashboard`: Web control and visualization UI
- `mobile-app`: Mobile control, telemetry, and push notifications
- `api-server`: Auth, devices, rules, notifications, MQTT orchestration
- `ml-service`: Sensor anomaly detection microservice
- `shared`: Shared DB schema and API client packages

## Core Architecture

1. ESP32 publishes telemetry to `home/{deviceId}/temp|hum|motion`
2. API subscribes to wildcard MQTT topics (`home/+/temp|hum|motion`)
3. API writes points to InfluxDB and forwards values to ML service
4. ML returns anomaly flags to API
5. Automation engine evaluates DB rules and triggers:
   - notification events
   - optional Expo push notifications
   - MQTT command publishes (for buzzer/alerts)
6. Web and mobile apps consume API data and interact with device topics

## Security Model

- JWT auth (`/api/auth/register`, `/api/auth/login`)
- Password hashing via `bcrypt`
- Protected API routes via auth middleware
- Auth rate limiting enabled for login/register
- MQTT backend requires `mqtts://` URL (TLS)
- No hardcoded broker credentials in repository templates

## MQTT Topic Contract

Topic namespace: `home/{deviceId}/{leaf}`

- Telemetry publish:
  - `home/{deviceId}/temp` -> float
  - `home/{deviceId}/hum` -> float
  - `home/{deviceId}/motion` -> `0|1` or `false|true`
- Status publish:
  - `home/{deviceId}/led/status` -> `ON|OFF`
  - `home/{deviceId}/buzzer/status` -> `ON|OFF`
  - `home/{deviceId}/alarm/status` -> `ON|OFF`
- Command publish:
  - `home/{deviceId}/led`
  - `home/{deviceId}/buzzer`
  - `home/{deviceId}/alarm`

## Prerequisites

- Node.js 20+
- pnpm 10+
- Python 3.11+ (for ML service)
- PostgreSQL 14+
- InfluxDB 2.x
- HiveMQ Cloud account (or compatible secure MQTT broker)

## Environment Setup

### API server

Copy `api-server/.env.example` values into your runtime environment:

- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`
- `MQTT_URL` (`mqtts://...`), `MQTT_USERNAME`, `MQTT_PASSWORD`
- `INFLUX_URL`, `INFLUX_TOKEN`, `INFLUX_ORG`, `INFLUX_BUCKET`
- `ML_SERVICE_URL`

### Web dashboard

Set `web-dashboard/.env.example`:

- `VITE_API_BASE_URL=http://localhost:3000`

### Mobile app

Set `mobile-app/.env.example`:

- `EXPO_PUBLIC_API_BASE_URL=http://localhost:3000`

### ML service

Install from `ml-service/requirements.txt`.

## Local Development

Install dependencies:

```bash
pnpm install
```

Create DB schema:

```bash
pnpm --filter @workspace/db run push
```

Run services:

```bash
# API
pnpm --filter @workspace/api-server dev

# Web
pnpm --filter @workspace/smart-home dev

# Mobile
pnpm --filter @workspace/mobile-app dev

# ML (new shell)
cd ml-service
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Quick alternative from repo root (one command per terminal):

```bash
pnpm run dev:api
pnpm run dev:web
pnpm run dev:mobile
pnpm run dev:ml
```

## HiveMQ Cloud Setup

1. Create HiveMQ Cloud cluster.
2. Create MQTT credentials.
3. Use secure URL format:
   - backend TLS: `mqtts://<cluster>.s1.eu.hivemq.cloud:8883`
   - frontend websocket: `wss://<cluster>.s1.eu.hivemq.cloud:8884/mqtt`
4. Configure ACLs so device/user topics are scoped to authorized namespaces.
5. Put credentials only in environment variables (not source code).

## InfluxDB Setup

1. Create InfluxDB org and bucket (`sensors` recommended).
2. Generate write/read API token.
3. Configure API env vars:
   - `INFLUX_URL`
   - `INFLUX_TOKEN`
   - `INFLUX_ORG`
   - `INFLUX_BUCKET`
4. Confirm `/api/data/history?deviceId=<id>&range=daily|weekly` returns series data.

## ML Service Setup

1. Start service at `http://localhost:8000`.
2. Set `ML_SERVICE_URL=http://localhost:8000` in API env.
3. API calls `POST /analyze` with device metric values.
4. ML returns:
   - `anomaly: boolean`
   - `kind: string | null`
   - `score: number | null`

## ESP32 Integration

Recommended wiring:

- DHT11 -> temperature/humidity sensor input pin
- PIR -> motion input pin
- LED -> GPIO output
- Buzzer -> GPIO output

Firmware responsibilities:

1. Connect to WiFi
2. Connect to MQTT broker over TLS/WebSocket as configured
3. Publish telemetry periodically:
   - temp/hum every N seconds
   - motion on state change
4. Subscribe to command topics:
   - `led`, `buzzer`, `alarm`
5. Publish status acknowledgement topics:
   - `led/status`, `buzzer/status`, `alarm/status`

## Deployment

### Web -> Vercel

- Config file: `web-dashboard/vercel.json`
- Build command: `pnpm --filter @workspace/smart-home build`
- Output dir: `web-dashboard/dist`
- Set `VITE_API_BASE_URL` to deployed API URL

### Backend + ML -> Render

- Config file: `render.yaml`
- Dockerfiles:
  - `api-server/Dockerfile`
  - `ml-service/Dockerfile`
- Add required secrets in Render dashboard (DB/JWT/MQTT/Influx/ML URL)

### Backend -> Railway (alternative)

- Config file: `railway.json`
- Uses `api-server/Dockerfile`

## Validation Checklist

- Can register and login from web/mobile
- Protected endpoints reject missing/invalid JWT
- Device CRUD and device switching works
- MQTT telemetry appears live in dashboard
- History API returns aggregated daily/weekly series
- ML anomalies generate notification events
- Motion + alarm-enabled triggers alert flow
- Mobile push token registers and notifications deliver

## Notes for Academic Submission

- Demonstrates layered IoT architecture (device, messaging, processing, storage, analytics, UI)
- Includes secure transport and credential management patterns
- Includes rule-based automation and ML anomaly detection
- Uses both relational DB and time-series DB based on data type and query pattern
