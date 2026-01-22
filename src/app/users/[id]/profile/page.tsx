"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Script from "next/script";
import { supabaseClient } from "@/lib/supabase-client";
import { Logo } from "@/components/Logo";
import type { User } from "@supabase/supabase-js";

const mapContainerStyle = {
  width: "100%",
  height: "300px",
  borderRadius: "16px",
};

const defaultCenter = {
  lat: -6.2088,
  lng: 106.8456,
};

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  credits?: number;
  tokens?: number;
  subscription_plan: string;
  provider: string;
  created_at: string;
  is_verification: boolean;
  user_number: number;
}

const DEFAULT_TOKENS = 1000000;

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState("");
  const [previewPfp, setPreviewPfp] = useState("");
  const [uploadingPfp, setUploadingPfp] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
    const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null);
      const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
      const mapRef = useRef<any>(null);
      const markerRef = useRef<any>(null);

      useEffect(() => {
        if (!isOwner || !navigator.geolocation) return;

        const watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const newPos = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            };
            setPosition(newPos);
          },
          (err) => console.error("Geolocation error:", err),
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 1000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
      }, [isOwner]);

      useEffect(() => {
        if (!position || !isOwner) return;

        const initMap = () => {
          if (!(window as any).L) return;
          const L = (window as any).L;

          if (!mapRef.current) {
            mapRef.current = L.map('osm-map').setView([position.lat, position.lng], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; OpenStreetMap contributors'
            }).addTo(mapRef.current);
            
            markerRef.current = L.marker([position.lat, position.lng]).addTo(mapRef.current);
          } else {
            mapRef.current.panTo([position.lat, position.lng]);
            markerRef.current.setLatLng([position.lat, position.lng]);
          }
        };

        if ((window as any).L) {
          initMap();
        }
      }, [position, isOwner]);


  useEffect(() => {
    const html = document.documentElement;
    html.className = "layout-navbar-fixed layout-menu-fixed layout-compact";
    html.setAttribute("data-template", "vertical-menu-template");
    html.setAttribute("data-assets-path", "https://api.vreden.my.id/assets/");

    return () => {
      html.className = "layout-navbar-fixed layout-wide";
      html.setAttribute("data-template", "front-pages");
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      setCurrentUser(user);

      let profileQuery = supabaseClient.from("profiles").select("*");
      
      if (!isNaN(Number(userId))) {
        profileQuery = profileQuery.eq("user_number", Number(userId));
      } else {
        profileQuery = profileQuery.eq("id", userId);
      }

      const { data: profileData, error } = await profileQuery.single();

      if (error || !profileData) {
        router.replace("/404");
        return;
      }

      setProfile(profileData);
      setEditName(profileData.full_name || "Guest User");
      setPreviewPfp(profileData.avatar_url || `https://ui-avatars.com/api/?name=${profileData.full_name || 'User'}&background=161B22&color=58A6FF`);

      if (user && user.id === profileData.id) {
        setIsOwner(true);
      }

      const { count: followersCountData } = await supabaseClient
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profileData.id);
      setFollowersCount(followersCountData || 0);

      const { count: followingCountData } = await supabaseClient
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profileData.id);
      setFollowingCount(followingCountData || 0);

      if (user && user.id !== profileData.id) {
        const { data: followData } = await supabaseClient
          .from("followers")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", profileData.id)
          .single();
        setIsFollowing(!!followData);
      }

      setLoading(false);
    };

    fetchData();
  }, [userId, router]);

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    router.replace("/");
  };

  const handleFollow = async () => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }

    if (!profile) return;
    
    setFollowLoading(true);

    if (isFollowing) {
      await supabaseClient
        .from("followers")
        .delete()
        .eq("follower_id", currentUser.id)
        .eq("following_id", profile.id);
      setIsFollowing(false);
      setFollowersCount((prev) => prev - 1);
    } else {
      await supabaseClient
        .from("followers")
        .insert({
          follower_id: currentUser.id,
          following_id: profile.id,
        });
      setIsFollowing(true);
      setFollowersCount((prev) => prev + 1);
    }

    setFollowLoading(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && profile) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewPfp(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadProfilePicture = async (): Promise<string | null> => {
    if (!selectedFile || !profile) return null;

    setUploadingPfp(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("userId", profile.id);

      const response = await fetch("/api/upload/profile-picture", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    } finally {
      setUploadingPfp(false);
    }
  };

  const saveProfile = async () => {
    if (!editName.trim()) {
      alert("Silakan masukkan nama yang valid.");
      return;
    }

    if (!profile) return;

    let avatarUrl = previewPfp;

    if (selectedFile) {
      const uploadedUrl = await uploadProfilePicture();
      if (uploadedUrl) {
        avatarUrl = uploadedUrl;
      }
    }

    const { error } = await supabaseClient
      .from("profiles")
      .update({
        full_name: editName.trim(),
        avatar_url: avatarUrl,
      })
      .eq("id", profile.id);

    if (error) {
      alert("Gagal menyimpan profil");
      return;
    }

    alert("Profil diperbarui!");
    setShowSettings(false);
    setSelectedFile(null);
    setProfile({ ...profile, full_name: editName.trim(), avatar_url: avatarUrl });
    setPreviewPfp(avatarUrl);
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toLocaleString("id-ID");
  };

  const getAvatarUrl = () => {
    if (profile?.avatar_url) return profile.avatar_url;
    return `https://ui-avatars.com/api/?name=${profile?.full_name || "User"}&background=161B22&color=58A6FF`;
  };

  const tokens = profile?.credits ?? profile?.tokens ?? DEFAULT_TOKENS;
  const isPremium = profile?.subscription_plan !== "free";
  const tokenPercentage = profile ? Math.min((tokens / DEFAULT_TOKENS) * 100, 100) : 0;

  if (loading) {
    return (
      <>
        <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/fonts/iconify-icons.css" />
        <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/css/core.css" />
        <link rel="stylesheet" href="https://api.vreden.my.id/assets/css/demo.css" />
        <style>{`
          :root {
            --main-color: #4361EE;
          }
          .loader-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
            .spinner {
              position: relative;
              margin: 0 auto;
              width: 70px;
            }
          .spinner:before {
            content: "";
            display: block;
            padding-top: 100%;
          }
          .circular {
            animation: rotate 2s linear infinite;
            height: 100%;
            transform-origin: center center;
            width: 100%;
            position: absolute;
            inset: 0;
            margin: auto;
          }
            .path {
              stroke: var(--main-color);
              stroke-dasharray: 1, 200;
              stroke-dashoffset: 0;
              animation: dash 1.5s ease-in-out infinite;
              stroke-linecap: round; 
            }
          @keyframes rotate {
            100% {
              transform: rotate(360deg);
            }
          }
          @keyframes dash {
            0% {
              stroke-dasharray: 1, 200;
              stroke-dashoffset: 0;
            }
            50% {
              stroke-dasharray: 89, 200;
              stroke-dashoffset: -35px;
            }
            100% {
              stroke-dasharray: 89, 200;
              stroke-dashoffset: -124px;
            }
          }
        `}</style>
        <div className="loader-container bg-body">
          <div className="spinner">
            <svg className="circular" viewBox="25 25 50 50">
              <circle
                className="path"
                cx="50"
                cy="50"
                r="20"
                fill="none"
                strokeWidth="6" 
              />
            </svg>
          </div>
        </div>
      </>
    );
  }

  if (!profile) return null;

  return (
    <>
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/fonts/iconify-icons.css" />
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/libs/node-waves/node-waves.css" />
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/libs/pickr/pickr-themes.css" />
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/css/core.css" />
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/css/demo.css" />
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/libs/perfect-scrollbar/perfect-scrollbar.css" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossOrigin="" />

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
      <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossOrigin="" strategy="afterInteractive" />
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

      <style jsx global>{`
        .profile-avatar-lg {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          object-fit: cover;
          border: 4px solid var(--bs-primary);
        }
        .profile-avatar-edit {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid var(--bs-primary);
          cursor: pointer;
        }
        .avatar-edit-container {
          position: relative;
          display: inline-block;
        }
        .avatar-edit-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
          cursor: pointer;
        }
        .avatar-edit-container:hover .avatar-edit-overlay {
          opacity: 1;
        }
        .stat-card {
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
        .profile-center-card {
          max-width: 600px;
          margin: 0 auto;
        }
        .profile-header-layout {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .profile-info-text {
          text-align: left;
        }
        .profile-info-text h4 {
          margin-bottom: 4px;
        }
        .profile-info-text p {
          margin-bottom: 2px;
        }
        @media (max-width: 576px) {
          .profile-header-layout {
            flex-direction: column;
            text-align: center;
          }
          .profile-info-text {
            text-align: center;
          }
        }
        .verified-badge {
          color: #1DA1F2;
          font-size: 18px;
        }
          .follow-stats {
            display: flex;
            gap: 16px;
            margin-top: 8px;
            flex-wrap: wrap;
            justify-content: flex-start;
          }
          .follow-stat {
            display: flex;
            gap: 4px;
            align-items: center;
          }
          .follow-stat-count {
            font-weight: 600;
          }
          .follow-stat-label {
            color: var(--bs-secondary-color);
          }
          @media (max-width: 576px) {
            .follow-stats {
              justify-content: center;
            }
          }
      `}</style>

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
              <li className="menu-item active">
                <a href="/users/profile" className="menu-link">
                  <i className="menu-icon tf-icons ri ri-user-line"></i>
                  <div>Profil</div>
                </a>
              </li>
              <li className="menu-item">
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
                <div className="row justify-content-center">
                  <div className="col-12 col-md-10 col-lg-8">
                    <div className="card mb-6 profile-center-card">
                      <div className="card-body pt-6">
                        <div className="profile-header-layout">
                          <img
                            src={getAvatarUrl()}
                            alt="Avatar"
                            className="profile-avatar-lg"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${profile?.full_name || "User"}&background=161B22&color=58A6FF`;
                            }}
                          />
                          <div className="profile-info-text">
                            <h4 className="mb-1 d-flex align-items-center gap-2">
                              {profile.full_name || "Guest User"}
{profile.is_verification && (
                                  <img
                                    src="https://cdn-icons-png.freepik.com/256/18984/18984328.png?semt=ais_white_label"
                                    alt="Verified"
                                    width="20"
                                    height="20"
                                    style={{ objectFit: "contain" }}
                                  />
                                )}
                            </h4>
                            <p className="text-muted mb-1">@user{profile.user_number}</p>
                            {isOwner && <p className="text-muted small mb-2">{profile.email}</p>}
                            
                            <div className="follow-stats">
                              <div className="follow-stat">
                                <span className="follow-stat-count">{followersCount}</span>
                                <span className="follow-stat-label">Pengikut</span>
                              </div>
                              <div className="follow-stat">
                                <span className="follow-stat-count">{followingCount}</span>
                                <span className="follow-stat-label">Mengikuti</span>
                              </div>
                            </div>

                            <div className="mt-3">
                              {isOwner ? (
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => setShowSettings(true)}
                                >
                                  <i className="ri ri-settings-3-line me-2"></i>
                                  Edit Profil
                                </button>
                              ) : (
                                <button
                                  className={`btn btn-sm ${isFollowing ? "btn-outline-danger" : "btn-primary"}`}
                                  onClick={handleFollow}
                                  disabled={followLoading}
                                >
                                  {followLoading ? (
                                    <span className="spinner-border spinner-border-sm"></span>
                                  ) : isFollowing ? (
                                    <>
                                      <i className="ri ri-user-unfollow-line me-2"></i>
                                      Batal Ikuti
                                    </>
                                  ) : (
                                    <>
                                      <i className="ri ri-user-add-line me-2"></i>
                                      Ikuti
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {isOwner && (
                  <>
                    <div className="row g-6">
                      <div className="col-md-6 col-lg-3">
                        <div className="card stat-card h-100">
                          <div className="card-body">
                            <div className="d-flex align-items-center">
                              <div className="avatar">
                                <div className="avatar-initial bg-label-primary rounded shadow-xs">
                                  <i className="ri ri-coin-line ri-24px"></i>
                                </div>
                              </div>
                              <div className="ms-3">
                                <p className="mb-0 text-muted small">Token Tersedia</p>
                                <h5 className="mb-0">{formatTokens(tokens)}</h5>
                              </div>
                            </div>
                            <div className="mt-3">
                              <div className="progress" style={{ height: "6px" }}>
                                <div
                                  className="progress-bar bg-primary"
                                  style={{ width: `${tokenPercentage}%` }}
                                ></div>
                              </div>
                              <small className="text-muted">
                                {tokenPercentage.toFixed(0)}% dari {formatTokens(DEFAULT_TOKENS)}
                              </small>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-6 col-lg-3">
                        <div className="card stat-card h-100">
                          <div className="card-body">
                            <div className="d-flex align-items-center">
                              <div className="avatar">
                                <div className="avatar-initial bg-label-info rounded shadow-xs">
                                  <i className="ri ri-vip-crown-line ri-24px"></i>
                                </div>
                              </div>
                              <div className="ms-3">
                                <p className="mb-0 text-muted small">Plan Aktif</p>
                                <h5 className="mb-0 text-capitalize">{profile.subscription_plan || "Free"}</h5>
                              </div>
                            </div>
                            <a href="/plan" className="btn btn-sm btn-outline-primary mt-3 w-100">
                              <i className="ri ri-arrow-up-circle-line me-1"></i>Upgrade
                            </a>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-6 col-lg-3">
                        <div className="card stat-card h-100">
                          <div className="card-body">
                            <div className="d-flex align-items-center">
                              <div className="avatar">
                                <div className="avatar-initial bg-label-success rounded shadow-xs">
                                  <i className="ri ri-calendar-check-line ri-24px"></i>
                                </div>
                              </div>
                              <div className="ms-3">
                                <p className="mb-0 text-muted small">Bergabung Sejak</p>
                                <h6 className="mb-0">
                                  {new Date(profile.created_at).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </h6>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-6 col-lg-3">
                        <div className="card stat-card h-100">
                          <div className="card-body">
                            <div className="d-flex align-items-center">
                              <div className="avatar">
                                <div className="avatar-initial bg-label-warning rounded shadow-xs">
                                  <i className="ri ri-shield-check-line ri-24px"></i>
                                </div>
                              </div>
                              <div className="ms-3">
                                <p className="mb-0 text-muted small">Provider</p>
                                <h6 className="mb-0 text-capitalize">{profile.provider || "Email"}</h6>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                      <div className="row mt-6">
                        <div className="col-12">
                          <div className="card">
                            <div className="card-header d-flex align-items-center justify-content-between">
                              <h5 className="card-title m-0">Lokasi Real-Time</h5>
                              <span className="badge bg-label-success rounded-pill">Owner Only</span>
                            </div>
                              <div className="card-body">
                                <div 
                                  id="osm-map" 
                                  style={{ 
                                    width: "100%", 
                                    height: "300px", 
                                    borderRadius: "16px",
                                    zIndex: 1
                                  }} 
                                />
                                {!position && (
                                  <div className="d-flex align-items-center justify-content-center" style={{ height: "300px", background: "rgba(0,0,0,0.05)", borderRadius: "16px", marginTop: "-300px", position: "relative", zIndex: 2 }}>
                                    <div className="text-center">
                                      <div className="spinner-border text-primary mb-2" role="status"></div>
                                      <p className="mb-0 text-muted">Memuat Peta...</p>
                                    </div>
                                  </div>
                                )}
                                <p className="text-muted small mt-3 mb-0">
                                  <i className="ri-information-line me-1"></i>
                                  Lokasi Anda dipantau secara real-time untuk keperluan keamanan akun.
                                </p>
                              </div>

                          </div>
                        </div>
                      </div>

                      <div className="row mt-6">
                      <div className="col-12">
                        <div className="card">
                          <div className="card-header d-flex align-items-center justify-content-between">
                            <h5 className="card-title m-0">Menu Cepat</h5>
                          </div>
                          <div className="card-body">
                            <div className="row g-4">
                              <div className="col-6 col-md-3">
                                <a href="/dashboard" className="card bg-label-primary text-center p-4 text-decoration-none h-100 d-flex flex-column align-items-center justify-content-center">
                                  <i className="ri ri-dashboard-line ri-36px mb-2"></i>
                                  <span className="fw-medium">Dashboard</span>
                                </a>
                              </div>
                              <div className="col-6 col-md-3">
                                <a href="/plan" className="card bg-label-info text-center p-4 text-decoration-none h-100 d-flex flex-column align-items-center justify-content-center">
                                  <i className="ri ri-vip-crown-line ri-36px mb-2"></i>
                                  <span className="fw-medium">Upgrade Plan</span>
                                </a>
                              </div>
                              <div className="col-6 col-md-3">
                                <a href="/" className="card bg-label-success text-center p-4 text-decoration-none h-100 d-flex flex-column align-items-center justify-content-center">
                                  <i className="ri ri-home-line ri-36px mb-2"></i>
                                  <span className="fw-medium">Beranda</span>
                                </a>
                              </div>
                              <div className="col-6 col-md-3">
                                <a
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleLogout();
                                  }}
                                  className="card bg-label-danger text-center p-4 text-decoration-none h-100 d-flex flex-column align-items-center justify-content-center"
                                >
                                  <i className="ri ri-logout-box-line ri-36px mb-2"></i>
                                  <span className="fw-medium">Keluar</span>
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {!isOwner && (
                  <div className="row g-6">
                    <div className="col-md-6">
                      <div className="card stat-card h-100">
                        <div className="card-body">
                          <div className="d-flex align-items-center">
                            <div className="avatar">
                              <div className="avatar-initial bg-label-success rounded shadow-xs">
                                <i className="ri ri-calendar-check-line ri-24px"></i>
                              </div>
                            </div>
                            <div className="ms-3">
                              <p className="mb-0 text-muted small">Bergabung Sejak</p>
                              <h6 className="mb-0">
                                {new Date(profile.created_at).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </h6>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="card stat-card h-100">
                        <div className="card-body">
                          <div className="d-flex align-items-center">
                            <div className="avatar">
                              <div className="avatar-initial bg-label-warning rounded shadow-xs">
                                <i className="ri ri-shield-check-line ri-24px"></i>
                              </div>
                            </div>
                            <div className="ms-3">
                              <p className="mb-0 text-muted small">Provider</p>
                              <h6 className="mb-0 text-capitalize">{profile.provider || "Email"}</h6>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <footer className="content-footer footer bg-footer-theme">
                <div className="container-xxl">
                  <div className="footer-container d-flex align-items-center justify-content-between py-4 flex-md-row flex-column">
                    <div className="text-body">
                      © {new Date().getFullYear()} • Build on{" "}
                      <a href="/" className="footer-link">
                        Vallzx APIs
                      </a>
                    </div>
                  </div>
                </div>
              </footer>
            </div>
          </div>
        </div>
      </div>

      {showSettings && isOwner && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSettings(false);
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Pengaturan Profil</h5>
                <button type="button" className="btn-close" onClick={() => setShowSettings(false)}></button>
              </div>
              <div className="modal-body text-center">
                <div
                  className="avatar-edit-container mb-4"
                  onClick={() => fileInputRef?.click()}
                >
                  <img
                    src={previewPfp}
                    alt="Preview"
                    className="profile-avatar-edit"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${profile?.full_name || "User"}&background=161B22&color=58A6FF`;
                    }}
                  />
                  <div className="avatar-edit-overlay">
                    <i className="ri ri-camera-line ri-24px text-white"></i>
                  </div>
                </div>
                <input
                  type="file"
                  ref={(el) => setFileInputRef(el)}
                  hidden
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <p className="text-muted small mb-4">Klik gambar untuk mengubah foto profil</p>

                <div className="mb-4 text-start">
                  <label className="form-label">Nama Lengkap</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Masukkan nama"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>

                <button className="btn btn-primary w-100 mb-3" onClick={saveProfile} disabled={uploadingPfp}>
                  {uploadingPfp ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <i className="ri ri-save-line me-2"></i>
                      Simpan Perubahan
                    </>
                  )}
                </button>

                <hr />

                <button
                  className="btn btn-outline-danger w-100"
                  onClick={async () => {
                    await supabaseClient.auth.signOut();
                    router.replace("/");
                  }}
                >
                  <i className="ri ri-delete-bin-line me-2"></i>
                  Hapus Akun
                </button>

                <p className="text-muted small mt-3">
                  Butuh bantuan?{" "}
                  <a href="https://wa.me/6289531606677" target="_blank">
                    Hubungi Support
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLoginModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLoginModal(false);
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Login Diperlukan</h5>
                <button type="button" className="btn-close" onClick={() => setShowLoginModal(false)}></button>
              </div>
              <div className="modal-body text-center">
                <i className="ri ri-user-line ri-64px text-primary mb-4"></i>
                <p className="mb-4">Anda perlu login terlebih dahulu untuk mengikuti pengguna ini.</p>
                <div className="d-flex gap-2 justify-content-center">
                  <a href="/login" className="btn btn-primary">
                    <i className="ri ri-login-box-line me-2"></i>
                    Login
                  </a>
                  <a href="/register" className="btn btn-outline-primary">
                    <i className="ri ri-user-add-line me-2"></i>
                    Daftar
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
