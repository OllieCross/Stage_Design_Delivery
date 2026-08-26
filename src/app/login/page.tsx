"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function login() {
    setBusy(true);
    setError(null);
    try {
      const optionsRes = await fetch("/api/auth/login/options", { method: "POST" });
      if (!optionsRes.ok) {
        throw new Error((await optionsRes.json()).error ?? "Failed to get options");
      }
      const optionsJSON = await optionsRes.json();
      const response = await startAuthentication({ optionsJSON });
      const verifyRes = await fetch("/api/auth/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(response),
      });
      if (!verifyRes.ok) {
        throw new Error((await verifyRes.json()).error ?? "Verification failed");
      }
      router.push("/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold tracking-tight uppercase">Admin Login</h1>
        <p className="text-muted mt-2 text-sm">Sign in with your passkey.</p>
        <button
          onClick={login}
          disabled={busy}
          className="mt-8 w-full rounded-md bg-white px-4 py-3 text-sm font-semibold tracking-wide text-black uppercase transition hover:bg-neutral-200 disabled:opacity-50"
        >
          {busy ? "Waiting for passkey..." : "Sign in with passkey"}
        </button>
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </div>
    </main>
  );
}
