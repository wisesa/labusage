"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AdminShell from "../_components/AdminShell";
import RefreshButton from "../_components/RefreshButton";

type MataKuliah = {
  id: string;
  kode: string;
  nama: string;
  active: boolean;
};

export default function MataKuliahPage() {
  const [items, setItems] = useState<MataKuliah[]>([]);
  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [active, setActive] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKode, setEditKode] = useState("");
  const [editNama, setEditNama] = useState("");
  const [editActive, setEditActive] = useState(true);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const sorted = [...items].sort((a, b) => {
      const kodeCompare = a.kode.localeCompare(b.kode, "id");
      if (kodeCompare !== 0) return kodeCompare;
      return a.nama.localeCompare(b.nama, "id");
    });

    if (!keyword) return sorted;

    return sorted.filter((item) =>
      [item.kode, item.nama].join(" ").toLowerCase().includes(keyword)
    );
  }, [items, search]);

  useEffect(() => {
    loadItems();
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
      window.location.href = "/admin/login?next=/admin/mata-kuliah";
      return null;
    }

    if (!response.ok) {
      throw new Error(data.error || "Request gagal.");
    }

    return data;
  }

  async function loadItems() {
    setLoading(true);
    setMessage("");

    try {
      const data = await requestApi("/api/admin/mata-kuliah");
      if (data) setItems(data.mata_kuliah || []);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Gagal memuat mata kuliah."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();

    if (!nama.trim()) {
      setMessage("Nama mata kuliah wajib diisi.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await requestApi("/api/admin/mata-kuliah", {
        method: "POST",
        body: JSON.stringify({
          kode: kode.trim(),
          nama: nama.trim(),
          active,
        }),
      });

      setKode("");
      setNama("");
      setActive(true);
      setMessage("Mata kuliah berhasil ditambahkan.");
      await loadItems();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Gagal menambah mata kuliah."
      );
    } finally {
      setLoading(false);
    }
  }

  function startEdit(item: MataKuliah) {
    setEditingId(item.id);
    setEditKode(item.kode || "");
    setEditNama(item.nama || "");
    setEditActive(item.active !== false);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditKode("");
    setEditNama("");
    setEditActive(true);
  }

  async function handleUpdate(id: string) {
    if (!editNama.trim()) {
      setMessage("Nama mata kuliah wajib diisi.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await requestApi(`/api/admin/mata-kuliah/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          kode: editKode.trim(),
          nama: editNama.trim(),
          active: editActive,
        }),
      });

      cancelEdit();
      setMessage("Mata kuliah berhasil diperbarui.");
      await loadItems();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui mata kuliah."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, namaMataKuliah: string) {
    const ok = window.confirm(`Hapus mata kuliah "${namaMataKuliah}"?`);
    if (!ok) return;

    setLoading(true);
    setMessage("");

    try {
      await requestApi(`/api/admin/mata-kuliah/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      setMessage("Mata kuliah berhasil dihapus.");
      await loadItems();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Gagal menghapus mata kuliah."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminShell
      title="Master Mata Kuliah"
      description="Kelola daftar mata kuliah yang digunakan pada dashboard penggunaan lab dan export PDF."
    >
      <div className="admin-grid">
        <section className="admin-card">
          <h2>Tambah Mata Kuliah</h2>
          <p>Mata kuliah aktif akan muncul di dropdown dashboard penggunaan lab.</p>

          <form className="admin-form" onSubmit={handleCreate}>
            <div className="admin-field">
              <label>Kode</label>
              <input
                className="admin-input"
                value={kode}
                onChange={(event) => setKode(event.target.value)}
                placeholder="Contoh: MK-001"
              />
            </div>

            <div className="admin-field">
              <label>Nama Mata Kuliah</label>
              <input
                className="admin-input"
                value={nama}
                onChange={(event) => setNama(event.target.value)}
                placeholder="Contoh: Pemrograman Dasar"
              />
            </div>

            <label className="admin-check">
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
              />
              Mata kuliah aktif
            </label>

            <button className="admin-button" disabled={loading}>
              {loading ? "Menyimpan..." : "Tambah Mata Kuliah"}
            </button>
          </form>

          {message && <div className="admin-message">{message}</div>}
        </section>

        <section className="admin-card">
          <div className="admin-toolbar">
            <div>
              <h2>Daftar Mata Kuliah</h2>
              <p>Total {items.length} data mata kuliah.</p>
            </div>

            <RefreshButton loading={loading} onClick={loadItems} />
          </div>

          <input
            className="admin-input admin-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari kode atau nama mata kuliah..."
          />

          <div style={{ height: 16 }} />

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Nama Mata Kuliah</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={4} className="admin-empty">
                      Belum ada mata kuliah yang cocok.
                    </td>
                  </tr>
                )}

                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {editingId === item.id ? (
                        <input
                          className="admin-input"
                          value={editKode}
                          onChange={(event) => setEditKode(event.target.value)}
                        />
                      ) : (
                        <strong>{item.kode || "-"}</strong>
                      )}
                    </td>

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