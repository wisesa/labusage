import { NextRequest, NextResponse } from "next/server";
import { FieldValue, WriteBatch } from "firebase-admin/firestore";
import {
  getAdminFirestore,
  getUsersCollectionName,
} from "@/lib/firebase-admin";
import { hashStudentPassword, requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

type ImportRow = {
  nim?: string;
  nama?: string;
  kelas?: string;
  username?: string;
  password?: string;
  active?: boolean;
};

const MAX_BATCH_SIZE = 450;

function cleanValue(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);

  if (!admin.ok) {
    return admin.response;
  }

  try {
    const body = await request.json();
    const rows = Array.isArray(body.rows) ? (body.rows as ImportRow[]) : [];

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Data import kosong." },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const collection = db.collection(getUsersCollectionName());

    let batch: WriteBatch = db.batch();
    let batchCounter = 0;

    let successCount = 0;
    let skippedCount = 0;

    const errors: Array<{
      row: number;
      nim?: string;
      username?: string;
      error: string;
    }> = [];

    const seenNim = new Map<string, number>();

    for (let index = 0; index < rows.length; index += 1) {
      const rowNumber = index + 2;
      const item = rows[index];

      const nim = cleanValue(item.nim);
      const nama = cleanValue(item.nama);
      const kelas = cleanValue(item.kelas);
      const username = cleanValue(item.username);
      const password = cleanValue(item.password);
      const active = item.active !== false;

      if (!nim || !nama || !kelas || !username || !password) {
        skippedCount += 1;
        errors.push({
          row: rowNumber,
          nim,
          username,
          error: "Kolom nim, nama, kelas, username, dan password wajib diisi.",
        });
        continue;
      }

      const duplicateRow = seenNim.get(nim);

      if (duplicateRow) {
        skippedCount += 1;
        errors.push({
          row: rowNumber,
          nim,
          username,
          error: `NIM duplikat di file Excel. Sudah muncul di baris ${duplicateRow}.`,
        });
        continue;
      }

      seenNim.set(nim, rowNumber);

      const userRef = collection.doc(username);
      const existingUserSnapshot = await userRef.get();

      const sameNimSnapshot = await collection
        .where("nim", "==", nim)
        .limit(5)
        .get();

      const usedByOtherUser = sameNimSnapshot.docs.some(
        (doc) => doc.id !== username
      );

      if (usedByOtherUser) {
        skippedCount += 1;
        errors.push({
          row: rowNumber,
          nim,
          username,
          error: `NIM ${nim} sudah dipakai username lain.`,
        });
        continue;
      }

      const payload: Record<string, unknown> = {
        username,
        nim,
        nama,
        kelas,
        password_hash: hashStudentPassword(password),
        password_plain: password,
        active,
        imported_by: admin.username,
        updated_by: admin.username,
        imported_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      };

      if (!existingUserSnapshot.exists) {
        payload.created_at = FieldValue.serverTimestamp();
        payload.created_by = admin.username;
      }

      batch.set(userRef, payload, { merge: true });

      successCount += 1;
      batchCounter += 1;

      if (batchCounter >= MAX_BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        batchCounter = 0;
      }
    }

    if (batchCounter > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      imported: successCount,
      skipped: skippedCount,
      errors,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal import data mahasiswa.",
      },
      { status: 500 }
    );
  }
}