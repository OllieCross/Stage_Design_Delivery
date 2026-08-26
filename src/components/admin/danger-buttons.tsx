"use client";

import { deleteFile, deleteVersion, trashProject } from "@/server/actions";

function confirmSubmit(message: string) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm(message)) e.preventDefault();
  };
}

export function TrashProjectButton({ projectId }: { projectId: string }) {
  return (
    <form
      action={trashProject}
      onSubmit={confirmSubmit("Move this project to trash? It will be purged after 7 days.")}
    >
      <input type="hidden" name="id" value={projectId} />
      <button className="rounded-md border border-red-900 px-3 py-2 text-xs tracking-wide text-red-400 uppercase transition hover:bg-red-950">
        Delete project
      </button>
    </form>
  );
}

export function DeleteVersionButton({ versionId, label }: { versionId: string; label: string }) {
  return (
    <form
      action={deleteVersion}
      onSubmit={confirmSubmit(`Delete version ${label} and its files permanently?`)}
    >
      <input type="hidden" name="id" value={versionId} />
      <button className="text-xs tracking-wide text-red-400 uppercase transition hover:text-red-300">
        Delete version
      </button>
    </form>
  );
}

export function DeleteFileButton({ fileId, name }: { fileId: string; name: string }) {
  return (
    <form action={deleteFile} onSubmit={confirmSubmit(`Delete ${name} permanently?`)}>
      <input type="hidden" name="id" value={fileId} />
      <button className="text-xs tracking-wide text-red-400 uppercase transition hover:text-red-300">
        Delete
      </button>
    </form>
  );
}
