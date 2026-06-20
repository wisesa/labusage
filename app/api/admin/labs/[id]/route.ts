import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  getAdminFirestore,
  getLabsCollectionName,
} from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>;
};

async function getParams(context: RouteContext) {
  return await context.params;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  try {
    const { id } = await getParams(context);
    const body = await request.json();

    const nama = String(body.nama || "").trim();
    const active = body.active !== false;

    if (!id) {
      return NextResponse.json(
        { error: "ID lab tidak valid." },
        { status: 400 }
      );
    }

    if (!nama) {
      return NextResponse.json(
        { error: "Nama lab wajib diisi." },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const ref = db.collection(getLabsCollectionName()).doc(id);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { error: "Data lab tidak ditemukan." },
        { status: 404 }
      );
    }

    await ref.update({
      nama,
      active,
      updated_by: admin.username,
      updated_at: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      id,
      nama,
      active,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gagal memperbarui lab.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  try {
    const { id } = await getParams(context);

    if (!id) {
      return NextResponse.json(
        { error: "ID lab tidak valid." },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const ref = db.collection(getLabsCollectionName()).doc(id);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { error: "Data lab tidak ditemukan." },
        { status: 404 }
      );
    }

    await ref.delete();

    return NextResponse.json({
      success: true,
      id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gagal menghapus lab.",
      },
      { status: 500 }
    );
  }
}