import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  getAdminFirestore,
  getLabUsageSettingsCollectionName,
  getMataKuliahCollectionName,
} from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

function makeSettingDocId(date: string, labId: string) {
  const safeLabId = Buffer.from(labId, "utf8").toString("base64url");
  return `${date}_${safeLabId}`;
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);

  if (!admin.ok) {
    return admin.response;
  }

  try {
    const body = await request.json();

    const selectedDate = String(body.selected_date || "").trim();
    const labId = String(body.lab_id || "").trim();
    const labName = String(body.lab_name || "").trim();
    const kelas = String(body.kelas || "").trim();
    const mataKuliahId = String(body.mata_kuliah_id || "").trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      return NextResponse.json(
        { error: "Tanggal tidak valid." },
        { status: 400 }
      );
    }

    if (!labId) {
      return NextResponse.json(
        { error: "Lab tidak valid." },
        { status: 400 }
      );
    }

    if (!kelas) {
      return NextResponse.json(
        { error: "Kelas wajib diisi." },
        { status: 400 }
      );
    }

    if (!mataKuliahId) {
      return NextResponse.json(
        { error: "Mata kuliah wajib dipilih." },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    const mataKuliahDoc = await db
      .collection(getMataKuliahCollectionName())
      .doc(mataKuliahId)
      .get();

    if (!mataKuliahDoc.exists) {
      return NextResponse.json(
        { error: "Mata kuliah tidak ditemukan." },
        { status: 404 }
      );
    }

    const mataKuliahData = mataKuliahDoc.data() || {};

    if (mataKuliahData.active === false) {
      return NextResponse.json(
        { error: "Mata kuliah tidak aktif." },
        { status: 400 }
      );
    }

    const mataKuliahKode = String(mataKuliahData.kode || "");
    const mataKuliahNama = String(mataKuliahData.nama || mataKuliahDoc.id);

    const docId = makeSettingDocId(selectedDate, labId);

    await db.collection(getLabUsageSettingsCollectionName()).doc(docId).set(
      {
        selected_date: selectedDate,
        lab_id: labId,
        lab_name: labName,
        kelas,
        mata_kuliah_id: mataKuliahId,
        mata_kuliah_kode: mataKuliahKode,
        mata_kuliah_nama: mataKuliahNama,
        updated_by: admin.username,
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      usage_config: {
        kelas,
        mata_kuliah_id: mataKuliahId,
        mata_kuliah_kode: mataKuliahKode,
        mata_kuliah_nama: mataKuliahNama,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal menyimpan setting penggunaan lab.",
      },
      { status: 500 }
    );
  }
}