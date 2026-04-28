"use client";

import Image from "next/image";
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
    <main className="access-layout">
      <section className="card access-card">
        <h1 className="access-title">Secure Workspace Access</h1>
        <p className="access-subtitle">
          Enter your shared passcode to open the initiative planning workspace.
        </p>
        <input
          data-testid="passcode-input"
          className="input"
          type="password"
          placeholder="Enter passcode"
          value={passcode}
          onChange={(event) => setPasscode(event.target.value)}
        />
        <div className="card-action-row">
          <button
            data-testid="passcode-submit"
            className="btn primary"
            onClick={() => void handleSubmit()}
            disabled={loading || !passcode.trim()}
          >
            {loading ? "Validating..." : "Enter Workspace"}
          </button>
        </div>
        {error ? <div className="status-error section-gap-sm">{error}</div> : null}
        <div className="access-signature">
          <Image src="/assets/logo-rgd.png" alt="R.G. Development" width={42} height={20} />
          <span>Engineered by R.G. Development</span>
        </div>
      </section>
    </main>
  );
}
