"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../_components/AdminShell";

type UserSession = {
  id: string;
  username: string;
  lab_id: string;
  lab_name: string;
  pengajar_id: string;
  pengajar: string;
  login_at: string | null;
  hostname: string;
  device_id: string;
};

type DashboardPengajar = {
  key: string;
  id: string;
  nama: string;
  login_count: number;
  unique_user_count: number;
  users: UserSession[];
};

type DashboardLab = {
  id: string;
  nama: string;
  active: boolean;
  has_login_today: boolean;
  login_count: number;
  unique_user_count: number;
  pengajar_count: number;
  last_login_at: string | null;
  pengajar: DashboardPengajar[];
};

type DashboardResponse = {
  date_label: string;
  start_at: string;
  end_at: string;
  labs: DashboardLab[];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [selectedPengajarKey, setSelectedPengajarKey] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const labs = data?.labs || [];

  const selectedLab = useMemo(() => {
    if (!selectedLabId) return null;
    return labs.find((lab) => lab.id === selectedLabId) || null;
  }, [labs, selectedLabId]);

  const selectedPengajar = useMemo(() => {
    if (!selectedLab || !selectedPengajarKey) return null;

    return (
      selectedLab.pengajar.find(
        (pengajar) => pengajar.key === selectedPengajarKey
      ) || null
    );
  }, [selectedLab, selectedPengajarKey]);

  const totalLabs = labs.length;
  const usedLabs = labs.filter((lab) => lab.has_login_today).length;
  const idleLabs = totalLabs - usedLabs;
  const totalSessions = labs.reduce((sum, lab) => sum + lab.login_count, 0);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function requestApi(path: string, options: RequestInit = {}) {
    const response = await fetch(path, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const responseData = await response.json().catch(() => ({}));

    if (response.status === 401) {
      window.location.href = "/admin/login?next=/admin/dashboard";
      return null;
    }

    if (!response.ok) {
      throw new Error(responseData.error || "Request gagal.");
    }

    return responseData;
  }

  async function loadDashboard() {
    setLoading(true);
    setMessage("");

    try {
      const responseData = await requestApi("/api/admin/dashboard");

      if (!responseData) return;

      setData(responseData);

      if (
        selectedLabId &&
        !responseData.labs.some((lab: DashboardLab) => lab.id === selectedLabId)
      ) {
        setSelectedLabId(null);
        setSelectedPengajarKey(null);
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Gagal memuat dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleLabClick(lab: DashboardLab) {
    setSelectedLabId(lab.id);
    setSelectedPengajarKey(null);
  }

  function formatTime(value: string | null) {
    if (!value) return "-";

    try {
      return new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value));
    } catch {
      return "-";
    }
  }

  function formatDateTime(value: string | null) {
    if (!value) return "-";

    try {
      return new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value));
    } catch {
      return "-";
    }
  }

  return (
    <AdminShell
      title="Dashboard Penggunaan Lab"
      description=""
    >
      <section className="dashboard-panel">
        <div className="panel-header">
          <div>
            <p>{data?.date_label || "Memuat tanggal..."}</p>
          </div>

          <button
            type="button"
            className="admin-button secondary"
            onClick={loadDashboard}
            disabled={loading}
          >
            {loading ? "Memuat..." : "Muat Ulang"}
          </button>
        </div>

        {message && <div className="admin-message">{message}</div>}

        <div className="lab-grid">
          {labs.map((lab) => {
            const isSelected = lab.id === selectedLabId;

            return (
              <button
                key={lab.id}
                type="button"
                className={[
                  "lab-card",
                  lab.has_login_today ? "has-login" : "no-login",
                  isSelected ? "selected" : "",
                ].join(" ")}
                onClick={() => handleLabClick(lab)}
              >
                <div className="lab-card-top">
                  <span className="lab-icon">🏫</span>
                  <span
                    className={
                      lab.has_login_today
                        ? "lab-status online"
                        : "lab-status offline"
                    }
                  >
                    {lab.has_login_today ? "Ada login" : "Kosong"}
                  </span>
                </div>

                <div className="lab-name">{lab.nama}</div>

                <div className="lab-meta">
                  <span>{lab.unique_user_count} user</span>
                  <span>{lab.pengajar_count} pengajar</span>
                </div>

                <div className="lab-last">
                  Login terakhir: {formatTime(lab.last_login_at)}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {selectedLab && (
        <section className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h2>Pengajar di {selectedLab.nama}</h2>
              <p>
                {selectedLab.pengajar.length > 0
                  ? "Klik card pengajar untuk melihat user yang login."
                  : "Belum ada pengajar yang menggunakan lab ini hari ini."}
              </p>
            </div>
          </div>

          {selectedLab.pengajar.length > 0 ? (
            <div className="pengajar-grid">
              {selectedLab.pengajar.map((pengajar) => {
                const isSelected = pengajar.key === selectedPengajarKey;

                return (
                  <button
                    key={pengajar.key}
                    type="button"
                    className={[
                      "pengajar-card",
                      isSelected ? "selected" : "",
                    ].join(" ")}
                    onClick={() => setSelectedPengajarKey(pengajar.key)}
                  >
                    <div className="pengajar-icon">👨‍🏫</div>

                    <div>
                      <strong>{pengajar.nama}</strong>
                      <span>
                        {pengajar.unique_user_count} user •{" "}
                        {pengajar.login_count} sesi login
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              Belum ada login pada lab ini hari ini.
            </div>
          )}
        </section>
      )}

      {selectedLab && selectedPengajar && (
        <section className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h2>User Login</h2>
              <p>
                {selectedLab.nama} • {selectedPengajar.nama} •{" "}
                {selectedPengajar.login_count} sesi
              </p>
            </div>
          </div>

          <div className="user-grid">
            {selectedPengajar.users.map((user) => (
              <article key={user.id} className="user-card">
                <div className="user-avatar">👤</div>

                <div className="user-info">
                  <strong>{user.username || "-"}</strong>
                  <span>{formatDateTime(user.login_at)}</span>

                  <div className="user-device">
                    {user.hostname ? `Komputer: ${user.hostname}` : "Komputer: -"}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <style jsx>{`
        .dashboard-summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }

        .summary-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 22px;
          padding: 20px;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
        }

        .summary-card span {
          display: block;
          color: #64748b;
          font-weight: 800;
          font-size: 13px;
          margin-bottom: 10px;
        }

        .summary-card strong {
          display: block;
          color: #0f172a;
          font-size: 34px;
          letter-spacing: -0.04em;
        }

        .summary-card.success {
          border-color: #bbf7d0;
          background: #f0fdf4;
        }

        .summary-card.muted {
          border-color: #e2e8f0;
          background: #f8fafc;
        }

        .summary-card.info {
          border-color: #bfdbfe;
          background: #eff6ff;
        }

        .dashboard-panel {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid #e2e8f0;
          border-radius: 26px;
          padding: 24px;
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.07);
          margin-bottom: 22px;
        }

        .panel-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .panel-header h2 {
          margin: 0;
          color: #0f172a;
          font-size: 24px;
          letter-spacing: -0.03em;
        }

        .panel-header p {
          margin: 7px 0 0;
          color: #64748b;
          line-height: 1.6;
        }

        .lab-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
        }

        .lab-card {
          min-height: 150px;
          border: 2px solid #e2e8f0;
          border-radius: 24px;
          padding: 16px;
          text-align: left;
          cursor: pointer;
          transition: 0.18s ease;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
        }

        .lab-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.11);
        }

        .lab-card.has-login {
          background: linear-gradient(135deg, #ecfdf5, #ffffff);
          border-color: #22c55e;
        }

        .lab-card.no-login {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .lab-card.selected {
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12),
            0 18px 42px rgba(15, 23, 42, 0.12);
        }

        .lab-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .lab-icon {
          width: 42px;
          height: 42px;
          border-radius: 16px;
          background: white;
          display: grid;
          place-items: center;
          font-size: 22px;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
        }

        .lab-status {
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 11px;
          font-weight: 900;
        }

        .lab-status.online {
          background: #dcfce7;
          color: #166534;
        }

        .lab-status.offline {
          background: #e2e8f0;
          color: #475569;
        }

        .lab-name {
          text-align: center;
          margin-top: 18px;
          color: #0f172a;
          font-size: 50px;
          font-weight: 950;
          letter-spacing: -0.03em;
        }

        .lab-meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .lab-meta span {
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 999px;
          padding: 5px 8px;
          color: #334155;
          font-size: 12px;
          font-weight: 800;
        }

        .lab-last {
          margin-top: 12px;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
        }

        .pengajar-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }

        .pengajar-card {
          display: flex;
          gap: 13px;
          align-items: center;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          border-radius: 20px;
          padding: 16px;
          text-align: left;
          cursor: pointer;
          transition: 0.18s ease;
        }

        .pengajar-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
        }

        .pengajar-card.selected {
          border-color: #2563eb;
          background: #eff6ff;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
        }

        .pengajar-icon {
          width: 44px;
          height: 44px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: #eff6ff;
          font-size: 22px;
        }

        .pengajar-card strong {
          display: block;
          color: #0f172a;
          font-size: 15px;
          margin-bottom: 4px;
        }

        .pengajar-card span {
          display: block;
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
        }

        .user-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }

        .user-card {
          display: flex;
          gap: 13px;
          align-items: flex-start;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          border-radius: 20px;
          padding: 16px;
        }

        .user-avatar {
          width: 42px;
          height: 42px;
          border-radius: 15px;
          background: #f1f5f9;
          display: grid;
          place-items: center;
          font-size: 21px;
        }

        .user-info strong {
          display: block;
          color: #0f172a;
          font-size: 16px;
          margin-bottom: 4px;
        }

        .user-info span {
          display: block;
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
        }

        .user-device {
          margin-top: 9px;
          color: #475569;
          font-size: 12px;
          font-weight: 700;
          word-break: break-word;
        }

        .empty-state {
          border: 1px dashed #cbd5e1;
          background: #f8fafc;
          border-radius: 18px;
          padding: 34px;
          color: #64748b;
          text-align: center;
          font-weight: 800;
        }

        @media (max-width: 1200px) {
          .lab-grid,
          .pengajar-grid,
          .user-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 900px) {
          .dashboard-summary,
          .lab-grid,
          .pengajar-grid,
          .user-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 560px) {
          .dashboard-summary,
          .lab-grid,
          .pengajar-grid,
          .user-grid {
            grid-template-columns: 1fr;
          }

          .panel-header {
            flex-direction: column;
          }
        }
      `}</style>
    </AdminShell>
  );
}