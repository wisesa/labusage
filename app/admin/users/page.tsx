"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AdminShell from "../_components/AdminShell";

type User = {
  username: string;
  active: boolean;
  last_login_at?: string | null;
  last_login_lab?: string;
  last_login_pengajar?: string;
  updated_at?: string | null;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [active, setActive] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [editActive, setEditActive] = useState(true);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return users;

    return users.filter((item) =>
      [
        item.username,
        item.last_login_lab || "",
        item.last_login_pengajar || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [users, search]);

  useEffect(() => {
    loadUsers();
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
      window.location.href = "/admin/login?next=/admin/users";
      return null;
    }

    if (!response.ok) {
      throw new Error(data.error || "Request gagal.");
    }

    return data;
  }

  async function loadUsers() {
    setLoading(true);
    setMessage("");

    try {
      const data = await requestApi("/api/admin/users");
      if (data) setUsers(data.users || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memuat user.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();

    if (!username.trim() || !password) {
      setMessage("Username dan password wajib diisi.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await requestApi("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          username: username.trim(),
          password,
          active,
        }),
      });

      setUsername("");
      setPassword("");
      setActive(true);
      setMessage("User berhasil dibuat.");
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal membuat user.");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(user: User) {
    setEditingUsername(user.username);
    setEditPassword("");
    setEditActive(user.active !== false);
  }

  function cancelEdit() {
    setEditingUsername(null);
    setEditPassword("");
    setEditActive(true);
  }

  async function handleUpdate(targetUsername: string) {
    setLoading(true);
    setMessage("");

    try {
      await requestApi(`/api/admin/users/${encodeURIComponent(targetUsername)}`, {
        method: "PATCH",
        body: JSON.stringify({
          password: editPassword,
          active: editActive,
        }),
      });

      cancelEdit();
      setMessage("User berhasil diperbarui.");
      await loadUsers();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Gagal memperbarui user."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(targetUsername: string) {
    const ok = window.confirm(`Hapus user "${targetUsername}"?`);
    if (!ok) return;

    setLoading(true);
    setMessage("");

    try {
      await requestApi(`/api/admin/users/${encodeURIComponent(targetUsername)}`, {
        method: "DELETE",
      });

      setMessage("User berhasil dihapus.");
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menghapus user.");
    } finally {
      setLoading(false);
    }
  }

  function formatDate(value?: string | null) {
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
      title="Kelola User Login Client"
      description="Buat akun mahasiswa, ubah password, nonaktifkan akun, dan pantau login terakhir dari komputer client."
    >
      <div className="admin-grid">
        <section className="admin-card">
          <h2>Tambah User</h2>
          <p>Password otomatis disimpan sebagai hash SHA-256.</p>

          <form className="admin-form" onSubmit={handleCreate}>
            <div className="admin-field">
              <label>Username</label>
              <input
                className="admin-input"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Contoh: 231001"
              />
            </div>

            <div className="admin-field">
              <label>Password</label>
              <input
                className="admin-input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password mahasiswa"
              />
            </div>

            <label className="admin-check">
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
              />
              User aktif
            </label>

            <button className="admin-button" disabled={loading}>
              {loading ? "Menyimpan..." : "Buat User"}
            </button>
          </form>

          {message && <div className="admin-message">{message}</div>}
        </section>

        <section className="admin-card">
          <div className="admin-toolbar">
            <div>
              <h2>Daftar User</h2>
              <p>Total {users.length} akun terdaftar.</p>
            </div>

            <button
              type="button"
              className="admin-button secondary"
              onClick={loadUsers}
              disabled={loading}
            >
              {loading ? "Memuat..." : "Muat Ulang"}
            </button>
          </div>

          <input
            className="admin-input admin-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari username, lab, atau pengajar..."
          />

          <div style={{ height: 16 }} />

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Status</th>
                  <th>Login Terakhir</th>
                  <th>Lab</th>
                  <th>Pengajar</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="admin-empty">
                      Belum ada user yang cocok.
                    </td>
                  </tr>
                )}

                {filteredUsers.map((user) => (
                  <tr key={user.username}>
                    <td>
                      <strong>{user.username}</strong>
                    </td>

                    <td>
                      {editingUsername === user.username ? (
                        <label className="admin-check">
                          <input
                            type="checkbox"
                            checked={editActive}
                            onChange={(event) =>
                              setEditActive(event.target.checked)
                            }
                          />
                          Aktif
                        </label>
                      ) : user.active !== false ? (
                        <span className="admin-badge active">Aktif</span>
                      ) : (
                        <span className="admin-badge inactive">Nonaktif</span>
                      )}
                    </td>

                    <td>{formatDate(user.last_login_at)}</td>
                    <td>{user.last_login_lab || "-"}</td>
                    <td>{user.last_login_pengajar || "-"}</td>

                    <td>
                      {editingUsername === user.username ? (
                        <div className="admin-actions">
                          <input
                            className="admin-input"
                            style={{ width: 180 }}
                            type="password"
                            value={editPassword}
                            onChange={(event) =>
                              setEditPassword(event.target.value)
                            }
                            placeholder="Password baru"
                          />

                          <button
                            type="button"
                            className="admin-button"
                            onClick={() => handleUpdate(user.username)}
                            disabled={loading}
                          >
                            Simpan
                          </button>

                          <button
                            type="button"
                            className="admin-button secondary"
                            onClick={cancelEdit}
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <div className="admin-actions">
                          <button
                            type="button"
                            className="admin-button secondary"
                            onClick={() => startEdit(user)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="admin-button danger"
                            onClick={() => handleDelete(user.username)}
                          >
                            Hapus
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}