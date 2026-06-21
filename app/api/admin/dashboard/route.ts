import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import {
  getAdminFirestore,
  getLabsCollectionName,
  getLoginLogsCollectionName,
  getMataKuliahCollectionName,
  getReportSettingsCollectionName,
  getUsersCollectionName,
} from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

type LabRow = {
  id: string;
  nama: string;
  active: boolean;
};

type MataKuliahRow = {
  id: string;
  kode: string;
  nama: string;
  active: boolean;
};

type LoginSession = {
  id: string;
  session_id: string;
  username: string;
  nim: string;
  nama: string;
  kelas: string;
  lab_id: string;
  lab_name: string;
  pengajar_id: string;
  pengajar: string;
  mata_kuliah_id: string;
  mata_kuliah_kode: string;
  mata_kuliah_nama: string;
  login_at: string | null;
  last_active_at: string | null;
  hostname: string;
  device_id: string;
  source: "login_logs" | "users_last_login";
};

const DEFAULT_REPORT_SETTINGS = {
  plp_title: "PLP/TEKNISI",
  plp_name: "Martadi",
  plp_signature_data_url: "",
  kepala_lab_title: "Kepala lab Komputer Gedung Kuliah Bersama",
  kepala_lab_name: "",
  kepala_lab_signature_data_url: "",
};

function getLoginSessionsCollectionName() {
  return process.env.FIRESTORE_LOGIN_SESSIONS_COLLECTION || "login_sessions";
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function serializeDate(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return null;
}

function getTimezoneOffsetMinutes() {
  const offset = Number(process.env.DASHBOARD_TZ_OFFSET_MINUTES || 420);
  return Number.isFinite(offset) ? offset : 420;
}

function getTodayInputDateByOffset(offsetMinutes: number) {
  const nowUtcMs = Date.now();
  const shiftedNow = new Date(nowUtcMs + offsetMinutes * 60 * 1000);

  const year = shiftedNow.getUTCFullYear();
  const month = String(shiftedNow.getUTCMonth() + 1).padStart(2, "0");
  const date = String(shiftedNow.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${date}`;
}

function normalizeDateParam(value: string | null) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;

  return value;
}

function getDateRangeUtc(request: NextRequest) {
  const offsetMinutes = getTimezoneOffsetMinutes();

  const selectedDate =
    normalizeDateParam(request.nextUrl.searchParams.get("date")) ||
    getTodayInputDateByOffset(offsetMinutes);

  const [year, month, date] = selectedDate.split("-").map(Number);

  const startUtcMs =
    Date.UTC(year, month - 1, date, 0, 0, 0, 0) -
    offsetMinutes * 60 * 1000;

  const endUtcMs = startUtcMs + 24 * 60 * 60 * 1000;

  return {
    selectedDate,
    startDate: new Date(startUtcMs),
    endDate: new Date(endUtcMs),
  };
}

function formatDateLabel(date: Date) {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function getComputerIdentityValue(data: Record<string, unknown>) {
  const computerIdentity = data.computer_identity || data.last_login_computer;

  if (computerIdentity && typeof computerIdentity === "object") {
    return computerIdentity as Record<string, unknown>;
  }

  return {};
}

function normalizeSessionMinute(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function getSessionKey(session: LoginSession) {
  return [
    session.username.trim().toLowerCase(),
    session.lab_id.trim().toLowerCase() || session.lab_name.trim().toLowerCase(),
    session.pengajar_id.trim().toLowerCase() ||
      session.pengajar.trim().toLowerCase(),
    session.mata_kuliah_id.trim().toLowerCase() ||
      session.mata_kuliah_nama.trim().toLowerCase(),
    normalizeSessionMinute(session.login_at),
  ].join("|");
}

function normalizeReportSettings(data: Record<string, unknown> = {}) {
  return {
    plp_title: String(data.plp_title || DEFAULT_REPORT_SETTINGS.plp_title),
    plp_name: String(data.plp_name || DEFAULT_REPORT_SETTINGS.plp_name),
    plp_signature_data_url: String(data.plp_signature_data_url || ""),
    kepala_lab_title: String(
      data.kepala_lab_title || DEFAULT_REPORT_SETTINGS.kepala_lab_title
    ),
    kepala_lab_name: String(data.kepala_lab_name || ""),
    kepala_lab_signature_data_url: String(
      data.kepala_lab_signature_data_url || ""
    ),
  };
}

function getMataKuliahDisplayName(session: LoginSession) {
  return session.mata_kuliah_nama || "Tanpa mata kuliah";
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);

  if (!admin.ok) {
    return admin.response;
  }

  try {
    const db = getAdminFirestore();
    const { selectedDate, startDate, endDate } = getDateRangeUtc(request);

    const reportSettingsSnapshot = await db
      .collection(getReportSettingsCollectionName())
      .doc("lab_usage_pdf")
      .get();

    const reportSettings = normalizeReportSettings(
      reportSettingsSnapshot.data()
    );

    const labsSnapshot = await db.collection(getLabsCollectionName()).get();

    const labs: LabRow[] = labsSnapshot.docs
      .map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          nama: String(data.nama || data.name || doc.id),
          active: data.active !== false,
        };
      })
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"));

    const mataKuliahSnapshot = await db
      .collection(getMataKuliahCollectionName())
      .get();

    const mataKuliah: MataKuliahRow[] = mataKuliahSnapshot.docs
      .map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          kode: String(data.kode || ""),
          nama: String(data.nama || data.name || doc.id),
          active: data.active !== false,
        };
      })
      .sort((a, b) => {
        const kodeCompare = a.kode.localeCompare(b.kode, "id");
        if (kodeCompare !== 0) return kodeCompare;
        return a.nama.localeCompare(b.nama, "id");
      });

    const labById = new Map(labs.map((lab) => [lab.id, lab]));
    const labByName = new Map(
      labs.map((lab) => [lab.nama.trim().toLowerCase(), lab])
    );

    const usersSnapshot = await db.collection(getUsersCollectionName()).get();

    const userProfileByUsername = new Map(
      usersSnapshot.docs.map((doc) => {
        const data = doc.data();

        return [
          doc.id,
          {
            nim: String(data.nim || ""),
            nama: String(data.nama || ""),
            kelas: String(data.kelas || ""),
          },
        ] as const;
      })
    );

    const sessions: LoginSession[] = [];

    const logsSnapshot = await db
      .collection(getLoginLogsCollectionName())
      .where("login_at", ">=", Timestamp.fromDate(startDate))
      .where("login_at", "<", Timestamp.fromDate(endDate))
      .get();

    const loginSessionIds = Array.from(
      new Set(
        logsSnapshot.docs
          .map((doc) => String(doc.data().session_id || "").trim())
          .filter(Boolean)
      )
    );

    const loginSessionById = new Map<string, Record<string, unknown>>();

    for (const chunk of chunkArray(loginSessionIds, 300)) {
      const refs = chunk.map((sessionId) =>
        db.collection(getLoginSessionsCollectionName()).doc(sessionId)
      );

      if (refs.length === 0) continue;

      const snapshots = await db.getAll(...refs);

      for (const snapshot of snapshots) {
        if (snapshot.exists) {
          loginSessionById.set(
            snapshot.id,
            (snapshot.data() || {}) as Record<string, unknown>
          );
        }
      }
    }

    for (const doc of logsSnapshot.docs) {
      const data = doc.data();
      const computerIdentity = getComputerIdentityValue(data);
      const username = String(data.username || "");
      const profile = userProfileByUsername.get(username);
      const sessionId = String(data.session_id || "").trim();
      const loginSessionData = sessionId
        ? loginSessionById.get(sessionId) || {}
        : {};

      sessions.push({
        id: `log:${doc.id}`,
        session_id: sessionId,
        username,
        nim: String(data.nim || profile?.nim || ""),
        nama: String(data.nama || profile?.nama || ""),
        kelas: String(data.kelas || profile?.kelas || ""),
        lab_id: String(data.lab_id || ""),
        lab_name: String(data.lab_name || ""),
        pengajar_id: String(data.pengajar_id || ""),
        pengajar: String(data.pengajar || "Tanpa pengajar"),
        mata_kuliah_id: String(data.mata_kuliah_id || ""),
        mata_kuliah_kode: String(data.mata_kuliah_kode || ""),
        mata_kuliah_nama: String(data.mata_kuliah_nama || ""),
        login_at: serializeDate(data.login_at),
        last_active_at:
          serializeDate(loginSessionData.last_active_at) ||
          serializeDate(loginSessionData.last_heartbeat_at) ||
          serializeDate(data.last_active_at) ||
          serializeDate(data.login_at),
        hostname: String(computerIdentity.hostname || ""),
        device_id: String(computerIdentity.device_id || ""),
        source: "login_logs",
      });
    }

    const usersLastLoginSnapshot = await db
      .collection(getUsersCollectionName())
      .where("last_login_at", ">=", Timestamp.fromDate(startDate))
      .where("last_login_at", "<", Timestamp.fromDate(endDate))
      .get();

    const existingSessionKeys = new Set(sessions.map(getSessionKey));

    for (const doc of usersLastLoginSnapshot.docs) {
      const data = doc.data();
      const computerIdentity = getComputerIdentityValue(data);
      const fallbackUsername = String(data.username || doc.id);
      const fallbackProfile = userProfileByUsername.get(fallbackUsername);

      const fallbackSession: LoginSession = {
        id: `user:${doc.id}`,
        session_id: String(
          data.last_login_session_id || data.last_active_session_id || ""
        ),
        username: fallbackUsername,
        nim: String(data.nim || fallbackProfile?.nim || ""),
        nama: String(data.nama || fallbackProfile?.nama || ""),
        kelas: String(data.kelas || fallbackProfile?.kelas || ""),
        lab_id: String(data.last_login_lab_id || ""),
        lab_name: String(data.last_login_lab || ""),
        pengajar_id: String(data.last_login_pengajar_id || ""),
        pengajar: String(data.last_login_pengajar || "Tanpa pengajar"),
        mata_kuliah_id: String(data.last_login_mata_kuliah_id || ""),
        mata_kuliah_kode: String(data.last_login_mata_kuliah_kode || ""),
        mata_kuliah_nama: String(data.last_login_mata_kuliah_nama || ""),
        login_at: serializeDate(data.last_login_at),
        last_active_at:
          serializeDate(data.last_active_at) ||
          serializeDate(data.last_login_at),
        hostname: String(computerIdentity.hostname || ""),
        device_id: String(computerIdentity.device_id || ""),
        source: "users_last_login",
      };

      const fallbackKey = getSessionKey(fallbackSession);

      if (!existingSessionKeys.has(fallbackKey)) {
        sessions.push(fallbackSession);
        existingSessionKeys.add(fallbackKey);
      }
    }

    const labGroups = new Map<
      string,
      {
        sessions: LoginSession[];
        penggunaan: Map<string, LoginSession[]>;
      }
    >();

    for (const lab of labs) {
      labGroups.set(lab.id, {
        sessions: [],
        penggunaan: new Map(),
      });
    }

    for (const session of sessions) {
      let lab = session.lab_id ? labById.get(session.lab_id) : null;

      if (!lab && session.lab_name) {
        lab = labByName.get(session.lab_name.trim().toLowerCase()) || null;
      }

      if (!lab) continue;

      const group = labGroups.get(lab.id);
      if (!group) continue;

      group.sessions.push(session);

      const pengajarKey =
        session.pengajar_id || session.pengajar.trim().toLowerCase();

      const mataKuliahKey =
        session.mata_kuliah_id ||
        session.mata_kuliah_nama.trim().toLowerCase() ||
        "tanpa-mata-kuliah";

      const penggunaanKey = `${pengajarKey}|${mataKuliahKey}`;

      if (!group.penggunaan.has(penggunaanKey)) {
        group.penggunaan.set(penggunaanKey, []);
      }

      group.penggunaan.get(penggunaanKey)?.push(session);
    }

    const dashboardLabs = labs.map((lab) => {
      const group = labGroups.get(lab.id);
      const labSessions = group?.sessions || [];

      const uniqueUsers = new Set(
        labSessions.map((session) => session.username).filter(Boolean)
      );

      const lastLoginAt =
        labSessions
          .map((session) => session.login_at)
          .filter(Boolean)
          .sort()
          .reverse()[0] || null;

      const penggunaan = Array.from(group?.penggunaan.entries() || [])
        .map(([key, items]) => {
          const first = items[0];

          const uniquePenggunaanUsers = new Set(
            items.map((item) => item.username).filter(Boolean)
          );

          const kelas = Array.from(
            new Set(items.map((item) => item.kelas).filter(Boolean))
          ).join(", ");

          const sortedUsers = [...items].sort((a, b) => {
            const aTime = a.login_at ? new Date(a.login_at).getTime() : 0;
            const bTime = b.login_at ? new Date(b.login_at).getTime() : 0;
            return bTime - aTime;
          });

          return {
            key,
            pengajar_id: first?.pengajar_id || "",
            pengajar_nama: first?.pengajar || "Tanpa pengajar",
            mata_kuliah_id: first?.mata_kuliah_id || "",
            mata_kuliah_kode: first?.mata_kuliah_kode || "",
            mata_kuliah_nama: getMataKuliahDisplayName(first),
            kelas,
            login_count: items.length,
            unique_user_count: uniquePenggunaanUsers.size,
            users: sortedUsers,
          };
        })
        .sort((a, b) => {
          const pengajarCompare = a.pengajar_nama.localeCompare(
            b.pengajar_nama,
            "id"
          );

          if (pengajarCompare !== 0) return pengajarCompare;

          return a.mata_kuliah_nama.localeCompare(b.mata_kuliah_nama, "id");
        });

      const uniquePengajarCount = new Set(
        penggunaan.map((item) => item.pengajar_nama).filter(Boolean)
      ).size;

      return {
        id: lab.id,
        nama: lab.nama,
        active: lab.active,
        has_login_today: labSessions.length > 0,
        login_count: labSessions.length,
        unique_user_count: uniqueUsers.size,
        pengajar_count: uniquePengajarCount,
        penggunaan_count: penggunaan.length,
        last_login_at: lastLoginAt,
        penggunaan,
      };
    });

    return NextResponse.json({
      selected_date: selectedDate,
      date_label: formatDateLabel(startDate),
      start_at: startDate.toISOString(),
      end_at: endDate.toISOString(),
      source_count: {
        login_logs: logsSnapshot.size,
        users_last_login: usersLastLoginSnapshot.size,
        combined_sessions: sessions.length,
      },
      report_settings: reportSettings,
      mata_kuliah: mataKuliah,
      labs: dashboardLabs,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal memuat dashboard lab.",
      },
      { status: 500 }
    );
  }
}