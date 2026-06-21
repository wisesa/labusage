"use client";

import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import AdminShell from "../_components/AdminShell";
import RefreshButton from "../_components/RefreshButton";

type UserSession = {
  id: string;
  session_id: string;
  username: string;
  nim?: string;
  nama?: string;
  kelas?: string;
  lab_id: string;
  lab_name: string;
  pengajar_id: string;
  pengajar: string;
  mata_kuliah_id: string;
  mata_kuliah_kode: string;
  mata_kuliah_nama: string;
  login_at: string | null;
  last_active_at: string | null;
  hostname: string;
  device_id: string;
  source: "login_logs" | "users_last_login";
};

type DashboardPenggunaan = {
  key: string;
  pengajar_id: string;
  pengajar_nama: string;
  mata_kuliah_id: string;
  mata_kuliah_kode: string;
  mata_kuliah_nama: string;
  kelas: string;
  login_count: number;
  unique_user_count: number;
  users: UserSession[];
};

type ReportSettings = {
  plp_title: string;
  plp_name: string;
  plp_signature_data_url: string;
  kepala_lab_title: string;
  kepala_lab_name: string;
  kepala_lab_signature_data_url: string;
};

type DashboardLab = {
  id: string;
  nama: string;
  active: boolean;
  has_login_today: boolean;
  login_count: number;
  unique_user_count: number;
  pengajar_count: number;
  penggunaan_count: number;
  last_login_at: string | null;
  penggunaan: DashboardPenggunaan[];
};

type DashboardResponse = {
  selected_date: string;
  date_label: string;
  start_at: string;
  end_at: string;
  report_settings: ReportSettings;
  labs: DashboardLab[];
};

const DEFAULT_REPORT_SETTINGS: ReportSettings = {
  plp_title: "PLP/TEKNISI",
  plp_name: "Martadi",
  plp_signature_data_url: "",
  kepala_lab_title: "Kepala lab Komputer Gedung Kuliah Bersama",
  kepala_lab_name: "",
  kepala_lab_signature_data_url: "",
};

function getTodayJakartaInputValue() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";

  return `${year}-${month}-${day}`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState(getTodayJakartaInputValue);
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [selectedPenggunaanKey, setSelectedPenggunaanKey] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
    null
  );
  const [message, setMessage] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const labs = data?.labs || [];
  const reportSettings = data?.report_settings || DEFAULT_REPORT_SETTINGS;

  const selectedLab = useMemo(() => {
    if (!selectedLabId) return null;
    return labs.find((lab) => lab.id === selectedLabId) || null;
  }, [labs, selectedLabId]);

  const selectedPenggunaan = useMemo(() => {
    if (!selectedLab || !selectedPenggunaanKey) return null;

    return (
      selectedLab.penggunaan.find(
        (penggunaan) => penggunaan.key === selectedPenggunaanKey
      ) || null
    );
  }, [selectedLab, selectedPenggunaanKey]);

  const totalLabs = labs.length;
  const usedLabs = labs.filter((lab) => lab.has_login_today).length;
  const idleLabs = totalLabs - usedLabs;
  const totalSessions = labs.reduce((sum, lab) => sum + lab.login_count, 0);

  useEffect(() => {
    loadDashboard(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function loadDashboard(dateValue = selectedDate) {
    setLoading(true);
    setMessage("");

    try {
      const responseData = await requestApi(
        `/api/admin/dashboard?date=${encodeURIComponent(dateValue)}`
      );

      if (!responseData) return;

      setData(responseData);

      const nextLab = responseData.labs.find(
        (lab: DashboardLab) => lab.id === selectedLabId
      );

      if (selectedLabId && !nextLab) {
        setSelectedLabId(null);
        setSelectedPenggunaanKey(null);
      }

      if (
        nextLab &&
        selectedPenggunaanKey &&
        !nextLab.penggunaan.some(
          (item: DashboardPenggunaan) => item.key === selectedPenggunaanKey
        )
      ) {
        setSelectedPenggunaanKey(null);
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Gagal memuat dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteLoginSession(user: UserSession) {
    const ok = window.confirm(
      `Hapus log login "${user.nama || user.username}" pada ${formatDateTime(
        user.login_at
      )}?`
    );

    if (!ok) return;

    setDeletingSessionId(user.id);
    setMessage("");

    try {
      await requestApi("/api/admin/dashboard/login-sessions", {
        method: "DELETE",
        body: JSON.stringify({
          session_id: user.id,
          source: user.source,
          username: user.username,
        }),
      });

      setMessage("Log login berhasil dihapus.");
      await loadDashboard(selectedDate);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Gagal menghapus log login."
      );
    } finally {
      setDeletingSessionId(null);
    }
  }

  function handleDateChange(value: string) {
    if (!value) return;

    setSelectedDate(value);
    setSelectedLabId(null);
    setSelectedPenggunaanKey(null);
    loadDashboard(value);
  }

  function handleTodayClick() {
    const today = getTodayJakartaInputValue();

    setSelectedDate(today);
    setSelectedLabId(null);
    setSelectedPenggunaanKey(null);
    loadDashboard(today);
  }

  function handleLabClick(lab: DashboardLab) {
    setSelectedLabId(lab.id);
    setSelectedPenggunaanKey(null);
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

  async function compressDataUrlToJpeg(
    dataUrl: string,
    maxWidth = 500,
    maxHeight = 220,
    quality = 0.55
  ) {
    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Gagal membaca gambar."));
      image.src = dataUrl;
    });

    let width = image.width;
    let height = image.height;

    const ratio = Math.min(maxWidth / width, maxHeight / height, 1);

    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Browser tidak mendukung kompres gambar.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", quality);
  }

  async function imageUrlToCompressedJpegDataUrl(
    url: string,
    maxWidth = 500,
    maxHeight = 220,
    quality = 0.55
  ) {
    try {
      const response = await fetch(url);

      if (!response.ok) return null;

      const blob = await response.blob();

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onloadend = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      return await compressDataUrlToJpeg(dataUrl, maxWidth, maxHeight, quality);
    } catch {
      return null;
    }
  }

  async function safeCompressSignature(dataUrl: string) {
    try {
      return await compressDataUrlToJpeg(dataUrl, 420, 180, 0.5);
    } catch {
      return "";
    }
  }

  function normalizeSessionMinute(value: string | null) {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day} ${hour}:${minute}`;
  }

  function normalizeReportKeyPart(value: string) {
    return value.trim().toLowerCase();
  }

  function getReportComputerSessionKey(user: UserSession) {
    const hostname = normalizeReportKeyPart(user.hostname);
    const deviceId = normalizeReportKeyPart(user.device_id);
    const sessionId = normalizeReportKeyPart(user.session_id);

    if (hostname || deviceId) {
      return [hostname, deviceId].filter(Boolean).join("@");
    }

    return sessionId || user.id;
  }

  function getReportSessionKey(user: UserSession) {
    return [
      normalizeReportKeyPart(user.username),
      normalizeReportKeyPart(user.lab_id) || normalizeReportKeyPart(user.lab_name),
      normalizeReportKeyPart(user.pengajar_id) ||
        normalizeReportKeyPart(user.pengajar),
      normalizeReportKeyPart(user.mata_kuliah_id) ||
        normalizeReportKeyPart(user.mata_kuliah_nama),
      normalizeSessionMinute(user.login_at),
      getReportComputerSessionKey(user),
    ].join("|");
  }

  function getComputerNumber(user: UserSession) {
    if (user.hostname) return user.hostname;
    if (user.device_id) return user.device_id;
    return "-";
  }

  async function generateUsagePdf(
    lab: DashboardLab,
    penggunaan: DashboardPenggunaan
  ) {
    const rawSessions = penggunaan.users;

    const seenSessions = new Set<string>();
    const sessions = rawSessions
      .filter((user) => {
        const key = getReportSessionKey(user);

        if (seenSessions.has(key)) return false;

        seenSessions.add(key);
        return true;
      })
      .sort((a, b) => {
        const aTime = a.login_at ? new Date(a.login_at).getTime() : 0;
        const bTime = b.login_at ? new Date(b.login_at).getTime() : 0;
        return aTime - bTime;
      });

    if (sessions.length === 0) {
      window.alert("Belum ada data login untuk dibuat PDF.");
      return;
    }

    setGeneratingPdf(true);

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 14;

      const logoDataUrl = await imageUrlToCompressedJpegDataUrl(
        "/logo-polman.png",
        420,
        320,
        0.6
      );

      if (logoDataUrl) {
        doc.addImage(logoDataUrl, "JPEG", marginX, 8, 28, 18);
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("POLITEKNIK", 46, 12);
      doc.text("MANUFAKTUR NEGERI", 46, 18);
      doc.text("BANGKA BELITUNG", 46, 24);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("GEDUNG KULIAH BERSAMA lt2", pageWidth - marginX, 10, {
        align: "right",
      });
      doc.text(
        "Kawasan Industri Air Kantung Sungailiat-Bangka",
        pageWidth - marginX,
        15,
        { align: "right" }
      );
      doc.text("Telp: 0717-93586", pageWidth - marginX, 20, {
        align: "right",
      });
      doc.text("Email: polman@polman-babel.ac.id", pageWidth - marginX, 25, {
        align: "right",
      });
      doc.text("http://polman-babel.ac.id", pageWidth - marginX, 30, {
        align: "right",
      });

      doc.setLineWidth(0.6);
      doc.line(marginX, 34, pageWidth - marginX, 34);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(
        "Form Penggunaan Laboratorium komputer Gedung kuliah Bersama",
        pageWidth / 2,
        43,
        { align: "center" }
      );

      function drawField(label: string, value: string, y: number) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(label, 24, y);
        doc.text(":", 66, y);
        doc.text(value || "-", 78, y);
        doc.line(78, y + 1.5, pageWidth - 30, y + 1.5);
      }

      const mataKuliahText = penggunaan.mata_kuliah_kode
        ? `${penggunaan.mata_kuliah_kode} - ${penggunaan.mata_kuliah_nama}`
        : penggunaan.mata_kuliah_nama || "-";

      drawField("Mata Kuliah", mataKuliahText, 52);
      drawField("Dosen/Pengajar", penggunaan.pengajar_nama, 60);
      drawField("Kelas", penggunaan.kelas || "-", 68);
      drawField("Laboratorium", lab.nama, 76);
      drawField("Tanggal", data?.date_label || selectedDate, 84);

      const tableBody = sessions.map((user, index) => [
        String(index + 1),
        user.nama || user.username || "-",
        formatTime(user.login_at),
        formatTime(user.last_active_at || user.login_at),
        getComputerNumber(user),
      ]);

      while (tableBody.length < 30) {
        tableBody.push([String(tableBody.length + 1), "", "", "", ""]);
      }

      autoTable(doc, {
        startY: 90,
        theme: "grid",
        margin: {
          left: marginX,
          right: marginX,
        },
        styles: {
          font: "helvetica",
          fontSize: 9,
          cellPadding: 1.7,
          lineColor: [70, 70, 70],
          lineWidth: 0.25,
          textColor: [30, 30, 30],
          valign: "middle",
        },
        headStyles: {
          fillColor: [245, 245, 245],
          textColor: [30, 30, 30],
          halign: "center",
          fontStyle: "bold",
        },
        bodyStyles: {
          minCellHeight: 6.6,
        },
        columnStyles: {
          0: { cellWidth: 11, halign: "center" },
          1: { cellWidth: 75 },
          2: { cellWidth: 27, halign: "center" },
          3: { cellWidth: 27, halign: "center" },
          4: { cellWidth: 42, halign: "center" },
        },
        head: [
          [
            { content: "No", rowSpan: 2 },
            { content: "Nama Mahasiswa", rowSpan: 2 },
            { content: "Waktu/Jam", colSpan: 2 },
            { content: "No Komputer", rowSpan: 2 },
          ],
          ["Jam mulai", "Jam selesai"],
        ],
        body: tableBody,
      });

      const lastAutoTable = (
        doc as jsPDF & {
          lastAutoTable?: {
            finalY: number;
          };
        }
      ).lastAutoTable;

      const finalY = lastAutoTable?.finalY || 220;
      const signatureY = Math.min(finalY + 10, 244);

      const leftCenterX = 46;
      const rightCenterX = pageWidth - 58;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      doc.text("Mengetahui,", leftCenterX, signatureY, { align: "center" });
      doc.text(reportSettings.plp_title, leftCenterX, signatureY + 6, {
        align: "center",
      });

      if (reportSettings.plp_signature_data_url) {
        const plpSignatureDataUrl = await safeCompressSignature(
          reportSettings.plp_signature_data_url
        );

        if (plpSignatureDataUrl) {
          doc.addImage(
            plpSignatureDataUrl,
            "JPEG",
            leftCenterX - 18,
            signatureY + 9,
            36,
            17
          );
        }
      }

      doc.text(
        `(${reportSettings.plp_name || "................................"})`,
        leftCenterX,
        signatureY + 32,
        { align: "center" }
      );

      doc.text(reportSettings.kepala_lab_title, rightCenterX, signatureY + 6, {
        align: "center",
      });

      if (reportSettings.kepala_lab_signature_data_url) {
        const kepalaLabSignatureDataUrl = await safeCompressSignature(
          reportSettings.kepala_lab_signature_data_url
        );

        if (kepalaLabSignatureDataUrl) {
          doc.addImage(
            kepalaLabSignatureDataUrl,
            "JPEG",
            rightCenterX - 18,
            signatureY + 9,
            36,
            17
          );
        }
      }

      doc.text(
        `(${
          reportSettings.kepala_lab_name || "................................"
        })`,
        rightCenterX,
        signatureY + 32,
        { align: "center" }
      );

      doc.setFontSize(9);
      doc.text(
        "Catatan : Jika ditemukan kerusakan pada komponen, diharapkan segera menginformasikan kerusakan",
        marginX,
        284
      );
      doc.text(
        "tersebut kepada pranata komputer yang ada digedung kuliah bersama agar dapat segera ditindaklanjuti",
        marginX,
        289
      );

      const safeLabName = lab.nama.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      const safeMk = penggunaan.mata_kuliah_nama
        .replace(/[^a-z0-9]+/gi, "-")
        .toLowerCase();

      doc.save(`report-${safeLabName}-${safeMk}-${selectedDate}.pdf`);
    } finally {
      setGeneratingPdf(false);
    }
  }

  return (
    <AdminShell title="Dashboard Penggunaan Lab" description="">
      <section className="dashboard-panel">
        <div className="panel-header">
          <div>
            <p>{data?.date_label || "Memuat tanggal..."}</p>
          </div>

          <div className="date-filter">
            <label>
              <span>Filter Hari</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => handleDateChange(event.target.value)}
                disabled={loading}
              />
            </label>

            <button
              type="button"
              className="admin-button secondary"
              onClick={handleTodayClick}
              disabled={loading}
            >
              Hari Ini
            </button>

            <RefreshButton
              loading={loading}
              onClick={() => loadDashboard(selectedDate)}
            />
          </div>
        </div>

        <div className="mini-summary">
          <div>
            <span>Total Lab</span>
            <strong>{totalLabs}</strong>
          </div>

          <div>
            <span>Lab Terpakai</span>
            <strong>{usedLabs}</strong>
          </div>

          <div>
            <span>Lab Kosong</span>
            <strong>{idleLabs}</strong>
          </div>

          <div>
            <span>Total Sesi</span>
            <strong>{totalSessions}</strong>
          </div>
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
                  <span>{lab.penggunaan_count} penggunaan</span>
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
              <h2>Penggunaan di {selectedLab.nama}</h2>
              <p>
                Data dikelompokkan berdasarkan nama pengajar dan nama mata
                kuliah yang dipilih saat login di aplikasi Python.
              </p>
            </div>
          </div>

          {selectedLab.penggunaan.length > 0 ? (
            <div className="pengajar-grid">
              {selectedLab.penggunaan.map((penggunaan) => {
                const isSelected = penggunaan.key === selectedPenggunaanKey;

                return (
                  <button
                    key={penggunaan.key}
                    type="button"
                    className={[
                      "pengajar-card",
                      isSelected ? "selected" : "",
                    ].join(" ")}
                    onClick={() => setSelectedPenggunaanKey(penggunaan.key)}
                  >
                    <div className="pengajar-icon">👨‍🏫</div>

                    <div>
                      <strong>{penggunaan.pengajar_nama}</strong>
                      <span>
                        📚{" "}
                        {penggunaan.mata_kuliah_kode
                          ? `${penggunaan.mata_kuliah_kode} - ${penggunaan.mata_kuliah_nama}`
                          : penggunaan.mata_kuliah_nama}
                      </span>
                      <span>
                        Kelas: {penggunaan.kelas || "-"} •{" "}
                        {penggunaan.unique_user_count} user •{" "}
                        {penggunaan.login_count} sesi
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              Belum ada login pada lab ini pada tanggal yang dipilih.
            </div>
          )}
        </section>
      )}

      {selectedLab && selectedPenggunaan && (
        <section className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h2>User Login</h2>
              <p>
                {selectedLab.nama} • {selectedPenggunaan.pengajar_nama} •{" "}
                {selectedPenggunaan.mata_kuliah_nama} •{" "}
                {selectedPenggunaan.login_count} sesi
              </p>
            </div>

            <button
              type="button"
              className="admin-button"
              onClick={() => generateUsagePdf(selectedLab, selectedPenggunaan)}
              disabled={generatingPdf}
            >
              {generatingPdf ? "Membuat PDF..." : "📄 Export PDF"}
            </button>
          </div>

          <div className="user-grid">
            {selectedPenggunaan.users.map((user) => (
              <article key={user.id} className="user-card">
                <div className="user-avatar">👤</div>

                <div className="user-info">
                  <strong>{user.nama || user.username || "-"}</strong>
                  <span>Login: {formatDateTime(user.login_at)}</span>

                  <div className="user-device">
                    Aktif terakhir:{" "}
                    {formatDateTime(user.last_active_at || user.login_at)}
                  </div>

                  <div className="user-device">
                    Kelas: {user.kelas || "-"}
                  </div>

                  <div className="user-device">
                    {user.hostname
                      ? `Komputer: ${user.hostname}`
                      : "Komputer: -"}
                  </div>

                  <div className="session-source">
                    Sumber:{" "}
                    {user.source === "login_logs"
                      ? "login_logs"
                      : "last_login mahasiswa"}
                  </div>

                  <button
                    type="button"
                    className="delete-session-button"
                    onClick={() => deleteLoginSession(user)}
                    disabled={deletingSessionId === user.id}
                  >
                    {deletingSessionId === user.id
                      ? "Menghapus..."
                      : "🗑 Hapus Log"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <style jsx>{`
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

        .date-filter {
          display: flex;
          align-items: end;
          gap: 10px;
          flex-wrap: wrap;
        }

        .date-filter label {
          display: grid;
          gap: 6px;
          color: #334155;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .date-filter input {
          height: 48px;
          min-width: 220px;
          border: 1px solid #dbeafe;
          background: #f8fafc;
          color: #0f172a;
          border-radius: 14px;
          padding: 0 14px;
          font-size: 15px;
          font-weight: 800;
          outline: none;
        }

        .date-filter input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
          background: white;
        }

        .mini-summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 22px;
        }

        .mini-summary div {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 18px;
          padding: 14px 16px;
        }

        .mini-summary span {
          display: block;
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 6px;
        }

        .mini-summary strong {
          color: #0f172a;
          font-size: 26px;
          font-weight: 950;
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
          grid-template-columns: repeat(3, minmax(0, 1fr));
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
          flex: 0 0 auto;
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
          margin-top: 3px;
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
          flex: 0 0 auto;
        }

        .user-info {
          min-width: 0;
          width: 100%;
        }

        .user-info strong {
          display: block;
          color: #0f172a;
          font-size: 16px;
          margin-bottom: 4px;
          word-break: break-word;
        }

        .user-info span {
          display: block;
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
        }

        .user-device,
        .session-source {
          margin-top: 9px;
          color: #475569;
          font-size: 12px;
          font-weight: 700;
          word-break: break-word;
        }

        .session-source {
          color: #64748b;
        }

        .delete-session-button {
          margin-top: 12px;
          width: 100%;
          border: 0;
          border-radius: 13px;
          background: #fee2e2;
          color: #991b1b;
          padding: 10px 12px;
          cursor: pointer;
          font-weight: 900;
          transition: 0.18s ease;
        }

        .delete-session-button:hover {
          background: #fecaca;
          transform: translateY(-1px);
        }

        .delete-session-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
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
          .mini-summary,
          .lab-grid,
          .pengajar-grid,
          .user-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .panel-header {
            flex-direction: column;
          }

          .date-filter {
            justify-content: flex-start;
            width: 100%;
          }
        }

        @media (max-width: 560px) {
          .mini-summary,
          .lab-grid,
          .pengajar-grid,
          .user-grid {
            grid-template-columns: 1fr;
          }

          .date-filter {
            display: grid;
            width: 100%;
          }

          .date-filter input,
          .date-filter button {
            width: 100%;
          }
        }
      `}</style>
    </AdminShell>
  );
}