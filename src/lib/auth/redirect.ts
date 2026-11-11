/**
 * Memastikan tujuan redirect (?next=) hanya berupa path internal.
 * Mencegah open redirect seperti //evil.com atau /\evil.com.
 */
export function safeNextPath(value: unknown, fallback = "/dashboard") {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;

  const path = value.split(/[?#]/)[0];
  const blocked = ["/", "/login", "/register", "/forgot-password", "/reset-password"];

  return blocked.includes(path) || path.startsWith("/auth/") ? fallback : value;
}
