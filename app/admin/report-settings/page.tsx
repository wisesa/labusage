"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import AdminShell from "../_components/AdminShell";
import RefreshButton from "../_components/RefreshButton";

type ReportSettings = {
  plp_title: string;
  plp_name: string;
  plp_signature_data_url: string;
  kepala_lab_title: string;
  kepala_lab_name: string;
  kepala_lab_signature_data_url: string;
};

const DEFAULT_SETTINGS: ReportSettings = {
  plp_title: "PLP/TEKNISI",
  plp_name: "Martadi",
  plp_signature_data_url: "",
  kepala_lab_title: "Kepala lab Komputer Gedung Kuliah Bersama",
  kepala_lab_name: "",
  kepala_lab_signature_data_url: "",
};

export default function ReportSettingsPage() {
  const [settings, setSettings] = useState<ReportSettings>(DEFAULT_SETTINGS);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
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

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      window.location.href = "/admin/login?next=/admin/report-settings";
      return null;
    }

    if (!response.ok) {
      throw new Error(data.error || "Request gagal.");
    }

    return data;
  }

  async function loadSettings() {
    setLoading(true);
    setMessage("");

    try {
      const data = await requestApi("/api/admin/report-settings");

      if (data?.settings) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...data.settings,
        });
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Gagal memuat pengaturan PDF."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();

    if (!settings.plp_title.trim()) {
      setMessage("Jabatan PLP/Teknisi wajib diisi.");
      return;
    }

    if (!settings.plp_name.trim()) {
      setMessage("Nama PLP/Teknisi wajib diisi.");
      return;
    }

    if (!settings.kepala_lab_title.trim()) {
      setMessage("Jabatan Kepala Lab wajib diisi.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const data = await requestApi("/api/admin/report-settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });

      if (data?.settings) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...data.settings,
        });
      }

      setMessage("Pengaturan PDF berhasil disimpan.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan pengaturan PDF."
      );
    } finally {
      setLoading(false);
    }
  }

  async function imageFileToDataUrl(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("File tanda tangan harus berupa gambar PNG/JPG.");
  }

  const image = new Image();
  const objectUrl = URL.createObjectURL(file);

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Gagal membaca gambar tanda tangan."));
      image.src = objectUrl;
    });

    const maxWidth = 500;
    const maxHeight = 180;

    let width = image.width;
    let height = image.height;

    const widthRatio = maxWidth / width;
    const heightRatio = maxHeight / height;
    const ratio = Math.min(widthRatio, heightRatio, 1);

    width = Math.round(width * ratio);
    height = Math.round(height * ratio);

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

    return canvas.toDataURL("image/jpeg", 0.65);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

  async function handleSignatureUpload(
    event: ChangeEvent<HTMLInputElement>,
    field: "plp_signature_data_url" | "kepala_lab_signature_data_url"
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setMessage("");

    try {
      const dataUrl = await imageFileToDataUrl(file);

      setSettings((current) => ({
        ...current,
        [field]: dataUrl,
      }));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Gagal membaca gambar."
      );
    } finally {
      event.target.value = "";
    }
  }

  function clearSignature(
    field: "plp_signature_data_url" | "kepala_lab_signature_data_url"
  ) {
    setSettings((current) => ({
      ...current,
      [field]: "",
    }));
  }

  return (
    <AdminShell
      title="Pengaturan PDF"
      description="Atur nama PLP/Teknisi, Kepala Lab GKB, dan tanda tangan otomatis untuk report penggunaan lab."
    >
      <section className="admin-card">
        <div className="admin-toolbar">
          <div>
            <h2>Master Tanda Tangan PDF</h2>
            <p>
              Tanda tangan ini akan otomatis muncul pada PDF penggunaan
              laboratorium.
            </p>
          </div>

          <RefreshButton loading={loading} onClick={loadSettings} />
        </div>

        {message && <div className="admin-message">{message}</div>}

        <form className="settings-form" onSubmit={handleSave}>
          <div className="signature-grid">
            <section className="signature-card">
              <h3>PLP / Teknisi</h3>

              <div className="admin-field">
                <label>Jabatan</label>
                <input
                  className="admin-input"
                  value={settings.plp_title}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      plp_title: event.target.value,
                    }))
                  }
                  placeholder="PLP/TEKNISI"
                />
              </div>

              <div className="admin-field">
                <label>Nama</label>
                <input
                  className="admin-input"
                  value={settings.plp_name}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      plp_name: event.target.value,
                    }))
                  }
                  placeholder="Nama PLP/Teknisi"
                />
              </div>

              <div className="admin-field">
                <label>Tanda Tangan</label>
                <input
                  className="file-input"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={(event) =>
                    handleSignatureUpload(event, "plp_signature_data_url")
                  }
                />
              </div>

              <div className="signature-preview">
                {settings.plp_signature_data_url ? (
                  <img src={settings.plp_signature_data_url} alt="TTD PLP" />
                ) : (
                  <span>Belum ada tanda tangan</span>
                )}
              </div>

              {settings.plp_signature_data_url && (
                <button
                  type="button"
                  className="admin-button secondary"
                  onClick={() => clearSignature("plp_signature_data_url")}
                >
                  Hapus Tanda Tangan
                </button>
              )}
            </section>

            <section className="signature-card">
              <h3>Kepala Lab GKB</h3>

              <div className="admin-field">
                <label>Jabatan</label>
                <input
                  className="admin-input"
                  value={settings.kepala_lab_title}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      kepala_lab_title: event.target.value,
                    }))
                  }
                  placeholder="Kepala lab Komputer Gedung Kuliah Bersama"
                />
              </div>

              <div className="admin-field">
                <label>Nama</label>
                <input
                  className="admin-input"
                  value={settings.kepala_lab_name}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      kepala_lab_name: event.target.value,
                    }))
                  }
                  placeholder="Nama Kepala Lab"
                />
              </div>

              <div className="admin-field">
                <label>Tanda Tangan</label>
                <input
                  className="file-input"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={(event) =>
                    handleSignatureUpload(
                      event,
                      "kepala_lab_signature_data_url"
                    )
                  }
                />
              </div>

              <div className="signature-preview">
                {settings.kepala_lab_signature_data_url ? (
                  <img
                    src={settings.kepala_lab_signature_data_url}
                    alt="TTD Kepala Lab"
                  />
                ) : (
                  <span>Belum ada tanda tangan</span>
                )}
              </div>

              {settings.kepala_lab_signature_data_url && (
                <button
                  type="button"
                  className="admin-button secondary"
                  onClick={() =>
                    clearSignature("kepala_lab_signature_data_url")
                  }
                >
                  Hapus Tanda Tangan
                </button>
              )}
            </section>
          </div>

          <div className="save-row">
            <button className="admin-button" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan Pengaturan PDF"}
            </button>
          </div>
        </form>
      </section>

      <style jsx>{`
        .settings-form {
          display: grid;
          gap: 22px;
        }

        .signature-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
        }

        .signature-card {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 22px;
          padding: 20px;
          display: grid;
          gap: 16px;
        }

        .signature-card h3 {
          margin: 0;
          color: #0f172a;
          font-size: 21px;
          letter-spacing: -0.03em;
        }

        .file-input {
          width: 100%;
          border: 1px dashed #cbd5e1;
          background: white;
          border-radius: 16px;
          padding: 16px;
          color: #334155;
          font-weight: 800;
        }

        .signature-preview {
          min-height: 120px;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 18px;
          display: grid;
          place-items: center;
          padding: 14px;
        }

        .signature-preview img {
          max-width: 100%;
          max-height: 100px;
          object-fit: contain;
        }

        .signature-preview span {
          color: #94a3b8;
          font-weight: 800;
        }

        .save-row {
          display: flex;
          justify-content: flex-end;
        }

        @media (max-width: 900px) {
          .signature-grid {
            grid-template-columns: 1fr;
          }

          .save-row {
            justify-content: stretch;
          }

          .save-row .admin-button {
            width: 100%;
          }
        }
      `}</style>
    </AdminShell>
  );
}