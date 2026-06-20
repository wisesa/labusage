import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import {
  getAdminFirestore,
  getLabsCollectionName,
  getLoginLogsCollectionName,
} from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

type LabRow = {
  id: string;
  nama: string;
  active: boolean;
};

type LoginSession = {
  id: string;
  username: string;
  lab_id: string;
  lab_name: string;
  pengajar_id: string;
  pengajar: string;
  login_at: string | null;
  hostname: string;
  device_id: string;
};

function serializeDate(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().toISOString();
  }

  return null;
}

function getTodayRangeUtc() {
  const offsetMinutes = Number(process.env.DASHBOARD_TZ_OFFSET_MINUTES || 420);

  const nowUtcMs = Date.now();
  const shiftedNow = new Date(nowUtcMs + offsetMinutes * 60 * 1000);

  const year = shiftedNow.getUTCFullYear();
  const month = shiftedNow.getUTCMonth();
  const date = shiftedNow.getUTCDate();

  const startUtcMs =
    Date.UTC(year, month, date, 0, 0, 0, 0) -
    offsetMinutes * 60 * 1000;

  const endUtcMs = startUtcMs + 24 * 60 * 60 * 1000;

  return {
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

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);

  if (!admin.ok) {
    return admin.response;
  }

  try {
    const db = getAdminFirestore();
    const { startDate, endDate } = getTodayRangeUtc();

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

    const labById = new Map(labs.map((lab) => [lab.id, lab]));
    const labByName = new Map(
      labs.map((lab) => [lab.nama.trim().toLowerCase(), lab])
    );

    const logsSnapshot = await db
      .collection(getLoginLogsCollectionName())
      .where("login_at", ">=", Timestamp.fromDate(startDate))
      .where("login_at", "<", Timestamp.fromDate(endDate))
      .get();

    const sessions: LoginSession[] = logsSnapshot.docs.map((doc) => {
      const data = doc.data();
      const computerIdentity = data.computer_identity || {};

      return {
        id: doc.id,
        username: String(data.username || ""),
        lab_id: String(data.lab_id || ""),
        lab_name: String(data.lab_name || ""),
        pengajar_id: String(data.pengajar_id || ""),
        pengajar: String(data.pengajar || "Tanpa pengajar"),
        login_at: serializeDate(data.login_at),
        hostname: String(computerIdentity.hostname || ""),
        device_id: String(computerIdentity.device_id || ""),
      };
    });

    const labGroups = new Map<
      string,
      {
        sessions: LoginSession[];
        pengajar: Map<string, LoginSession[]>;
      }
    >();

    for (const lab of labs) {
      labGroups.set(lab.id, {
        sessions: [],
        pengajar: new Map(),
      });
    }

    for (const session of sessions) {
      let lab = session.lab_id ? labById.get(session.lab_id) : null;

      if (!lab && session.lab_name) {
        lab = labByName.get(session.lab_name.trim().toLowerCase()) || null;
      }

      if (!lab) {
        continue;
      }

      const group = labGroups.get(lab.id);

      if (!group) {
        continue;
      }

      group.sessions.push(session);

      const pengajarKey =
        session.pengajar_id || session.pengajar.trim().toLowerCase();

      if (!group.pengajar.has(pengajarKey)) {
        group.pengajar.set(pengajarKey, []);
      }

      group.pengajar.get(pengajarKey)?.push(session);
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

      const pengajar = Array.from(group?.pengajar.entries() || [])
        .map(([key, items]) => {
          const first = items[0];

          const uniquePengajarUsers = new Set(
            items.map((item) => item.username).filter(Boolean)
          );

          const sortedUsers = [...items].sort((a, b) => {
            const aTime = a.login_at ? new Date(a.login_at).getTime() : 0;
            const bTime = b.login_at ? new Date(b.login_at).getTime() : 0;
            return bTime - aTime;
          });

          return {
            key,
            id: first?.pengajar_id || "",
            nama: first?.pengajar || "Tanpa pengajar",
            login_count: items.length,
            unique_user_count: uniquePengajarUsers.size,
            users: sortedUsers,
          };
        })
        .sort((a, b) => a.nama.localeCompare(b.nama, "id"));

      return {
        id: lab.id,
        nama: lab.nama,
        active: lab.active,
        has_login_today: labSessions.length > 0,
        login_count: labSessions.length,
        unique_user_count: uniqueUsers.size,
        pengajar_count: pengajar.length,
        last_login_at: lastLoginAt,
        pengajar,
      };
    });

    return NextResponse.json({
      date_label: formatDateLabel(startDate),
      start_at: startDate.toISOString(),
      end_at: endDate.toISOString(),
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