"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";

type AdminShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export default function AdminShell({
  title,
  description,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await fetch("/api/admin/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      window.location.href = "/admin/login";
    }
  }

  function navClass(href: string) {
    return pathname === href ? "admin-nav-link active" : "admin-nav-link";
  }

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-icon">🎓</div>
          <div>
            <div className="admin-brand-title">Lab Usage</div>
            <div className="admin-brand-subtitle">Firestore Admin</div>
          </div>
        </div>

        <nav className="admin-nav">
          <Link href="/admin/dashboard" className={navClass("/admin/dashboard")}>
            <span>📊</span>
            Dashboard
          </Link>

          <Link href="/admin/users" className={navClass("/admin/users")}>
            <span>👥</span>
            User Login
          </Link>

          <Link href="/admin/pengajar" className={navClass("/admin/pengajar")}>
            <span>👨‍🏫</span>
            Pengajar
          </Link>

          <Link href="/admin/labs" className={navClass("/admin/labs")}>
            <span>🏫</span>
            Master Lab
          </Link>

          <Link href="/admin/account" className={navClass("/admin/account")}>
            <span>🔐</span>
            Akun Admin
          </Link>
        </nav>

        <button
          type="button"
          className="admin-logout"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? "Keluar..." : "Logout"}
        </button>
      </aside>

      <section className="admin-main">
        <header className="admin-header">
          <div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </header>

        {children}
      </section>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f4f7fb;
          color: #0f172a;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .admin-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 280px 1fr;
          background: radial-gradient(
              circle at top right,
              rgba(37, 99, 235, 0.12),
              transparent 34%
            ),
            #f4f7fb;
        }

        .admin-sidebar {
          position: sticky;
          top: 0;
          height: 100vh;
          padding: 24px;
          background: #0f172a;
          color: white;
          display: flex;
          flex-direction: column;
        }

        .admin-brand {
          display: flex;
          align-items: center;
          gap: 14px;
          padding-bottom: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        }

        .admin-brand-icon {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #2563eb, #14b8a6);
          font-size: 24px;
        }

        .admin-brand-title {
          font-size: 17px;
          font-weight: 900;
        }

        .admin-brand-subtitle {
          margin-top: 3px;
          font-size: 12px;
          color: #94a3b8;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .admin-nav {
          margin-top: 28px;
          display: grid;
          gap: 10px;
        }

        .admin-nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #cbd5e1;
          text-decoration: none;
          padding: 13px 14px;
          border-radius: 14px;
          font-weight: 800;
          transition: 0.18s ease;
        }

        .admin-nav-link:hover {
          background: rgba(255, 255, 255, 0.08);
          color: white;
        }

        .admin-nav-link.active {
          background: white;
          color: #0f172a;
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.2);
        }

        .admin-logout {
          margin-top: auto;
          width: 100%;
          border: 0;
          background: rgba(239, 68, 68, 0.14);
          color: #fecaca;
          padding: 13px 16px;
          border-radius: 14px;
          cursor: pointer;
          font-weight: 900;
        }

        .admin-logout:hover {
          background: rgba(239, 68, 68, 0.22);
        }

        .admin-main {
          padding: 34px;
        }

        .admin-header {
          margin-bottom: 26px;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 26px;
          padding: 28px;
          box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(14px);
        }

        .admin-eyebrow {
          color: #2563eb;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .admin-header h1 {
          margin: 0;
          font-size: clamp(28px, 4vw, 46px);
          letter-spacing: -0.04em;
          line-height: 1;
        }

        .admin-header p {
          margin: 12px 0 0;
          color: #64748b;
          max-width: 760px;
          line-height: 1.7;
        }

        .admin-grid {
          display: grid;
          grid-template-columns: 380px 1fr;
          gap: 22px;
        }

        .admin-card {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.07);
        }

        .admin-card h2 {
          margin: 0 0 8px;
          font-size: 22px;
          letter-spacing: -0.03em;
        }

        .admin-card p {
          margin: 0 0 20px;
          color: #64748b;
          line-height: 1.6;
        }

        .admin-form {
          display: grid;
          gap: 14px;
        }

        .admin-field label {
          display: block;
          margin-bottom: 7px;
          color: #334155;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .admin-input {
          width: 100%;
          border: 1px solid #dbeafe;
          background: #f8fafc;
          color: #0f172a;
          border-radius: 14px;
          padding: 13px 14px;
          font-size: 15px;
          outline: none;
          transition: 0.15s ease;
        }

        .admin-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
          background: white;
        }

        .admin-check {
          display: flex;
          align-items: center;
          gap: 9px;
          font-weight: 800;
          color: #334155;
        }

        .admin-check input {
          width: 18px;
          height: 18px;
        }

        .admin-button {
          border: 0;
          border-radius: 14px;
          background: linear-gradient(135deg, #2563eb, #14b8a6);
          color: white;
          padding: 13px 16px;
          cursor: pointer;
          font-weight: 900;
          box-shadow: 0 14px 30px rgba(37, 99, 235, 0.22);
        }

        .admin-button:hover {
          filter: brightness(0.98);
          transform: translateY(-1px);
        }

        .admin-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .admin-button.secondary {
          background: #e2e8f0;
          color: #0f172a;
          box-shadow: none;
        }

        .admin-button.danger {
          background: #ef4444;
          box-shadow: none;
        }

        .admin-message {
          margin-top: 14px;
          margin-bottom: 14px;
          border-radius: 14px;
          padding: 12px 14px;
          background: #ecfdf5;
          color: #047857;
          font-weight: 800;
          font-size: 14px;
        }

        .admin-toolbar {
          display: flex;
          gap: 12px;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .admin-search {
          width: min(380px, 100%);
        }

        .admin-table-wrap {
          overflow-x: auto;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 760px;
        }

        .admin-table th,
        .admin-table td {
          padding: 15px 14px;
          border-bottom: 1px solid #e2e8f0;
          text-align: left;
          vertical-align: middle;
        }

        .admin-table th {
          background: #f8fafc;
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .admin-table tr:last-child td {
          border-bottom: 0;
        }

        .admin-badge {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 900;
        }

        .admin-badge.active {
          background: #dcfce7;
          color: #166534;
        }

        .admin-badge.inactive {
          background: #fee2e2;
          color: #991b1b;
        }

        .admin-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .admin-empty {
          text-align: center;
          color: #64748b;
          padding: 40px 20px;
        }

        @media (max-width: 980px) {
          .admin-page {
            grid-template-columns: 1fr;
          }

          .admin-sidebar {
            position: relative;
            height: auto;
            border-radius: 0 0 24px 24px;
          }

          .admin-nav {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .admin-logout {
            margin-top: 18px;
          }

          .admin-main {
            padding: 22px;
          }

          .admin-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .admin-nav {
            grid-template-columns: 1fr;
          }

          .admin-toolbar {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </main>
  );
}