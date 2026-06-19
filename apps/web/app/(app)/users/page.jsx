"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, ShieldAlert, Trash2, UserRound } from "lucide-react";
import { apiFetch, buildQuery } from "../../../lib/api";
import { ROLES } from "../../../lib/constants";
import { formatDateTime } from "../../../lib/format";
import { useAuth } from "../../../components/AuthProvider";
import { EmptyState } from "../../../components/EmptyState";
import { Modal } from "../../../components/Modal";

const defaultForm = {
  name: "",
  username: "",
  email: "",
  password: "password123",
  role: "Staff",
  unitId: "",
  isActive: true
};

export default function UsersPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [units, setUnits] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0 });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.role === "Admin") {
      apiFetch("/organization")
        .then((result) => setUnits(result.data))
        .catch((err) => setError(err.message));
    }
  }, [user?.role]);

  const loadUsers = useCallback(async () => {
    if (user?.role !== "Admin") return;
    setError("");
    try {
      const result = await apiFetch(`/users${buildQuery({ search, page: meta.page, limit: 10 })}`);
      setUsers(result.data);
      setMeta(result.meta);
    } catch (err) {
      setError(err.message);
    }
  }, [search, meta.page, user?.role]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const totalPages = useMemo(() => Math.max(Math.ceil((meta.total || 0) / meta.limit), 1), [meta]);

  if (user?.role !== "Admin") {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-5 text-amber-800">
        <div className="flex items-center gap-3">
          <ShieldAlert size={22} />
          <div>
            <h1 className="text-base font-semibold">Akses terbatas</h1>
            <p className="mt-1 text-sm">User management hanya tersedia untuk Admin.</p>
          </div>
        </div>
      </div>
    );
  }

  function openCreate() {
    setEditing(null);
    setForm(defaultForm);
    setFormOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      name: item.name || "",
      username: item.username || "",
      email: item.email || "",
      password: "",
      role: item.role || "Staff",
      unitId: item.unit_id || "",
      isActive: Boolean(item.is_active)
    });
    setFormOpen(true);
  }

  async function submitUser(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiFetch(editing ? `/users/${editing.id}` : "/users", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(form)
      });
      setFormOpen(false);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deactivateUser(item) {
    const confirmed = window.confirm(`Nonaktifkan user "${item.name}"?`);
    if (!confirmed) return;
    try {
      await apiFetch(`/users/${item.id}`, { method: "DELETE" });
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-brand-700">Admin</p>
          <h1 className="mt-1 text-2xl font-bold text-ink">User Management</h1>
          <p className="mt-1 text-sm text-slate-500">{meta.total || 0} user dummy</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus size={18} />
          Tambah User
        </button>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Search</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setMeta((current) => ({ ...current, page: 1 }));
              }}
              className="focus-ring h-10 w-full rounded-md border border-slate-200 pl-9 pr-3 text-sm"
              placeholder="Cari nama, username, atau email"
            />
          </span>
        </label>
      </section>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Dibuat</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                        <UserRound size={18} />
                      </span>
                      <div>
                        <p className="font-semibold text-ink">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.role}</td>
                  <td className="px-4 py-3 text-slate-600">{item.unit_name || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${item.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
                      {item.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDateTime(item.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <IconButton label="Edit" icon={Pencil} onClick={() => openEdit(item)} />
                      <IconButton label="Nonaktifkan" icon={Trash2} onClick={() => deactivateUser(item)} danger />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 ? <EmptyState title="User belum tersedia" description="Tambahkan user dummy untuk mencoba role access." /> : null}
        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Halaman {meta.page || 1} dari {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={(meta.page || 1) <= 1}
              onClick={() => setMeta((current) => ({ ...current, page: current.page - 1 }))}
              className="focus-ring rounded-md border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              disabled={(meta.page || 1) >= totalPages}
              onClick={() => setMeta((current) => ({ ...current, page: current.page + 1 }))}
              className="focus-ring rounded-md border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </section>

      <Modal title={editing ? "Edit user" : "Tambah user"} open={formOpen} onClose={() => setFormOpen(false)} wide>
        <form onSubmit={submitUser} className="grid gap-4 md:grid-cols-2">
          <Input label="Nama" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} required />
          <Input label="Username" value={form.username} onChange={(value) => setForm((current) => ({ ...current, username: value }))} required />
          <Input label="Email" type="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} required />
          <Input
            label={editing ? "Password baru" : "Password"}
            type="password"
            value={form.password}
            onChange={(value) => setForm((current) => ({ ...current, password: value }))}
            required={!editing}
          />
          <Select label="Role" value={form.role} onChange={(value) => setForm((current) => ({ ...current, role: value }))}>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </Select>
          <Select label="Unit" value={form.unitId} onChange={(value) => setForm((current) => ({ ...current, unitId: value }))}>
            <option value="">Pilih unit</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-brand-600"
            />
            <span className="text-sm font-semibold text-slate-700">User aktif</span>
          </label>
          <div className="flex justify-end md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="focus-ring inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Plus size={17} />
              {saving ? "Menyimpan..." : "Simpan User"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", required = false }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="focus-ring h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
      />
    </label>
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
