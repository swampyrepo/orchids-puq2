"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabase-client";
import { Key, CheckCircle2, XCircle, Loader2, ArrowLeft, Shield, Sun, Moon } from "lucide-react";

export default function RecoveryPage() {
  const [vccKey, setVccKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    plan?: string;
    expiresAt?: string;
  } | null>(null);
  const [theme, setTheme] = useState<string>("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    let activeTheme = savedTheme;
    if (savedTheme === "system") {
      activeTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    setTheme(activeTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-bs-theme", newTheme);
  };

  const handleRecover = async () => {
    if (!vccKey.trim()) return;
    
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabaseClient
        .from("vcc_keys")
        .select("*")
        .eq("key", vccKey.toUpperCase().trim())
        .single();

      if (error || !data) {
        setResult({
          success: false,
          message: "Key tidak ditemukan. Pastikan key yang dimasukkan benar.",
        });
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setResult({
          success: false,
          message: "Key sudah expired. Silakan beli plan baru.",
        });
        return;
      }

      const { data: { user } } = await supabaseClient.auth.getUser();

      if (user) {
        await supabaseClient
          .from("profiles")
          .update({ subscription_plan: data.plan_id })
          .eq("id", user.id);

        await supabaseClient
          .from("vcc_keys")
          .update({ 
            user_id: user.id, 
            is_used: true, 
            activated_at: new Date().toISOString() 
          })
          .eq("key", vccKey.toUpperCase().trim());
      }

      localStorage.setItem("vcc_recovery_plan", data.plan_id);
      localStorage.setItem("vcc_recovery_key", data.key);

      setResult({
        success: true,
        message: "Plan berhasil dipulihkan!",
        plan: data.plan_id.toUpperCase(),
        expiresAt: new Date(data.expires_at).toLocaleDateString("id-ID"),
      });
    } catch (err) {
      console.error("Recovery error:", err);
      setResult({
        success: false,
        message: "Terjadi kesalahan. Silakan coba lagi.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />

      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-slate-900/80 border-b border-slate-800">
        <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Kembali</span>
            </Link>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                <span className="text-sm text-slate-400">Recovery</span>
              </div>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-slate-800 transition-colors"
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {theme === "dark" ? <Sun className="w-5 h-5 text-slate-400" /> : <Moon className="w-5 h-5 text-slate-400" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
              <Key className="w-10 h-10 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Pulihkan Plan</h1>
            <p className="text-slate-400">
              Masukkan VCC Recovery Key untuk memulihkan plan yang sudah dibeli
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6">
            <div className="mb-6">
              <label className="block text-sm text-slate-400 mb-2">VCC Recovery Key</label>
              <input
                type="text"
                placeholder="VCC-XXXXXXXX"
                value={vccKey}
                onChange={(e) => setVccKey(e.target.value.toUpperCase())}
                className="w-full px-4 py-4 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-mono text-lg text-center tracking-wider"
                maxLength={12}
              />
            </div>

            <button
              onClick={handleRecover}
              disabled={!vccKey.trim() || loading}
              className={`w-full py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                vccKey.trim() && !loading
                  ? "bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90"
                  : "bg-slate-700 cursor-not-allowed opacity-50"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  <Key className="w-5 h-5" />
                  Pulihkan Plan
                </>
              )}
            </button>

            {result && (
              <div className={`mt-6 p-4 rounded-xl ${
                result.success 
                  ? "bg-emerald-500/10 border border-emerald-500/30" 
                  : "bg-rose-500/10 border border-rose-500/30"
              }`}>
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-rose-400 flex-shrink-0" />
                  )}
                  <div>
                    <p className={`font-medium ${result.success ? "text-emerald-300" : "text-rose-300"}`}>
                      {result.message}
                    </p>
                    {result.plan && (
                      <div className="mt-2 text-sm text-slate-400">
                        <p>Plan: <span className="text-white font-medium">{result.plan}</span></p>
                        <p>Berlaku sampai: <span className="text-white">{result.expiresAt}</span></p>
                      </div>
                    )}
                  </div>
                </div>

                {result.success && (
                  <Link 
                    href="/dashboard" 
                    className="mt-4 block w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold text-center hover:bg-emerald-600 transition-colors"
                  >
                    Ke Dashboard
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Belum punya key?{" "}
              <Link href="/plan" className="text-blue-400 hover:underline">
                Beli Plan
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
