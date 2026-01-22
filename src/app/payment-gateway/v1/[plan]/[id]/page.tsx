"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";
import { 
  CreditCard, 
  Wallet, 
  Shield, 
  Check, 
  X, 
  AlertTriangle,
  Copy,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Key
} from "lucide-react";

const planDetails: Record<string, {
  name: string;
  price: number;
  priceIDR: number;
  description: string;
  color: string;
}> = {
  starter: { name: "STARTER PACK", price: 0, priceIDR: 0, description: "Gratis untuk semua orang", color: "from-slate-500 to-slate-600" },
  plus: { name: "PLUS", price: 10, priceIDR: 160000, description: "Stabil untuk penggunaan rutin", color: "from-blue-500 to-blue-600" },
  premium: { name: "PREMIUM", price: 25, priceIDR: 400000, description: "Lebih jarang error & konteks panjang", color: "from-amber-500 to-orange-500" },
  creator: { name: "CREATOR", price: 60, priceIDR: 960000, description: "Cocok untuk konten & coding berat", color: "from-purple-500 to-pink-500" },
  business: { name: "BUSINESS", price: 300, priceIDR: 4800000, description: "Private Server untuk perusahaan", color: "from-emerald-500 to-teal-500" },
  ultimate: { name: "ULTIMATE", price: 1200, priceIDR: 19000000, description: "Dedicated / HPC Class", color: "from-rose-500 to-red-600" },
};

type PaymentMethod = "ovo" | "dana" | "credit_card" | null;

function generateVCCKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let key = "VCC-";
  for (let i = 0; i < 8; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

export default function PaymentGatewayPage() {
  const params = useParams();
  const router = useRouter();
  const plan = params.plan as string;
  const paymentId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [showVCCKeyPopup, setShowVCCKeyPopup] = useState(false);
  const [vccKey, setVccKey] = useState("");
  const [keyCopied, setKeyCopied] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [email, setEmail] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCVV, setCardCVV] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [continueAsGuest, setContinueAsGuest] = useState(false);

  const planInfo = planDetails[plan];

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    checkUser();
  }, []);

  const handleProceedToPayment = () => {
    if (!user && !continueAsGuest) {
      setShowLoginPopup(true);
      return;
    }
    if (!selectedMethod) return;
    processPayment();
  };

  const handleContinueAsGuest = () => {
    setContinueAsGuest(true);
    setShowLoginPopup(false);
    const newVccKey = generateVCCKey();
    setVccKey(newVccKey);
    setShowVCCKeyPopup(true);
  };

  const handleVCCKeyConfirm = () => {
    setShowVCCKeyPopup(false);
  };

  const copyVCCKey = () => {
    navigator.clipboard.writeText(vccKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const processPayment = async () => {
    if (!selectedMethod) return;
    setProcessing(true);

    try {
      const finalVccKey = !user && continueAsGuest ? vccKey : null;
      
      const { data: purchase, error: purchaseError } = await supabaseClient
        .from("plan_purchases")
        .insert({
          user_id: user?.id || null,
          plan_name: plan,
          amount_usd: planInfo.price,
          amount_idr: planInfo.priceIDR,
          payment_method: selectedMethod,
          payment_status: "completed",
          recovery_code: finalVccKey,
          email: user?.email || email || null,
          is_guest: !user,
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      if (finalVccKey) {
        const { error: vccError } = await supabaseClient
          .from("vcc_keys")
          .insert({
            key: finalVccKey,
            plan_id: plan,
            payment_id: purchase.id,
            user_id: user?.id || null,
            email: user?.email || email || null,
            is_used: false,
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          });

        if (vccError) console.error("VCC key save error:", vccError);
      }

      if (user) {
        await supabaseClient
          .from("profiles")
          .update({ subscription_plan: plan })
          .eq("id", user.id);
      }

      setPaymentSuccess(true);
    } catch (error) {
      console.error("Payment error:", error);
      alert("Terjadi kesalahan saat memproses pembayaran");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!planInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Plan tidak ditemukan</h1>
          <Link href="/plan" className="text-blue-400 hover:underline">Kembali ke halaman Plan</Link>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-slate-900/80 border border-slate-700 rounded-2xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Pembayaran Berhasil!</h1>
          <p className="text-slate-400 mb-6">
            Plan <strong className="text-white">{planInfo.name}</strong> telah aktif.
          </p>
          
          {vccKey && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <p className="text-sm text-amber-300 mb-2">Simpan Recovery Key ini:</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-lg font-mono text-white bg-slate-800 px-4 py-2 rounded-lg">{vccKey}</code>
                <button onClick={copyVCCKey} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors">
                  {keyCopied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-slate-400" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">Key ini bisa digunakan untuk memulihkan plan jika hilang</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Link href="/dashboard" className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:opacity-90 transition-opacity">
              Ke Dashboard
            </Link>
            <Link href="/plan" className="w-full py-3 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors">
              Lihat Plan Lain
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />

      {showLoginPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-amber-500/20">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Kamu belum log in</h2>
            </div>
            <p className="text-slate-400 mb-6">
              Kamu terdeteksi tidak log in, apakah mau melanjutkan? Atau Log in dulu?
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/register" className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold text-center hover:opacity-90 transition-opacity">
                Buat akun
              </Link>
              <Link href="/login" className="w-full py-3 rounded-xl bg-slate-800 text-white font-semibold text-center hover:bg-slate-700 transition-colors border border-slate-700">
                Log in
              </Link>
              <button
                onClick={handleContinueAsGuest}
                className="w-full py-3 rounded-xl bg-transparent text-slate-400 font-medium hover:text-white transition-colors"
              >
                Lanjutkan tanpa akun
              </button>
            </div>
            <button onClick={() => setShowLoginPopup(false)} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-slate-800 transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
      )}

      {showVCCKeyPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-emerald-500/20">
                <Key className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Recovery Key</h2>
            </div>
            <p className="text-slate-400 mb-4">
              Karena kamu melanjutkan tanpa akun, simpan key ini untuk memulihkan plan jika:
            </p>
            <ul className="text-sm text-slate-500 mb-4 space-y-1">
              <li>• Plan hilang</li>
              <li>• Akun direset</li>
              <li>• Cache browser dihapus</li>
            </ul>
            
            <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 mb-6">
              <div className="flex items-center justify-between gap-3">
                <code className="text-xl font-mono text-emerald-400 font-bold">{vccKey}</code>
                <button onClick={copyVCCKey} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors">
                  {keyCopied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-slate-400" />}
                </button>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-6">
              <p className="text-xs text-amber-300">
                <strong>PENTING:</strong> Simpan key ini di tempat yang aman. Key tidak bisa dipulihkan jika hilang!
              </p>
            </div>

            <button
              onClick={handleVCCKeyConfirm}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Saya sudah menyimpan key
            </button>
          </div>
        </div>
      )}

      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-slate-900/80 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/plan" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Kembali ke Plan</span>
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <span className="text-sm text-slate-400">Pembayaran Aman</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <div className={`p-6 rounded-2xl bg-gradient-to-br ${planInfo.color} shadow-xl`}>
              <h1 className="text-2xl font-bold text-white mb-2">{planInfo.name}</h1>
              <p className="text-white/80 mb-4">{planInfo.description}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">${planInfo.price}</span>
                <span className="text-white/70">/ bulan</span>
              </div>
              <p className="text-sm text-white/60 mt-1">± Rp{planInfo.priceIDR.toLocaleString("id-ID")}</p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-700">
              <h2 className="text-lg font-semibold text-white mb-4">Pilih Metode Pembayaran</h2>
              
              <div className="space-y-3">
                <button
                  onClick={() => setSelectedMethod("ovo")}
                  className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all ${
                    selectedMethod === "ovo"
                      ? "bg-purple-500/20 border-2 border-purple-500"
                      : "bg-slate-800 border border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center font-bold text-white text-lg">
                    OVO
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-white">OVO</p>
                    <p className="text-sm text-slate-400">Bayar dengan OVO</p>
                  </div>
                  {selectedMethod === "ovo" && <Check className="w-6 h-6 text-purple-400" />}
                </button>

                <button
                  onClick={() => setSelectedMethod("dana")}
                  className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all ${
                    selectedMethod === "dana"
                      ? "bg-blue-500/20 border-2 border-blue-500"
                      : "bg-slate-800 border border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center font-bold text-white text-sm">
                    DANA
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-white">DANA</p>
                    <p className="text-sm text-slate-400">Bayar dengan DANA</p>
                  </div>
                  {selectedMethod === "dana" && <Check className="w-6 h-6 text-blue-400" />}
                </button>

                <button
                  onClick={() => setSelectedMethod("credit_card")}
                  className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all ${
                    selectedMethod === "credit_card"
                      ? "bg-amber-500/20 border-2 border-amber-500"
                      : "bg-slate-800 border border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-white">Kartu Kredit / Debit</p>
                    <p className="text-sm text-slate-400">Visa, Mastercard, JCB</p>
                  </div>
                  {selectedMethod === "credit_card" && <Check className="w-6 h-6 text-amber-400" />}
                </button>
              </div>
            </div>

            {selectedMethod && (
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-700 animate-in slide-in-from-top duration-300">
                <h2 className="text-lg font-semibold text-white mb-4">Detail Pembayaran</h2>
                
                {selectedMethod === "credit_card" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Nomor Kartu</label>
                      <input
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Expiry</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">CVV</label>
                        <input
                          type="text"
                          placeholder="123"
                          value={cardCVV}
                          onChange={(e) => setCardCVV(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">
                        Nomor {selectedMethod === "ovo" ? "OVO" : "DANA"}
                      </label>
                      <input
                        type="tel"
                        placeholder="08xxxxxxxxxx"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                )}

                {!user && (
                  <div className="mt-4">
                    <label className="block text-sm text-slate-400 mb-2">Email (opsional, untuk notifikasi)</label>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="sticky top-24 p-6 rounded-2xl bg-slate-900/80 border border-slate-700">
              <h2 className="text-lg font-semibold text-white mb-4">Ringkasan</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-slate-400">Plan</span>
                  <span className="text-white font-medium">{planInfo.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Harga</span>
                  <span className="text-white">${planInfo.price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Periode</span>
                  <span className="text-white">1 Bulan</span>
                </div>
                <hr className="border-slate-700" />
                <div className="flex justify-between">
                  <span className="text-slate-400">Total</span>
                  <div className="text-right">
                    <p className="text-xl font-bold text-white">${planInfo.price}</p>
                    <p className="text-sm text-slate-500">Rp{planInfo.priceIDR.toLocaleString("id-ID")}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleProceedToPayment}
                disabled={!selectedMethod || processing}
                className={`w-full py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                  selectedMethod && !processing
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90"
                    : "bg-slate-700 cursor-not-allowed opacity-50"
                }`}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Wallet className="w-5 h-5" />
                    Bayar Sekarang
                  </>
                )}
              </button>

              {user && (
                <p className="text-center text-sm text-slate-500 mt-4">
                  Login sebagai <span className="text-white">{user.email}</span>
                </p>
              )}

              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
                <Shield className="w-4 h-4" />
                <span>Transaksi terenkripsi & aman</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
          <p className="text-xs text-slate-500 text-center">
            Transaction ID: <code className="text-slate-400">{paymentId}</code>
          </p>
        </div>
      </main>
    </div>
  );
}
