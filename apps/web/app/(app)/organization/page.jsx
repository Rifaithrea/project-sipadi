"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Network, UserRound } from "lucide-react";
import { apiFetch } from "../../../lib/api";
import { EmptyState } from "../../../components/EmptyState";

export default function OrganizationPage() {
  const [tree, setTree] = useState([]);
  const [units, setUnits] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [orgResult, userResult] = await Promise.all([apiFetch("/organization"), apiFetch("/organization/users")]);
        setTree(orgResult.tree);
        setUnits(orgResult.data);
        setUsers(userResult.data);
        setSelectedId(orgResult.data[0]?.id || null);
        setExpanded(new Set(orgResult.data.map((unit) => unit.id)));
      } catch (err) {
        setError(err.message);
      }
    }
    load();
  }, []);

  const selected = useMemo(() => units.find((unit) => unit.id === selectedId), [units, selectedId]);
  const selectedUsers = useMemo(() => users.filter((user) => user.unit_id === selectedId), [users, selectedId]);

  function toggle(id) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold uppercase text-brand-700">Struktur organisasi</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">Inspektorat</h1>
        <p className="mt-1 text-sm text-slate-500">Pilih unit untuk melihat detail dan user dummy yang terhubung.</p>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          {tree.length ? (
            <div className="space-y-2">
              {tree.map((unit) => (
                <OrgNode
                  key={unit.id}
                  unit={unit}
                  depth={0}
                  expanded={expanded}
                  onToggle={toggle}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="Struktur belum tersedia" description="Jalankan seed database untuk memuat unit organisasi dummy." />
          )}
        </section>

        <section className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-semibold text-ink">{selected?.name || "Pilih unit"}</h2>
            <p className="mt-1 text-sm text-slate-500">{selected?.unit_type || "-"}</p>
          </div>
          <div className="p-4">
            <div className="rounded-md bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Kode unit</p>
              <p className="mt-1 text-lg font-bold text-ink">{selected?.code || "-"}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{selected?.description || "Tidak ada deskripsi."}</p>
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-semibold text-ink">User pada unit</h3>
              <div className="mt-2 divide-y divide-slate-100 rounded-md border border-slate-200">
                {selectedUsers.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-3 py-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                      <UserRound size={18} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.role} | {item.email}</p>
                    </div>
                  </div>
                ))}
                {selectedUsers.length === 0 ? <div className="px-3 py-6 text-sm text-slate-500">Belum ada user aktif pada unit ini.</div> : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function OrgNode({ unit, depth, expanded, onToggle, selectedId, onSelect }) {
  const hasChildren = unit.children?.length > 0;
  const isExpanded = expanded.has(unit.id);
  const active = selectedId === unit.id;

  return (
    <div>
      <div
        className={`flex items-center gap-2 rounded-md border px-3 py-2 ${
          active ? "border-brand-200 bg-brand-50" : "border-slate-200 bg-white hover:bg-slate-50"
        }`}
        style={{ marginLeft: depth * 20 }}
      >
        <button
          type="button"
          className="focus-ring flex h-8 w-8 items-center justify-center rounded-md text-slate-500"
          onClick={() => hasChildren && onToggle(unit.id)}
          aria-label="Buka tutup unit"
        >
          {hasChildren ? isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} /> : <Network size={17} />}
        </button>
        <button type="button" onClick={() => onSelect(unit.id)} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold text-ink">{unit.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">{unit.unit_type} | {unit.user_count} user</p>
        </button>
      </div>
      {hasChildren && isExpanded ? (
        <div className="mt-2 space-y-2">
          {unit.children.map((child) => (
            <OrgNode
              key={child.id}
              unit={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
