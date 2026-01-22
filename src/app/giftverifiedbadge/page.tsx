"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";

const ALLOWED_USER_IDS = [
  "admin-user-id-here"
];

export default function GiftVerifiedBadgePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accountId, setAccountId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [targetProfile, setTargetProfile] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      
      if (!user) {
        router.replace("/login");
        return;
      }

      setCurrentUser(user);

      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("is_verification")
        .eq("id", user.id)
        .single();

      if (profile?.is_verification || ALLOWED_USER_IDS.includes(user.id)) {
        setIsAuthorized(true);
      }

      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const searchUser = async () => {
    if (!accountId.trim()) return;

    setSearching(true);
    setTargetProfile(null);
    setResult(null);

    let query = supabaseClient.from("profiles").select("id, full_name, avatar_url, email, user_number, is_verification");

    if (!isNaN(Number(accountId))) {
      query = query.eq("user_number", Number(accountId));
    } else {
      query = query.eq("id", accountId);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      setResult({ success: false, message: "Pengguna tidak ditemukan" });
    } else {
      setTargetProfile(data);
    }

    setSearching(false);
  };

  const giftBadge = async () => {
    if (!targetProfile) return;

    setSubmitting(true);
    setResult(null);

    const { error } = await supabaseClient
      .from("profiles")
      .update({ is_verification: true })
      .eq("id", targetProfile.id);

    if (error) {
      setResult({ success: false, message: "Gagal memberikan badge: " + error.message });
    } else {
      setResult({ success: true, message: `Verified badge berhasil diberikan ke ${targetProfile.full_name || "User"}!` });
      setTargetProfile({ ...targetProfile, is_verification: true });
    }

    setSubmitting(false);
  };

  const revokeBadge = async () => {
    if (!targetProfile) return;

    setSubmitting(true);
    setResult(null);

    const { error } = await supabaseClient
      .from("profiles")
      .update({ is_verification: false })
      .eq("id", targetProfile.id);

    if (error) {
      setResult({ success: false, message: "Gagal mencabut badge: " + error.message });
    } else {
      setResult({ success: false, message: `Verified badge dicabut dari ${targetProfile.full_name || "User"}` });
      setTargetProfile({ ...targetProfile, is_verification: false });
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a" }}>
        <div className="spinner"></div>
        <style>{`
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255,255,255,0.1);
            border-top-color: #1DA1F2;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", color: "#fff" }}>
        <div style={{ textAlign: "center", padding: "40px" }}>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" style={{ marginBottom: "20px" }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h1 style={{ fontSize: "24px", marginBottom: "12px" }}>Akses Ditolak</h1>
          <p style={{ color: "#888", marginBottom: "24px" }}>Hanya pengguna terverifikasi yang dapat mengakses halaman ini.</p>
          <a href="/" style={{ color: "#1DA1F2", textDecoration: "none" }}>Kembali ke Beranda</a>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .page-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
          padding: 40px 20px;
          color: #fff;
        }
        .card {
          max-width: 500px;
          margin: 0 auto;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          padding: 32px;
          backdrop-filter: blur(10px);
        }
        .card-header {
          text-align: center;
          margin-bottom: 32px;
        }
        .badge-icon {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #1DA1F2, #0d8ecf);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }
        .card-title {
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 8px;
        }
        .card-subtitle {
          color: #888;
          font-size: 14px;
          margin: 0;
        }
        .input-group {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }
        .input-field {
          flex: 1;
          padding: 14px 18px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 12px;
          color: #fff;
          font-size: 15px;
          outline: none;
          transition: border-color 0.2s;
        }
        .input-field:focus {
          border-color: #1DA1F2;
        }
        .input-field::placeholder {
          color: #666;
        }
        .btn {
          padding: 14px 24px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }
        .btn-primary {
          background: linear-gradient(135deg, #1DA1F2, #0d8ecf);
          color: #fff;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(29, 161, 242, 0.3);
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        .btn-danger {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: #fff;
        }
        .btn-danger:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
        }
        .btn-full {
          width: 100%;
        }
        .user-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .user-avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #1DA1F2;
        }
        .user-details h4 {
          margin: 0 0 4px;
          font-size: 18px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .user-details p {
          margin: 0;
          color: #888;
          font-size: 14px;
        }
        .verified-badge {
          color: #1DA1F2;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          margin-top: 12px;
        }
        .status-verified {
          background: rgba(29, 161, 242, 0.2);
          color: #1DA1F2;
        }
        .status-not-verified {
          background: rgba(255, 255, 255, 0.1);
          color: #888;
        }
        .result-message {
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 20px;
          text-align: center;
          font-weight: 500;
        }
        .result-success {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }
        .result-error {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .action-buttons {
          display: flex;
          gap: 12px;
        }
        .action-buttons .btn {
          flex: 1;
        }
        .back-link {
          display: block;
          text-align: center;
          margin-top: 24px;
          color: #888;
          text-decoration: none;
          font-size: 14px;
        }
        .back-link:hover {
          color: #1DA1F2;
        }
        .spinner-small {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          display: inline-block;
          margin-right: 8px;
          vertical-align: middle;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="page-container">
        <div className="card">
          <div className="card-header">
            <div className="badge-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff">
                <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
              </svg>
            </div>
            <h1 className="card-title">Gift Verified Badge</h1>
            <p className="card-subtitle">Berikan badge verifikasi ke pengguna lain</p>
          </div>

          <div className="input-group">
            <input
              type="text"
              className="input-field"
              placeholder="Masukkan User Number atau User ID"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchUser()}
            />
            <button className="btn btn-primary" onClick={searchUser} disabled={searching || !accountId.trim()}>
              {searching ? <span className="spinner-small"></span> : "Cari"}
            </button>
          </div>

          {result && !targetProfile && (
            <div className={`result-message ${result.success ? "result-success" : "result-error"}`}>
              {result.message}
            </div>
          )}

          {targetProfile && (
            <>
              <div className="user-card">
                <div className="user-info">
                  <img
                    src={targetProfile.avatar_url || `https://ui-avatars.com/api/?name=${targetProfile.full_name || "User"}&background=1DA1F2&color=fff`}
                    alt="Avatar"
                    className="user-avatar"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${targetProfile.full_name || "User"}&background=1DA1F2&color=fff`;
                    }}
                  />
                  <div className="user-details">
                    <h4>
                      {targetProfile.full_name || "Guest User"}
                      {targetProfile.is_verification && (
                        <svg className="verified-badge" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                          <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                        </svg>
                      )}
                    </h4>
                    <p>@user{targetProfile.user_number}</p>
                    <span className={`status-badge ${targetProfile.is_verification ? "status-verified" : "status-not-verified"}`}>
                      {targetProfile.is_verification ? "Terverifikasi" : "Belum Terverifikasi"}
                    </span>
                  </div>
                </div>
              </div>

              {result && (
                <div className={`result-message ${result.success ? "result-success" : "result-error"}`}>
                  {result.message}
                </div>
              )}

              <div className="action-buttons">
                {!targetProfile.is_verification ? (
                  <button className="btn btn-primary btn-full" onClick={giftBadge} disabled={submitting}>
                    {submitting ? <><span className="spinner-small"></span>Memproses...</> : "Berikan Verified Badge"}
                  </button>
                ) : (
                  <button className="btn btn-danger btn-full" onClick={revokeBadge} disabled={submitting}>
                    {submitting ? <><span className="spinner-small"></span>Memproses...</> : "Cabut Verified Badge"}
                  </button>
                )}
              </div>
            </>
          )}

          <a href="/" className="back-link">← Kembali ke Beranda</a>
        </div>
      </div>
    </>
  );
}
