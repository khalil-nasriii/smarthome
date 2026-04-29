import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { DataPoint } from "@/hooks/useSensorHistory";

type Props = {
  data: DataPoint[];
  lang?: "en" | "fr" | "ar";
};

export function HumidityChart({ data, lang = "en" }: Props) {
  const chartData = data.slice(-30);
  const labels = {
    en: { title: "Humidity", points: "points" },
    fr: { title: "Humidité", points: "points" },
    ar: { title: "الرطوبة", points: "نقطة" },
  } as const;
  const t = labels[lang];

  return (
    <div className="h-52 w-full rounded-2xl border border-white/10 bg-[#111827] p-3 sm:h-60">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-medium text-[#e5e7eb]">{t.title}</h4>
        <span className="text-xs text-[#9ca3af]">{chartData.length} {t.points}</span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid stroke="rgba(148,163,184,0.18)" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid rgba(148,163,184,0.3)",
              borderRadius: "12px",
              color: "#e5e7eb",
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#22c55e"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive
            animationDuration={350}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
