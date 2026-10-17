import { useId } from "react";
import type { CameraStyle, ProductArtKind } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Vector stand-in for product photography. Renders a device in the chosen
 * variant colour so galleries, cards and carts stay consistent until real
 * photos are uploaded (Product.images takes precedence when present).
 */
export function ProductArt({
  kind,
  color = "#2b2b2d",
  camera = "trio-square",
  label,
  className,
  view = "pair",
}: {
  kind: ProductArtKind;
  color?: string;
  camera?: CameraStyle;
  label?: string;
  className?: string;
  /** Phones only: show front + back, just the back, or just the front. */
  view?: "pair" | "back" | "front";
}) {
  const uid = useId().replace(/:/g, "");
  const dark = shade(color, -0.35);
  const light = shade(color, 0.25);
  const isLight = luminance(color) > 0.6;

  return (
    <svg viewBox="0 0 200 200" className={cn("h-full w-full", className)} role="img" aria-label={label}>
      <defs>
        <linearGradient id={`body-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="0.55" stopColor={color} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <linearGradient id={`screen-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff5a6a" />
          <stop offset="0.45" stopColor="#b50d22" />
          <stop offset="1" stopColor="#1a0306" />
        </linearGradient>
        <radialGradient id={`lens-${uid}`} cx="0.35" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#5a6070" />
          <stop offset="0.5" stopColor="#14161c" />
          <stop offset="1" stopColor="#000" />
        </radialGradient>
        <linearGradient id={`gloss-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={`shadow-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000" floodOpacity="0.18" />
        </filter>
      </defs>
      <ellipse cx="100" cy="182" rx="62" ry="6" fill="#000" opacity="0.08" />
      <g filter={`url(#shadow-${uid})`}>
        {kind === "phone" && <Phone uid={uid} camera={camera} view={view} color={color} isLight={isLight} />}
        {kind === "case" && <Case uid={uid} dark={dark} />}
        {kind === "charger" && <Charger uid={uid} isLight={isLight} />}
        {kind === "cable" && <Cable color={color} dark={dark} isLight={isLight} />}
        {kind === "powerbank" && <PowerBank uid={uid} isLight={isLight} />}
        {kind === "earbuds" && <Earbuds uid={uid} isLight={isLight} />}
        {kind === "headphones" && <Headphones uid={uid} dark={dark} />}
        {kind === "watch" && <Watch uid={uid} dark={dark} />}
        {kind === "protector" && <Protector uid={uid} />}
        {kind === "speaker" && <Speaker uid={uid} dark={dark} />}
      </g>
    </svg>
  );
}

function Lens({ uid, cx, cy, r }: { uid: string; cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 1.6} fill="#0b0b0c" opacity="0.55" />
      <circle cx={cx} cy={cy} r={r} fill={`url(#lens-${uid})`} />
      <circle cx={cx - r * 0.3} cy={cy - r * 0.3} r={r * 0.22} fill="#fff" opacity="0.35" />
    </g>
  );
}

function CameraModule({ uid, style, x, y }: { uid: string; style: CameraStyle; x: number; y: number }) {
  switch (style) {
    case "trio-square":
      return (
        <g>
          <rect x={x} y={y} width="38" height="38" rx="10" fill="#fff" opacity="0.18" />
          <Lens uid={uid} cx={x + 11} cy={y + 11} r={7} />
          <Lens uid={uid} cx={x + 11} cy={y + 27} r={7} />
          <Lens uid={uid} cx={x + 27} cy={y + 19} r={7} />
          <circle cx={x + 29} cy={y + 6} r="2" fill="#f5e7c8" />
        </g>
      );
    case "duo-diagonal":
      return (
        <g>
          <rect x={x} y={y} width="30" height="38" rx="10" fill="#fff" opacity="0.18" />
          <Lens uid={uid} cx={x + 10} cy={y + 10} r={6.5} />
          <Lens uid={uid} cx={x + 20} cy={y + 27} r={6.5} />
          <circle cx={x + 22} cy={y + 8} r="2" fill="#f5e7c8" />
        </g>
      );
    case "vertical":
      return (
        <g>
          <Lens uid={uid} cx={x + 9} cy={y + 8} r={6.5} />
          <Lens uid={uid} cx={x + 9} cy={y + 24} r={6.5} />
          <Lens uid={uid} cx={x + 9} cy={y + 40} r={6.5} />
          <circle cx={x + 22} cy={y + 8} r="2" fill="#f5e7c8" />
        </g>
      );
    case "bar":
      return (
        <g>
          <rect x={x - 6} y={y + 4} width="72" height="20" rx="10" fill="#0e0f12" opacity="0.85" />
          <Lens uid={uid} cx={x + 10} cy={y + 14} r={6} />
          <Lens uid={uid} cx={x + 26} cy={y + 14} r={6} />
          <Lens uid={uid} cx={x + 42} cy={y + 14} r={5} />
          <circle cx={x + 55} cy={y + 14} r="2" fill="#f5e7c8" />
        </g>
      );
    case "circle":
      return (
        <g>
          <circle cx={x + 30} cy={y + 22} r="21" fill="#0e0f12" opacity="0.85" />
          <circle cx={x + 30} cy={y + 22} r="21" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.5" />
          <Lens uid={uid} cx={x + 22} cy={y + 15} r={6} />
          <Lens uid={uid} cx={x + 38} cy={y + 15} r={6} />
          <Lens uid={uid} cx={x + 30} cy={y + 30} r={5} />
        </g>
      );
    case "square-quad":
      return (
        <g>
          <rect x={x} y={y} width="40" height="40" rx="12" fill="#0e0f12" opacity="0.8" />
          <Lens uid={uid} cx={x + 12} cy={y + 12} r={6.5} />
          <Lens uid={uid} cx={x + 28} cy={y + 12} r={6.5} />
          <Lens uid={uid} cx={x + 12} cy={y + 28} r={6.5} />
          <circle cx={x + 28} cy={y + 28} r="3" fill="#f5e7c8" />
        </g>
      );
  }
}

function Phone({
  uid,
  camera,
  view,
  isLight,
}: {
  uid: string;
  camera: CameraStyle;
  view: "pair" | "back" | "front";
  color: string;
  isLight: boolean;
}) {
  const back = (x: number, y: number, rot: number) => (
    <g transform={`rotate(${rot} ${x + 34} ${y + 70})`}>
      <rect x={x} y={y} width="68" height="140" rx="14" fill={`url(#body-${uid})`} />
      <rect x={x + 1.5} y={y + 1.5} width="65" height="137" rx="12.5" fill="none" stroke="#fff" strokeOpacity={isLight ? 0.6 : 0.18} />
      <rect x={x + 10} y={y} width="14" height="140" fill={`url(#gloss-${uid})`} opacity="0.5" />
      <CameraModule uid={uid} style={camera} x={camera === "bar" ? x + 9 : x + 7} y={y + 8} />
    </g>
  );
  const front = (x: number, y: number, rot: number) => (
    <g transform={`rotate(${rot} ${x + 34} ${y + 70})`}>
      <rect x={x} y={y} width="68" height="140" rx="14" fill="#0b0b0c" />
      <rect x={x + 3} y={y + 3} width="62" height="134" rx="11" fill={`url(#screen-${uid})`} />
      <rect x={x + 26} y={y + 7} width="16" height="5" rx="2.5" fill="#000" />
      <text x={x + 34} y={y + 46} textAnchor="middle" fill="#fff" fontSize="15" fontWeight="600" fontFamily="system-ui">
        9:41
      </text>
      <rect x={x + 10} y={y + 112} width="48" height="12" rx="6" fill="#fff" opacity="0.2" />
      <path d={`M${x + 3} ${y + 80} q 30 -30 62 -10 v 54 a 11 11 0 0 1 -11 11 h -40 a 11 11 0 0 1 -11 -11 z`} fill="#fff" opacity="0.06" />
    </g>
  );
  if (view === "back") return back(66, 30, 0);
  if (view === "front") return front(66, 30, 0);
  return (
    <>
      {back(88, 26, 8)}
      {front(44, 34, -6)}
    </>
  );
}

function Case({ uid, dark }: { uid: string; dark: string }) {
  return (
    <g>
      <rect x="62" y="24" width="76" height="152" rx="18" fill={`url(#body-${uid})`} />
      <rect x="68" y="30" width="64" height="140" rx="13" fill={dark} opacity="0.25" />
      <rect x="70" y="34" width="38" height="40" rx="11" fill="#0b0b0c" opacity="0.7" />
      <rect x="70" y="34" width="38" height="40" rx="11" fill="none" stroke="#fff" strokeOpacity="0.3" />
      <circle cx="100" cy="112" r="22" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" />
      <rect x="136" y="64" width="3" height="18" rx="1.5" fill={dark} />
      <rect x="72" y="24" width="14" height="152" fill={`url(#gloss-${uid})`} opacity="0.45" />
    </g>
  );
}

function Charger({ uid, isLight }: { uid: string; isLight: boolean }) {
  const port = isLight ? "#1a1a1d" : "#d4d4d8";
  return (
    <g>
      <rect x="72" y="22" width="9" height="30" rx="2" fill="#a1a1aa" />
      <rect x="96" y="14" width="9" height="38" rx="2" fill="#a1a1aa" />
      <rect x="119" y="22" width="9" height="30" rx="2" fill="#a1a1aa" />
      <rect x="54" y="46" width="92" height="104" rx="18" fill={`url(#body-${uid})`} />
      <rect x="54" y="46" width="92" height="20" rx="10" fill="#fff" opacity="0.12" />
      <rect x="86" y="114" width="28" height="9" rx="4.5" fill={port} />
      <rect x="64" y="46" width="16" height="104" fill={`url(#gloss-${uid})`} opacity="0.5" />
    </g>
  );
}

function Cable({ color, dark, isLight }: { color: string; dark: string; isLight: boolean }) {
  const metal = "#c9ccd2";
  return (
    <g fill="none" strokeLinecap="round">
      <path
        d="M58 60 C 20 90, 70 130, 100 110 S 160 70, 150 120 S 90 170, 70 140"
        stroke={dark}
        strokeWidth="9"
      />
      <path
        d="M58 60 C 20 90, 70 130, 100 110 S 160 70, 150 120 S 90 170, 70 140"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={isLight ? "0" : "3 2"}
      />
      <g transform="rotate(-35 58 60)">
        <rect x="44" y="30" width="28" height="34" rx="6" fill={color} stroke={dark} strokeWidth="1.5" />
        <rect x="49" y="16" width="18" height="16" rx="4" fill={metal} />
      </g>
      <g transform="rotate(20 70 140)">
        <rect x="56" y="140" width="28" height="30" rx="6" fill={color} stroke={dark} strokeWidth="1.5" />
        <rect x="61" y="168" width="18" height="14" rx="4" fill={metal} />
      </g>
    </g>
  );
}

function PowerBank({ uid, isLight }: { uid: string; isLight: boolean }) {
  return (
    <g>
      <rect x="56" y="30" width="88" height="142" rx="16" fill={`url(#body-${uid})`} />
      <rect x="66" y="30" width="16" height="142" fill={`url(#gloss-${uid})`} opacity="0.5" />
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={86 + i * 9} cy={150} r="2.6" fill={i < 3 ? "#22c55e" : isLight ? "#a1a1aa" : "#52525b"} />
      ))}
      <rect x="84" y="30" width="32" height="6" rx="3" fill={isLight ? "#1a1a1d" : "#d4d4d8"} opacity="0.7" />
      <text x="100" y="105" textAnchor="middle" fontSize="13" fontWeight="700" fill={isLight ? "#1a1a1d" : "#fff"} opacity="0.55" fontFamily="system-ui">
        20000
      </text>
    </g>
  );
}

function Earbuds({ uid, isLight }: { uid: string; isLight: boolean }) {
  const stem = isLight ? "#e4e4e7" : "#3f3f46";
  return (
    <g>
      <rect x="48" y="96" width="104" height="72" rx="30" fill={`url(#body-${uid})`} />
      <path d="M48 120 h104" stroke="#000" strokeOpacity="0.12" />
      <circle cx="100" cy="146" r="3" fill="#22c55e" />
      <g transform="rotate(-18 78 62)">
        <ellipse cx="78" cy="50" rx="17" ry="15" fill={`url(#body-${uid})`} />
        <rect x="72" y="58" width="12" height="40" rx="6" fill={`url(#body-${uid})`} />
        <ellipse cx="72" cy="46" rx="6" ry="5" fill={stem} />
      </g>
      <g transform="rotate(18 122 62)">
        <ellipse cx="122" cy="50" rx="17" ry="15" fill={`url(#body-${uid})`} />
        <rect x="116" y="58" width="12" height="40" rx="6" fill={`url(#body-${uid})`} />
        <ellipse cx="128" cy="46" rx="6" ry="5" fill={stem} />
      </g>
    </g>
  );
}

function Headphones({ uid, dark }: { uid: string; dark: string }) {
  return (
    <g>
      <path d="M48 112 C 48 40, 152 40, 152 112" fill="none" stroke={dark} strokeWidth="12" strokeLinecap="round" />
      <rect x="34" y="100" width="34" height="58" rx="16" fill={`url(#body-${uid})`} />
      <rect x="132" y="100" width="34" height="58" rx="16" fill={`url(#body-${uid})`} />
    </g>
  );
}

function Watch({ uid, dark }: { uid: string; dark: string }) {
  return (
    <g>
      <rect x="74" y="8" width="52" height="56" rx="14" fill={dark} />
      <rect x="74" y="136" width="52" height="56" rx="14" fill={dark} />
      <rect x="60" y="48" width="80" height="96" rx="24" fill={`url(#body-${uid})`} />
      <rect x="67" y="55" width="66" height="82" rx="18" fill="#050505" />
      <circle cx="100" cy="96" r="24" fill="none" stroke="#ee2f42" strokeWidth="5" strokeDasharray="110 200" strokeLinecap="round" transform="rotate(-90 100 96)" />
      <circle cx="100" cy="96" r="16" fill="none" stroke="#22c55e" strokeWidth="5" strokeDasharray="70 200" strokeLinecap="round" transform="rotate(-90 100 96)" />
      <text x="100" y="128" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="system-ui" fontWeight="600">
        10:09
      </text>
      <rect x="139" y="78" width="5" height="16" rx="2.5" fill={dark} />
    </g>
  );
}

function Protector({ uid }: { uid: string }) {
  return (
    <g>
      <rect x="78" y="20" width="70" height="146" rx="14" fill="#cfe3ee" opacity="0.5" stroke="#9fc2d6" />
      <rect x="56" y="34" width="70" height="146" rx="14" fill="#e3f0f7" opacity="0.85" stroke="#9fc2d6" />
      <rect x="82" y="40" width="18" height="5" rx="2.5" fill="#9fc2d6" />
      <path d="M62 120 L 120 62" stroke="#fff" strokeWidth="10" opacity="0.7" />
      <path d="M62 146 L 120 88" stroke="#fff" strokeWidth="4" opacity="0.6" />
      <text x="91" y="160" textAnchor="middle" fontSize="12" fontWeight="700" fill="#5b8aa6" fontFamily="system-ui">
        9H
      </text>
      <rect x="56" y="34" width="70" height="146" rx="14" fill={`url(#gloss-${uid})`} opacity="0.4" />
    </g>
  );
}

function Speaker({ uid, dark }: { uid: string; dark: string }) {
  return (
    <g>
      <rect x="30" y="66" width="140" height="72" rx="36" fill={`url(#body-${uid})`} />
      <ellipse cx="34" cy="102" rx="10" ry="34" fill={dark} />
      <ellipse cx="166" cy="102" rx="10" ry="34" fill={dark} />
      <g opacity="0.25">
        {Array.from({ length: 9 }).map((_, i) => (
          <path key={i} d={`M${58 + i * 10} 72 v 60`} stroke="#000" strokeWidth="2" />
        ))}
      </g>
      <rect x="84" y="94" width="32" height="16" rx="5" fill="#fff" opacity="0.9" />
      <text x="100" y="106" textAnchor="middle" fontSize="10" fontWeight="800" fill="#c8102e" fontFamily="system-ui">
        JOH
      </text>
    </g>
  );
}

// ---------------------------------------------------------------- colour helpers

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
}

function shade(hex: string, amount: number) {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c: number) => Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount);
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
