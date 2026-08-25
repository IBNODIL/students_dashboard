import crypto from "node:crypto";

const ENV_NAME = "STUDENT_PROFILE_SECRET";

function getSecret(): string {
  const secret = process.env[ENV_NAME]?.trim();

  if (!secret) {
    throw new Error(`${ENV_NAME} is not configured.`);
  }

  return secret;
}

export function createStudentPublicKey(
  studentId: number,
  phone: string | null | undefined,
): string {
  const payload = [
    String(studentId).trim(),
    String(phone ?? "").trim(),
  ].join("|");

  return crypto
    .createHmac("sha256", getSecret())
    .update(payload, "utf8")
    .digest("base64url")
    .slice(0, 8);
}