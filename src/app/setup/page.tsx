"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function SetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function register() {
    setBusy(true);
    setError(null);
    try {
      const optionsRes = await fetch("/api/auth/register/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!optionsRes.ok) {
        throw new Error((await optionsRes.json()).error ?? "Failed to get options");
      }
      const optionsJSON = await optionsRes.json();
      const response = await startRegistration({ optionsJSON });
      const verifyRes = await fetch("/api/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, response }),
      });
      if (!verifyRes.ok) {
        throw new Error((await verifyRes.json()).error ?? "Verification failed");
      }
      router.push("/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold tracking-tight uppercase">Passkey Setup</h1>
        <p className="text-muted mt-2 text-sm">
          Register a passkey for the admin account. Requires the setup token.
        </p>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Setup token"
          className="mt-8 w-full rounded-md border border-neutral-700 bg-transparent px-4 py-3 text-sm outline-none focus:border-neutral-400"
        />
        <button
          onClick={register}
          disabled={busy || !token}
          className="mt-4 w-full rounded-md bg-white px-4 py-3 text-sm font-semibold tracking-wide text-black uppercase transition hover:bg-neutral-200 disabled:opacity-50"
        >
          {busy ? "Waiting for passkey..." : "Register passkey"}
        </button>
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </div>
    </main>
  );
}

export default function SetupPage() {
  return (
    <Suspense>
      <SetupForm />
    </Suspense>
  );
}
