import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
setBaseUrl(apiBaseUrl ?? null);
setAuthTokenGetter(() => localStorage.getItem("smarthome_token"));

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[PWA] Service worker registered:", reg.scope);
      })
      .catch((err) => {
        console.warn("[PWA] Service worker registration failed:", err);
      });
  });
}
