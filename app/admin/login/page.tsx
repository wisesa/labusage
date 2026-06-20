"use client";

import { FormEvent, useEffect, useState } from "react";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [nextPath, setNextPath] = useState("/admin/users");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(params.get("next") || "/admin/users");
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Login gagal.");
      }

      window.location.href = nextPath;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <form className="card" onSubmit={handleSubmit}>
        <div className="icon">🔐</div>
        <h1>Login Admin</h1>
        <p>Masuk untuk mengelola user mahasiswa dan pengajar.</p>

        <label>Username</label>
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoFocus
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <button disabled={loading}>{loading ? "Memproses..." : "Login"}</button>

        {message && <div className="message">{message}</div>}
      </form>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: Arial, sans-serif;
          padding: 20px;
        }

        .card {
          width: 100%;
          max-width: 420px;
          background: white;
          border-radius: 24px;
          padding: 34px;
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.12);
        }

        .icon {
          width: 72px;
          height: 72px;
          border-radius: 22px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 34px;
          margin-bottom: 18px;
        }

        h1 {
          margin: 0 0 8px;
          color: #0f172a;
        }

        p {
          margin: 0 0 24px;
          color: #64748b;
        }

        label {
          display: block;
          margin: 14px 0 8px;
          font-weight: 700;
          color: #334155;
        }

        input {
          width: 100%;
          padding: 13px 14px;
          border-radius: 12px;
          border: 1px solid #dbeafe;
          background: #f8fafc;
          outline: none;
        }

        button {
          width: 100%;
          margin-top: 22px;
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
          color: #dc2626;
          font-weight: 700;
        }
      `}</style>
    </main>
  );
}