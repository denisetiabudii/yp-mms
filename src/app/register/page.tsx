import { redirect } from "next/navigation";

/**
 * PRD FR-003: pengguna dibuat melalui undangan administrator, bukan
 * pendaftaran mandiri. Halaman lama dialihkan ke login.
 */
export default function RegisterPage() {
  redirect("/login?reason=invite-only");
}
