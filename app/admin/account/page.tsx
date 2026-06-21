"use client";

import { FormEvent, useState } from "react";
import AdminShell from "../_components/AdminShell";

export default function AdminAccountPage() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      setMessage("Konfirmasi password baru tidak sama.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/auth/change-password", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        window.location.href = "/admin/login?next=/admin/account";
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Gagal mengganti password.");
      }

      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password admin berhasil diganti.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Gagal mengganti password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminShell
      title="Akun Admin"
      description="Kelola kredensial akun administrator yang digunakan untuk mengakses panel admin."
    >
      <div className="account-layout">
        <section className="admin-card account-card">
          <h2>Ganti Password Admin</h2>
          <p>
            Masukkan password lama, lalu tentukan password baru untuk sesi login
            admin berikutnya.
          </p>

          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="admin-field">
              <label htmlFor="old-password">Password Lama</label>
              <input
                id="old-password"
                className="admin-input"
                type="password"
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <div className="admin-field">
              <label htmlFor="new-password">Password Baru</label>
              <input
                id="new-password"
                className="admin-input"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="admin-field">
              <label htmlFor="confirm-password">Konfirmasi Password Baru</label>
              <input
                id="confirm-password"
                className="admin-input"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <button className="admin-button" disabled={loading} type="submit">
              {loading ? "Menyimpan..." : "Ganti Password"}
            </button>
          </form>

          {message && <div className="admin-message">{message}</div>}
        </section>
      </div>

      <style jsx>{`
        .account-layout {
          display: grid;
          grid-template-columns: minmax(0, 560px);
          gap: 22px;
        }

        .account-card {
          max-width: 560px;
        }
      `}</style>
    </AdminShell>
  );
}
