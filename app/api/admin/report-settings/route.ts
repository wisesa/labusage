import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  getAdminFirestore,
  getReportSettingsCollectionName,
} from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

const REPORT_SETTINGS_DOC_ID = "lab_usage_pdf";

const DEFAULT_REPORT_SETTINGS = {
  plp_title: "PLP/TEKNISI",
  plp_name: "Martadi",
  plp_signature_data_url: "",
  kepala_lab_title: "Kepala lab Komputer Gedung Kuliah Bersama",
  kepala_lab_name: "",
  kepala_lab_signature_data_url: "",
};

function normalizeSettings(data: Record<string, unknown> = {}) {
  return {
    plp_title: String(data.plp_title || DEFAULT_REPORT_SETTINGS.plp_title),
    plp_name: String(data.plp_name || DEFAULT_REPORT_SETTINGS.plp_name),
    plp_signature_data_url: String(data.plp_signature_data_url || ""),
    kepala_lab_title: String(
      data.kepala_lab_title || DEFAULT_REPORT_SETTINGS.kepala_lab_title
    ),
    kepala_lab_name: String(data.kepala_lab_name || ""),
    kepala_lab_signature_data_url: String(
      data.kepala_lab_signature_data_url || ""
    ),
  };
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);

  if (!admin.ok) {
    return admin.response;
  }

  try {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection(getReportSettingsCollectionName())
      .doc(REPORT_SETTINGS_DOC_ID)
      .get();

    const settings = normalizeSettings(snapshot.data());

    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal membaca pengaturan PDF.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);

  if (!admin.ok) {
    return admin.response;
  }

  try {
    const body = await request.json();

    const plpTitle = String(body.plp_title || "").trim();
    const plpName = String(body.plp_name || "").trim();
    const plpSignatureDataUrl = String(
      body.plp_signature_data_url || ""
    ).trim();

    const kepalaLabTitle = String(body.kepala_lab_title || "").trim();
    const kepalaLabName = String(body.kepala_lab_name || "").trim();
    const kepalaLabSignatureDataUrl = String(
      body.kepala_lab_signature_data_url || ""
    ).trim();

    if (!plpTitle) {
      return NextResponse.json(
        { error: "Jabatan PLP/Teknisi wajib diisi." },
        { status: 400 }
      );
    }

    if (!plpName) {
      return NextResponse.json(
        { error: "Nama PLP/Teknisi wajib diisi." },
        { status: 400 }
      );
    }

    if (!kepalaLabTitle) {
      return NextResponse.json(
        { error: "Jabatan Kepala Lab wajib diisi." },
        { status: 400 }
      );
    }

    const settings = {
      plp_title: plpTitle,
      plp_name: plpName,
      plp_signature_data_url: plpSignatureDataUrl,
      kepala_lab_title: kepalaLabTitle,
      kepala_lab_name: kepalaLabName,
      kepala_lab_signature_data_url: kepalaLabSignatureDataUrl,
      updated_by: admin.username,
      updated_at: FieldValue.serverTimestamp(),
    };

    const db = getAdminFirestore();

    await db
      .collection(getReportSettingsCollectionName())
      .doc(REPORT_SETTINGS_DOC_ID)
      .set(settings, { merge: true });

    return NextResponse.json({
      success: true,
      settings: normalizeSettings(settings),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal menyimpan pengaturan PDF.",
      },
      { status: 500 }
    );
  }
}