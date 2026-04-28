"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AccessPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Access denied.");
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "1rem",
      }}
    >
      <section className="card" style={{ width: "100%", maxWidth: "420px" }}>
        <h1 style={{ marginTop: 0 }}>Secure Access</h1>
        <p style={{ color: "var(--text-muted)" }}>
          Enter the shared passcode to access this app instance.
        </p>
        <input
          data-testid="passcode-input"
          className="input"
          type="password"
          placeholder="Passcode"
          value={passcode}
          onChange={(event) => setPasscode(event.target.value)}
        />
        <div style={{ marginTop: "0.75rem" }}>
          <button
            data-testid="passcode-submit"
            className="btn primary"
            onClick={() => void handleSubmit()}
            disabled={loading || !passcode.trim()}
          >
            {loading ? "Validating..." : "Enter"}
          </button>
        </div>
        {error ? <div className="status-error" style={{ marginTop: "0.75rem" }}>{error}</div> : null}
      </section>
    </main>
  );
}
