import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  getAdminFirestore,
  getMataKuliahCollectionName,
} from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  try {
    const { id } = await context.params;
    const body = await request.json();

    const kode = String(body.kode || "").trim();
    const nama = String(body.nama || "").trim();
    const active = body.active !== false;

    if (!id) {
      return NextResponse.json(
        { error: "ID mata kuliah tidak valid." },
        { status: 400 }
      );
    }

    if (!nama) {
      return NextResponse.json(
        { error: "Nama mata kuliah wajib diisi." },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const ref = db.collection(getMataKuliahCollectionName()).doc(id);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { error: "Data mata kuliah tidak ditemukan." },
        { status: 404 }
      );
    }

    await ref.update({
      kode,
      nama,
      active,
      updated_by: admin.username,
      updated_at: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      id,
      kode,
      nama,
      active,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal memperbarui mata kuliah.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "ID mata kuliah tidak valid." },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const ref = db.collection(getMataKuliahCollectionName()).doc(id);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { error: "Data mata kuliah tidak ditemukan." },
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
          error instanceof Error
            ? error.message
            : "Gagal menghapus mata kuliah.",
      },
      { status: 500 }
    );
  }
}