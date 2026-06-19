import { File, FileImage, FileSpreadsheet, FileText } from "lucide-react";

export function FileTypeIcon({ type }) {
  const normalized = String(type || "").toUpperCase();
  const Icon = normalized.includes("XLS")
    ? FileSpreadsheet
    : ["JPG", "JPEG", "PNG"].includes(normalized)
      ? FileImage
      : normalized.includes("DOC") || normalized === "PDF"
        ? FileText
        : File;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700">
      <Icon size={15} />
      {normalized || "-"}
    </span>
  );
}
