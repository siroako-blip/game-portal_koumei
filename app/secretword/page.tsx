"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  createSecretWordGame,
  getSecretWordGame,
  joinSecretWordGame,
} from "@/lib/gameDb";

function generatePlayerId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "pid-" + Math.random().toString(36).slice(2) + "-" + Date.now();
}

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 8;

export default function SecretWordLobbyPage() {
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
      const { id } = await createSecretWordGame(hostId);
      router.push(`/secretword/game/${id}?pid=${encodeURIComponent(hostId)}`);
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
      const existing = await getSecretWordGame(trimmed);
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
      await joinSecretWordGame(trimmed, playerId);
      router.push(`/secretword/game/${trimmed}?pid=${encodeURIComponent(playerId)}`);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "参加に失敗しました");
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 gap-6 items-center justify-center bg-gradient-to-b from-emerald-950/95 via-teal-950/90 to-emerald-950/95 text-emerald-100">
      <Link
        href="/"
        className="absolute top-4 left-4 text-emerald-300 hover:text-emerald-200 text-sm font-medium underline"
      >
        ゲーム選択に戻る
      </Link>
      <div className="text-center space-y-3 fade-in-up">
        <div className="flex justify-center items-end gap-3">
          <span className="text-4xl animate-bob">🌲</span>
          <span className="text-7xl drop-shadow-lg animate-float">🐺</span>
          <span className="text-4xl animate-bob bob-delay-2">🌲</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 drop-shadow-sm tracking-wider font-serif">
          Word Wolf
        </h1>
        <p className="text-emerald-300 text-sm md:text-base">
          🗣️ ワードウルフ — お題を推理してウルフを当てる（{MIN_PLAYERS}〜{MAX_PLAYERS}人）
        </p>
        {/* 市民の中に1人だけウルフ */}
        <div className="flex justify-center gap-3 pt-2">
          {["🙂", "🙂", "🐺", "🙂"].map((icon, i) => (
            <div
              key={i}
              className={`w-11 h-11 rounded-xl border shadow flex items-center justify-center text-2xl pop-in fade-delay-${i + 1}
                ${
                  icon === "🐺"
                    ? "bg-emerald-700/90 border-emerald-300 animate-bob"
                    : "bg-emerald-900/70 border-emerald-500/40"
                }`}
            >
              {icon}
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-sm rounded-2xl bg-emerald-900/60 p-6 border-2 border-emerald-500/50 shadow-xl flex flex-col gap-6 fade-in-up fade-delay-2">
        <button
          type="button"
          onClick={handleCreate}
          disabled={!!loading}
          className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-lg hover:from-emerald-400 hover:to-teal-500 border-b-4 border-emerald-800 shadow-lg disabled:opacity-50 transition-all active:border-b-0 active:translate-y-1"
        >
          {loading === "create" ? "⏳ 部屋を開いています…" : "🌙 集会を開く (Host)"}
        </button>

        <div className="border-t border-emerald-500/30 pt-5">
          <p className="text-sm text-emerald-200 font-bold mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            🎟️ 参加する (Join)
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              placeholder="招待IDを入力"
              className="flex-1 px-3 py-2 rounded-lg border-2 border-emerald-500/50 bg-emerald-950/80 text-emerald-100 placeholder-emerald-400/60 focus:border-emerald-400 focus:outline-none"
              disabled={!!loading}
            />
            <button
              type="button"
              onClick={handleJoin}
              disabled={!!loading}
              className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-bold hover:bg-emerald-400 border-2 border-emerald-400 disabled:opacity-50 transition-colors"
            >
              {loading === "join" ? "…" : "参加"}
            </button>
          </div>
        </div>

        {error && (
          <div
            className="bg-red-900/40 border-l-4 border-emerald-400 text-red-200 p-3 text-sm rounded space-y-2 pop-in"
            role="alert"
          >
            <p>⚠️ {error}</p>
            {fullGameId && (
              <Link
                href={`/secretword/game/${fullGameId}`}
                className="inline-block px-4 py-2 rounded-lg bg-emerald-500 text-white font-bold hover:bg-emerald-400 border-2 border-emerald-400 text-sm"
              >
                👀 観戦する
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-emerald-900/40 p-4 border border-emerald-500/30 max-w-md text-sm text-emerald-200 fade-in-up fade-delay-3">
        <p className="font-bold text-emerald-100 mb-1 font-serif">📜 ルール概要</p>
        <p>
          全員に「似た単語」が配られるが、1人だけ違う単語（ウルフ）。議論で「噛み合わない人」を探し、投票で追放。追放された人がウルフなら市民の勝ち、市民ならウルフの勝ち。
        </p>
      </div>

      <footer className="mt-8 text-center text-emerald-500 text-xs max-w-md px-4">
        ※ これは非公式のファンプロジェクトであり、オリジナルのゲームとは関係ありません。
      </footer>
    </div>
  );
}
