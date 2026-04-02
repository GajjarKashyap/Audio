import { useEffect, useState } from "react";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";

const storageKey = "soundbound_api_key";

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(storageKey) || "");

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem(storageKey, apiKey);
      return;
    }

    localStorage.removeItem(storageKey);
  }, [apiKey]);

  if (!apiKey) {
    return <LoginPage onSubmit={setApiKey} />;
  }

  return <HomePage apiKey={apiKey} onLogout={() => setApiKey("")} />;
}
