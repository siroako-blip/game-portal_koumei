"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  createMidnightPartyGame,
  getMidnightPartyGame,
  joinMidnightPartyGame,
} from "@/lib/gameDb";

function generatePlayerId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "pid-" + Math.random().toString(36).slice(2) + "-" + Date.now();
}

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;

export default function MidnightPartyLobbyPage() {
  const router = useRouter();
  const [joinId, setJoinId] = useState("");
  const [loading, setLoading] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullGameId, setFullGameId] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    setLoading("create");
    try {
      const hostId = generatePlayerId();
      const { id } = await createMidnightPartyGame(hostId);
      router.push(`/midnight/game/${id}?pid=${encodeURIComponent(hostId)}`);
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
      const existing = await getMidnightPartyGame(trimmed);
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
      if (existing.player_ids.length >= MAX_PLAYERS) {
        setError("定員に達しています");
        setLoading(null);
        return;
      }
      const playerId = generatePlayerId();
      await joinMidnightPartyGame(trimmed, playerId);
      router.push(`/midnight/game/${trimmed}?pid=${encodeURIComponent(playerId)}`);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "参加に失敗しました");
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 gap-6 items-center justify-center bg-gradient-to-b from-purple-950/95 via-indigo-950/90 to-purple-950/95 text-purple-100">
      <Link
        href="/"
        className="absolute top-4 left-4 text-purple-300 hover:text-fuchsia-300 text-sm font-medium underline"
      >
        ゲーム選択に戻る
      </Link>
      <div className="text-center space-y-3 fade-in-up">
        <div className="flex justify-center items-end gap-3">
          <span className="text-3xl animate-twinkle">⭐</span>
          <span className="text-7xl drop-shadow-lg animate-float">🌙</span>
          <span className="text-3xl animate-twinkle" style={{ animationDelay: "0.6s" }}>✨</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 via-purple-200 to-cyan-300 drop-shadow-sm tracking-wider font-serif">
          Midnight Party
        </h1>
        <p className="text-purple-300 text-sm md:text-base">
          🃏 合計値を推理してビッド — コヨーテ風（{MIN_PLAYERS}〜{MAX_PLAYERS}人）
        </p>
        {/* 自分のカードだけ見えないイメージ */}
        <div className="flex justify-center gap-2 pt-2">
          {["5", "12", "?", "8"].map((label, i) => (
            <div
              key={i}
              className={`w-10 h-14 rounded-lg flex items-center justify-center text-lg font-extrabold shadow-lg border-2 pop-in fade-delay-${i + 1}
                ${
                  label === "?"
                    ? "bg-gradient-to-b from-fuchsia-600 to-purple-800 text-white border-fuchsia-400 animate-bob"
                    : "bg-purple-100 text-purple-900 border-purple-300"
                }`}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-sm rounded-2xl bg-purple-900/60 p-6 border-2 border-fuchsia-500/50 shadow-xl shadow-fuchsia-500/10 flex flex-col gap-6 fade-in-up fade-delay-2">
        <button
          type="button"
          onClick={handleCreate}
          disabled={!!loading}
          className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-bold text-lg hover:from-fuchsia-400 hover:to-purple-500 border-b-4 border-purple-800 shadow-lg disabled:opacity-50 transition-all active:border-b-0 active:translate-y-1"
        >
          {loading === "create" ? "⏳ 部屋を開いています…" : "🌃 パーティーを開く (Host)"}
        </button>

        <div className="border-t border-fuchsia-500/30 pt-5">
          <p className="text-sm text-fuchsia-200 font-bold mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-fuchsia-400 rounded-full animate-pulse" />
            🎟️ 参加する (Join)
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              placeholder="招待IDを入力"
              className="flex-1 px-3 py-2 rounded-lg border-2 border-fuchsia-500/50 bg-purple-950/80 text-purple-100 placeholder-purple-400 focus:border-fuchsia-400 focus:outline-none"
              disabled={!!loading}
            />
            <button
              type="button"
              onClick={handleJoin}
              disabled={!!loading}
              className="px-4 py-2 rounded-lg bg-fuchsia-500 text-white font-bold hover:bg-fuchsia-400 border-2 border-fuchsia-400 disabled:opacity-50 transition-colors"
            >
              {loading === "join" ? "…" : "参加"}
            </button>
          </div>
        </div>

        {error && (
          <div
            className="bg-red-900/40 border-l-4 border-fuchsia-400 text-red-200 p-3 text-sm rounded space-y-2 pop-in"
            role="alert"
          >
            <p>⚠️ {error}</p>
            {fullGameId && (
              <Link
                href={`/midnight/game/${fullGameId}`}
                className="inline-block px-4 py-2 rounded-lg bg-fuchsia-500 text-white font-bold hover:bg-fuchsia-400 border-2 border-fuchsia-400 text-sm"
              >
                👀 観戦する
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-purple-900/40 p-4 border border-fuchsia-500/30 max-w-md text-sm text-purple-200 shadow-inner fade-in-up fade-delay-3">
        <p className="font-bold text-fuchsia-200 mb-1 font-serif">📜 ルール概要</p>
        <p>
          自分のカードだけ見えません。他人のカードは全部見えるので、合計値を推理して「より大きい数字」を宣言するか、「Midnight!」でチャレンジ。合計が宣言より小さければ宣言者の負け、以上ならチャレンジした人の負け。ライフ0で脱落。
        </p>
      </div>

      <footer className="mt-8 text-center text-purple-500 text-xs max-w-md px-4">
        ※ これは非公式のファンプロジェクトであり、オリジナルのゲームとは関係ありません。
      </footer>
    </div>
  );
}
