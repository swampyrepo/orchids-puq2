"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ServiceUnavailable() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
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

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/maintenance");
        const data = await res.json();
        
        if (!data.enabled) {
          router.replace("/");
        } else {
          setChecking(false);
        }
      } catch {
        setChecking(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, [router]);

  const bgGradient = theme === "dark" 
    ? "linear-gradient(180deg, #1e1e2d 0%, #232333 100%)" 
    : "linear-gradient(180deg, #eef5ff 0%, #ffffff 100%)";

  const textColor = theme === "dark" ? "#cfd3ec" : "#333";
  const mutedColor = theme === "dark" ? "#8a8d93" : "#64748b";
  const cardBg = theme === "dark" ? "#2b2c40" : "#ffffff";

  if (checking) {
    return (
      <div
        style={{
          margin: 0,
          padding: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: bgGradient,
          fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          color: textColor,
          textAlign: "center" as const,
          position: "relative",
        }}
      >
        <button
          onClick={toggleTheme}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {theme === "dark" ? (
            <i className="ri-sun-line" style={{ color: "#fff", fontSize: "18px" }}></i>
          ) : (
            <i className="ri-moon-line" style={{ color: "#333", fontSize: "18px" }}></i>
          )}
        </button>
        <p style={{ color: mutedColor }}>Memeriksa status layanan...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        margin: 0,
        padding: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: bgGradient,
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: textColor,
        textAlign: "center" as const,
        position: "relative",
      }}
    >
      <button
        onClick={toggleTheme}
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          background: theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {theme === "dark" ? (
          <i className="ri-sun-line" style={{ color: "#fff", fontSize: "18px" }}></i>
        ) : (
          <i className="ri-moon-line" style={{ color: "#333", fontSize: "18px" }}></i>
        )}
      </button>
      <div
        style={{
          padding: "20px",
          width: "90%",
          maxWidth: "450px",
        }}
      >
        <img
          src="https://visora-dev-assets-id.assetsvsiddev.workers.dev/small-favicon/favicon-small.png"
          alt="Logo"
          style={{
            width: "180px",
            height: "auto",
            marginBottom: "50px",
            display: "inline-block",
          }}
        />

        <div
          style={{
            color: "#d93025",
            fontWeight: 700,
            fontSize: "1.2rem",
            marginBottom: "30px",
          }}
        >
          HTTP 503 Service Unavailable:
        </div>

        <div
          style={{
            background: cardBg,
            padding: "40px 30px",
            borderRadius: "24px",
            boxShadow: theme === "dark" ? "0 10px 30px rgba(0, 0, 0, 0.3)" : "0 10px 30px rgba(0, 0, 0, 0.05)",
            marginBottom: "30px",
          }}
        >
          <p
            style={{
              fontSize: "1.05rem",
              lineHeight: 1.6,
              color: theme === "dark" ? "#b4bdc6" : "#444",
              fontWeight: 500,
              margin: 0,
            }}
          >
            Maaf, layanan kami sedang dalam pembaruan, silahkan periksa kembali saat 1 - 3 jam lagi.
            <br />
            Terima Kasih
          </p>
        </div>

        <p
          style={{
            fontSize: "0.85rem",
            color: mutedColor,
            marginTop: "20px",
          }}
        >
          Halaman akan otomatis refresh saat layanan kembali online
        </p>
      </div>
    </div>
  );
}
