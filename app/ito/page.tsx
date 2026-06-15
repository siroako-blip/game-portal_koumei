"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { RuleBook } from "@/components/RuleBook";
import { useState } from "react";
import { createItoGame, getItoGame, joinItoGame } from "@/lib/gameDb";
import type { ItoDifficulty } from "@/app/ito/logic";

function generatePlayerId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "pid-" + Math.random().toString(36).slice(2) + "-" + Date.now();
}

const DIFFICULTY_OPTIONS: { value: ItoDifficulty; label: string }[] = [
  { value: "EASY", label: "🟢 かんたん（EASYのみ）" },
  { value: "NORMAL", label: "🟡 ふつう（NORMALのみ）" },
  { value: "HARD", label: "🔴 むずかしい（HARDのみ）" },
  { value: "MIXED", label: "🍲 闇鍋ミックス（MIXED）" },
  { value: "GRADUAL", label: "📈 徐々に難しく（GRADUAL）おすすめ" },
];

export default function ItoLobbyPage() {
  const router = useRouter();
  const [joinId, setJoinId] = useState("");
  const [difficulty, setDifficulty] = useState<ItoDifficulty>("GRADUAL");
  const [loading, setLoading] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullGameId, setFullGameId] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    setLoading("create");
    try {
      const hostId = generatePlayerId();
      const { id } = await createItoGame(hostId);
      router.push(`/ito/game/${id}?pid=${encodeURIComponent(hostId)}&difficulty=${encodeURIComponent(difficulty)}`);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "ゲームの作成に失敗しました");
      setLoading(null);
    }
  };

  const handleJoin = async () => {
    const trimmed = joinId.trim();
    if (!trimmed) {
      setError("ゲームIDを入力してください");
      setFullGameId(null);
      return;
    }
    setError(null);
    setFullGameId(null);
    setLoading("join");
    try {
      const playerId = generatePlayerId();
      const existing = await getItoGame(trimmed);
      if (!existing) {
        setError("ゲームが見つかりません");
        setLoading(null);
        return;
      }
      if (existing.status !== "waiting") {
        setError("このゲームは既に開始済みです。観戦する場合は下のボタンからどうぞ。");
        setFullGameId(trimmed);
        setLoading(null);
        return;
      }
      await joinItoGame(trimmed, playerId);
      router.push(`/ito/game/${trimmed}?pid=${encodeURIComponent(playerId)}`);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "参加に失敗しました");
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 gap-6 items-center justify-center bg-gradient-to-b from-orange-50 to-amber-50/80 text-orange-900">
      <Link href="/" className="absolute top-4 left-4 text-orange-700 hover:text-orange-800 text-sm font-medium underline">
        ← ゲーム選択に戻る
      </Link>
      <div className="text-center space-y-3 fade-in-up">
        <div className="flex justify-center items-end gap-2">
          <span className="text-4xl animate-bob">🗨️</span>
          <span className="text-7xl drop-shadow-lg animate-float">💬</span>
          <span className="text-4xl animate-bob bob-delay-2">💭</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold drop-shadow-sm tracking-wider font-serif text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-amber-500 to-orange-700">
          ito
        </h1>
        <p className="text-orange-600 text-sm md:text-base">🤝 イト — 数字を「たとえ話」で伝える協力ゲーム</p>
        {/* 小さい順に並べるイメージ */}
        <div className="flex justify-center items-center gap-2 pt-2">
          {["1", "→", "34", "→", "67", "→", "100"].map((label, i) =>
            label === "→" ? (
              <span key={i} className="text-orange-400 font-bold">→</span>
            ) : (
              <div
                key={i}
                className={`w-11 h-11 rounded-full bg-white border-2 border-orange-300 shadow
                  flex items-center justify-center text-sm font-extrabold text-orange-700 pop-in fade-delay-${Math.floor(i / 2) + 1}`}
              >
                {label}
              </div>
            )
          )}
        </div>
      </div>

      <div className="w-full max-w-sm rounded-2xl bg-white/90 p-6 border-4 border-orange-300 shadow-xl flex flex-col gap-6 fade-in-up fade-delay-2">
        <div>
          <p className="text-sm text-orange-700 font-bold mb-2">🎚️ お題の難易度</p>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as ItoDifficulty)}
            className="w-full px-3 py-2 rounded-lg border-2 border-orange-300 bg-orange-50/80 text-orange-900 focus:border-orange-400 focus:outline-none"
            disabled={!!loading}
          >
            {DIFFICULTY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!!loading}
          className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-orange-400 to-amber-500 text-white font-bold text-lg hover:from-orange-500 hover:to-amber-600 border-b-4 border-orange-600 shadow-lg disabled:opacity-50 transition-all active:border-b-0 active:translate-y-1"
        >
          {loading === "create" ? "⏳ 部屋を開いています…" : "💬 部屋を作成 (Host)"}
        </button>

        <div className="border-t-2 border-orange-200 pt-5">
          <p className="text-sm text-orange-700 font-bold mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
            🎟️ 参加する (Join)
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              placeholder="招待IDを入力"
              className="flex-1 px-3 py-2 rounded-lg border-2 border-orange-300 bg-orange-50/80 text-orange-900 focus:border-orange-400 focus:outline-none placeholder-orange-400/70"
              disabled={!!loading}
            />
            <button
              type="button"
              onClick={handleJoin}
              disabled={!!loading}
              className="px-4 py-2 rounded-lg bg-orange-400 text-white font-bold hover:bg-orange-500 border-2 border-orange-500 disabled:opacity-50 transition-colors"
            >
              {loading === "join" ? "…" : "参加"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-400 text-red-800 p-3 text-sm rounded space-y-2 pop-in" role="alert">
            <p>⚠️ {error}</p>
            {fullGameId && (
              <Link
                href={`/ito/game/${fullGameId}`}
                className="inline-block px-4 py-2 rounded-lg bg-orange-400 text-white font-bold hover:bg-orange-500 border-2 border-orange-500 text-sm"
              >
                👀 観戦する
              </Link>
            )}
          </div>
        )}
      </div>

      <RuleBook gameType="ito" />

      <footer className="mt-8 text-center text-orange-500 text-xs max-w-md px-4">
        ※ これは非公式のファンプロジェクトであり、オリジナルのゲームとは関係ありません。
      </footer>
    </div>
  );
}
