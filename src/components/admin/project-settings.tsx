"use client";

import { useState } from "react";
import { updateProject } from "@/server/actions";

const fieldClass =
  "w-full border border-neutral-700 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-400";
const labelClass = "text-muted block text-xs tracking-widest uppercase";

export function ProjectSettings({
  project,
}: {
  project: {
    id: string;
    name: string;
    slug: string;
    eventDate: string;
    hidden: boolean;
  };
}) {
  const [slug, setSlug] = useState(project.slug);

  return (
    <form action={updateProject} className="mt-6 border border-neutral-800 p-5">
      <input type="hidden" name="id" value={project.id} />
      <h2 className="text-muted text-xs font-bold tracking-widest uppercase">Project settings</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Name
          <input
            name="name"
            defaultValue={project.name}
            required
            className={`${fieldClass} mt-1`}
          />
        </label>

        <label className={labelClass}>
          Event date
          <input
            name="eventDate"
            type="date"
            defaultValue={project.eventDate}
            className={`${fieldClass} mt-1`}
          />
          <span className="text-muted mt-1 block text-[10px] normal-case">
            Leave empty to show the project as a concept.
          </span>
        </label>

        <label className={`${labelClass} sm:col-span-2`}>
          Link
          <span className="mt-1 flex items-center gap-2">
            <span className="text-muted shrink-0 text-sm lowercase">/projects/</span>
            <input
              name="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              pattern="[a-z0-9-]+"
              required
              className={fieldClass}
            />
          </span>
          {slug !== project.slug && (
            <span className="mt-1 block text-[10px] text-amber-400 normal-case">
              Changing the link breaks any URL already shared for this project.
            </span>
          )}
        </label>
      </div>

      <label className="mt-5 flex items-start gap-3">
        <input
          type="checkbox"
          name="hidden"
          defaultChecked={project.hidden}
          className="mt-0.5 accent-white"
        />
        <span className="text-xs tracking-widest uppercase">
          Hide project
          <span className="text-muted mt-0.5 block text-[10px] normal-case">
            Hidden projects are visible to you only, including by direct link.
          </span>
        </span>
      </label>

      <button className="mt-5 bg-white px-4 py-2 text-xs font-semibold tracking-widest text-black uppercase transition hover:bg-neutral-200">
        Save settings
      </button>
    </form>
  );
}
