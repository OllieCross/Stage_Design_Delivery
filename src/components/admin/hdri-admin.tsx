"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { deleteHdriAsset } from "@/server/actions";
import { formatBytes, MAX_FILE_SIZE, MAX_FILE_SIZE_LABEL } from "@/lib/files";

type Asset = { name: string; size: number } | null;

function confirmSubmit(message: string) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm(message)) e.preventDefault();
  };
}

function HdriSlot({
  variant,
  label,
  asset,
}: {
  variant: "DAY" | "NIGHT";
  label: string;
  asset: Asset;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (file.size > MAX_FILE_SIZE) {
      setStatus(`Exceeds the ${MAX_FILE_SIZE_LABEL} limit`);
      return;
    }
    setBusy(true);
    setStatus(`Uploading ${file.name}...`);
    const body = new FormData();
    body.set("variant", variant);
    body.set("file", file);
    const res = await fetch("/api/admin/upload-hdri", { method: "POST", body });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setStatus(`Failed: ${err.error ?? res.statusText}`);
      setBusy(false);
      return;
    }
    setStatus(null);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="rounded-md border border-neutral-800 p-4">
      <div className="flex items-center justify-between">
        <span className="text-muted text-xs font-bold tracking-widest uppercase">{label}</span>
        {asset && (
          <form action={deleteHdriAsset} onSubmit={confirmSubmit(`Remove the ${label} HDRI?`)}>
            <input type="hidden" name="variant" value={variant} />
            <button className="text-xs tracking-wide text-red-400 uppercase transition hover:text-red-300">
              Remove
            </button>
          </form>
        )}
      </div>

      {asset ? (
        <p className="mt-2 truncate text-sm">
          {asset.name} <span className="text-muted">({formatBytes(asset.size)})</span>
        </p>
      ) : (
        <p className="text-muted mt-2 text-sm">Not set</p>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="text-muted mt-3 text-xs tracking-wide uppercase underline-offset-4 hover:text-white hover:underline disabled:opacity-50"
      >
        {busy ? "Uploading..." : asset ? "Replace" : "Upload"} .hdr / .exr
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".hdr,.hdri,.exr"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) upload(file);
        }}
      />
      {status && <p className="text-muted mt-2 text-xs">{status}</p>}
    </div>
  );
}

export function HdriAdmin({ day, night }: { day: Asset; night: Asset }) {
  return (
    <section className="mt-12">
      <h2 className="text-muted text-sm font-bold tracking-widest uppercase">
        Sky environment (all projects)
      </h2>
      <p className="text-muted mt-1 text-xs">
        Shared Day/Night HDRI pair for every project&apos;s 3D tour. Replacing one applies
        everywhere immediately.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <HdriSlot variant="DAY" label="Day" asset={day} />
        <HdriSlot variant="NIGHT" label="Night" asset={night} />
      </div>
    </section>
  );
}
