"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  BarChart3,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  Search,
  ShieldCheck,
  Users,
  X
} from "lucide-react";
import { useAuth } from "./AuthProvider";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/archives", label: "Arsip", icon: Archive },
  { href: "/dispositions", label: "Disposisi", icon: ClipboardList },
  { href: "/organization", label: "Organisasi", icon: Network },
  { href: "/reports", label: "Laporan", icon: BarChart3 },
  { href: "/audit-logs", label: "Audit Log", icon: ShieldCheck, roles: ["Admin", "Inspektur", "Sekretaris"] },
  { href: "/users", label: "User", icon: Users, roles: ["Admin"] }
];

export function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  const visibleNav = useMemo(() => {
    if (!user) return [];
    return navItems.filter((item) => !item.roles || item.roles.includes(user.role));
  }, [user]);

  function submitSearch(event) {
    event.preventDefault();
    const value = globalSearch.trim();
    router.push(value ? `/archives?search=${encodeURIComponent(value)}` : "/archives");
    setMobileOpen(false);
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f7f6] px-4">
        <div className="rounded-md border border-slate-200 bg-white px-5 py-4 shadow-soft">Memuat SIPADI...</div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7f6]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white">
              SP
            </span>
            <span>
              <span className="block text-lg font-bold text-ink">SIPADI</span>
              <span className="block text-xs text-slate-500">Inspektorat</span>
            </span>
          </Link>
          <button
            type="button"
            className="focus-ring rounded-md p-2 text-slate-500 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Tutup menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="space-y-1 px-3 py-4">
          {visibleNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${
                  active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-ink"
                }`}
              >
                <Icon size={19} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-4">
          <div className="mb-3 rounded-md bg-slate-50 p-3">
            <p className="text-sm font-semibold text-ink">{user.name}</p>
            <p className="mt-1 text-xs text-slate-500">{user.role} | {user.unitName || "Unit belum diatur"}</p>
          </div>
          <button
            type="button"
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
          >
            <LogOut size={17} />
            Keluar
          </button>
        </div>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Tutup overlay"
          className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              className="focus-ring rounded-md p-2 text-slate-600 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Buka menu"
            >
              <Menu size={22} />
            </button>
            <form onSubmit={submitSearch} className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
                className="focus-ring h-10 w-full rounded-md border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-ink placeholder:text-slate-400"
                placeholder="Cari nama arsip atau nomor dokumen"
              />
            </form>
            <div className="hidden items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 sm:flex">
              <FileText size={17} />
              <span>{user.role}</span>
            </div>
          </div>
        </header>

        <main className="px-4 py-5 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
