from __future__ import annotations

from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from typing import Deque, Dict, Literal, Optional, Tuple

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field
from sklearn.ensemble import IsolationForest

Metric = Literal["temp", "hum", "motion"]


class AnalyzeRequest(BaseModel):
    deviceId: str = Field(..., min_length=1)
    metric: Metric
    value: float
    timestamp: Optional[datetime] = None


class AnalyzeResponse(BaseModel):
    anomaly: bool
    kind: Optional[str] = None
    score: Optional[float] = None


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


class RollingAnomalyDetector:
    """
    In-memory per-device rolling anomaly detection.
    - Temperature/humidity: IsolationForest once we have enough samples.
    - Motion: burst detection using rolling event rate (simple z-score).

    This is deliberately stateful but ephemeral (safe for academic demo + dev).
    For production, persist features or use a streaming job.
    """

    def __init__(self) -> None:
        self._series: Dict[Tuple[str, Metric], Deque[float]] = defaultdict(lambda: deque(maxlen=240))
        self._motion_times: Dict[str, Deque[datetime]] = defaultdict(lambda: deque(maxlen=500))

    def analyze(self, device_id: str, metric: Metric, value: float, ts: datetime) -> AnalyzeResponse:
        if metric in ("temp", "hum"):
            return self._analyze_numeric(device_id, metric, value, ts)
        return self._analyze_motion(device_id, value, ts)

    def _analyze_numeric(self, device_id: str, metric: Metric, value: float, ts: datetime) -> AnalyzeResponse:
        key = (device_id, metric)
        history = self._series[key]
        history.append(float(value))

        # Require a warm-up window.
        if len(history) < 40:
            return AnalyzeResponse(anomaly=False, kind=None, score=None)

        X = np.array(history, dtype=np.float64).reshape(-1, 1)
        # Keep model lightweight; contamination is a small fraction.
        model = IsolationForest(
            n_estimators=100,
            contamination=0.03,
            random_state=42,
        )
        model.fit(X)

        x = np.array([[float(value)]], dtype=np.float64)
        pred = model.predict(x)[0]  # -1 anomaly, 1 normal
        score = float(model.score_samples(x)[0])

        if pred == -1:
            return AnalyzeResponse(anomaly=True, kind=f"{metric}_anomaly", score=score)
        return AnalyzeResponse(anomaly=False, kind=None, score=score)

    def _analyze_motion(self, device_id: str, value: float, ts: datetime) -> AnalyzeResponse:
        # Treat any positive value as motion event.
        if value > 0:
            q = self._motion_times[device_id]
            q.append(ts)

        q = self._motion_times[device_id]
        if len(q) < 10:
            return AnalyzeResponse(anomaly=False, kind=None, score=None)

        # Compute event count in last 10 minutes and baseline last 2 hours (excluding last 10 min).
        ts_utc = ts.astimezone(timezone.utc)
        ten_min_ago = ts_utc - timedelta(minutes=10)
        two_hr_ago = ts_utc - timedelta(hours=2)

        recent = [t for t in q if t >= ten_min_ago]
        baseline = [t for t in q if two_hr_ago <= t < ten_min_ago]

        recent_count = float(len(recent))
        baseline_count = float(len(baseline))

        # Convert to rates per 10 min window.
        baseline_windows = max(1.0, (120.0 - 10.0) / 10.0)  # 11 windows
        baseline_rate = baseline_count / baseline_windows

        # Simple burst heuristic.
        if recent_count >= max(8.0, baseline_rate * 4.0):
            return AnalyzeResponse(anomaly=True, kind="motion_burst", score=recent_count)
        return AnalyzeResponse(anomaly=False, kind=None, score=recent_count)


app = FastAPI(title="SmartHome ML Service", version="1.0.0")
detector = RollingAnomalyDetector()


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    ts = req.timestamp or _now_utc()
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)

    return detector.analyze(req.deviceId, req.metric, float(req.value), ts)

