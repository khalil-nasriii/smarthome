import { useEffect } from "react";

interface NotificationToastProps {
  message: string;
  type: "alert" | "info" | "success";
  onClose: () => void;
  duration?: number;
}

export function NotificationToast({ message, type, onClose, duration = 5000 }: NotificationToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const colors = {
    alert: {
      border: "rgba(255, 50, 50, 0.5)",
      bg: "rgba(255, 50, 50, 0.1)",
      text: "#ff3232",
      icon: "🚨",
    },
    info: {
      border: "rgba(0, 200, 255, 0.4)",
      bg: "rgba(0, 200, 255, 0.08)",
      text: "#00c8ff",
      icon: "ℹ️",
    },
    success: {
      border: "rgba(0, 255, 136, 0.4)",
      bg: "rgba(0, 255, 136, 0.08)",
      text: "#00ff88",
      icon: "✅",
    },
  };

  const c = colors[type];

  return (
    <div
      className="notification-enter flex items-start gap-3 p-4 rounded-xl backdrop-blur-md min-w-[280px] max-w-sm"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        boxShadow: `0 0 20px ${c.border}`,
      }}
    >
      <span className="text-xl flex-shrink-0">{c.icon}</span>
      <div className="flex-1">
        <p className="text-sm font-medium" style={{ color: c.text }}>
          {message}
        </p>
      </div>
      <button
        onClick={onClose}
        className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
