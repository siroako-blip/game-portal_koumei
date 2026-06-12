"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  createAbyssSalvageGame,
  getAbyssSalvageGame,
  joinAbyssSalvageGame,
} from "@/lib/gameDb";
import { TOTAL_ROUNDS } from "@/app/abyss/logic";

function generatePlayerId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "pid-" + Math.random().toString(36).slice(2) + "-" + Date.now();
}

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;

export default function AbyssSalvageLobbyPage() {
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
      const { id } = await createAbyssSalvageGame(hostId);
      router.push(`/abyss/game/${id}?pid=${encodeURIComponent(hostId)}`);
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
      const existing = await getAbyssSalvageGame(trimmed);
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
      await joinAbyssSalvageGame(trimmed, playerId);
      router.push(`/abyss/game/${trimmed}?pid=${encodeURIComponent(playerId)}`);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "参加に失敗しました");
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 gap-6 items-center justify-center bg-gradient-to-b from-slate-950 via-blue-950/95 to-slate-950 text-slate-100">
      <Link
        href="/"
        className="absolute top-4 left-4 text-cyan-300 hover:text-cyan-200 text-sm font-medium underline"
      >
        ゲーム選択に戻る
      </Link>
      <div className="text-center space-y-2">
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-cyan-200 to-teal-400 drop-shadow-sm tracking-wider font-serif">
          Abyss Salvage
        </h1>
        <p className="text-cyan-200/80 text-sm md:text-base">
          深海探検 — 遺跡を拾い、酸素を共有して帰還（{MIN_PLAYERS}〜{MAX_PLAYERS}人・全{TOTAL_ROUNDS}ラウンド）
        </p>
      </div>

      <div className="w-full max-w-sm rounded-2xl bg-slate-900/70 p-6 border-2 border-cyan-500/40 shadow-xl shadow-cyan-500/10 flex flex-col gap-6">
        <button
          type="button"
          onClick={handleCreate}
          disabled={!!loading}
          className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-bold text-lg hover:from-cyan-500 hover:to-teal-500 border-2 border-cyan-400/60 shadow-lg disabled:opacity-50 transition-all active:scale-95"
        >
          {loading === "create" ? "部屋を開いています…" : "部屋を作成 (Host)"}
        </button>

        <div className="border-t border-cyan-500/30 pt-5">
          <p className="text-sm text-cyan-200 font-bold mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-cyan-400 rounded-full" />
            参加する (Join)
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              placeholder="招待IDを入力"
              className="flex-1 px-3 py-2 rounded-lg border-2 border-cyan-500/50 bg-slate-950/80 text-cyan-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
              disabled={!!loading}
            />
            <button
              type="button"
              onClick={handleJoin}
              disabled={!!loading}
              className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-bold hover:bg-cyan-500 border-2 border-cyan-400 disabled:opacity-50 transition-colors"
            >
              {loading === "join" ? "…" : "参加"}
            </button>
          </div>
        </div>

        {error && (
          <div
            className="bg-red-900/40 border-l-4 border-cyan-400 text-red-200 p-3 text-sm rounded space-y-2"
            role="alert"
          >
            <p>{error}</p>
            {fullGameId && (
              <Link
                href={`/abyss/game/${fullGameId}`}
                className="inline-block px-4 py-2 rounded-lg bg-cyan-600 text-white font-bold hover:bg-cyan-500 border-2 border-cyan-400 text-sm"
              >
                観戦する
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-slate-900/50 p-4 border border-cyan-500/30 max-w-md text-sm text-cyan-100/90">
        <p className="font-bold text-cyan-200 mb-1 font-serif">ルール概要</p>
        <p>
          1隻の潜水艦から出発し、深く潜って遺跡チップを拾う。酸素は全員で共有（初期25）。持っている遺跡の数だけ毎ターン酸素を消費。サイコロ2つで移動（持っている数だけ出目から引く）。他のプレイヤーのマスは飛び越える。全員が戻るか酸素0でラウンド終了。3ラウンドで総得点を競う。
        </p>
      </div>

      <footer className="mt-8 text-center text-slate-500 text-xs max-w-md px-4">
        ※ これは非公式のファンプロジェクトであり、オリジナルのゲームとは関係ありません。
      </footer>
    </div>
  );
}
