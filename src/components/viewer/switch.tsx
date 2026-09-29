"use client";

/**
 * Square on/off switch in the site's monochrome style. The button itself is
 * the full 44px-tall hit area; the visible track is drawn inside it.
 */
export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 shrink-0 items-center disabled:opacity-40"
    >
      <span
        className={`flex h-6 w-11 items-center border transition-colors ${
          checked ? "border-white bg-white" : "border-neutral-600 bg-black"
        }`}
      >
        <span
          className={`block h-4 w-4 transition-transform ${
            checked ? "translate-x-6 bg-black" : "translate-x-1 bg-neutral-400"
          }`}
        />
      </span>
    </button>
  );
}
