import { useState } from "react";
import { login, register } from "@workspace/api-client-react";

type Props = {
  onAuthed: () => void;
};

export default function AuthPage({ onAuthed }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res =
        mode === "login"
          ? await login({ email, password })
          : await register({ email, password });
      localStorage.setItem("smarthome_token", res.token);
      localStorage.setItem("smarthome_user_email", res.user.email);
      onAuthed();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="glass-card p-6 w-full max-w-md space-y-4">
        <h1 className="font-orbitron text-xl text-neon-blue">
          {mode === "login" ? "Login" : "Register"}
        </h1>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min 8 chars)"
          required
          minLength={8}
          className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg border border-cyan-400/40 text-cyan-300 disabled:opacity-60"
        >
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
        </button>
        <button
          type="button"
          onClick={() => setMode((m) => (m === "login" ? "register" : "login"))}
          className="w-full text-xs text-muted-foreground underline"
        >
          {mode === "login" ? "Need an account? Register" : "Have an account? Login"}
        </button>
      </form>
    </div>
  );
}

