"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as XLSX from "xlsx";
import AdminShell from "../_components/AdminShell";
import RefreshButton from "../_components/RefreshButton";

type User = {
  username: string;
  nim: string;
  nama: string;
  kelas: string;
  password: string;
  active: boolean;
  last_login_at?: string | null;
  last_login_lab?: string;
  last_login_pengajar?: string;
  updated_at?: string | null;
};

type ImportRow = {
  nim: string;
  nama: string;
  kelas: string;
  username: string;
  password: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);

  const [nim, setNim] = useState("");
  const [nama, setNama] = useState("");
  const [kelas, setKelas] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [active, setActive] = useState(true);

  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<50 | 100>(50);
  const [currentPage, setCurrentPage] = useState(1);

  const [message, setMessage] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  const [editNim, setEditNim] = useState("");
  const [editNama, setEditNama] = useState("");
  const [editKelas, setEditKelas] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return users;

    return users.filter((item) =>
      [
        item.nim,
        item.nama,
        item.kelas,
        item.username,
        item.password,
        item.last_login_lab || "",
        item.last_login_pengajar || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [users, search]);

  const totalFilteredUsers = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredUsers / pageSize));

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage, pageSize]);

  const paginationStart =
    totalFilteredUsers === 0 ? 0 : (currentPage - 1) * pageSize + 1;

  const paginationEnd = Math.min(currentPage * pageSize, totalFilteredUsers);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function openAddModal() {
    setIsAddOpen(true);
    setModalMessage("");
  }

  function closeAddModal() {
    if (loading) return;

    setIsAddOpen(false);
    setModalMessage("");
    setImportRows([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

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
      setMessage(
        error instanceof Error ? error.message : "Gagal memuat mahasiswa."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();

    if (
      !nim.trim() ||
      !nama.trim() ||
      !kelas.trim() ||
      !username.trim() ||
      !password
    ) {
      setModalMessage("NIM, nama, kelas, username, dan password wajib diisi.");
      return;
    }

    setLoading(true);
    setModalMessage("");

    try {
      await requestApi("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          nim: nim.trim(),
          nama: nama.trim(),
          kelas: kelas.trim(),
          username: username.trim(),
          password,
          active,
        }),
      });

      setNim("");
      setNama("");
      setKelas("");
      setUsername("");
      setPassword("");
      setActive(true);
      setModalMessage("Mahasiswa berhasil dibuat.");
      await loadUsers();
    } catch (error) {
      setModalMessage(
        error instanceof Error ? error.message : "Gagal membuat mahasiswa."
      );
    } finally {
      setLoading(false);
    }
  }

  function startEdit(user: User) {
    setEditingUsername(user.username);
    setEditNim(user.nim || "");
    setEditNama(user.nama || "");
    setEditKelas(user.kelas || "");
    setEditPassword("");
    setEditActive(user.active !== false);
    setShowEditPassword(false);
  }

  function cancelEdit() {
    setEditingUsername(null);
    setEditNim("");
    setEditNama("");
    setEditKelas("");
    setEditPassword("");
    setEditActive(true);
    setShowEditPassword(false);
  }

  async function handleUpdate(targetUsername: string) {
    setLoading(true);
    setMessage("");

    try {
      await requestApi(`/api/admin/users/${encodeURIComponent(targetUsername)}`, {
        method: "PATCH",
        body: JSON.stringify({
          nim: editNim,
          nama: editNama,
          kelas: editKelas,
          password: editPassword,
          active: editActive,
        }),
      });

      cancelEdit();
      setMessage("Mahasiswa berhasil diperbarui.");
      await loadUsers();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Gagal memperbarui mahasiswa."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(targetUsername: string) {
    const ok = window.confirm(`Hapus mahasiswa "${targetUsername}"?`);
    if (!ok) return;

    setLoading(true);
    setMessage("");

    try {
      await requestApi(`/api/admin/users/${encodeURIComponent(targetUsername)}`, {
        method: "DELETE",
      });

      setMessage("Mahasiswa berhasil dihapus.");
      await loadUsers();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Gagal menghapus mahasiswa."
      );
    } finally {
      setLoading(false);
    }
  }

  function normalizeExcelRow(raw: Record<string, unknown>): ImportRow {
    const lowerMap = Object.fromEntries(
      Object.entries(raw).map(([key, value]) => [
        key.trim().toLowerCase(),
        value,
      ])
    );

    return {
      nim: String(lowerMap.nim ?? "").trim(),
      nama: String(lowerMap.nama ?? "").trim(),
      kelas: String(lowerMap.kelas ?? "").trim(),
      username: String(lowerMap.username ?? "").trim(),
      password: String(lowerMap.password ?? "").trim(),
    };
  }

  async function handleExcelFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setModalMessage("");

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        throw new Error("Sheet Excel tidak ditemukan.");
      }

      const worksheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        worksheet,
        {
          defval: "",
        }
      );

      const rows = rawRows
        .map(normalizeExcelRow)
        .filter(
          (row) =>
            row.nim || row.nama || row.kelas || row.username || row.password
        );

      setImportRows(rows);
      setModalMessage(`File Excel terbaca: ${rows.length} baris.`);
    } catch (error) {
      setImportRows([]);
      setModalMessage(
        error instanceof Error ? error.message : "Gagal membaca file Excel."
      );
    }
  }

  async function handleImportExcel() {
    if (importRows.length === 0) {
      setModalMessage("Pilih file Excel terlebih dahulu.");
      return;
    }

    const ok = window.confirm(
      `Import ${importRows.length} data mahasiswa? Data dengan username sama akan diperbarui.`
    );

    if (!ok) return;

    setLoading(true);
    setModalMessage("");

    try {
      const data = await requestApi("/api/admin/users/import", {
        method: "POST",
        body: JSON.stringify({
          rows: importRows,
        }),
      });

      if (!data) return;

      setImportRows([]);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setModalMessage(
        `Import selesai. Berhasil: ${data.imported}, dilewati: ${data.skipped}.`
      );

      await loadUsers();
    } catch (error) {
      setModalMessage(
        error instanceof Error ? error.message : "Gagal import Excel."
      );
    } finally {
      setLoading(false);
    }
  }

  function downloadTemplate() {
    const rows = [
      {
        nim: "230001",
        nama: "Budi Santoso",
        kelas: "1A",
        username: "230001",
        password: "password123",
      },
      {
        nim: "230002",
        nama: "Siti Aminah",
        kelas: "1A",
        username: "230002",
        password: "password123",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "mahasiswa");
    XLSX.writeFile(workbook, "template-import-mahasiswa.xlsx");
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
      title="Kelola Mahasiswa"
      description="Kelola data mahasiswa, akun login client, dan riwayat login terakhir."
    >
      <section className="admin-card list-card">
        <div className="admin-toolbar">
          <div>
            <h2>Daftar Mahasiswa</h2>
            <p>Total {users.length} mahasiswa terdaftar.</p>
          </div>

          <div className="toolbar-actions">
            <button
              type="button"
              className="admin-button"
              onClick={openAddModal}
            >
              + Tambah
            </button>

            <RefreshButton loading={loading} onClick={loadUsers} />
          </div>
        </div>

        {message && <div className="admin-message">{message}</div>}

        <input
          className="admin-input admin-search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setCurrentPage(1);
          }}
          placeholder="Cari NIM, nama, kelas, username, password, lab, atau pengajar..."
        />

        <div style={{ height: 16 }} />

        <div className="pagination-bar">
          <div className="pagination-info">
            Menampilkan <strong>{paginationStart}</strong>-
            <strong>{paginationEnd}</strong> dari{" "}
            <strong>{totalFilteredUsers}</strong> data
          </div>

          <div className="pagination-controls">
            <label className="page-size-label">
              <span>Per halaman</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value) as 50 | 100);
                  setCurrentPage(1);
                }}
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>

            <button
              type="button"
              className="admin-button secondary"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage <= 1}
            >
              Sebelumnya
            </button>

            <div className="page-number">
              Halaman <strong>{currentPage}</strong> / {totalPages}
            </div>

            <button
              type="button"
              className="admin-button secondary"
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
              disabled={currentPage >= totalPages}
            >
              Berikutnya
            </button>
          </div>
        </div>

        <div style={{ height: 16 }} />

        <div className="admin-table-wrap">
          <table className="admin-table mahasiswa-table">
            <thead>
              <tr>
                <th>NIM</th>
                <th>Nama</th>
                <th>Kelas</th>
                <th>Username</th>
                <th>Password</th>
                <th>Status</th>
                <th>Login Terakhir</th>
                <th>Lab</th>
                <th>Pengajar</th>
                <th>Aksi</th>
              </tr>
            </thead>

            <tbody>
              {paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan={10} className="admin-empty">
                    Belum ada mahasiswa yang cocok.
                  </td>
                </tr>
              )}

              {paginatedUsers.map((user) => (
                <tr key={user.username}>
                  <td>
                    {editingUsername === user.username ? (
                      <input
                        className="admin-input table-input"
                        value={editNim}
                        onChange={(event) => setEditNim(event.target.value)}
                      />
                    ) : (
                      <strong>{user.nim || "-"}</strong>
                    )}
                  </td>

                  <td>
                    {editingUsername === user.username ? (
                      <input
                        className="admin-input table-input"
                        value={editNama}
                        onChange={(event) => setEditNama(event.target.value)}
                      />
                    ) : (
                      user.nama || "-"
                    )}
                  </td>

                  <td>
                    {editingUsername === user.username ? (
                      <input
                        className="admin-input table-input"
                        value={editKelas}
                        onChange={(event) => setEditKelas(event.target.value)}
                      />
                    ) : (
                      user.kelas || "-"
                    )}
                  </td>

                  <td>
                    <strong>{user.username}</strong>
                  </td>

                  <td>
                    <code className="password-value">
                      {user.password || "-"}
                    </code>
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
                        <div className="password-row table-password-row">
                          <input
                            className="admin-input"
                            style={{ width: 190 }}
                            type={showEditPassword ? "text" : "password"}
                            value={editPassword}
                            onChange={(event) =>
                              setEditPassword(event.target.value)
                            }
                            placeholder="Password baru"
                          />

                          <button
                            type="button"
                            className="admin-button secondary reveal-button"
                            onClick={() =>
                              setShowEditPassword((value) => !value)
                            }
                          >
                            {showEditPassword ? "Hide" : "Show"}
                          </button>
                        </div>

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

      {isAddOpen && (
        <div className="modal-backdrop" onMouseDown={closeAddModal}>
          <div
            className="modal-card"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Tambah Mahasiswa</h2>
                <p>Tambah manual atau import dari Excel.</p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeAddModal}
                disabled={loading}
              >
                ✕
              </button>
            </div>

            {modalMessage && <div className="admin-message">{modalMessage}</div>}

            <div className="modal-grid">
              <section className="modal-section">
                <h3>Input Manual</h3>

                <form className="admin-form" onSubmit={handleCreate}>
                  <div className="admin-field">
                    <label>NIM</label>
                    <input
                      className="admin-input"
                      value={nim}
                      onChange={(event) => setNim(event.target.value)}
                      placeholder="Contoh: 230001"
                    />
                  </div>

                  <div className="admin-field">
                    <label>Nama</label>
                    <input
                      className="admin-input"
                      value={nama}
                      onChange={(event) => setNama(event.target.value)}
                      placeholder="Nama mahasiswa"
                    />
                  </div>

                  <div className="admin-field">
                    <label>Kelas</label>
                    <input
                      className="admin-input"
                      value={kelas}
                      onChange={(event) => setKelas(event.target.value)}
                      placeholder="Contoh: 1A"
                    />
                  </div>

                  <div className="admin-field">
                    <label>Username</label>
                    <input
                      className="admin-input"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="Username login"
                    />
                  </div>

                  <div className="admin-field">
                    <label>Password</label>
                    <div className="password-row">
                      <input
                        className="admin-input"
                        type={showCreatePassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Password mahasiswa"
                      />

                      <button
                        type="button"
                        className="admin-button secondary reveal-button"
                        onClick={() =>
                          setShowCreatePassword((value) => !value)
                        }
                      >
                        {showCreatePassword ? "Sembunyikan" : "Lihat"}
                      </button>
                    </div>
                  </div>

                  <label className="admin-check">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(event) => setActive(event.target.checked)}
                    />
                    Mahasiswa aktif
                  </label>

                  <button className="admin-button" disabled={loading}>
                    {loading ? "Menyimpan..." : "Simpan Mahasiswa"}
                  </button>
                </form>
              </section>

              <section className="modal-section">
                <h3>Import Excel</h3>

                <p className="modal-text">
                  Upload file Excel dengan kolom nim, nama, kelas, username,
                  password. NIM tidak boleh sama.
                </p>

                <div className="excel-example">
                  <div className="excel-example-title">
                    Contoh format template Excel
                  </div>

                  <div className="excel-table-wrap">
                    <table className="excel-table">
                      <thead>
                        <tr>
                          <th>nim</th>
                          <th>nama</th>
                          <th>kelas</th>
                          <th>username</th>
                          <th>password</th>
                        </tr>
                      </thead>

                      <tbody>
                        <tr>
                          <td>230001</td>
                          <td>Budi Santoso</td>
                          <td>1A</td>
                          <td>230001</td>
                          <td>password123</td>
                        </tr>

                        <tr>
                          <td>230002</td>
                          <td>Siti Aminah</td>
                          <td>1A</td>
                          <td>230002</td>
                          <td>password123</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="import-box">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelFile}
                  />

                  <div className="admin-actions">
                    <button
                      type="button"
                      className="admin-button"
                      onClick={handleImportExcel}
                      disabled={loading || importRows.length === 0}
                    >
                      Import{" "}
                      {importRows.length > 0 ? `(${importRows.length})` : ""}
                    </button>

                    <button
                      type="button"
                      className="admin-button secondary"
                      onClick={downloadTemplate}
                    >
                      Download Template
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .list-card {
          width: 100%;
        }

        .toolbar-actions {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .password-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .password-row .admin-input {
          flex: 1;
        }

        .reveal-button {
          min-width: 96px;
          box-shadow: none;
        }

        .mahasiswa-table {
          min-width: 1320px;
        }

        .table-input {
          min-width: 140px;
        }

        .password-value {
          display: inline-block;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 7px 9px;
          color: #0f172a;
          font-size: 13px;
          font-weight: 800;
          white-space: nowrap;
        }

        .table-password-row {
          align-items: center;
        }

        .pagination-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 18px;
          padding: 12px 14px;
        }

        .pagination-info {
          color: #64748b;
          font-size: 14px;
          font-weight: 800;
        }

        .pagination-info strong {
          color: #0f172a;
        }

        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .page-size-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #64748b;
          font-size: 13px;
          font-weight: 900;
        }

        .page-size-label select {
          height: 42px;
          border: 1px solid #dbeafe;
          background: white;
          color: #0f172a;
          border-radius: 12px;
          padding: 0 10px;
          font-weight: 900;
          outline: none;
        }

        .page-size-label select:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
        }

        .page-number {
          color: #475569;
          font-size: 14px;
          font-weight: 800;
          padding: 0 6px;
        }

        .page-number strong {
          color: #0f172a;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(15, 23, 42, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          backdrop-filter: blur(6px);
        }

        .modal-card {
          width: min(1040px, 100%);
          max-height: calc(100vh - 48px);
          overflow: auto;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 28px;
          padding: 26px;
          box-shadow: 0 30px 90px rgba(15, 23, 42, 0.28);
        }

        .modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }

        .modal-header h2 {
          margin: 0;
          color: #0f172a;
          font-size: 26px;
          letter-spacing: -0.04em;
        }

        .modal-header p {
          margin: 7px 0 0;
          color: #64748b;
        }

        .modal-close {
          width: 42px;
          height: 42px;
          border: 0;
          border-radius: 14px;
          background: #f1f5f9;
          color: #0f172a;
          cursor: pointer;
          font-weight: 900;
          font-size: 18px;
        }

        .modal-close:hover {
          background: #e2e8f0;
        }

        .modal-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .modal-section {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 22px;
          padding: 20px;
        }

        .modal-section h3 {
          margin: 0 0 12px;
          color: #0f172a;
          font-size: 20px;
          letter-spacing: -0.03em;
        }

        .modal-text {
          margin: 0 0 14px;
          color: #64748b;
          line-height: 1.6;
        }

        .import-box {
          display: grid;
          gap: 16px;
        }

        .import-box input[type="file"] {
          width: 100%;
          border: 1px dashed #cbd5e1;
          background: white;
          border-radius: 16px;
          padding: 16px;
          color: #334155;
          font-weight: 800;
        }

        .excel-example {
          border: 1px solid #dbeafe;
          background: white;
          border-radius: 18px;
          padding: 14px;
          margin-bottom: 16px;
        }

        .excel-example-title {
          color: #0f172a;
          font-size: 13px;
          font-weight: 900;
          margin-bottom: 10px;
        }

        .excel-table-wrap {
          overflow-x: auto;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          background: white;
        }

        .excel-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 560px;
        }

        .excel-table th,
        .excel-table td {
          border-bottom: 1px solid #e2e8f0;
          padding: 10px 12px;
          text-align: left;
          font-size: 13px;
        }

        .excel-table th {
          background: #eff6ff;
          color: #1d4ed8;
          font-weight: 900;
          text-transform: lowercase;
        }

        .excel-table tr:last-child td {
          border-bottom: none;
        }

        @media (max-width: 980px) {
          .modal-grid {
            grid-template-columns: 1fr;
          }

          .admin-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .toolbar-actions {
            width: 100%;
          }

          .toolbar-actions .admin-button {
            flex: 1;
          }
        }

        @media (max-width: 560px) {
          .modal-card {
            padding: 18px;
            border-radius: 22px;
          }

          .password-row {
            flex-direction: column;
            align-items: stretch;
          }

          .reveal-button {
            width: 100%;
          }

          .pagination-bar {
            align-items: stretch;
          }

          .pagination-controls {
            display: grid;
            width: 100%;
          }

          .pagination-controls .admin-button,
          .page-size-label,
          .page-size-label select {
            width: 100%;
          }

          .page-size-label {
            justify-content: space-between;
          }

          .page-number {
            text-align: center;
          }
        }
      `}</style>
    </AdminShell>
  );
}