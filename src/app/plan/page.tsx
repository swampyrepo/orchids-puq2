"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { supabaseClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";

const plans = [
  {
    id: "starter",
    name: "STARTER PACK",
    price: "0",
    priceIDR: "Gratis",
    period: "Gratis (masa awal)",
    description: "Cocok untuk coba-coba dan user baru",
    icon: "ri-flashlight-line",
    color: "secondary",
    badge: null,
    features: [
      "Akses AI standar",
      "Generate teks & chat",
      "Limit harian rendah",
      "Tanpa private server",
      "Shared server",
    ],
    models: ["Aurora Lite"],
    popular: false,
  },
  {
    id: "plus",
    name: "PLUS",
    price: "10",
    priceIDR: "Rp160.000",
    period: "/ bulan",
    description: "Stabil untuk penggunaan rutin",
    icon: "ri-star-line",
    color: "info",
    badge: null,
    features: [
      "Limit lebih besar dari Starter",
      "Response lebih cepat",
      "Prioritas antrian ringan",
      "Shared server",
    ],
    models: ["Aurora Lite", "Aurora Core"],
    popular: false,
  },
  {
    id: "premium",
    name: "PREMIUM",
    price: "25",
    priceIDR: "Rp400.000",
    period: "/ bulan",
    description: "Lebih jarang error & konteks panjang",
    icon: "ri-vip-crown-line",
    color: "warning",
    badge: "Popular",
    features: [
      "Limit tinggi",
      "Konteks lebih panjang",
      "Lebih jarang error",
      "Prioritas komputasi menengah",
      "Shared server premium",
    ],
    models: ["Aurora Lite", "Aurora Core", "Aurora Pro"],
    popular: true,
  },
  {
    id: "creator",
    name: "CREATOR",
    price: "60",
    priceIDR: "Rp960.000",
    period: "/ bulan",
    description: "Cocok untuk konten, video prompt, dan coding berat",
    icon: "ri-magic-line",
    color: "primary",
    badge: null,
    features: [
      "Limit sangat tinggi",
      "Cocok untuk konten & coding berat",
      "Response cepat & stabil",
      "Prioritas komputasi tinggi",
      "Shared server high-performance",
    ],
    models: ["Aurora Core", "Aurora Pro"],
    popular: false,
  },
  {
    id: "business",
    name: "BUSINESS",
    price: "300 – 600",
    priceIDR: "Rp4.800.000 – Rp9.600.000",
    period: "/ bulan",
    description: "Private Server untuk perusahaan",
    icon: "ri-briefcase-line",
    color: "success",
    badge: "Private Server",
    features: [
      "Private Server (PS)",
      "Isolasi user penuh",
      "Statistik penggunaan real-time (grafik)",
      "Total kredit terpakai",
      "Jumlah request API",
      "Lebih aman & stabil",
      "Cocok untuk sistem internal perusahaan",
    ],
    models: ["Aurora Pro", "Aurora Business"],
    serverPath: "/users/server_business/[token]",
    popular: false,
  },
  {
    id: "ultimate",
    name: "ULTIMATE",
    price: "1.200 – 2.500",
    priceIDR: "Rp19.000.000 – Rp40.000.000",
    period: "/ bulan",
    description: "Dedicated / HPC Class dengan resource maksimal",
    icon: "ri-server-line",
    color: "danger",
    badge: "Dedicated HPC",
    features: [
      "Dedicated Private Server",
      "Kelas supercomputer / HPC",
      "Resource sangat besar",
      "Beban berat tanpa throttling",
      "Statistik lengkap & real-time",
      "Prioritas absolut",
    ],
    models: ["Aurora Pro", "Aurora Ultimate", "Aurora Prime 8K (akses terbatas)"],
    serverSpecs: {
      os: "Linux x64",
      ram: "hingga 17 TB",
      memory: "200–320 GB",
      server: "VSID_SERVER10",
    },
    serverPath: "/users/server_ultimate/[token]",
    popular: false,
  },
];

function generatePaymentId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-&";
  let result = "";
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function PlanPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    html.className = "layout-navbar-fixed layout-menu-fixed layout-compact";
    html.setAttribute("data-template", "vertical-menu-template");
    html.setAttribute("data-assets-path", "https://api.vreden.my.id/assets/");

    const checkUser = async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      setUser(user);
    };
    checkUser();

    return () => {
      html.className = "layout-navbar-fixed layout-wide";
      html.setAttribute("data-template", "front-pages");
    };
  }, []);

  return (
    <>
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/fonts/iconify-icons.css" />
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/libs/node-waves/node-waves.css" />
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/libs/pickr/pickr-themes.css" />
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/css/core.css" />
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/css/demo.css" />
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/libs/perfect-scrollbar/perfect-scrollbar.css" />

      <Script src="https://api.vreden.my.id/assets/vendor/js/helpers.js" strategy="beforeInteractive" />
      <Script src="/js/customizer.js" strategy="beforeInteractive" />
      <Script src="https://api.vreden.my.id/assets/js/config.js" strategy="beforeInteractive" />
      <Script src="https://api.vreden.my.id/assets/vendor/libs/jquery/jquery.js" strategy="afterInteractive" />
      <Script src="https://api.vreden.my.id/assets/vendor/libs/popper/popper.js" strategy="afterInteractive" />
      <Script src="https://api.vreden.my.id/assets/vendor/js/bootstrap.js" strategy="afterInteractive" />
      <Script src="https://api.vreden.my.id/assets/vendor/libs/node-waves/node-waves.js" strategy="afterInteractive" />
      <Script src="https://api.vreden.my.id/assets/vendor/libs/perfect-scrollbar/perfect-scrollbar.js" strategy="afterInteractive" />
      <Script src="https://api.vreden.my.id/assets/vendor/js/menu.js" strategy="afterInteractive" />
      <Script src="https://api.vreden.my.id/assets/js/main.js" strategy="afterInteractive" />
      <Script id="theme-switcher" strategy="afterInteractive">{`
        (function() {
          function setTheme(theme) {
            var html = document.documentElement;
            var activeTheme = theme;
            if (theme === 'system') {
              activeTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            html.setAttribute('data-bs-theme', activeTheme);
            localStorage.setItem('theme', theme);
            document.querySelectorAll('[data-bs-theme-value]').forEach(function(btn) {
              btn.classList.remove('active');
              if (btn.getAttribute('data-bs-theme-value') === theme) {
                btn.classList.add('active');
              }
            });
            var iconActive = document.querySelector('.theme-icon-active');
            if (iconActive) {
              iconActive.className = iconActive.className.replace(/ri-sun-line|ri-moon-clear-line|ri-computer-line/, '');
              if (theme === 'dark') {
                iconActive.classList.add('ri-moon-clear-line');
              } else if (theme === 'system') {
                iconActive.classList.add('ri-computer-line');
              } else {
                iconActive.classList.add('ri-sun-line');
              }
            }
          }
          var savedTheme = localStorage.getItem('theme') || 'light';
          setTheme(savedTheme);
          window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
            if (localStorage.getItem('theme') === 'system') {
              setTheme('system');
            }
          });
          document.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-bs-theme-value]');
            if (btn) {
              var theme = btn.getAttribute('data-bs-theme-value');
              setTheme(theme);
            }
          });
        })();
      `}</Script>

      <div className="layout-wrapper layout-content-navbar">
        <div className="layout-container">
          <aside id="layout-menu" className="layout-menu menu-vertical menu bg-menu-theme">
            <div className="app-brand demo">
              <a href="/" className="app-brand-link">
                <span className="app-brand-logo demo me-1">
                  <Logo width={150} src="https://visora-dev-assets-id.assetsvsiddev.workers.dev/small-favicon/favicon-small.png" />
                </span>
              </a>
              <a href="javascript:void(0);" className="layout-menu-toggle menu-link text-large ms-auto">
                <i className="menu-toggle-icon d-xl-block align-middle"></i>
              </a>
            </div>
            <div className="menu-inner-shadow"></div>
            <ul className="menu-inner py-1">
              <li className="menu-item">
                <a href="/" className="menu-link">
                  <i className="menu-icon tf-icons ri ri-home-smile-line"></i>
                  <div>Beranda</div>
                </a>
              </li>
              <li className="menu-item">
                <a href="/dashboard" className="menu-link">
                  <i className="menu-icon tf-icons ri ri-dashboard-line"></i>
                  <div>Dashboard</div>
                </a>
              </li>
              <li className="menu-item">
                <a href="/users/profile" className="menu-link">
                  <i className="menu-icon tf-icons ri ri-user-line"></i>
                  <div>Profil</div>
                </a>
              </li>
              <li className="menu-item active">
                <a href="/plan" className="menu-link">
                  <i className="menu-icon tf-icons ri ri-vip-crown-line"></i>
                  <div>Upgrade Plan</div>
                </a>
              </li>
              <li className="menu-header mt-7">
                <span className="menu-header-text">Support</span>
              </li>
              <li className="menu-item">
                <a href="https://whatsapp.com/channel/0029Vb7fXyMId7nQmJJx1U1L" target="_blank" className="menu-link">
                  <i className="menu-icon tf-icons ri ri-whatsapp-line"></i>
                  <div>Channel Info</div>
                </a>
              </li>
              <li className="menu-item">
                <a href="https://wa.me/6289531606677" target="_blank" className="menu-link">
                  <i className="menu-icon tf-icons ri ri-customer-service-line"></i>
                  <div>WhatsApp</div>
                </a>
              </li>
            </ul>
          </aside>

          <div className="menu-mobile-toggler d-xl-none rounded-1">
            <a href="javascript:void(0);" className="layout-menu-toggle menu-link text-large text-bg-secondary p-2 rounded-1">
              <i className="ri ri-menu-line icon-base"></i>
              <i className="ri ri-arrow-right-s-line icon-base"></i>
            </a>
          </div>

          <div className="layout-page">
            <nav className="layout-navbar container-xxl navbar-detached navbar navbar-expand-xl align-items-center bg-navbar-theme" id="layout-navbar">
              <div className="layout-menu-toggle navbar-nav align-items-xl-center me-4 me-xl-0 d-xl-none">
                <a className="nav-item nav-link px-0 me-xl-6" href="javascript:void(0)">
                  <i className="icon-base ri ri-menu-line icon-md"></i>
                </a>
              </div>
              <div className="navbar-nav-right d-flex align-items-center justify-content-end" id="navbar-collapse">
                <ul className="navbar-nav flex-row align-items-center ms-md-auto">
                  <li className="nav-item dropdown me-sm-2 me-xl-0">
                    <a className="nav-link dropdown-toggle hide-arrow btn btn-icon btn-text-secondary rounded-pill" id="nav-theme" href="javascript:void(0);" data-bs-toggle="dropdown">
                      <i className="icon-base ri ri-sun-line icon-22px theme-icon-active"></i>
                    </a>
                    <ul className="dropdown-menu dropdown-menu-end">
                      <li>
                        <button type="button" className="dropdown-item align-items-center active" data-bs-theme-value="light">
                          <span><i className="icon-base ri ri-sun-line icon-md me-3"></i>Light</span>
                        </button>
                      </li>
                      <li>
                        <button type="button" className="dropdown-item align-items-center" data-bs-theme-value="dark">
                          <span><i className="icon-base ri ri-moon-clear-line icon-md me-3"></i>Dark</span>
                        </button>
                      </li>
                      <li>
                        <button type="button" className="dropdown-item align-items-center" data-bs-theme-value="system">
                          <span><i className="icon-base ri ri-computer-line icon-md me-3"></i>System</span>
                        </button>
                      </li>
                    </ul>
                  </li>
                  <li className="nav-item d-flex align-items-center">
                    <Logo width={50} src="https://visora-dev-assets-id.assetsvsiddev.workers.dev/small-favicon/favicon-small.png" />
                  </li>
                </ul>
              </div>
            </nav>

            <div className="content-wrapper">
              <div className="container-xxl flex-grow-1 container-p-y">
                <div className="text-center mb-6">
                  <h6 className="d-flex justify-content-center align-items-center mb-3">
                    <img src="https://api.vreden.my.id/assets/img/front-pages/icons/section-title-icon.png" alt="section title icon" className="me-2" height="19" />
                    <span className="text-uppercase text-muted">Daftar Plan & Fitur Layanan</span>
                  </h6>
                  <h4 className="mb-2">Pilih Plan yang <span className="text-primary">Sesuai</span></h4>
                  <p className="text-muted">Dari pemula hingga enterprise, temukan plan yang cocok untuk kebutuhanmu</p>
                </div>

                <div className="alert alert-warning d-flex align-items-start mb-6" role="alert">
                  <i className="ri ri-shield-check-line me-3 ri-24px"></i>
                  <div>
                    <h6 className="alert-heading mb-1">Catatan Penting</h6>
                    <ul className="mb-0 ps-3">
                      <li>Saat ini semua plan masih <strong>GRATIS</strong> (early access)</li>
                      <li>Kecuali <strong className="text-danger">Aurora Prime 8K</strong> - masih tahap training & uji coba</li>
                      <li>Penggunaan Aurora Prime 8K dikenakan biaya khusus</li>
                    </ul>
                  </div>
                </div>

                <div className="row g-6 mb-6">
                  {plans.map((plan) => {
                    const paymentId = generatePaymentId();
                    return (
                      <div key={plan.id} className={`col-xl-4 col-lg-6 ${plan.popular ? 'order-lg-2' : ''}`}>
                        <div className={`card h-100 ${plan.popular ? 'border-primary border-2 shadow-lg' : ''}`}>
                          {plan.badge && (
                            <div className="position-absolute top-0 start-50 translate-middle">
                              <span className={`badge bg-${plan.color} rounded-pill px-3 py-2`}>{plan.badge}</span>
                            </div>
                          )}
                          <div className="card-header border-0 pt-5">
                            <div className="d-flex align-items-center mb-3">
                              <div className={`avatar avatar-sm me-3`}>
                                <span className={`avatar-initial bg-label-${plan.color} rounded`}>
                                  <i className={`ri ${plan.icon} ri-24px`}></i>
                                </span>
                              </div>
                              <h5 className="mb-0">{plan.name}</h5>
                            </div>
                            <div className="d-flex align-items-baseline mb-2">
                              <sup className="h5 mt-4 text-muted">$</sup>
                              <span className="display-5 fw-bold">{plan.price}</span>
                              <sub className="text-muted ms-1">{plan.period}</sub>
                            </div>
                            <p className="text-muted small mb-0">± {plan.priceIDR} {plan.period !== "Gratis (masa awal)" ? "/ bulan" : ""}</p>
                          </div>
                          <div className="card-body">
                            <p className="text-muted mb-4">{plan.description}</p>
                            
                            <ul className="list-unstyled mb-4">
                              {plan.features.map((feature, idx) => (
                                <li key={idx} className="d-flex align-items-center mb-2">
                                  <i className={`ri ri-checkbox-circle-fill text-${plan.color} me-2`}></i>
                                  <span className="small">{feature}</span>
                                </li>
                              ))}
                            </ul>

                            {plan.serverSpecs && (
                              <div className="bg-lighter rounded p-3 mb-4">
                                <h6 className="small text-uppercase text-muted mb-3">Spesifikasi Server</h6>
                                <div className="row g-2 small">
                                  <div className="col-6 d-flex align-items-center">
                                    <i className="ri ri-global-line text-muted me-2"></i>
                                    <span>{plan.serverSpecs.os}</span>
                                  </div>
                                  <div className="col-6 d-flex align-items-center">
                                    <i className="ri ri-cpu-line text-muted me-2"></i>
                                    <span>RAM {plan.serverSpecs.ram}</span>
                                  </div>
                                  <div className="col-6 d-flex align-items-center">
                                    <i className="ri ri-database-2-line text-muted me-2"></i>
                                    <span>Mem {plan.serverSpecs.memory}</span>
                                  </div>
                                  <div className="col-6 d-flex align-items-center">
                                    <i className="ri ri-server-line text-muted me-2"></i>
                                    <span>{plan.serverSpecs.server}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="mb-4">
                              <h6 className="small text-uppercase text-muted mb-2">Model Terbuka</h6>
                              <div className="d-flex flex-wrap gap-1">
                                {plan.models.map((model, idx) => (
                                  <span 
                                    key={idx} 
                                    className={`badge rounded-pill ${
                                      model.includes("Prime 8K")
                                        ? "bg-label-danger"
                                        : model.includes("Ultimate")
                                        ? "bg-label-danger"
                                        : model.includes("Business")
                                        ? "bg-label-success"
                                        : model.includes("Pro")
                                        ? "bg-label-primary"
                                        : model.includes("Core")
                                        ? "bg-label-info"
                                        : "bg-label-secondary"
                                    }`}
                                  >
                                    {model}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {plan.serverPath && (
                              <div className="bg-lighter rounded p-2 mb-4">
                                <code className="small text-muted">{plan.serverPath}</code>
                              </div>
                            )}

                            <Link
                              href={`/payment-gateway/v1/${plan.id}/${paymentId}`}
                              className={`btn w-100 ${plan.popular ? `btn-${plan.color}` : `btn-outline-${plan.color}`}`}
                            >
                              {plan.price === "0" ? "Mulai Gratis" : "Pilih Plan"}
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-center">
                  <p className="text-muted mb-3">Butuh bantuan memilih plan yang tepat?</p>
                  <a href="https://wa.me/6285643115199" target="_blank" className="btn btn-outline-success">
                    <i className="ri ri-whatsapp-line me-2"></i>
                    Hubungi Kami
                  </a>
                </div>
              </div>

              <footer className="content-footer footer bg-footer-theme">
                <div className="container-xxl">
                  <div className="footer-container d-flex align-items-center justify-content-between py-4 flex-md-row flex-column">
                    <div className="text-body">
                      © {new Date().getFullYear()} • Build on{" "}
                      <a href="/" className="footer-link">Vallzx APIs</a>
                    </div>
                  </div>
                </div>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
