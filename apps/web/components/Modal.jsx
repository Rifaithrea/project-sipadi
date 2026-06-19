import { X } from "lucide-react";

export function Modal({ title, children, open, onClose, wide = false }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-4">
      <div className={`max-h-[92vh] w-full overflow-hidden rounded-t-md bg-white shadow-soft sm:rounded-md ${wide ? "sm:max-w-4xl" : "sm:max-w-xl"}`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button type="button" className="focus-ring rounded-md p-2 text-slate-500" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[calc(92vh-57px)] overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
