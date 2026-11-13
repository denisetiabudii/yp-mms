/**
 * Struktur data hasil pencarian notulen
 * yang digunakan oleh Server Action dan komponen UI.
 */
export type SearchResult = {
  id: string;
  title: string;
  date: string;
  status: string;
  href: string;
};