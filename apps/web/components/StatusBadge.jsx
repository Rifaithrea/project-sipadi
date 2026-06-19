const statusClass = {
  Draft: "bg-slate-100 text-slate-700 border-slate-200",
  "Menunggu Review": "bg-amber-50 text-amber-700 border-amber-200",
  Terverifikasi: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Ditolak: "bg-red-50 text-red-700 border-red-200",
  Diarsipkan: "bg-blue-50 text-blue-700 border-blue-200",
  Dikirim: "bg-slate-100 text-slate-700 border-slate-200",
  Dibaca: "bg-sky-50 text-sky-700 border-sky-200",
  Diproses: "bg-amber-50 text-amber-700 border-amber-200",
  Selesai: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Dibatalkan: "bg-red-50 text-red-700 border-red-200"
};

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-xs font-semibold ${statusClass[status] || statusClass.Draft}`}>
      {status}
    </span>
  );
}
