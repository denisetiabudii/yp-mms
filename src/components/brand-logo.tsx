import Image from "next/image";

/**
 * Logo Yuk Peduli.
 * File: public/yuk-peduli-logo.png (300x152, latar transparan).
 * Area logo yang terlihat hanya x 39–213 dan y 25–125 (174x100),
 * sisanya ruang kosong. Gambar di-crop lewat CSS supaya ukuran logo
 * sesuai tinggi yang ditentukan, tanpa perlu mengedit file PNG.
 *
 * Atur ukuran lewat className tinggi, misalnya "h-12" atau "h-16".
 */
const LOGO = {
  canvasW: 300,
  canvasH: 152,
  x: 39,
  y: 25,
  w: 174,
  h: 100,
};

const imageStyle: React.CSSProperties = {
  position: "absolute",
  maxWidth: "none",
  width: `${(LOGO.canvasW / LOGO.w) * 100}%`,
  height: `${(LOGO.canvasH / LOGO.h) * 100}%`,
  left: `${-(LOGO.x / LOGO.w) * 100}%`,
  top: `${-(LOGO.y / LOGO.h) * 100}%`,
};

export function BrandLogo({ className = "h-12" }: { className?: string }) {
  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ aspectRatio: `${LOGO.w} / ${LOGO.h}` }}
      role="img"
      aria-label="Yuk Peduli"
    >
      <Image
        src="/yuk-peduli-logo.png"
        alt=""
        width={LOGO.canvasW}
        height={LOGO.canvasH}
        priority
        style={imageStyle}
      />
    </div>
  );
}