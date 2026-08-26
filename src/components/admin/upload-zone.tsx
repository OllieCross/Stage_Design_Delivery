"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const MAX_SIZE = 20 * 1024 * 1024;

export function UploadZone({ versionId }: { versionId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList | File[]) {
    setBusy(true);
    let done = 0;
    const list = Array.from(files);
    for (const file of list) {
      if (file.size > MAX_SIZE) {
        setStatus(`${file.name} exceeds the 20 MB limit, skipped`);
        continue;
      }
      setStatus(`Uploading ${file.name} (${done + 1}/${list.length})…`);
      const body = new FormData();
      body.set("versionId", versionId);
      body.set("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus(`Failed to upload ${file.name}: ${err.error ?? res.statusText}`);
        setBusy(false);
        return;
      }
      done++;
    }
    setStatus(done > 0 ? `Uploaded ${done} file${done === 1 ? "" : "s"}` : null);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="mt-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-md border border-dashed px-4 py-6 text-center text-sm transition ${
          dragging
            ? "border-white bg-neutral-900"
            : "text-muted border-neutral-700 hover:border-neutral-500"
        }`}
      >
        {busy ? "Uploading…" : "Drop files here or click to upload (max 20 MB each)"}
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => e.target.files?.length && upload(e.target.files)}
        />
      </div>
      {status && <p className="text-muted mt-2 text-xs">{status}</p>}
    </div>
  );
}
