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
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.12)",
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: "#3b82f6",
            pointBorderColor: "#3b82f6",
            tension: 0.4,
            fill: true,
            yAxisID: "y",
          },
          {
            label: "Humidity (%)",
            data: humHistory.map((p) => p.value),
            borderColor: "#22c55e",
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: "#22c55e",
            pointBorderColor: "#22c55e",
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
              color: "rgba(229, 231, 235, 0.75)",
              font: { size: 11, family: "Inter" },
              boxWidth: 12,
              padding: 16,
            },
          },
          tooltip: {
            backgroundColor: "rgba(17, 24, 39, 0.96)",
            borderColor: "rgba(148, 163, 184, 0.35)",
            borderWidth: 1,
            titleColor: "#e5e7eb",
            bodyColor: "rgba(229, 231, 235, 0.85)",
            padding: 10,
          },
        },
        scales: {
          x: {
            ticks: {
              color: "rgba(156, 163, 175, 0.9)",
              font: { size: 9, family: "JetBrains Mono" },
              maxTicksLimit: 6,
              maxRotation: 0,
            },
            grid: {
              color: "rgba(148, 163, 184, 0.12)",
            },
          },
          y: {
            type: "linear",
            display: true,
            position: "left",
            ticks: {
              color: "rgba(96, 165, 250, 0.9)",
              font: { size: 10, family: "JetBrains Mono" },
              callback: (val) => `${val}°C`,
            },
            grid: {
              color: "rgba(148, 163, 184, 0.12)",
            },
          },
          y1: {
            type: "linear",
            display: true,
            position: "right",
            ticks: {
              color: "rgba(34, 197, 94, 0.9)",
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
