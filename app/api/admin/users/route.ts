import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  getAdminFirestore,
  getUsersCollectionName,
} from "@/lib/firebase-admin";
import { hashStudentPassword, requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

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

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  try {
    const db = getAdminFirestore();
    const snapshot = await db.collection(getUsersCollectionName()).get();

    const users = snapshot.docs
      .map((doc) => {
        const data = doc.data();

        return {
          username: doc.id,
          nim: data.nim || "",
          nama: data.nama || "",
          kelas: data.kelas || "",
          password: data.password_plain || data.password || "",
          active: data.active !== false,
          last_login_at: serializeDate(data.last_login_at),
          last_login_lab: data.last_login_lab || "",
          last_login_pengajar: data.last_login_pengajar || "",
          last_login_computer: data.last_login_computer || null,
          created_at: serializeDate(data.created_at),
          updated_at: serializeDate(data.updated_at),
        };
      })
      .sort((a, b) => {
        const nimCompare = String(a.nim).localeCompare(String(b.nim), "id");
        if (nimCompare !== 0) return nimCompare;
        return a.username.localeCompare(b.username, "id");
      });

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal membaca data mahasiswa.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  try {
    const body = await request.json();

    const nim = String(body.nim || "").trim();
    const nama = String(body.nama || "").trim();
    const kelas = String(body.kelas || "").trim();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const active = body.active !== false;

    if (!nim) {
      return NextResponse.json({ error: "NIM wajib diisi." }, { status: 400 });
    }

    if (!nama) {
      return NextResponse.json({ error: "Nama wajib diisi." }, { status: 400 });
    }

    if (!kelas) {
      return NextResponse.json(
        { error: "Kelas wajib diisi." },
        { status: 400 }
      );
    }

    if (!username) {
      return NextResponse.json(
        { error: "Username wajib diisi." },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: "Password wajib diisi." },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const collection = db.collection(getUsersCollectionName());

    const userRef = collection.doc(username);
    const userSnapshot = await userRef.get();

    if (userSnapshot.exists) {
      return NextResponse.json(
        { error: "Username sudah ada." },
        { status: 409 }
      );
    }

    const sameNimSnapshot = await collection
      .where("nim", "==", nim)
      .limit(1)
      .get();

    if (!sameNimSnapshot.empty) {
      return NextResponse.json(
        { error: `NIM ${nim} sudah dipakai mahasiswa lain.` },
        { status: 409 }
      );
    }

    await userRef.set({
      username,
      nim,
      nama,
      kelas,
      password_hash: hashStudentPassword(password),
      password_plain: password,
      active,
      created_by: admin.username,
      updated_by: admin.username,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      username,
      nim,
      nama,
      kelas,
      password,
      active,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal menambah mahasiswa.",
      },
      { status: 500 }
    );
  }
}