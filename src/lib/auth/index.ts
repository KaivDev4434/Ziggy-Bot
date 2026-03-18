// ─── Auth Helpers ─────────────────────────────────────────────────────────────
//
// JWT session tokens (via jose) and password hashing (via bcryptjs).
// API token generation and hashing for bearer token clients.

import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import prisma from "@/lib/db";

// ─── Constants ────────────────────────────────────────────────────────────────

export const SESSION_COOKIE = "ziggy_session";
const SESSION_DURATION = "30d";
const BCRYPT_ROUNDS = 12;

// ─── JWT Secret ───────────────────────────────────────────────────────────────

/**
 * Returns the JWT signing secret as a Uint8Array.
 * Priority: process.env.JWT_SECRET → AppConfig.jwt_secret → auto-generated
 */
async function getJwtSecret(): Promise<Uint8Array> {
  if (process.env.JWT_SECRET) {
    return new TextEncoder().encode(process.env.JWT_SECRET);
  }
  try {
    const config = await prisma.appConfig.findUnique({
      where: { key: "jwt_secret" },
    });
    if (config?.value) {
      return new TextEncoder().encode(config.value);
    }
    // Generate and persist a new secret
    const secret = randomBytes(32).toString("hex");
    await prisma.appConfig.create({ data: { key: "jwt_secret", value: secret } });
    return new TextEncoder().encode(secret);
  } catch {
    // Fallback for pre-migration or test environments
    const fallback = process.env.JWT_SECRET ?? "ziggy-dev-secret-change-in-production";
    if (process.env.NODE_ENV === "production") {
      console.warn("[auth] WARNING: Using fallback JWT secret. Set JWT_SECRET in env.");
    }
    return new TextEncoder().encode(fallback);
  }
}

// ─── Session Tokens (JWT) ─────────────────────────────────────────────────────

export async function createSessionToken(): Promise<string> {
  const secret = await getJwtSecret();
  return new SignJWT({ sub: "user" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(secret);
}

/**
 * Verifies a JWT session token. Returns true if valid, false otherwise.
 * Used by API route guards (Node.js runtime — can access DB for secret).
 */
export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const secret = await getJwtSecret();
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifies a JWT using only process.env.JWT_SECRET (edge-runtime safe).
 * Used by src/middleware.ts which runs in the Edge runtime.
 */
export function getEdgeJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? "ziggy-dev-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

// ─── Password Hashing ─────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── App Config Helpers ───────────────────────────────────────────────────────

export async function getConfig(key: string): Promise<string | null> {
  try {
    const config = await prisma.appConfig.findUnique({ where: { key } });
    return config?.value ?? null;
  } catch {
    return null;
  }
}

export async function setConfig(key: string, value: string): Promise<void> {
  await prisma.appConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function isSetupComplete(): Promise<boolean> {
  const val = await getConfig("onboarding_complete");
  return val === "true";
}

export async function getPasswordHash(): Promise<string | null> {
  return getConfig("password_hash");
}

// ─── API Tokens (Bearer) ──────────────────────────────────────────────────────

/** Generates a random API token and returns both the raw value and its hash. */
export function generateApiToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  const hash = hashApiToken(raw);
  return { raw, hash };
}

export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Verifies a bearer token against the ApiToken table.
 * Updates lastUsedAt on success.
 */
export async function verifyApiToken(token: string): Promise<boolean> {
  try {
    const hash = hashApiToken(token);
    const record = await prisma.apiToken.findUnique({
      where: { tokenHash: hash },
    });
    if (!record?.active) return false;

    // Update lastUsedAt in background
    prisma.apiToken
      .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});

    return true;
  } catch {
    return false;
  }
}
