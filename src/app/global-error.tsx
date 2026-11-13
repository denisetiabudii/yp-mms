"use client";

import { useEffect } from "react";

/**
 * Pengaman terakhir: aktif hanya bila root layout itu sendiri gagal.
 * Menggantikan seluruh halaman, jadi wajib memuat <html> dan <body> sendiri
 * dan memakai gaya inline (CSS/Tailwind dari layout tidak tersedia di sini).
 */
export default function GlobalError({
  error,
  reset,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  /** Next.js sebelum 16.2. */
  reset?: () => void;
  /** Next.js 16.2 ke atas: mengambil ulang data lalu merender ulang. */
  unstable_retry?: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  function retry() {
    const handler = unstable_retry ?? reset;

    if (handler) handler();
    else window.location.reload();
  }

  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          color: "#0f172a",
          padding: 16,
        }}
      >
        <main
          style={{
            maxWidth: 440,
            width: "100%",
            textAlign: "center",
            background: "#fff",
            border: "1px solid #dbeafe",
            borderRadius: 24,
            padding: 40,
            boxShadow: "0 20px 40px rgba(37,99,235,0.10)",
          }}
        >
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Terjadi kesalahan pada aplikasi</h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#64748b", margin: "0 0 24px" }}>
            Maaf, YP-MMS tidak dapat ditampilkan saat ini. Coba muat ulang. Bila masalah berlanjut, hubungi
            administrator{error.digest ? ` dan sebutkan kode ${error.digest}` : ""}.
          </p>
          <button
            type="button"
            onClick={retry}
            style={{
              height: 44,
              padding: "0 24px",
              border: 0,
              borderRadius: 12,
              background: "#2563eb",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Coba lagi
          </button>
        </main>
      </body>
    </html>
  );
}
