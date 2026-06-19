import { Inbox } from "lucide-react";

export function EmptyState({ title = "Data belum tersedia", description = "Ubah filter atau tambahkan data baru." }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
      <Inbox className="text-slate-400" size={34} />
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
    </div>
  );
}
