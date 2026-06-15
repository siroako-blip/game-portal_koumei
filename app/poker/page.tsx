"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { RuleBook } from "@/components/RuleBook";
import { useState } from "react";
import {
  createPokerGame,
  getPokerGame,
  joinPokerGame,
} from "@/lib/gameDb";

function generatePlayerId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "pid-" + Math.random().toString(36).slice(2) + "-" + Date.now();
}

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;

export default function PokerLobbyPage() {
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
      const { id } = await createPokerGame(hostId);
      router.push(`/poker/game/${id}?pid=${encodeURIComponent(hostId)}`);
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
      const existing = await getPokerGame(trimmed);
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
      await joinPokerGame(trimmed, playerId);
      router.push(`/poker/game/${trimmed}?pid=${encodeURIComponent(playerId)}`);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "参加に失敗しました");
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 gap-6 items-center justify-center bg-gradient-to-b from-green-950 via-emerald-950 to-green-950 text-emerald-50">
      <Link
        href="/"
        className="absolute top-4 left-4 text-emerald-300 hover:text-amber-300 text-sm font-medium underline"
      >
        ゲーム選択に戻る
      </Link>
      <div className="text-center space-y-3 fade-in-up">
        <div className="flex justify-center items-end gap-2 text-5xl drop-shadow-lg">
          <span className="animate-float">♠️</span>
          <span className="text-amber-300 animate-bob">🃏</span>
          <span className="animate-float" style={{ animationDelay: "0.5s" }}>♥️</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 drop-shadow-sm tracking-wider font-serif">
          Poker
        </h1>
        <p className="text-emerald-200 text-sm md:text-base">
          🃏 テキサスホールデム — チップを賭けて役で勝負（{MIN_PLAYERS}〜{MAX_PLAYERS}人）
        </p>
        <div className="flex justify-center gap-2 pt-2">
          {["A♠", "K♥", "Q♦", "J♣"].map((label, i) => (
            <div
              key={i}
              className={`w-11 h-15 px-1 py-2 rounded-lg flex items-center justify-center text-base font-extrabold shadow-lg border-2 bg-white border-amber-200 pop-in fade-delay-${i + 1} ${
                label.includes("♥") || label.includes("♦") ? "text-red-600" : "text-stone-900"
              }`}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-sm rounded-2xl bg-emerald-900/60 p-6 border-2 border-amber-500/50 shadow-xl shadow-amber-500/10 flex flex-col gap-6 fade-in-up fade-delay-2">
        <button
          type="button"
          onClick={handleCreate}
          disabled={!!loading}
          className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-emerald-950 font-bold text-lg hover:from-amber-400 hover:to-yellow-500 border-b-4 border-amber-800 shadow-lg disabled:opacity-50 transition-all active:border-b-0 active:translate-y-1"
        >
          {loading === "create" ? "⏳ テーブルを開いています…" : "🎰 テーブルを開く (Host)"}
        </button>

        <div className="border-t border-amber-500/30 pt-5">
          <p className="text-sm text-amber-200 font-bold mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            🎟️ 参加する (Join)
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              placeholder="招待IDを入力"
              className="flex-1 px-3 py-2 rounded-lg border-2 border-amber-500/50 bg-emerald-950/80 text-emerald-50 placeholder-emerald-400 focus:border-amber-400 focus:outline-none"
              disabled={!!loading}
            />
            <button
              type="button"
              onClick={handleJoin}
              disabled={!!loading}
              className="px-4 py-2 rounded-lg bg-amber-500 text-emerald-950 font-bold hover:bg-amber-400 border-2 border-amber-400 disabled:opacity-50 transition-colors"
            >
              {loading === "join" ? "…" : "参加"}
            </button>
          </div>
        </div>

        {error && (
          <div
            className="bg-red-900/40 border-l-4 border-amber-400 text-red-200 p-3 text-sm rounded space-y-2 pop-in"
            role="alert"
          >
            <p>⚠️ {error}</p>
            {fullGameId && (
              <Link
                href={`/poker/game/${fullGameId}`}
                className="inline-block px-4 py-2 rounded-lg bg-amber-500 text-emerald-950 font-bold hover:bg-amber-400 border-2 border-amber-400 text-sm"
              >
                👀 観戦する
              </Link>
            )}
          </div>
        )}
      </div>

      <RuleBook gameType="poker" />

      <footer className="mt-8 text-center text-emerald-600 text-xs max-w-md px-4">
        ※ これは非公式のファンプロジェクトであり、オリジナルのゲームとは関係ありません。
      </footer>
    </div>
  );
}
