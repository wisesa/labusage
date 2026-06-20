import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  getAdminFirestore,
  getLabsCollectionName,
} from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/admin-auth";

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
    const snapshot = await db.collection(getLabsCollectionName()).get();

    const labs = snapshot.docs
      .map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          nama: String(data.nama || data.name || doc.id),
          active: data.active !== false,
          created_at: serializeDate(data.created_at),
          updated_at: serializeDate(data.updated_at),
        };
      })
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"));

    return NextResponse.json({ labs });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gagal membaca data lab.",
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

    const nama = String(body.nama || "").trim();
    const active = body.active !== false;

    if (!nama) {
      return NextResponse.json(
        { error: "Nama lab wajib diisi." },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    const ref = await db.collection(getLabsCollectionName()).add({
      nama,
      active,
      created_by: admin.username,
      updated_by: admin.username,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      id: ref.id,
      nama,
      active,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gagal menambah lab.",
      },
      { status: 500 }
    );
  }
}