"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardPlus, Eye, RefreshCcw, Search, Trash2 } from "lucide-react";
import { apiFetch, buildQuery } from "../../../lib/api";
import { DISPOSITION_STATUSES, canCreateDisposition } from "../../../lib/constants";
import { formatDate, formatDateTime } from "../../../lib/format";
import { useAuth } from "../../../components/AuthProvider";
import { EmptyState } from "../../../components/EmptyState";
import { Modal } from "../../../components/Modal";
import { StatusBadge } from "../../../components/StatusBadge";

const defaultForm = {
  archiveId: "",
  toUserId: "",
  toUnitId: "",
  note: "",
  deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
};

export default function DispositionsPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({ search: "", status: "", page: 1 });
  const [dispositions, setDispositions] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0 });
  const [archives, setArchives] = useState([]);
  const [users, setUsers] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [targetMode, setTargetMode] = useState("user");
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusForm, setStatusForm] = useState({ status: "Diproses", note: "" });

  useEffect(() => {
    async function loadLookups() {
      try {
        const [archiveResult, orgResult, userResult] = await Promise.all([
          apiFetch("/archives?limit=100"),
          apiFetch("/organization"),
          apiFetch("/organization/users")
        ]);
        setArchives(archiveResult.data);
        setUnits(orgResult.data);
        setUsers(userResult.data);
      } catch (err) {
        setError(err.message);
      }
    }
    loadLookups();
  }, []);

  const loadDispositions = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const result = await apiFetch(`/dispositions${buildQuery({ ...filters, limit: 10 })}`);
      setDispositions(result.data);
      setMeta(result.meta);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadDispositions();
  }, [loadDispositions]);

  const totalPages = useMemo(() => Math.max(Math.ceil((meta.total || 0) / meta.limit), 1), [meta]);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value, page: key === "page" ? value : 1 }));
  }

  async function submitDisposition(event) {
    event.preventDefault();
    if (!canCreateDisposition(user)) {
      setError("Hanya Admin, Inspektur, atau Sekretaris yang dapat membuat disposisi");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await apiFetch("/dispositions", {
        method: "POST",
        body: JSON.stringify({
          archiveId: form.archiveId,
          toUserId: targetMode === "user" ? form.toUserId : "",
          toUnitId: targetMode === "unit" ? form.toUnitId : "",
          note: form.note,
          deadline: form.deadline
        })
      });
      setForm(defaultForm);
      setFormOpen(false);
      await loadDispositions();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function openDetail(id) {
    try {
      const result = await apiFetch(`/dispositions/${id}`);
      setDetail(result.data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitStatus(event) {
    event.preventDefault();
    if (!statusTarget) return;
    try {
      await apiFetch(`/dispositions/${statusTarget.id}/status`, {
        method: "PATCH",
        body: JSON.stringify(statusForm)
      });
      setStatusTarget(null);
      await loadDispositions();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteDisposition(item) {
    const confirmed = window.confirm(`Hapus disposisi untuk "${item.archive_title}"?`);
    if (!confirmed) return;
    try {
      await apiFetch(`/dispositions/${item.id}`, { method: "DELETE" });
      await loadDispositions();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-brand-700">Disposisi</p>
          <h1 className="mt-1 text-2xl font-bold text-ink">Alur Disposisi Dokumen</h1>
          <p className="mt-1 text-sm text-slate-500">{meta.total || 0} disposisi aktif dan historis</p>
        </div>
        {canCreateDisposition(user) ? (
          <button
            type="button"
            onClick={() => {
              setForm(defaultForm);
              setFormOpen(true);
            }}
            className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <ClipboardPlus size={18} />
            Kirim Disposisi
          </button>
        ) : null}
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Search</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
                className="focus-ring h-10 w-full rounded-md border border-slate-200 pl-9 pr-3 text-sm"
                placeholder="Cari arsip atau catatan"
              />
            </span>
          </label>
          <Select label="Status" value={filters.status} onChange={(value) => updateFilter("status", value)}>
            <option value="">Semua status</option>
            {DISPOSITION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </div>
      </section>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Arsip</th>
                <th className="px-4 py-3">Dari</th>
                <th className="px-4 py-3">Tujuan</th>
                <th className="px-4 py-3">Deadline</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dispositions.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="max-w-sm px-4 py-3">
                    <p className="font-semibold text-ink">{item.archive_title}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.document_number}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.from_user_name || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{item.to_user_name || item.to_unit_name || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(item.deadline)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <IconButton label="Detail" icon={Eye} onClick={() => openDetail(item.id)} />
                      <IconButton
                        label="Ubah Status"
                        icon={RefreshCcw}
                        onClick={() => {
                          setStatusTarget(item);
                          setStatusForm({ status: item.status === "Selesai" ? "Selesai" : "Diproses", note: "" });
                        }}
                      />
                      <IconButton label="Hapus" icon={Trash2} onClick={() => deleteDisposition(item)} danger />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && dispositions.length === 0 ? <EmptyState title="Disposisi tidak ditemukan" description="Buat disposisi baru atau ubah filter." /> : null}
        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Halaman {meta.page || 1} dari {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={(meta.page || 1) <= 1}
              onClick={() => updateFilter("page", (meta.page || 1) - 1)}
              className="focus-ring rounded-md border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              disabled={(meta.page || 1) >= totalPages}
              onClick={() => updateFilter("page", (meta.page || 1) + 1)}
              className="focus-ring rounded-md border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </section>

      <Modal title="Kirim disposisi" open={formOpen} onClose={() => setFormOpen(false)} wide>
        <form onSubmit={submitDisposition} className="grid gap-4 md:grid-cols-2">
          <Select label="Arsip" value={form.archiveId} onChange={(value) => setForm((current) => ({ ...current, archiveId: value }))}>
            <option value="">Pilih arsip</option>
            {archives.map((archive) => (
              <option key={archive.id} value={archive.id}>
                {archive.document_number} - {archive.title}
              </option>
            ))}
          </Select>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Deadline</span>
            <input
              type="date"
              value={form.deadline}
              onChange={(event) => setForm((current) => ({ ...current, deadline: event.target.value }))}
              className="focus-ring h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
              required
            />
          </label>
          <div className="md:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase text-slate-500">Tujuan</span>
            <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setTargetMode("user")}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${targetMode === "user" ? "bg-white text-brand-700 shadow-sm" : "text-slate-600"}`}
              >
                User
              </button>
              <button
                type="button"
                onClick={() => setTargetMode("unit")}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${targetMode === "unit" ? "bg-white text-brand-700 shadow-sm" : "text-slate-600"}`}
              >
                Divisi
              </button>
            </div>
          </div>
          {targetMode === "user" ? (
            <Select label="User Tujuan" value={form.toUserId} onChange={(value) => setForm((current) => ({ ...current, toUserId: value }))}>
              <option value="">Pilih user</option>
              {users.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.name} - {target.role}
                </option>
              ))}
            </Select>
          ) : (
            <Select label="Divisi Tujuan" value={form.toUnitId} onChange={(value) => setForm((current) => ({ ...current, toUnitId: value }))}>
              <option value="">Pilih divisi</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </Select>
          )}
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Catatan</span>
            <textarea
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              className="focus-ring min-h-32 w-full rounded-md border border-slate-200 p-3 text-sm"
              required
            />
          </label>
          <div className="flex justify-end md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="focus-ring inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              <ClipboardPlus size={17} />
              {saving ? "Mengirim..." : "Kirim Disposisi"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal title="Riwayat disposisi" open={Boolean(detail)} onClose={() => setDetail(null)} wide>
        {detail ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
            <div className="rounded-md border border-slate-200 p-4">
              <StatusBadge status={detail.status} />
              <h2 className="mt-3 text-xl font-bold text-ink">{detail.archive_title}</h2>
              <p className="mt-1 text-sm text-slate-500">{detail.document_number}</p>
              <p className="mt-4 text-sm leading-6 text-slate-700">{detail.note}</p>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <Info label="Dari" value={detail.from_user_name} />
                <Info label="Tujuan" value={detail.to_user_name || detail.to_unit_name} />
                <Info label="Deadline" value={formatDate(detail.deadline)} />
                <Info label="Dibuat" value={formatDateTime(detail.created_at)} />
              </dl>
            </div>
            <div className="rounded-md border border-slate-200">
              <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-ink">Riwayat</div>
              <div className="divide-y divide-slate-100">
                {detail.history?.map((item) => (
                  <div key={item.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={item.status} />
                      <span className="text-xs text-slate-500">{formatDateTime(item.created_at)}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{item.note}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.user_name || "User"}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal title="Ubah status disposisi" open={Boolean(statusTarget)} onClose={() => setStatusTarget(null)}>
        <form onSubmit={submitStatus} className="space-y-4">
          <Select label="Status" value={statusForm.status} onChange={(value) => setStatusForm((current) => ({ ...current, status: value }))}>
            {DISPOSITION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Catatan</span>
            <textarea
              value={statusForm.note}
              onChange={(event) => setStatusForm((current) => ({ ...current, note: event.target.value }))}
              className="focus-ring min-h-28 w-full rounded-md border border-slate-200 p-3 text-sm"
            />
          </label>
          <button type="submit" className="focus-ring inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
            <RefreshCcw size={17} />
            Simpan Status
          </button>
        </form>
      </Modal>
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

function IconButton({ label, icon: Icon, onClick, danger = false }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`focus-ring inline-flex h-9 w-9 items-center justify-center rounded-md border ${
        danger ? "border-red-200 text-red-700 hover:bg-red-50" : "border-slate-200 text-slate-600 hover:bg-slate-50"
      }`}
    >
      <Icon size={16} />
    </button>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-700">{value || "-"}</dd>
    </div>
  );
}
