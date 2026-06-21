"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AdminShell from "../_components/AdminShell";
import RefreshButton from "../_components/RefreshButton";

type Lab = {
  id: string;
  nama: string;
  active: boolean;
};

export default function LabsPage() {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [nama, setNama] = useState("");
  const [active, setActive] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNama, setEditNama] = useState("");
  const [editActive, setEditActive] = useState(true);

  const filteredLabs = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const sorted = [...labs].sort((a, b) =>
      a.nama.localeCompare(b.nama, "id")
    );

    if (!keyword) return sorted;

    return sorted.filter((item) =>
      item.nama.toLowerCase().includes(keyword)
    );
  }, [labs, search]);

  useEffect(() => {
    loadLabs();
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
      window.location.href = "/admin/login?next=/admin/labs";
      return null;
    }

    if (!response.ok) {
      throw new Error(data.error || "Request gagal.");
    }

    return data;
  }

  async function loadLabs() {
    setLoading(true);
    setMessage("");

    try {
      const data = await requestApi("/api/admin/labs");
      if (data) setLabs(data.labs || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memuat lab.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();

    if (!nama.trim()) {
      setMessage("Nama lab wajib diisi.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await requestApi("/api/admin/labs", {
        method: "POST",
        body: JSON.stringify({
          nama: nama.trim(),
          active,
        }),
      });

      setNama("");
      setActive(true);
      setMessage("Lab berhasil ditambahkan.");
      await loadLabs();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menambah lab.");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(item: Lab) {
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
      setMessage("Nama lab wajib diisi.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await requestApi(`/api/admin/labs/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          nama: editNama.trim(),
          active: editActive,
        }),
      });

      cancelEdit();
      setMessage("Lab berhasil diperbarui.");
      await loadLabs();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Gagal memperbarui lab."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, namaLab: string) {
    const ok = window.confirm(`Hapus lab "${namaLab}"?`);
    if (!ok) return;

    setLoading(true);
    setMessage("");

    try {
      await requestApi(`/api/admin/labs/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      setMessage("Lab berhasil dihapus.");
      await loadLabs();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menghapus lab.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminShell
      title="Master Lab"
      description="Kelola daftar lab yang digunakan aplikasi client Python untuk menandai lokasi login mahasiswa."
    >
      <div className="admin-grid">
        <section className="admin-card">
          <h2>Tambah Lab</h2>
          <p>Lab aktif dapat dipilih di aplikasi client Python saat setting lab.</p>

          <form className="admin-form" onSubmit={handleCreate}>
            <div className="admin-field">
              <label>Nama Lab</label>
              <input
                className="admin-input"
                value={nama}
                onChange={(event) => setNama(event.target.value)}
                placeholder="Contoh: Lab Komputer 1"
              />
            </div>

            <label className="admin-check">
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
              />
              Lab aktif
            </label>

            <button className="admin-button" disabled={loading}>
              {loading ? "Menyimpan..." : "Tambah Lab"}
            </button>
          </form>

          {message && <div className="admin-message">{message}</div>}
        </section>

        <section className="admin-card">
          <div className="admin-toolbar">
            <div>
              <h2>Daftar Lab</h2>
              <p>Total {labs.length} data lab.</p>
            </div>

            <RefreshButton loading={loading} onClick={loadLabs} />
          </div>

          <input
            className="admin-input admin-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama lab..."
          />

          <div style={{ height: 16 }} />

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nama Lab</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {filteredLabs.length === 0 && (
                  <tr>
                    <td colSpan={3} className="admin-empty">
                      Belum ada lab yang cocok.
                    </td>
                  </tr>
                )}

                {filteredLabs.map((item) => (
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