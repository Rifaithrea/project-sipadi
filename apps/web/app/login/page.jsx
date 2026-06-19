"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, LockKeyhole, LogIn, UserRound } from "lucide-react";
import { useAuth } from "../../components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(identifier, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#edf3f1] px-4 py-10">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-md border border-slate-200 bg-white shadow-soft md:grid-cols-[1fr_420px]">
        <div className="flex min-h-[520px] flex-col justify-between bg-brand-700 p-8 text-white">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white/15">
              <Archive size={26} />
            </div>
            <h1 className="mt-8 text-3xl font-bold">SIPADI</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-brand-50">
              Sistem Pengarsipan dan Disposisi Inspektorat untuk mengelola arsip, verifikasi dokumen,
              disposisi, laporan, dan riwayat aktivitas secara tertib.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-brand-50 sm:grid-cols-3">
            <div className="rounded-md border border-white/15 p-3">Pengarsipan Digital</div>
            <div className="rounded-md border border-white/15 p-3">Disposisi Dokumen</div>
            <div className="rounded-md border border-white/15 p-3">Laporan Arsip</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col justify-center p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase text-brand-700">Masuk aplikasi</p>
          <h2 className="mt-2 text-2xl font-bold text-ink">Dashboard arsip kantor</h2>
          <p className="mt-2 text-sm text-slate-500">Masukkan akun yang telah terdaftar untuk mengakses sistem.</p>

          <label className="mt-8 block text-sm font-medium text-slate-700">
            Email atau username
            <span className="relative mt-2 block">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="focus-ring h-11 w-full rounded-md border border-slate-200 pl-10 pr-3 text-sm"
                placeholder="email atau username"
              />
            </span>
          </label>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Password
            <span className="relative mt-2 block">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="focus-ring h-11 w-full rounded-md border border-slate-200 pl-10 pr-3 text-sm"
                placeholder="Masukkan password"
              />
            </span>
          </label>

          {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

          <button
            type="submit"
            disabled={submitting}
            className="focus-ring mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <LogIn size={18} />
            {submitting ? "Memproses..." : "Masuk"}
          </button>

          <p className="mt-5 text-xs leading-5 text-slate-500">
            Akses sistem diberikan sesuai kewenangan masing-masing pengguna.
          </p>
        </form>
      </section>
    </main>
  );
}
