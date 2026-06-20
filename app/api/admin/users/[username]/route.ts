import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  getAdminFirestore,
  getUsersCollectionName,
} from "@/lib/firebase-admin";
import { hashStudentPassword, requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: { username: string } | Promise<{ username: string }> }
) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  try {
    const { username } = await context.params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {
      updated_at: FieldValue.serverTimestamp(),
    };

    if (typeof body.active === "boolean") {
      updateData.active = body.active;
    }

    if (body.password) {
      updateData.password_hash = hashStudentPassword(String(body.password));
    }

    const db = getAdminFirestore();

    await db
      .collection(getUsersCollectionName())
      .doc(username)
      .update(updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gagal memperbarui user.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { username: string } | Promise<{ username: string }> }
) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  try {
    const { username } = await context.params;

    const db = getAdminFirestore();

    await db.collection(getUsersCollectionName()).doc(username).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gagal menghapus user.",
      },
      { status: 500 }
    );
  }
}