"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileSpreadsheet, FileText, Search } from "lucide-react";
import { apiFetch, buildQuery, downloadFromApi } from "../../../lib/api";
import { ARCHIVE_STATUSES, DOCUMENT_TYPES, FILE_TYPES } from "../../../lib/constants";
import { StatusBadge } from "../../../components/StatusBadge";
import { FileTypeIcon } from "../../../components/FileTypeIcon";

export default function ReportsPage() {
  const [filters, setFilters] = useState({ search: "", unitId: "", status: "", documentType: "", fileType: "", year: "" });
  const [units, setUnits] = useState([]);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState("");

  useEffect(() => {
    apiFetch("/organization")
      .then((result) => setUnits(result.data))
      .catch((err) => setError(err.message));
  }, []);

  const loadReport = useCallback(async () => {
    setError("");
    try {
      const result = await apiFetch(`/reports/archives${buildQuery(filters)}`);
      setReport(result);
    } catch (err) {
      setError(err.message);
    }
  }, [filters]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  async function exportReport(format) {
    setExporting(format);
    setError("");
    try {
      await downloadFromApi(`/reports/archives/export${buildQuery({ ...filters, format })}`, `laporan-arsip-sipadi.${format === "pdf" ? "pdf" : "xls"}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting("");
    }
  }

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  const summary = report?.summary || {};
  const statusRows = [
    ["Draft", summary.draft],
    ["Menunggu Review", summary.waiting_review],
    ["Terverifikasi", summary.verified],
    ["Ditolak", summary.rejected],
    ["Diarsipkan", summary.archived]
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-brand-700">Laporan</p>
          <h1 className="mt-1 text-2xl font-bold text-ink">Laporan Arsip</h1>
          <p className="mt-1 text-sm text-slate-500">Export PDF dan Excel berdasarkan filter aktif.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => exportReport("pdf")}
            disabled={Boolean(exporting)}
            className="focus-ring inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <FileText size={17} />
            PDF
          </button>
          <button
            type="button"
            onClick={() => exportReport("xls")}
            disabled={Boolean(exporting)}
            className="focus-ring inline-flex h-10 items-center gap-2 rounded-md bg-brand-600 px-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            <FileSpreadsheet size={17} />
            Excel
          </button>
        </div>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <label className="md:col-span-2 xl:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Search</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
                className="focus-ring h-10 w-full rounded-md border border-slate-200 pl-9 pr-3 text-sm"
                placeholder="Nama atau nomor dokumen"
              />
            </span>
          </label>
          <Select label="Divisi" value={filters.unitId} onChange={(value) => updateFilter("unitId", value)}>
            <option value="">Semua divisi</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </Select>
          <Select label="Status" value={filters.status} onChange={(value) => updateFilter("status", value)}>
            <option value="">Semua status</option>
            {ARCHIVE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
          <Select label="Jenis" value={filters.documentType} onChange={(value) => updateFilter("documentType", value)}>
            <option value="">Semua jenis</option>
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
          <Select label="File" value={filters.fileType} onChange={(value) => updateFilter("fileType", value)}>
            <option value="">Semua file</option>
            {FILE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Tahun</span>
            <input
              value={filters.year}
              onChange={(event) => updateFilter("year", event.target.value)}
              className="focus-ring h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
              placeholder="2026"
            />
          </label>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Status dokumen</h2>
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
              <Download size={14} />
              {summary.total || 0} total
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {statusRows.map(([status, value]) => {
              const percent = summary.total ? Math.round((Number(value || 0) / Number(summary.total)) * 100) : 0;
              return (
                <div key={status}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <StatusBadge status={status} />
                    <span className="font-semibold text-ink">{value || 0}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-md bg-slate-100">
                    <div className="h-full rounded-md bg-brand-600" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-ink">Arsip per divisi</h2>
          <div className="mt-4 space-y-2">
            {(report?.byUnit || []).map((unit) => (
              <div key={unit.unit_name} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
                <span className="font-medium text-slate-700">{unit.unit_name}</span>
                <span className="font-bold text-ink">{unit.total}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-ink">Preview laporan</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Dokumen</th>
                <th className="px-4 py-3">Divisi</th>
                <th className="px-4 py-3">Jenis</th>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(report?.data || []).map((archive) => (
                <tr key={archive.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{archive.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{archive.document_number} | {archive.year}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{archive.unit_name}</td>
                  <td className="px-4 py-3 text-slate-600">{archive.document_type}</td>
                  <td className="px-4 py-3">
                    <FileTypeIcon type={archive.file_type} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={archive.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Select({ label, value, onChange, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="focus-ring h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
        {children}
      </select>
    </label>
  );
}
