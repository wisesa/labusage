"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AdminShell from "../_components/AdminShell";

type Pengajar = {
  id: string;
  nama: string;
  active: boolean;
};

export default function PengajarPage() {
  const [pengajar, setPengajar] = useState<Pengajar[]>([]);
  const [nama, setNama] = useState("");
  const [active, setActive] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNama, setEditNama] = useState("");
  const [editActive, setEditActive] = useState(true);

  const filteredPengajar = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const sorted = [...pengajar].sort((a, b) =>
      a.nama.localeCompare(b.nama, "id")
    );

    if (!keyword) return sorted;

    return sorted.filter((item) =>
      item.nama.toLowerCase().includes(keyword)
    );
  }, [pengajar, search]);

  useEffect(() => {
    loadPengajar();
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
      window.location.href = "/admin/login?next=/admin/pengajar";
      return null;
    }

    if (!response.ok) {
      throw new Error(data.error || "Request gagal.");
    }

    return data;
  }

  async function loadPengajar() {
    setLoading(true);
    setMessage("");

    try {
      const data = await requestApi("/api/admin/pengajar");
      if (data) setPengajar(data.pengajar || []);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Gagal memuat pengajar."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();

    if (!nama.trim()) {
      setMessage("Nama pengajar wajib diisi.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await requestApi("/api/admin/pengajar", {
        method: "POST",
        body: JSON.stringify({
          nama: nama.trim(),
          active,
        }),
      });

      setNama("");
      setActive(true);
      setMessage("Pengajar berhasil ditambahkan.");
      await loadPengajar();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Gagal menambah pengajar."
      );
    } finally {
      setLoading(false);
    }
  }

  function startEdit(item: Pengajar) {
    setEditingId(item.id);
    setEditNama(item.nama);
    setEditActive(item.active !== false);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditNama("");
    setEditActive(true);
  }

  async function handleUpdate(id: string) {
    if (!editNama.trim()) {
      setMessage("Nama pengajar wajib diisi.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await requestApi(`/api/admin/pengajar/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          nama: editNama.trim(),
          active: editActive,
        }),
      });

      cancelEdit();
      setMessage("Pengajar berhasil diperbarui.");
      await loadPengajar();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Gagal memperbarui pengajar."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, namaPengajar: string) {
    const ok = window.confirm(`Hapus pengajar "${namaPengajar}"?`);
    if (!ok) return;

    setLoading(true);
    setMessage("");

    try {
      await requestApi(`/api/admin/pengajar/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      setMessage("Pengajar berhasil dihapus.");
      await loadPengajar();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Gagal menghapus pengajar."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminShell
      title="Kelola Pengajar"
      description="Tambah, ubah, nonaktifkan, atau hapus daftar pengajar yang muncul di dropdown aplikasi client Python. Urutan tampil otomatis berdasarkan abjad nama."
    >
      <div className="admin-grid">
        <section className="admin-card">
          <h2>Tambah Pengajar</h2>
          <p>Pengajar aktif akan muncul pada pilihan login mahasiswa.</p>

          <form className="admin-form" onSubmit={handleCreate}>
            <div className="admin-field">
              <label>Nama Pengajar</label>
              <input
                className="admin-input"
                value={nama}
                onChange={(event) => setNama(event.target.value)}
                placeholder="Contoh: Budi Santoso"
              />
            </div>

            <label className="admin-check">
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
              />
              Pengajar aktif
            </label>

            <button className="admin-button" disabled={loading}>
              {loading ? "Menyimpan..." : "Tambah Pengajar"}
            </button>
          </form>

          {message && <div className="admin-message">{message}</div>}
        </section>

        <section className="admin-card">
          <div className="admin-toolbar">
            <div>
              <h2>Daftar Pengajar</h2>
              <p>Total {pengajar.length} data pengajar.</p>
            </div>

            <button
              type="button"
              className="admin-button secondary"
              onClick={loadPengajar}
              disabled={loading}
            >
              {loading ? "Memuat..." : "Muat Ulang"}
            </button>
          </div>

          <input
            className="admin-input admin-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama pengajar..."
          />

          <div style={{ height: 16 }} />

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {filteredPengajar.length === 0 && (
                  <tr>
                    <td colSpan={3} className="admin-empty">
                      Belum ada pengajar yang cocok.
                    </td>
                  </tr>
                )}

                {filteredPengajar.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {editingId === item.id ? (
                        <input
                          className="admin-input"
                          value={editNama}
                          onChange={(event) => setEditNama(event.target.value)}
                        />
                      ) : (
                        <strong>{item.nama}</strong>
                      )}
                    </td>

                    <td>
                      {editingId === item.id ? (
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
                      ) : item.active !== false ? (
                        <span className="admin-badge active">Aktif</span>
                      ) : (
                        <span className="admin-badge inactive">Nonaktif</span>
                      )}
                    </td>

                    <td>
                      {editingId === item.id ? (
                        <div className="admin-actions">
                          <button
                            type="button"
                            className="admin-button"
                            onClick={() => handleUpdate(item.id)}
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
                            onClick={() => startEdit(item)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="admin-button danger"
                            onClick={() => handleDelete(item.id, item.nama)}
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