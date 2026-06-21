import {
  createHash,
  createHmac,
  pbkdf2Sync,
  randomBytes,
  timingSafeEqual,
} from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-session";
import {
  getAdminFirestore,
  getAdminsCollectionName,
} from "@/lib/firebase-admin";

type AdminSessionPayload = {
  username: string;
  exp: number;
};

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET belum diset di environment.");
  }

  return secret;
}

export function getAdminSessionMaxAgeSeconds() {
  const days = Number(process.env.ADMIN_SESSION_MAX_AGE_DAYS || 365);

  if (!Number.isFinite(days) || days <= 0) {
    return 60 * 60 * 24 * 365;
  }

  return Math.floor(days * 24 * 60 * 60);
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function hashAdminPassword(password: string) {
  const iterations = 210000;
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString(
    "hex"
  );

  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
}

export function verifyAdminPassword(password: string, storedHash: string) {
  if (!storedHash) return false;

  if (storedHash.startsWith("pbkdf2_sha256$")) {
    const parts = storedHash.split("$");
    const iterations = Number(parts[1]);
    const salt = parts[2];
    const expectedHash = parts[3];

    if (!iterations || !salt || !expectedHash) {
      return false;
    }

    const actualHash = pbkdf2Sync(
      password,
      salt,
      iterations,
      32,
      "sha256"
    ).toString("hex");

    return safeEqual(actualHash, expectedHash);
  }

  const legacyHash = createHash("sha256").update(password, "utf8").digest("hex");
  return safeEqual(legacyHash, storedHash);
}

export function hashStudentPassword(password: string) {
  return createHash("sha256").update(password, "utf8").digest("hex");
}

export function createAdminSessionToken(username: string) {
  const maxAgeSeconds = getAdminSessionMaxAgeSeconds();

  const payload: AdminSessionPayload = {
    username,
    exp: Date.now() + maxAgeSeconds * 1000,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );

  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(token: string) {
  try {
    const [encodedPayload, signature] = token.split(".");

    if (!encodedPayload || !signature) {
      return null;
    }

    const expectedSignature = signPayload(encodedPayload);

    if (!safeEqual(signature, expectedSignature)) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as AdminSessionPayload;

    if (!payload.username || !payload.exp) {
      return null;
    }

    if (Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function requireAdmin(request: NextRequest) {
  try {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value || "";
    const session = verifyAdminSessionToken(token);

    if (!session) {
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: "Sesi admin tidak valid. Silakan login ulang." },
          { status: 401 }
        ),
      };
    }

    const db = getAdminFirestore();
    const adminDoc = await db
      .collection(getAdminsCollectionName())
      .doc(session.username)
      .get();

    if (!adminDoc.exists) {
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: "Admin tidak ditemukan." },
          { status: 401 }
        ),
      };
    }

    const adminData = adminDoc.data() || {};

    if (adminData.active === false) {
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: "Admin tidak aktif." },
          { status: 403 }
        ),
      };
    }

    return {
      ok: true as const,
      username: session.username,
      admin: adminData,
    };
  } catch (error) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Gagal memvalidasi sesi admin.",
        },
        { status: 500 }
      ),
    };
  }
}