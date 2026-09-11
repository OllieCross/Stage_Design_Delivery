"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Passkey sign-in, embedded directly on the main page rather than behind a
 * separate /login route - a visitor who only has a project link sees this
 * button in the header and nothing else; there is no project list to browse
 * until it succeeds. The WebAuthn ceremony itself (options/verify, session
 * cookie) is unchanged from the old /login page - only where this UI lives
 * moved.
 */
export function PasskeyLogin() {
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
      // Already on the page that shows the admin view once authenticated -
      // no navigation needed, just re-render this route as an admin.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={login}
        disabled={busy}
        className="text-muted border border-neutral-700 px-3 py-2 text-xs tracking-widest uppercase transition hover:border-white hover:text-white disabled:opacity-50"
      >
        {busy ? "Waiting for passkey..." : "Login"}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
