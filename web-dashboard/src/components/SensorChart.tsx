import { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { DataPoint } from "@/hooks/useSensorHistory";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SensorChartProps {
  tempHistory: DataPoint[];
  humHistory: DataPoint[];
}

export function SensorChart({ tempHistory, humHistory }: SensorChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const allTimes = Array.from(
      new Set([
        ...tempHistory.map((p) => p.time),
        ...humHistory.map((p) => p.time),
      ])
    ).sort();

    chartRef.current = new ChartJS(ctx, {
      type: "line",
      data: {
        labels: allTimes.length > 0 ? allTimes : ["--"],
        datasets: [
          {
            label: "Temperature (°C)",
            data: tempHistory.map((p) => p.value),
            borderColor: "#00c8ff",
            backgroundColor: "rgba(0, 200, 255, 0.08)",
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: "#00c8ff",
            pointBorderColor: "#00c8ff",
            tension: 0.4,
            fill: true,
            yAxisID: "y",
          },
          {
            label: "Humidity (%)",
            data: humHistory.map((p) => p.value),
            borderColor: "#00ff88",
            backgroundColor: "rgba(0, 255, 136, 0.06)",
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: "#00ff88",
            pointBorderColor: "#00ff88",
            tension: 0.4,
            fill: true,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 400,
          easing: "easeInOutQuart",
        },
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              color: "rgba(200, 230, 255, 0.7)",
              font: { size: 11, family: "Inter" },
              boxWidth: 12,
              padding: 16,
            },
          },
          tooltip: {
            backgroundColor: "rgba(10, 18, 35, 0.95)",
            borderColor: "rgba(0, 200, 255, 0.3)",
            borderWidth: 1,
            titleColor: "#00c8ff",
            bodyColor: "rgba(200, 230, 255, 0.85)",
            padding: 10,
          },
        },
        scales: {
          x: {
            ticks: {
              color: "rgba(200, 230, 255, 0.4)",
              font: { size: 9, family: "JetBrains Mono" },
              maxTicksLimit: 6,
              maxRotation: 0,
            },
            grid: {
              color: "rgba(0, 200, 255, 0.05)",
            },
          },
          y: {
            type: "linear",
            display: true,
            position: "left",
            ticks: {
              color: "rgba(0, 200, 255, 0.6)",
              font: { size: 10, family: "JetBrains Mono" },
              callback: (val) => `${val}°C`,
            },
            grid: {
              color: "rgba(0, 200, 255, 0.05)",
            },
          },
          y1: {
            type: "linear",
            display: true,
            position: "right",
            ticks: {
              color: "rgba(0, 255, 136, 0.6)",
              font: { size: 10, family: "JetBrains Mono" },
              callback: (val) => `${val}%`,
            },
            grid: {
              drawOnChartArea: false,
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [tempHistory, humHistory]);

  return (
    <div className="chart-container">
      <canvas ref={canvasRef} />
    </div>
  );
}
