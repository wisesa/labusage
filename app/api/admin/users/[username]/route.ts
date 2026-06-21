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

    const db = getAdminFirestore();
    const collection = db.collection(getUsersCollectionName());
    const userRef = collection.doc(username);
    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists) {
      return NextResponse.json(
        { error: "Mahasiswa tidak ditemukan." },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {
      updated_by: admin.username,
      updated_at: FieldValue.serverTimestamp(),
    };

    if (typeof body.nim === "string") {
      const nim = body.nim.trim();

      if (!nim) {
        return NextResponse.json(
          { error: "NIM wajib diisi." },
          { status: 400 }
        );
      }

      const sameNimSnapshot = await collection
        .where("nim", "==", nim)
        .limit(5)
        .get();

      const usedByOtherUser = sameNimSnapshot.docs.some(
        (doc) => doc.id !== username
      );

      if (usedByOtherUser) {
        return NextResponse.json(
          { error: `NIM ${nim} sudah dipakai mahasiswa lain.` },
          { status: 409 }
        );
      }

      updateData.nim = nim;
    }

    if (typeof body.nama === "string") {
      const nama = body.nama.trim();

      if (!nama) {
        return NextResponse.json(
          { error: "Nama wajib diisi." },
          { status: 400 }
        );
      }

      updateData.nama = nama;
    }

    if (typeof body.kelas === "string") {
      const kelas = body.kelas.trim();

      if (!kelas) {
        return NextResponse.json(
          { error: "Kelas wajib diisi." },
          { status: 400 }
        );
      }

      updateData.kelas = kelas;
    }

    if (typeof body.active === "boolean") {
      updateData.active = body.active;
    }

    if (body.password) {
      const password = String(body.password);
      updateData.password_hash = hashStudentPassword(password);
      updateData.password_plain = password;
    }

    await userRef.update(updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal memperbarui mahasiswa.",
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
        { error: "Mahasiswa tidak ditemukan." },
        { status: 404 }
      );
    }

    await userRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal menghapus mahasiswa.",
      },
      { status: 500 }
    );
  }
}