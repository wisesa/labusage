import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  getAdminFirestore,
  getAdminsCollectionName,
} from "@/lib/firebase-admin";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-session";
import {
  createAdminSessionToken,
  getAdminSessionMaxAgeSeconds,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username dan password wajib diisi." },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const adminRef = db.collection(getAdminsCollectionName()).doc(username);
    const adminDoc = await adminRef.get();

    if (!adminDoc.exists) {
      return NextResponse.json(
        { error: "Username atau password admin salah." },
        { status: 401 }
      );
    }

    const adminData = adminDoc.data() || {};

    if (adminData.active === false) {
      return NextResponse.json(
        { error: "Admin tidak aktif." },
        { status: 403 }
      );
    }

    const passwordHash = String(adminData.password_hash || "");

    if (!verifyAdminPassword(password, passwordHash)) {
      return NextResponse.json(
        { error: "Username atau password admin salah." },
        { status: 401 }
      );
    }

    await adminRef.update({
      last_login_at: FieldValue.serverTimestamp(),
    });

    const token = createAdminSessionToken(username);
    const maxAge = getAdminSessionMaxAgeSeconds();

    const response = NextResponse.json({
      success: true,
      username,
    });

    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Login admin gagal.",
      },
      { status: 500 }
    );
  }
}