# Smart Home Dashboard

## Overview

A modern, futuristic smart home web dashboard that connects to an ESP32 via MQTT protocol. Features a dark theme with neon blue/green/red colors, glassmorphism design, real-time sensor monitoring, interactive device controls, and a smart alarm system.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/smart-home)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM (not used by dashboard — MQTT is the data source)
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **MQTT**: mqtt.js (WebSocket/WSS)
- **Charts**: Chart.js

## Smart Home Dashboard Features

### Real-time Monitoring (MQTT)
- **Temperature** — subscribed to `home/temp`
- **Humidity** — subscribed to `home/hum`
- **Motion Detection** — subscribed to `home/motion`
- **LED Status** — subscribed to `home/led/status`
- **Buzzer Status** — subscribed to `home/buzzer/status`

### Interactive Controls
- Toggle LED (publishes to `home/led`)
- Toggle Buzzer (publishes to `home/buzzer`)
- Enable/Disable Alarm System toggle switch

### Smart Alarm System
- When motion is detected AND alarm is enabled:
  - Activates browser alarm sound (Web Audio API)
  - Flashes screen red
  - Shows "Intrusion Detected" alert banner
  - Sends browser notification (if permission granted)
  - Publishes `ON` to `home/buzzer`
- When motion stops: auto-silences alarm, publishes `OFF` to `home/buzzer`

### Visual Design
- Glassmorphism card layout
- Neon blue (#00c8ff), green (#00ff88), red (#ff3232) color scheme
- Orbitron font for futuristic look
- Animated scan line effect
- LED glow, buzzer pulse, motion blink animations
- Live Chart.js graph for temperature and humidity history

### MQTT Configuration
- Default broker: `wss://broker.hivemq.com:8884/mqtt`
- Supports HiveMQ Cloud with username/password authentication
- Connects via WebSocket Secure (WSS)
- Click "CONNECT" button to configure and connect

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/smart-home run dev` — run smart home dashboard

## Artifact Paths

- Frontend: `artifacts/smart-home/` — React+Vite dashboard
- API server: `artifacts/api-server/` — Express backend (health check only for this project)
- Shared libs: `lib/` — API spec, client hooks, DB schema

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
