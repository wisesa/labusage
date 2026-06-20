import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  getAdminFirestore,
  getUsersCollectionName,
} from "@/lib/firebase-admin";
import { hashStudentPassword, requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    username: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const admin = await requireAdmin(request);

  if (!admin.ok) {
    return admin.response;
  }

  try {
    const { username } = await context.params;
    const body = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: "Username tidak valid." },
        { status: 400 }
      );
    }

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
    const userRef = db.collection(getUsersCollectionName()).doc(username);
    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists) {
      return NextResponse.json(
        { error: "User tidak ditemukan." },
        { status: 404 }
      );
    }

    await userRef.update(updateData);

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

export async function DELETE(request: NextRequest, context: RouteContext) {
  const admin = await requireAdmin(request);

  if (!admin.ok) {
    return admin.response;
  }

  try {
    const { username } = await context.params;

    if (!username) {
      return NextResponse.json(
        { error: "Username tidak valid." },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const userRef = db.collection(getUsersCollectionName()).doc(username);
    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists) {
      return NextResponse.json(
        { error: "User tidak ditemukan." },
        { status: 404 }
      );
    }

    await userRef.delete();

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