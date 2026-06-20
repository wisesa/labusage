import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  getAdminFirestore,
  getAdminsCollectionName,
} from "@/lib/firebase-admin";
import {
  hashAdminPassword,
  requireAdmin,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);

  if (!admin.ok) {
    return admin.response;
  }

  try {
    const body = await request.json();

    const oldPassword = String(body.old_password || "");
    const newPassword = String(body.new_password || "");

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { error: "Password lama dan password baru wajib diisi." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password baru minimal 6 karakter." },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const adminRef = db.collection(getAdminsCollectionName()).doc(admin.username);
    const adminDoc = await adminRef.get();
    const adminData = adminDoc.data() || {};

    const currentHash = String(adminData.password_hash || "");

    if (!verifyAdminPassword(oldPassword, currentHash)) {
      return NextResponse.json(
        { error: "Password lama salah." },
        { status: 401 }
      );
    }

    await adminRef.update({
      password_hash: hashAdminPassword(newPassword),
      updated_at: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengganti password.",
      },
      { status: 500 }
    );
  }
}