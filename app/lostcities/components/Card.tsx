"use client";

import type { Card as CardType, CardColor } from "../types";
import { COLOR_LABELS } from "../types";

/** 5属性のアイコン（火・水・風・土・光） */
export const COLOR_ICONS: Record<CardColor, string> = {
  red: "🔥",
  blue: "💧",
  green: "🍃",
  yellow: "⛰️",
  white: "✨",
};

/* 属性ごとのグラデーション配色 */
const COLOR_STYLES: Record<CardColor, { bg: string; border: string; text: string }> = {
  red: {
    bg: "bg-gradient-to-b from-rose-400 via-red-500 to-red-700",
    border: "border-red-800",
    text: "text-white",
  },
  blue: {
    bg: "bg-gradient-to-b from-sky-400 via-blue-500 to-blue-700",
    border: "border-blue-800",
    text: "text-white",
  },
  green: {
    bg: "bg-gradient-to-b from-emerald-400 via-emerald-500 to-green-700",
    border: "border-green-800",
    text: "text-white",
  },
  yellow: {
    bg: "bg-gradient-to-b from-yellow-300 via-amber-400 to-orange-500",
    border: "border-orange-600",
    text: "text-amber-950",
  },
  white: {
    bg: "bg-gradient-to-b from-white via-slate-100 to-slate-300",
    border: "border-slate-400",
    text: "text-slate-700",
  },
};

interface CardProps {
  card: CardType;
  faceDown?: boolean;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export function Card({ card, faceDown, selected, onClick, compact }: CardProps) {
  const size = compact ? "h-12 w-9 min-w-[2.25rem]" : "h-20 w-14 min-w-[3.5rem]";

  if (faceDown) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`
          ${size} rounded-lg border-2 border-indigo-400/60
          bg-gradient-to-br from-indigo-700 via-indigo-800 to-indigo-950
          shadow-[0_3px_6px_rgba(0,0,0,0.3)] transition-all duration-200
          relative overflow-hidden flex items-center justify-center
          ${selected ? "scale-105 ring-2 ring-amber-500 ring-offset-2 ring-offset-amber-100" : ""}
        `}
        aria-label="裏のカード"
      >
        <span className="absolute inset-1 rounded-md border border-indigo-400/40" />
        <span className={compact ? "text-base" : "text-2xl"}>🔮</span>
      </button>
    );
  }

  const style = COLOR_STYLES[card.color];
  const isWager = card.value === "wager";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        ${size} ${style.bg} ${style.text} rounded-lg border-2 ${style.border}
        font-bold transition-all duration-200 relative overflow-hidden select-none
        shadow-[0_3px_6px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_12px_rgba(0,0,0,0.35)]
        ${selected ? "translate-y-[-4px] ring-2 ring-amber-500 ring-offset-2 ring-offset-amber-100 scale-105 shadow-[0_10px_14px_rgba(0,0,0,0.4)]" : ""}
        hover:translate-y-[-2px] active:translate-y-0
      `}
      aria-label={`${COLOR_LABELS[card.color]} ${isWager ? "契約" : card.value}`}
    >
      {/* 左上の値 */}
      <span className={`absolute top-0.5 left-1 font-extrabold leading-none drop-shadow-sm ${compact ? "text-[11px]" : "text-sm"}`}>
        {isWager ? "×2" : card.value}
      </span>
      {/* 右下の値（回転） */}
      <span className={`absolute bottom-0.5 right-1 font-extrabold leading-none rotate-180 drop-shadow-sm ${compact ? "text-[11px]" : "text-sm"}`}>
        {isWager ? "×2" : card.value}
      </span>
      {/* 中央のアイコン */}
      <span className={`absolute inset-0 flex items-center justify-center drop-shadow ${compact ? "text-base" : "text-2xl"}`}>
        {isWager ? "🤝" : COLOR_ICONS[card.color]}
      </span>
      {/* 契約カードのリボン */}
      {isWager && (
        <span
          className={`absolute bottom-0 inset-x-0 bg-black/25 text-center font-bold tracking-wider ${compact ? "text-[8px] py-px" : "text-[10px] py-0.5"}`}
        >
          契約
        </span>
      )}
    </button>
  );
}
