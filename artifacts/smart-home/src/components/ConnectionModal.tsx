import { useState } from "react";
import { MqttConfig } from "@/hooks/useMqtt";

interface ConnectionModalProps {
  config: MqttConfig;
  onConnect: (config: MqttConfig) => void;
  onClose: () => void;
}

export function ConnectionModal({ config, onConnect, onClose }: ConnectionModalProps) {
  const [form, setForm] = useState<MqttConfig>({ ...config });
  const [brokerType, setBrokerType] = useState<"hivemq-cloud" | "hivemq-public" | "custom">("hivemq-public");

  const presets = {
    "hivemq-public": "wss://broker.hivemq.com:8884/mqtt",
    "hivemq-cloud": "wss://YOUR-CLUSTER.s1.eu.hivemq.cloud:8884/mqtt",
    "custom": form.brokerUrl,
  };

  const handlePreset = (type: typeof brokerType) => {
    setBrokerType(type);
    if (type !== "custom") {
      setForm((f) => ({ ...f, brokerUrl: presets[type] }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConnect(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="glass-card neon-blue w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-neon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            <h2 className="font-orbitron text-base font-bold text-neon-blue">MQTT Configuration</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Broker preset buttons */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Broker Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["hivemq-public", "hivemq-cloud", "custom"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handlePreset(type)}
                  className="py-2 px-2 rounded-lg text-xs font-mono font-semibold transition-all"
                  style={
                    brokerType === type
                      ? {
                          background: "rgba(0,200,255,0.15)",
                          border: "1px solid rgba(0,200,255,0.5)",
                          color: "#00c8ff",
                        }
                      : {
                          background: "transparent",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "rgba(200,220,255,0.5)",
                        }
                  }
                >
                  {type === "hivemq-public" ? "HiveMQ Public" : type === "hivemq-cloud" ? "HiveMQ Cloud" : "Custom"}
                </button>
              ))}
            </div>
          </div>

          {/* Broker URL */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">
              Broker URL (WSS)
            </label>
            <input
              type="text"
              value={form.brokerUrl}
              onChange={(e) => {
                setForm({ ...form, brokerUrl: e.target.value });
                setBrokerType("custom");
              }}
              required
              className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:border-primary transition-colors"
              placeholder="wss://your-cluster.s1.eu.hivemq.cloud:8884/mqtt"
            />
            {brokerType === "hivemq-cloud" && (
              <p className="text-xs text-yellow-400/70 mt-1 font-mono">
                Replace YOUR-CLUSTER with your actual HiveMQ Cloud cluster ID
              </p>
            )}
          </div>

          {/* Username + Password */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                Username
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:border-primary transition-colors"
                placeholder={brokerType === "hivemq-cloud" ? "required" : "optional"}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:border-primary transition-colors"
                placeholder={brokerType === "hivemq-cloud" ? "required" : "optional"}
              />
            </div>
          </div>

          {/* Client ID */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">
              Client ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                className="flex-1 bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:border-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setForm({ ...form, clientId: `smarthome_${Math.random().toString(16).slice(2, 8)}` })}
                className="px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:border-primary/50 transition-colors font-mono"
              >
                Regen
              </button>
            </div>
          </div>

          {/* Info box */}
          <div className="bg-muted/20 rounded-lg p-3 text-xs text-muted-foreground border border-white/5">
            <p className="font-semibold text-foreground/60 mb-1.5">Subscribe topics (read from ESP32):</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono text-muted-foreground/70">
              <span>• home/temp</span>
              <span>• home/led/status</span>
              <span>• home/hum</span>
              <span>• home/buzzer/status</span>
              <span>• home/motion</span>
              <span>• home/alarm/status</span>
            </div>
            <p className="font-semibold text-foreground/60 mt-2 mb-1">Publish topics (control ESP32):</p>
            <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 font-mono text-muted-foreground/70">
              <span>• home/led</span>
              <span>• home/buzzer</span>
              <span>• home/alarm</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-border text-muted-foreground text-sm hover:border-primary/50 transition-colors font-mono"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-lg text-sm font-bold font-mono transition-all"
              style={{
                background: "linear-gradient(135deg, rgba(0,200,255,0.2), rgba(0,200,255,0.08))",
                border: "1px solid rgba(0,200,255,0.5)",
                color: "#00c8ff",
                boxShadow: "0 0 20px rgba(0,200,255,0.2)",
              }}
            >
              Connect
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
