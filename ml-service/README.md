## ML Service (FastAPI)

### What it does
- `POST /analyze`: anomaly detection for `temp`, `hum`, `motion`
  - **temp/hum**: rolling IsolationForest (warm-up required)
  - **motion**: burst detection (recent 10 min vs baseline)

### Setup

```bash
cd ml-service
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

### Endpoints
- `GET /healthz`
- `POST /analyze`

Example body:

```json
{
  "deviceId": "1",
  "metric": "temp",
  "value": 23.1,
  "timestamp": "2026-04-17T12:00:00Z"
}
```

