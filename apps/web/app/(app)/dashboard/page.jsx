"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, CheckCircle2, Clock3, FilePlus2, FileText, Layers3, PencilLine, ShieldCheck } from "lucide-react";
import { apiFetch, buildQuery } from "../../../lib/api";
import { StatusBadge } from "../../../components/StatusBadge";
import { FileTypeIcon } from "../../../components/FileTypeIcon";
import { formatDateTime } from "../../../lib/format";

function StatCard({ label, value, icon: Icon, tone = "brand" }) {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    slate: "bg-slate-100 text-slate-700",
    red: "bg-red-50 text-red-700"
  };

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-ink">{value ?? 0}</p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-md ${tones[tone]}`}>
          <Icon size={21} />
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [unitId, setUnitId] = useState("");
  const [units, setUnits] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [dashboardResult, organizationResult] = await Promise.all([
        apiFetch(`/dashboard${buildQuery({ unitId })}`),
        apiFetch("/organization")
      ]);
      setDashboard(dashboardResult);
      setUnits(organizationResult.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = dashboard?.stats || {};
  const activeUnit = useMemo(() => units.find((unit) => unit.id === Number(unitId)), [units, unitId]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-brand-700">Dashboard</p>
          <h1 className="mt-1 text-2xl font-bold text-ink">Ringkasan Arsip Inspektorat</h1>
          <p className="mt-1 text-sm text-slate-500">{activeUnit ? activeUnit.name : "Semua unit organisasi"}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={unitId}
            onChange={(event) => setUnitId(event.target.value)}
            className="focus-ring h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">Semua divisi</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
          <Link
            href="/archives?new=1"
            className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <FilePlus2 size={18} />
            Tambah Arsip
          </Link>
        </div>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total arsip" value={stats.totalArchives} icon={Archive} />
        <StatCard label="Arsip divisi" value={stats.divisionArchives} icon={Layers3} tone="slate" />
        <StatCard label="Menunggu review" value={stats.waitingReview} icon={Clock3} tone="amber" />
        <StatCard label="Terverifikasi" value={stats.verified} icon={ShieldCheck} tone="emerald" />
        <StatCard label="Draft" value={stats.draft} icon={PencilLine} tone="slate" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-semibold text-ink">Arsip terbaru</h2>
            <Link href="/archives" className="text-sm font-semibold text-brand-700 hover:text-brand-600">
              Lihat semua
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Dokumen</th>
                  <th className="px-4 py-3">Divisi</th>
                  <th className="px-4 py-3">File</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(dashboard?.recentArchives || []).map((archive) => (
                  <tr key={archive.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{archive.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{archive.document_number}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{archive.unit_name}</td>
                    <td className="px-4 py-3">
                      <FileTypeIcon type={archive.file_type} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={archive.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(archive.created_at)}</td>
                  </tr>
                ))}
                {!loading && dashboard?.recentArchives?.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                      Belum ada arsip.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-semibold text-ink">Aktivitas terbaru</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {(dashboard?.activities || []).map((activity) => (
              <div key={activity.id} className="flex gap-3 px-4 py-3">
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                  <CheckCircle2 size={17} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {activity.action} {activity.entity}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {activity.user_name || "Sistem"} | {formatDateTime(activity.created_at)}
                  </p>
                </div>
              </div>
            ))}
            {!loading && dashboard?.activities?.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">Belum ada aktivitas.</div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
