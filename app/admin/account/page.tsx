"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

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
    <main className="page">
      <section className="card">
        <div className="nav">
          <Link href="/admin/users">User</Link>
          <Link href="/admin/pengajar">Pengajar</Link>
        </div>

        <h1>Ganti Password Admin</h1>

        <form onSubmit={handleSubmit}>
          <label>Password Lama</label>
          <input
            type="password"
            value={oldPassword}
            onChange={(event) => setOldPassword(event.target.value)}
          />

          <label>Password Baru</label>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />

          <label>Konfirmasi Password Baru</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />

          <button disabled={loading}>
            {loading ? "Menyimpan..." : "Ganti Password"}
          </button>
        </form>

        {message && <p className="message">{message}</p>}
      </section>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #f1f5f9;
          padding: 40px 20px;
          font-family: Arial, sans-serif;
        }

        .card {
          max-width: 520px;
          margin: 0 auto;
          background: white;
          border-radius: 24px;
          padding: 28px;
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.1);
        }

        .nav {
          display: flex;
          gap: 10px;
          margin-bottom: 24px;
        }

        .nav a {
          background: #eff6ff;
          color: #2563eb;
          text-decoration: none;
          padding: 10px 14px;
          border-radius: 12px;
          font-weight: 800;
        }

        label {
          display: block;
          margin: 16px 0 8px;
          font-weight: 800;
          color: #334155;
        }

        input {
          width: 100%;
          border: 1px solid #dbeafe;
          background: #f8fafc;
          border-radius: 12px;
          padding: 13px 14px;
        }

        button {
          margin-top: 22px;
          width: 100%;
          border: none;
          border-radius: 12px;
          padding: 14px;
          background: #2563eb;
          color: white;
          font-weight: 800;
          cursor: pointer;
        }

        .message {
          margin-top: 16px;
          font-weight: 700;
          color: #475569;
        }
      `}</style>
    </main>
  );
}