"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Eye, FilePlus2, MessageSquarePlus, Pencil, Search, ShieldCheck, Trash2 } from "lucide-react";
import Select from "react-select";
import dataJsonDropbar from "../../../data/dropbar.json";
import { apiFetch, buildQuery, downloadFromApi } from "../../../lib/api";
import {
  ARCHIVE_STATUSES,
  DOCUMENT_TYPES,
  FILE_TYPES,
  canChooseArchiveUnit,
  canDeleteArchive,
  canDownloadArchive,
  canEditArchive,
  canUpdateArchiveStatus,
  canViewArchive
} from "../../../lib/constants";
import { formatBytes, formatDateTime } from "../../../lib/format";
import { useAuth } from "../../../components/AuthProvider";
import { EmptyState } from "../../../components/EmptyState";
import { FileTypeIcon } from "../../../components/FileTypeIcon";
import { Modal } from "../../../components/Modal";
import { StatusBadge } from "../../../components/StatusBadge";

const defaultForm = {
  title: "",
  documentNumber: "",
  unitId: "",
  documentType: DOCUMENT_TYPES[0],
  fileType: "PDF",
  year: new Date().getFullYear(),
  status: "Draft",
  classification: "Internal",
  description: "",
  file: null
};

export default function ArchivesPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [units, setUnits] = useState([]);
  const [archives, setArchives] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0 });
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    unitId: "",
    status: "",
    documentType: "",
    fileType: "",
    year: "",
    page: 1
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [comment, setComment] = useState("");
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [verifyForm, setVerifyForm] = useState({ status: "Terverifikasi", note: "" });

  const searchParamString = searchParams.toString();

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm({
      ...defaultForm,
      unitId: canChooseArchiveUnit(user) ? "" : user?.unitId || "",
      documentNumber: `SIPADI/${new Date().getFullYear()}/${Date.now().toString().slice(-5)}`
    });
    setFormOpen(true);
  }, [user]);

  useEffect(() => {
    apiFetch("/organization")
      .then((result) => setUnits(result.data))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(searchParamString);
    const search = params.get("search") || "";
    const openNew = params.get("new") === "1";
    setFilters((current) => ({ ...current, search, page: 1 }));
    if (openNew) openCreate();
  }, [searchParamString, openCreate]);

  const loadArchives = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const result = await apiFetch(`/archives${buildQuery({ ...filters, limit: 10 })}`);
      setArchives(result.data);
      setMeta(result.meta);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadArchives();
  }, [loadArchives]);

  const totalPages = useMemo(() => Math.max(Math.ceil((meta.total || 0) / meta.limit), 1), [meta]);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value, page: key === "page" ? value : 1 }));
  }

  function openEdit(archive) {
    setEditing(archive);
    setForm({
      title: archive.title || "",
      documentNumber: archive.document_number || "",
      unitId: archive.unit_id || "",
      documentType: archive.document_type || DOCUMENT_TYPES[0],
      fileType: archive.file_type || "PDF",
      year: archive.year || new Date().getFullYear(),
      status: archive.status || "Draft",
      classification: archive.classification || "Internal",
      description: archive.description || "",
      file: null
    });
    setFormOpen(true);
  }

  async function submitArchive(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key === "file") {
          if (value) payload.append("file", value);
        } else if (value !== undefined && value !== null) {
          payload.append(key, value);
        }
      });

      await apiFetch(editing ? `/archives/${editing.id}` : "/archives", {
        method: editing ? "PUT" : "POST",
        body: payload
      });

      setFormOpen(false);
      await loadArchives();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function openDetail(archiveId) {
    setError("");
    try {
      const result = await apiFetch(`/archives/${archiveId}`);
      setDetail(result.data);
      setDetailOpen(true);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    async function loadPreview() {
      if (!detailOpen || !detail?.id) {
        setPreviewUrl("");
        setPreviewLoading(false);
        setPreviewError("");
        return;
      }

      setPreviewLoading(true);
      setPreviewError("");
      setPreviewUrl("");

      try {
        const response = await apiFetch(`/archives/${detail.id}/download`);
        const blob = await response.blob();

        if (!active) return;

        objectUrl = window.URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      } catch (err) {
        if (active) {
          setPreviewError(err.message);
        }
      } finally {
        if (active) {
          setPreviewLoading(false);
        }
      }
    }

    loadPreview();

    return () => {
      active = false;
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
    };
  }, [detail?.id, detail?.updated_at, detailOpen]);

  async function submitComment(event) {
    event.preventDefault();
    if (!detail || !comment.trim()) return;
    try {
      await apiFetch(`/archives/${detail.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ comment })
      });
      setComment("");
      await openDetail(detail.id);
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitVerify(event) {
    event.preventDefault();
    if (!verifyTarget) return;
    try {
      await apiFetch(`/archives/${verifyTarget.id}/verify`, {
        method: "POST",
        body: JSON.stringify(verifyForm)
      });
      setVerifyOpen(false);
      setVerifyTarget(null);
      await loadArchives();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteArchive(archive) {
    const confirmed = window.confirm(`Hapus arsip "${archive.title}"?`);
    if (!confirmed) return;
    try {
      await apiFetch(`/archives/${archive.id}`, { method: "DELETE" });
      await loadArchives();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-brand-700">Manajemen arsip</p>
          <h1 className="mt-1 text-2xl font-bold text-ink">Data Arsip</h1>
          <p className="mt-1 text-sm text-slate-500">{meta.total || 0} dokumen ditemukan</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <FilePlus2 size={18} />
          Tambah Arsip
        </button>
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
          <FilterSelect label="Divisi" value={filters.unitId} onChange={(value) => updateFilter("unitId", value)}>
            <option value="">Semua divisi</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Status" value={filters.status} onChange={(value) => updateFilter("status", value)}>
            <option value="">Semua status</option>
            {ARCHIVE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Jenis" value={filters.documentType} onChange={(value) => updateFilter("documentType", value)}>
            <option value="">Semua jenis</option>
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="File" value={filters.fileType} onChange={(value) => updateFilter("fileType", value)}>
            <option value="">Semua file</option>
            {FILE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </FilterSelect>
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

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Dokumen</th>
                <th className="px-4 py-3">Divisi</th>
                <th className="px-4 py-3">Jenis</th>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {archives.map((archive) => {
                const mayView = canViewArchive(user, archive);
                const mayDownload = canDownloadArchive(user, archive);
                const mayEdit = canEditArchive(user, archive);
                const mayDelete = canDeleteArchive(user, archive);
                const mayUpdateStatus = canUpdateArchiveStatus(user, archive);

                return (
                  <tr key={archive.id} className="hover:bg-slate-50">
                    <td className="max-w-sm px-4 py-3">
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
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {mayView ? <IconButton label="Lihat" onClick={() => openDetail(archive.id)} icon={Eye} /> : null}
                        {mayEdit ? <IconButton label="Edit" onClick={() => openEdit(archive)} icon={Pencil} /> : null}
                        {mayDownload ? (
                          <IconButton
                            label="Download"
                            onClick={() => downloadFromApi(`/archives/${archive.id}/download`, `arsip-${archive.id}.${archive.file_type?.toLowerCase() || "txt"}`)}
                            icon={Download}
                          />
                        ) : null}
                        {mayUpdateStatus ? (
                          <IconButton
                            label="Verifikasi"
                            onClick={() => {
                              setVerifyTarget(archive);
                              setVerifyForm({ status: "Terverifikasi", note: "" });
                              setVerifyOpen(true);
                            }}
                            icon={ShieldCheck}
                          />
                        ) : null}
                        {mayDelete ? <IconButton label="Hapus" onClick={() => deleteArchive(archive)} icon={Trash2} danger /> : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && archives.length === 0 ? <EmptyState title="Arsip tidak ditemukan" description="Coba ubah kata kunci atau filter arsip." /> : null}
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

      <Modal title={editing ? "Edit arsip" : "Tambah arsip"} open={formOpen} onClose={() => setFormOpen(false)} wide>
        <ArchiveForm
          form={form}
          setForm={setForm}
          units={units}
          submitting={saving}
          onSubmit={submitArchive}
          user={user}
        />
      </Modal>

      <Modal title="Detail arsip" open={detailOpen} onClose={() => setDetailOpen(false)} wide>
        {detail ? (
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={detail.status} />
                  <FileTypeIcon type={detail.file_type} />
                </div>
                <h2 className="mt-3 text-xl font-bold text-ink">{detail.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{detail.document_number}</p>
              </div>
              <dl className="grid gap-3 rounded-md border border-slate-200 p-4 text-sm sm:grid-cols-2">
                <Info label="Divisi" value={detail.unit_name} />
                <Info label="Jenis" value={detail.document_type} />
                <Info label="Tahun" value={detail.year} />
                <Info label="Klasifikasi" value={detail.classification} />
                <Info label="Pembuat" value={detail.creator_name} />
                <Info label="Ukuran file" value={formatBytes(detail.file_size)} />
              </dl>
              <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">File arsip</p>
                    <p className="mt-1 text-sm font-semibold text-ink">{detail.file_original_name || `arsip-${detail.id}`}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      downloadFromApi(
                        `/archives/${detail.id}/download`,
                        detail.file_original_name || `arsip-${detail.id}.${detail.file_type?.toLowerCase() || "txt"}`
                      )
                    }
                    className="focus-ring inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Download size={17} />
                    Unduh
                  </button>
                </div>
                <div className="h-[420px] bg-slate-50">
                  {previewLoading ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">Memuat file...</div>
                  ) : previewError ? (
                    <div className="flex h-full items-center justify-center p-6 text-sm text-red-600">{previewError}</div>
                  ) : previewUrl ? (
                    <object data={previewUrl} type={getPreviewMimeType(detail.file_type)} className="h-full w-full">
                      <div className="flex h-full items-center justify-center p-6 text-sm text-slate-500">
                        Pratinjau file tidak tersedia. Gunakan tombol unduh.
                      </div>
                    </object>
                  ) : null}
                </div>
              </div>
              <p className="rounded-md bg-slate-50 p-4 text-sm leading-6 text-slate-600">{detail.description || "Tidak ada deskripsi."}</p>

              <div className="rounded-md border border-slate-200">
                <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-ink">Riwayat disposisi</div>
                <div className="divide-y divide-slate-100">
                  {detail.dispositions?.map((disposition) => (
                    <div key={disposition.id} className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={disposition.status} />
                        <span className="text-slate-500">{formatDateTime(disposition.created_at)}</span>
                      </div>
                      <p className="mt-2 text-slate-700">{disposition.note}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {disposition.from_user_name} ke {disposition.to_user_name || disposition.to_unit_name}
                      </p>
                    </div>
                  ))}
                  {detail.dispositions?.length === 0 ? <div className="px-4 py-5 text-sm text-slate-500">Belum ada disposisi.</div> : null}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <form onSubmit={submitComment} className="rounded-md border border-slate-200 p-4">
                <label className="text-sm font-semibold text-ink">
                  Komentar
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    className="focus-ring mt-2 min-h-24 w-full rounded-md border border-slate-200 p-3 text-sm"
                    placeholder="Tulis komentar arsip"
                  />
                </label>
                <button
                  type="submit"
                  className="focus-ring mt-3 inline-flex items-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
                >
                  <MessageSquarePlus size={17} />
                  Simpan Komentar
                </button>
              </form>

              <div className="rounded-md border border-slate-200">
                <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-ink">Komentar arsip</div>
                <div className="divide-y divide-slate-100">
                  {detail.comments?.map((item) => (
                    <div key={item.id} className="px-4 py-3">
                      <p className="text-sm text-slate-700">{item.comment}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.user_name || "User"} | {formatDateTime(item.created_at)}
                      </p>
                    </div>
                  ))}
                  {detail.comments?.length === 0 ? <div className="px-4 py-5 text-sm text-slate-500">Belum ada komentar.</div> : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal title="Verifikasi arsip" open={verifyOpen} onClose={() => setVerifyOpen(false)}>
        <form onSubmit={submitVerify} className="space-y-4">
          <FilterSelect label="Status" value={verifyForm.status} onChange={(value) => setVerifyForm((current) => ({ ...current, status: value }))}>
            {["Menunggu Review", "Terverifikasi", "Ditolak", "Diarsipkan"].map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </FilterSelect>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Catatan</span>
            <textarea
              value={verifyForm.note}
              onChange={(event) => setVerifyForm((current) => ({ ...current, note: event.target.value }))}
              className="focus-ring min-h-28 w-full rounded-md border border-slate-200 p-3 text-sm"
              placeholder="Catatan verifikasi"
            />
          </label>
          <button type="submit" className="focus-ring inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
            <ShieldCheck size={17} />
            Simpan Verifikasi
          </button>
        </form>
      </Modal>
    </div>
  );
}

function FilterSelect({ label, value, onChange, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="focus-ring h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
      >
        {children}
      </select>
    </label>
  );
}

function IconButton({ label, icon: Icon, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`focus-ring inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm ${
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

function ArchiveForm({ form, setForm, units, submitting, onSubmit, user }) {
  const unitLocked = !canChooseArchiveUnit(user);

  const opsiDropbar = dataJsonDropbar.map((item) => ({
    value: item.Dropbar,
    label: item.Dropbar
  }));

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <TextInput label="Judul" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} required />
      <TextInput
        label="Nomor Dokumen"
        value={form.documentNumber}
        onChange={(value) => setForm((current) => ({ ...current, documentNumber: value }))}
        required
      />
      <FilterSelect label="Divisi" value={form.unitId} onChange={(value) => setForm((current) => ({ ...current, unitId: value }))}>
        <option value="">Pilih divisi</option>
        {units.map((unit) => (
          <option key={unit.id} value={unit.id} disabled={unitLocked && Number(unit.id) !== Number(user?.unitId)}>
            {unit.name}
          </option>
        ))}
      </FilterSelect>
      {/* --- KODE JENIS DOKUMEN BARU MULAI DI SINI --- */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500 uppercase">
          Jenis Dokumen
        </label>
        <Select
          options={opsiDropbar}
          value={opsiDropbar.find(option => option.value === form.documentType) || null}
          onChange={(pilihan) => setForm((current) => ({ 
            ...current, 
            documentType: pilihan ? pilihan.value : '' 
          }))}
          isSearchable={true}
          placeholder="Ketik untuk mencari..."
          noOptionsMessage={() => "Dokumen tidak ditemukan"}
          styles={{
            control: (base, state) => ({
              ...base,
              borderColor: state.isFocused ? '#0d9488' : '#e2e8f0', // Warna teal Tailwind
              boxShadow: state.isFocused ? '0 0 0 1px #0d9488' : 'none',
              '&:hover': {
                borderColor: '#0d9488',
              },
              borderRadius: '0.375rem',
              minHeight: '2.5rem',
            }),
          }}
        />
      </div>
      {/* --- KODE JENIS DOKUMEN BARU BERAKHIR DI SINI --- */}
      <FilterSelect label="Status" value={form.status} onChange={(value) => setForm((current) => ({ ...current, status: value }))}>
        {ARCHIVE_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect label="Tipe File" value={form.fileType} onChange={(value) => setForm((current) => ({ ...current, fileType: value }))}>
        {FILE_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </FilterSelect>
      <TextInput label="Tahun" value={form.year} onChange={(value) => setForm((current) => ({ ...current, year: value }))} required />
      <TextInput label="Klasifikasi" value={form.classification} onChange={(value) => setForm((current) => ({ ...current, classification: value }))} />
      <label className="md:col-span-2">
        <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Deskripsi</span>
        <textarea
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          className="focus-ring min-h-28 w-full rounded-md border border-slate-200 p-3 text-sm"
        />
      </label>
      <label className="md:col-span-2">
        <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Upload file</span>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          onChange={(event) => setForm((current) => ({ ...current, file: event.target.files?.[0] || null }))}
          className="focus-ring block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
        />
      </label>
      <div className="flex justify-end md:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="focus-ring inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          <FilePlus2 size={17} />
          {submitting ? "Menyimpan..." : "Simpan Arsip"}
        </button>
      </div>
    </form>
  );
}

function TextInput({ label, value, onChange, required = false }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="focus-ring h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
      />
    </label>
  );
}

function getPreviewMimeType(type) {
  switch (String(type || "").toUpperCase()) {
    case "PDF":
      return "application/pdf";
    case "DOC":
      return "application/msword";
    case "DOCX":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "XLS":
      return "application/vnd.ms-excel";
    case "XLSX":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "JPG":
    case "JPEG":
      return "image/jpeg";
    case "PNG":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}
