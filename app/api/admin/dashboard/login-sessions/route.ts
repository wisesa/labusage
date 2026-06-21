import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  getAdminFirestore,
  getLoginLogsCollectionName,
  getUsersCollectionName,
} from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

function getDateFromValue(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate() as Date;
  }

  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }

  return null;
}

function normalizeMinute(value: unknown) {
  const date = getDateFromValue(value);

  if (!date) return "";

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

async function clearUserLastLogin(username: string, updatedBy: string) {
  if (!username) return false;

  const db = getAdminFirestore();
  const userRef = db.collection(getUsersCollectionName()).doc(username);
  const userSnapshot = await userRef.get();

  if (!userSnapshot.exists) return false;

  await userRef.update({
    last_login_at: FieldValue.delete(),
    last_login_pengajar_id: FieldValue.delete(),
    last_login_pengajar: FieldValue.delete(),
    last_login_lab_id: FieldValue.delete(),
    last_login_lab: FieldValue.delete(),
    last_login_computer: FieldValue.delete(),
    updated_by: updatedBy,
    updated_at: FieldValue.serverTimestamp(),
  });

  return true;
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);

  if (!admin.ok) {
    return admin.response;
  }

  try {
    const body = await request.json();

    const sessionId = String(body.session_id || "").trim();
    const source = String(body.source || "").trim();
    let username = String(body.username || "").trim();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID tidak valid." },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    if (source === "login_logs" || sessionId.startsWith("log:")) {
      const logId = sessionId.replace(/^log:/, "");

      if (!logId) {
        return NextResponse.json(
          { error: "ID log tidak valid." },
          { status: 400 }
        );
      }

      const logRef = db.collection(getLoginLogsCollectionName()).doc(logId);
      const logSnapshot = await logRef.get();

      if (!logSnapshot.exists) {
        return NextResponse.json(
          { error: "Log login tidak ditemukan." },
          { status: 404 }
        );
      }

      const logData = logSnapshot.data() || {};
      username = String(logData.username || username || "").trim();

      await logRef.delete();

      if (username) {
        const userRef = db.collection(getUsersCollectionName()).doc(username);
        const userSnapshot = await userRef.get();

        if (userSnapshot.exists) {
          const userData = userSnapshot.data() || {};
          const userLastLoginMinute = normalizeMinute(userData.last_login_at);
          const deletedLogMinute = normalizeMinute(logData.login_at);

          const sameMinute =
            userLastLoginMinute &&
            deletedLogMinute &&
            userLastLoginMinute === deletedLogMinute;

          const sameLab =
            !logData.lab_id ||
            !userData.last_login_lab_id ||
            String(userData.last_login_lab_id) === String(logData.lab_id);

          if (sameMinute && sameLab) {
            await clearUserLastLogin(username, admin.username);
          }
        }
      }

      return NextResponse.json({
        success: true,
        deleted_source: "login_logs",
      });
    }

    if (source === "users_last_login" || sessionId.startsWith("user:")) {
      if (!username && sessionId.startsWith("user:")) {
        username = sessionId.replace(/^user:/, "");
      }

      if (!username) {
        return NextResponse.json(
          { error: "Username tidak valid." },
          { status: 400 }
        );
      }

      const cleared = await clearUserLastLogin(username, admin.username);

      if (!cleared) {
        return NextResponse.json(
          { error: "Data last login mahasiswa tidak ditemukan." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        deleted_source: "users_last_login",
      });
    }

    return NextResponse.json(
      { error: "Sumber session tidak valid." },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gagal menghapus log login.",
      },
      { status: 500 }
    );
  }
}