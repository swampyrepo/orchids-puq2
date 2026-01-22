"use client";

import { useEffect, useState, useRef } from "react";
import { supabaseClient } from "@/lib/supabase-client";

declare global {
  interface Window {
    ApexCharts: any;
  }
}

interface ServerStats {
  success: boolean;
  statistics: {
    total_requests: number;
    total_visitors: number;
    total_success: number;
    total_errors: number;
    today_requests: number;
  };
  weekly: {
    daily: Record<string, number>;
    total: number;
  };
  top_apis: { name: string; count: number }[];
  server: {
    status: string;
    uptime_seconds: number;
    uptime_formatted: string;
    os: string;
    architecture: string;
    platform: string;
    hostname: string;
    cpu: {
      model: string;
      cores: number;
      usage_percent: string;
    };
    memory: {
      total_bytes: number;
      total_formatted: string;
      used_bytes: number;
      used_formatted: string;
      free_bytes: number;
      free_formatted: string;
      usage_percent: string;
    };
    storage: {
      total: string;
      used: string;
      free: string;
      usage_percent: string;
    };
  };
  timestamp: string;
}

export default function ServerMonitorPage() {
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [realtimeStatus, setRealtimeStatus] = useState<"connected" | "disconnected">("disconnected");
  const [selectedApi, setSelectedApi] = useState<{ name: string; count: number } | null>(null);
  const weeklyChartRef = useRef<any>(null);
  const apiChartRef = useRef<any>(null);
  const topApisChartRef = useRef<any>(null);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/server-monitor");
      const data = await response.json();
      if (data.success) {
        setStats(data);
        setLastUpdate(new Date());
        updateCharts(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateCharts = (data: ServerStats) => {
    if (typeof window === "undefined" || !window.ApexCharts) return;

    const weeklyLabels = Object.keys(data.weekly.daily).map(date => {
      const d = new Date(date);
      return d.toLocaleDateString('id-ID', { weekday: 'short' });
    });
    const weeklyData = Object.values(data.weekly.daily);

    if (weeklyChartRef.current) {
      weeklyChartRef.current.updateOptions({
        xaxis: { categories: weeklyLabels },
        series: [{ name: 'Requests', data: weeklyData }]
      });
    } else {
      const weeklyEl = document.querySelector("#weeklyChart");
      if (weeklyEl) {
        weeklyChartRef.current = new window.ApexCharts(weeklyEl, {
          chart: {
            type: 'area',
            height: 300,
            toolbar: { show: false },
            sparkline: { enabled: false },
            animations: {
              enabled: true,
              easing: 'easeinout',
              speed: 800,
              animateGradually: { enabled: true, delay: 150 },
              dynamicAnimation: { enabled: true, speed: 350 }
            },
            dropShadow: {
              enabled: true,
              top: 3,
              left: 2,
              blur: 4,
              opacity: 0.2,
              color: '#4361EE'
            }
          },
          series: [{ name: 'Requests', data: weeklyData }],
          xaxis: {
            categories: weeklyLabels,
            labels: { style: { colors: '#64748b', fontSize: '12px', fontWeight: 500 } },
            axisBorder: { show: false },
            axisTicks: { show: false },
          },
          yaxis: {
            labels: { 
              style: { colors: '#64748b', fontSize: '12px' },
              formatter: (val: number) => Math.round(val).toLocaleString()
            },
          },
          fill: {
            type: 'gradient',
            gradient: {
              shadeIntensity: 1,
              opacityFrom: 0.6,
              opacityTo: 0.1,
              stops: [0, 90, 100],
              colorStops: [
                { offset: 0, color: '#4361EE', opacity: 0.5 },
                { offset: 50, color: '#1D92F1', opacity: 0.3 },
                { offset: 100, color: '#4361EE', opacity: 0.05 },
              ],
            },
          },
          stroke: {
            curve: 'smooth',
            width: 3,
            colors: ['#4361EE'],
          },
          markers: {
            size: 4,
            colors: ['#4361EE'],
            strokeColors: '#fff',
            strokeWidth: 2,
            hover: { size: 6 }
          },
          dataLabels: { enabled: false },
          grid: {
            borderColor: 'rgba(148, 163, 184, 0.1)',
            strokeDashArray: 4,
            padding: { left: 10, right: 10 }
          },
          tooltip: {
            theme: 'light',
            y: { formatter: (val: number) => val.toLocaleString() + ' requests' },
            marker: { show: true }
          },
        });
        weeklyChartRef.current.render();
      }
    }

    const apiLabels = data.top_apis.slice(0, 6).map(a => a.name);
    const apiData = data.top_apis.slice(0, 6).map(a => a.count);

if (apiChartRef.current) {
        apiChartRef.current.updateOptions({
          labels: apiLabels,
          series: apiData,
        });
      } else {
        const apiEl = document.querySelector("#apiChart");
        if (apiEl) {
          apiChartRef.current = new window.ApexCharts(apiEl, {
            chart: {
              type: 'donut',
              height: 300,
              animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 800,
              },
              dropShadow: {
                enabled: true,
                top: 0,
                left: 0,
                blur: 10,
                opacity: 0.15,
                color: '#4361EE'
              }
            },
            series: apiData,
            labels: apiLabels,
            colors: ['#4361EE', '#1D92F1', '#12AE6F', '#f59e0b', '#ef4444', '#ec4899'],
            legend: {
              position: 'bottom',
              labels: { colors: '#64748b' },
              fontFamily: 'inherit'
            },
            dataLabels: {
              enabled: true,
              formatter: (val: number) => val.toFixed(1) + '%',
              style: { fontSize: '12px', fontWeight: 600 }
            },
            plotOptions: {
              pie: {
                donut: {
                  size: '65%',
                  labels: {
                    show: true,
                    total: {
                      show: true,
                      label: 'Total',
                      color: '#64748b',
                      fontFamily: 'inherit',
                      formatter: () => data.weekly.total.toLocaleString(),
                    },
                    value: {
                      color: '#1e293b',
                      fontWeight: 700,
                      fontSize: '24px'
                    }
                  },
                },
              },
            },
            stroke: {
              width: 0
            },
            tooltip: { 
              theme: 'light',
              y: { formatter: (val: number) => val.toLocaleString() + ' requests' }
            },
          });
          apiChartRef.current.render();
        }
      }

      const topApisLabels = data.top_apis.slice(0, 6).map(a => a.name);
      const topApisData = data.top_apis.slice(0, 6).map(a => a.count);

      if (topApisChartRef.current) {
        topApisChartRef.current.updateOptions({
          xaxis: { categories: topApisLabels },
          series: [{ name: 'Usage', data: topApisData }]
        });
      } else {
        const topApisEl = document.querySelector("#topApisChart");
        if (topApisEl) {
          topApisChartRef.current = new window.ApexCharts(topApisEl, {
            chart: {
              type: 'bar',
              height: 320,
              toolbar: { show: false },
              animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 800,
              },
              events: {
                dataPointSelection: function(event: any, chartContext: any, config: any) {
                  const selectedIndex = config.dataPointIndex;
                  const apiName = topApisLabels[selectedIndex];
                  const apiCount = topApisData[selectedIndex];
                  const tooltip = document.getElementById('api-usage-tooltip');
                  if (tooltip) {
                    tooltip.textContent = `Used: ${apiCount.toLocaleString()}x`;
                    tooltip.style.display = 'block';
                    tooltip.style.opacity = '1';
                    setTimeout(() => {
                      tooltip.style.opacity = '0';
                      setTimeout(() => { tooltip.style.display = 'none'; }, 300);
                    }, 2000);
                  }
                }
              }
            },
            series: [{ name: 'Usage', data: topApisData }],
            xaxis: {
              categories: topApisLabels,
              labels: { 
                style: { colors: '#64748b', fontSize: '11px', fontWeight: 500 },
              },
              axisBorder: { show: false },
              axisTicks: { show: false },
            },
            yaxis: {
              labels: { 
                style: { colors: '#64748b', fontSize: '11px' },
                formatter: (val: number) => Math.round(val).toLocaleString()
              },
            },
            plotOptions: {
              bar: {
                horizontal: true,
                borderRadius: 6,
                barHeight: '60%',
                distributed: true,
                dataLabels: {
                  position: 'center'
                }
              }
            },
            colors: ['#4361EE', '#1D92F1', '#12AE6F', '#f59e0b', '#ef4444', '#ec4899'],
            dataLabels: {
              enabled: true,
              formatter: (val: number) => val.toLocaleString(),
              style: { 
                fontSize: '11px', 
                fontWeight: 600,
                colors: ['#fff']
              },
              offsetX: 0
            },
            grid: {
              borderColor: 'rgba(148, 163, 184, 0.1)',
              strokeDashArray: 4,
              xaxis: { lines: { show: true } },
              yaxis: { lines: { show: false } },
            },
            legend: { show: false },
            tooltip: {
              theme: 'light',
              y: { formatter: (val: number) => `Used: ${val.toLocaleString()}x` }
            },
            states: {
              hover: {
                filter: { type: 'darken', value: 0.85 }
              },
              active: {
                filter: { type: 'darken', value: 0.75 }
              }
            }
          });
          topApisChartRef.current.render();
        }
      }
    };

  useEffect(() => {
    fetchStats();

    const interval = setInterval(fetchStats, 5000);

    const channel = supabaseClient
      .channel('server-monitor-stats')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'statistics',
          filter: 'id=eq.1'
        },
        () => {
          fetchStats();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
        }
      });

    return () => {
      clearInterval(interval);
      supabaseClient.removeChannel(channel);
if (weeklyChartRef.current) weeklyChartRef.current.destroy();
        if (apiChartRef.current) apiChartRef.current.destroy();
        if (topApisChartRef.current) topApisChartRef.current.destroy();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: '#f8fafc' }}>
        <div className="text-center">
          <div className="spinner-border mb-3" role="status" style={{ width: '3rem', height: '3rem', color: '#4361EE' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p style={{ color: '#64748b' }}>Loading server stats...</p>
        </div>
      </div>
    );
  }

  const memoryPercent = parseFloat(stats?.server.memory.usage_percent || "0");
  const successRate = stats ? ((stats.statistics.total_success / (stats.statistics.total_success + stats.statistics.total_errors)) * 100).toFixed(1) : "0";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .text-rainbow-flow {
          font-size: 2.5rem;
          font-weight: 900;
          background: linear-gradient(270deg, #12AE6F, #4361EE, #1D92F1);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: rainbowFlow 6s linear infinite;
        }

        @keyframes rainbowFlow {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }

        .monitor-hero {
          position: relative;
          padding: 80px 0 60px;
          overflow: hidden;
        }

        .monitor-card {
          background: #fff;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.15);
          transition: all 0.3s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .monitor-card:hover {
          border-color: rgba(67, 97, 238, 0.3);
          box-shadow: 0 20px 40px rgba(67, 97, 238, 0.1);
          transform: translateY(-4px);
        }

        .stat-card {
          position: relative;
          overflow: hidden;
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #4361EE, #1D92F1);
        }

        .stat-value {
          font-weight: 800;
          font-size: 2.25rem;
          color: #1e293b;
          line-height: 1.2;
        }

        .stat-label {
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 50px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .status-online {
          background: linear-gradient(135deg, rgba(18, 174, 111, 0.1), rgba(18, 174, 111, 0.05));
          color: #12AE6F;
          border: 1px solid rgba(18, 174, 111, 0.2);
        }

        .status-realtime {
          background: linear-gradient(135deg, rgba(67, 97, 238, 0.1), rgba(29, 146, 241, 0.05));
          color: #4361EE;
          border: 1px solid rgba(67, 97, 238, 0.2);
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }

        .feature-icon {
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          margin-bottom: 16px;
        }

        .icon-blue {
          background: linear-gradient(135deg, rgba(67, 97, 238, 0.15), rgba(29, 146, 241, 0.1));
        }

        .icon-green {
          background: linear-gradient(135deg, rgba(18, 174, 111, 0.15), rgba(18, 174, 111, 0.1));
        }

        .icon-red {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.1));
        }

        .icon-amber {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.1));
        }

        .server-spec-item {
          display: flex;
          align-items: center;
          padding: 14px 16px;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border-radius: 12px;
          margin-bottom: 10px;
          border: 1px solid rgba(148, 163, 184, 0.1);
        }

        .server-spec-icon {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(67, 97, 238, 0.15), rgba(29, 146, 241, 0.1));
          border-radius: 10px;
          margin-right: 14px;
        }

        .api-list-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 0;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        }

        .api-list-item:last-child {
          border-bottom: none;
        }

        .api-rank {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #4361EE, #1D92F1);
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #fff;
          margin-right: 12px;
        }

        .memory-gauge {
          position: relative;
          width: 180px;
          height: 180px;
          margin: 0 auto;
        }

        .memory-gauge-bg {
          fill: none;
          stroke: rgba(148, 163, 184, 0.15);
          stroke-width: 14;
        }

        .memory-gauge-fill {
          fill: none;
          stroke: url(#gaugeGradient);
          stroke-width: 14;
          stroke-linecap: round;
          transform: rotate(-90deg);
          transform-origin: center;
          transition: stroke-dasharray 0.8s ease;
        }

        .memory-value {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .section-title-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .btn-gradient {
          background: linear-gradient(90deg, #4361EE, #1D92F1);
          color: white;
          border: none;
          padding: 12px 28px;
          border-radius: 10px;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .btn-gradient:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(67, 97, 238, 0.3);
          color: white;
        }

        .fun-facts-section {
          background: linear-gradient(135deg, #4361EE 0%, #1D92F1 100%);
          padding: 60px 0;
          margin: 40px 0;
        }

        .fun-fact-item {
          text-align: center;
          color: white;
        }

        .fun-fact-icon {
          width: 70px;
          height: 70px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          backdrop-filter: blur(10px);
        }

        .fun-fact-value {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 4px;
        }

        .fun-fact-label {
          font-size: 0.9rem;
          opacity: 0.9;
        }
      `}} />

      <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
          <section className="py-5" style={{ paddingTop: '40px' }}>
          <div className="container">
            <div className="row g-4 mb-4">
              <div className="col-lg-3 col-md-6">
                <div className="monitor-card stat-card p-4 h-100">
                  <div className="feature-icon icon-blue">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4361EE" strokeWidth="2">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                    </svg>
                  </div>
                  <span className="stat-label">Total Requests</span>
                  <div className="stat-value">{stats?.statistics.total_requests.toLocaleString()}</div>
                </div>
              </div>
              <div className="col-lg-3 col-md-6">
                <div className="monitor-card stat-card p-4 h-100">
                  <div className="feature-icon icon-blue">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1D92F1" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <span className="stat-label">Total Visitors</span>
                  <div className="stat-value">{stats?.statistics.total_visitors.toLocaleString()}</div>
                </div>
              </div>
              <div className="col-lg-3 col-md-6">
                <div className="monitor-card stat-card p-4 h-100">
                  <div className="feature-icon icon-green">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#12AE6F" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <span className="stat-label">Success</span>
                  <div className="stat-value" style={{ color: '#12AE6F' }}>{stats?.statistics.total_success.toLocaleString()}</div>
                </div>
              </div>
              <div className="col-lg-3 col-md-6">
                <div className="monitor-card stat-card p-4 h-100">
                  <div className="feature-icon icon-red">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="15" y1="9" x2="9" y2="15"></line>
                      <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                  </div>
                  <span className="stat-label">Errors</span>
                  <div className="stat-value" style={{ color: '#ef4444' }}>{stats?.statistics.total_errors.toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="row g-4 mb-4">
              <div className="col-lg-8">
                <div className="monitor-card p-4 h-100">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                      <div className="section-title-icon justify-content-start">
                        <img src="https://api.vreden.my.id/assets/img/front-pages/icons/section-title-icon.png" alt="icon" height="16" />
                        <span className="text-uppercase small fw-semibold" style={{ color: '#1e293b' }}>Analytics</span>
                      </div>
                      <h5 className="mb-1 fw-bold">Weekly API Usage</h5>
                      <p className="mb-0 small" style={{ color: '#1e293b' }}>Total: {stats?.weekly.total.toLocaleString()} requests this week</p>
                    </div>
                    <span className="badge px-3 py-2" style={{ background: 'linear-gradient(135deg, rgba(67, 97, 238, 0.1), rgba(29, 146, 241, 0.05))', color: '#4361EE' }}>
                      Last 7 days
                    </span>
                  </div>
                  <div id="weeklyChart"></div>
                </div>
              </div>
              <div className="col-lg-4">
                <div className="monitor-card p-4 h-100">
                  <div className="section-title-icon justify-content-start mb-3">
                    <img src="https://api.vreden.my.id/assets/img/front-pages/icons/section-title-icon.png" alt="icon" height="16" />
                    <span className="text-uppercase small fw-semibold" style={{ color: '#1e293b' }}>Distribution</span>
                  </div>
                  <h5 className="mb-1 fw-bold">Top APIs</h5>
                  <p className="mb-3 small" style={{ color: '#1e293b' }}>Most used endpoints</p>
                  <div id="apiChart"></div>
                </div>
              </div>
            </div>

            <div className="row g-4 mb-4">
              <div className="col-lg-4">
                <div className="monitor-card p-4 h-100">
                  <div className="section-title-icon justify-content-start mb-3">
                    <img src="https://api.vreden.my.id/assets/img/front-pages/icons/section-title-icon.png" alt="icon" height="16" />
                    <span className="text-uppercase small fw-semibold" style={{ color: '#1e293b' }}>Hardware</span>
                  </div>
                  <h5 className="mb-4 fw-bold">Server Specifications</h5>
                  
                  <div className="server-spec-item">
                    <div className="server-spec-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4361EE" strokeWidth="2">
                        <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                        <rect x="9" y="9" width="6" height="6"></rect>
                      </svg>
                    </div>
                    <div className="flex-grow-1">
                      <div className="text-muted small">Operating System</div>
                      <div className="fw-semibold">Linux</div>
                    </div>
                  </div>
                  <div className="server-spec-item">
                    <div className="server-spec-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4361EE" strokeWidth="2">
                        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                        <polyline points="2 17 12 22 22 17"></polyline>
                        <polyline points="2 12 12 17 22 12"></polyline>
                      </svg>
                    </div>
                    <div className="flex-grow-1">
                      <div className="text-muted small">Architecture</div>
                      <div className="fw-semibold">x64</div>
                    </div>
                  </div>
                  <div className="server-spec-item">
                    <div className="server-spec-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4361EE" strokeWidth="2">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                      </svg>
                    </div>
                    <div className="flex-grow-1">
                      <div className="text-muted small">Storage (RAM)</div>
                      <div className="fw-semibold">17 TB</div>
                    </div>
                  </div>
                  <div className="server-spec-item">
                    <div className="server-spec-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4361EE" strokeWidth="2">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                      </svg>
                    </div>
                    <div className="flex-grow-1">
                      <div className="text-muted small">Memory</div>
                      <div className="fw-semibold">320 GB</div>
                    </div>
                  </div>
                  <div className="server-spec-item">
                    <div className="server-spec-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4361EE" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                    </div>
                    <div className="flex-grow-1">
                      <div className="text-muted small">Uptime</div>
                      <div className="fw-semibold">{stats?.server.uptime_formatted}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-4">
                <div className="monitor-card p-4 h-100">
                  <div className="section-title-icon justify-content-start mb-3">
                    <img src="https://api.vreden.my.id/assets/img/front-pages/icons/section-title-icon.png" alt="icon" height="16" />
                    <span className="text-uppercase small fw-semibold" style={{ color: '#1e293b' }}>Resources</span>
                  </div>
                  <h5 className="mb-4 fw-bold">Memory Usage</h5>
                  
                  <div className="memory-gauge mb-4">
                    <svg width="180" height="180" viewBox="0 0 200 200">
                      <defs>
                        <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#4361EE" />
                          <stop offset="100%" stopColor="#1D92F1" />
                        </linearGradient>
                      </defs>
                      <circle cx="100" cy="100" r="80" className="memory-gauge-bg" />
                      <circle 
                        cx="100" 
                        cy="100" 
                        r="80" 
                        className="memory-gauge-fill"
                        strokeDasharray={`${(memoryPercent / 100) * 502} 502`}
                      />
                    </svg>
                    <div className="memory-value">
                      <div className="fw-bold" style={{ fontSize: '1.5rem', color: '#1e293b' }}>
                        {stats?.server.memory.used_formatted}
                      </div>
                      <div className="text-muted small">/ 320 GB</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="badge px-4 py-2" style={{ background: 'linear-gradient(135deg, rgba(67, 97, 238, 0.1), rgba(29, 146, 241, 0.05))', color: '#4361EE', fontSize: '0.9rem', fontWeight: 600 }}>
                      {stats?.server.memory.usage_percent}% Used
                    </span>
                  </div>
                </div>
              </div>

<div className="col-lg-4">
                  <div className="monitor-card p-4 h-100" style={{ position: 'relative' }}>
                    <div id="api-usage-tooltip" style={{
                      display: 'none',
                      position: 'absolute',
                      top: '20px',
                      right: '20px',
                      background: 'linear-gradient(135deg, #4361EE, #1D92F1)',
                      color: 'white',
                      padding: '10px 20px',
                      borderRadius: '10px',
                      fontWeight: 600,
                      fontSize: '14px',
                      boxShadow: '0 4px 15px rgba(67, 97, 238, 0.4)',
                      zIndex: 100,
                      transition: 'opacity 0.3s ease'
                    }}></div>
                    <div className="section-title-icon justify-content-start mb-3">
                      <img src="https://api.vreden.my.id/assets/img/front-pages/icons/section-title-icon.png" alt="icon" height="16" />
                      <span className="text-uppercase small fw-semibold" style={{ color: '#1e293b' }}>Rankings</span>
                    </div>
                    <h5 className="mb-1 fw-bold">Top APIs</h5>
                    <p className="mb-3 small" style={{ color: '#64748b' }}>Click bar to see usage count</p>
                    <div id="topApisChart"></div>
                  </div>
                </div>
            </div>

            <div className="row g-4">
              <div className="col-12">
                <div className="monitor-card p-4">
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                    <div>
                      <div className="section-title-icon justify-content-start mb-2">
                        <img src="https://api.vreden.my.id/assets/img/front-pages/icons/section-title-icon.png" alt="icon" height="16" />
                        <span className="text-uppercase small fw-semibold" style={{ color: '#1e293b' }}>Today</span>
                      </div>
                      <h5 className="mb-1 fw-bold">Today&apos;s Requests</h5>
                      <p className="mb-0 small" style={{ color: '#1e293b' }}>Total API requests processed today</p>
                    </div>
                    <div className="stat-value" style={{ fontSize: '2.5rem', background: 'linear-gradient(90deg, #4361EE, #1D92F1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      {stats?.statistics.today_requests.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="py-4" style={{ background: '#f1f5f9' }}>
          <div className="container">
            <div className="text-center">
              <p className="text-muted small mb-2">
                Last updated: {lastUpdate.toLocaleString('id-ID')} • Data refreshes every 5 seconds
              </p>
              <p className="text-muted small mb-0">
                © {new Date().getFullYear()} • Vallzx APIs Server Monitor
              </p>
            </div>
          </div>
        </footer>
      </div>

      <script src="https://cdn.jsdelivr.net/npm/apexcharts@3.45.1/dist/apexcharts.min.js" async />
    </>
  );
}
