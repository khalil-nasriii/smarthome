import { useState } from "react";
import { MqttConfig } from "@/hooks/useMqtt";

interface ConnectionModalProps {
  config: MqttConfig;
  onConnect: (config: MqttConfig) => void;
  onClose: () => void;
}

export function ConnectionModal({ config, onConnect, onClose }: ConnectionModalProps) {
  const [form, setForm] = useState<MqttConfig>({ ...config });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConnect(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="glass-card neon-blue w-full max-w-md p-6 mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-orbitron text-lg font-bold text-neon-blue">MQTT Configuration</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">
              Broker URL (WSS)
            </label>
            <input
              type="text"
              value={form.brokerUrl}
              onChange={(e) => setForm({ ...form, brokerUrl: e.target.value })}
              className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:border-primary transition-colors"
              placeholder="wss://your-broker.hivemq.cloud:8884/mqtt"
            />
          </div>

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
                placeholder="optional"
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
                placeholder="optional"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">
              Client ID
            </label>
            <input
              type="text"
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground/70 mb-1">Subscribed topics:</p>
            <ul className="space-y-0.5 font-mono">
              <li>• home/temp</li>
              <li>• home/hum</li>
              <li>• home/motion</li>
              <li>• home/led/status</li>
              <li>• home/buzzer/status</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-border text-muted-foreground text-sm hover:border-primary/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: "linear-gradient(135deg, rgba(0,200,255,0.2), rgba(0,200,255,0.1))",
                border: "1px solid rgba(0,200,255,0.4)",
                color: "#00c8ff",
                boxShadow: "0 0 15px rgba(0,200,255,0.2)",
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
