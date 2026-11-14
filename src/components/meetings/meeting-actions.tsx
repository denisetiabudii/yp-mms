"use client";

import * as React from "react";
import Link from "next/link";
import { Ban, CheckCircle2, Pencil } from "lucide-react";

import { meetingLock, type Meeting } from "@/lib/meetings";

const MIN_REASON = 5;

/**
 * Aksi di halaman detail rapat: ubah dan batalkan. Hanya untuk yang berwenang
 * (canManage) dan hanya selama rapat masih Dijadwalkan.
 */
export function MeetingActions({
  meeting,
  canManage,
  openActionItems,
}: {
  meeting: Meeting;
  canManage: boolean;
  /** Jumlah action item terkait yang belum selesai, untuk peringatan saat membatalkan. */
  openActionItems: number;
}) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState("");
  const [cancelled, setCancelled] = React.useState(false);

  const lock = meetingLock(meeting);

  if (meeting.status === "Dibatalkan" || cancelled) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <Ban className="mt-0.5 size-4 shrink-0" />
        <span>
          {cancelled
            ? "Rapat dibatalkan. Peserta akan diberi tahu. (Belum tersimpan: fitur ini belum tersambung ke backend.)"
            : "Rapat ini telah dibatalkan."}
        </span>
      </div>
    );
  }

  if (!canManage || lock) return null;

  function confirmCancel() {
    if (reason.trim().length < MIN_REASON) {
      setError(`Alasan pembatalan wajib diisi (minimal ${MIN_REASON} karakter).`);
      return;
    }

    // TODO: Server Action — set status Dibatalkan, simpan alasan, catat ke audit_logs,
    // kirim notifikasi ke seluruh peserta, dan tolak bila rapat sudah tidak Dijadwalkan.
    setCancelled(true);
    setOpen(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/meetings/${meeting.id}/edit`}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        >
          <Pencil className="size-4" />
          Ubah rapat
        </Link>

        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-medium text-red-600 transition hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
          >
            <Ban className="size-4" />
            Batalkan rapat
          </button>
        )}
      </div>

      {open && (
        <div role="group" aria-label="Batalkan rapat" className="space-y-3 rounded-xl border border-red-200 bg-red-50/60 p-4">
          <p className="text-sm font-semibold text-red-800">Batalkan “{meeting.title}”?</p>
          <ul className="list-disc space-y-0.5 pl-5 text-xs text-red-700">
            <li>{meeting.participants.length} peserta akan menerima pemberitahuan pembatalan.</li>
            {openActionItems > 0 && (
              <li>{openActionItems} action item terkait belum selesai dan tetap ada; tinjau kelanjutannya.</li>
            )}
            <li>Rapat dibatalkan tidak dihapus: tetap tercatat di arsip dan audit log.</li>
          </ul>

          <div className="space-y-1.5">
            <label htmlFor="cancel-reason" className="text-sm font-medium text-slate-700">
              Alasan pembatalan <span className="text-red-500">*</span>
            </label>
            <textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError("");
              }}
              aria-invalid={!!error}
              aria-describedby={error ? "cancel-reason-error" : undefined}
              maxLength={300}
              className="min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-400/20 aria-[invalid=true]:border-red-400"
            />
            {error && <p id="cancel-reason-error" role="alert" className="text-xs text-red-600">{error}</p>}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmCancel}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
            >
              <CheckCircle2 className="size-4" />
              Ya, batalkan rapat
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError("");
              }}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Tidak jadi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
