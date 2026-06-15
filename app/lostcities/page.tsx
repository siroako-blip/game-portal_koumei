"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { createGame, getGame, joinGame, startGame } from "@/lib/gameDb";
import { createInitialState } from "@/app/lostcities/logic";
import { COLOR_ICONS } from "@/app/lostcities/components/Card";
import { COLORS, COLOR_LABELS } from "@/app/lostcities/types";
import { RuleBook } from "@/components/RuleBook";

function generatePlayerId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "pid-" + Math.random().toString(36).slice(2) + "-" + Date.now();
}

export default function LostCitiesLobbyPage() {
  const router = useRouter();
  const [joinId, setJoinId] = useState("");
  const [loading, setLoading] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullGameId, setFullGameId] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    setLoading("create");
    try {
      const player1Id = generatePlayerId();
      const { id } = await createGame(player1Id);
      router.push(`/lostcities/game/${id}?pid=${encodeURIComponent(player1Id)}`);
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
      const player2Id = generatePlayerId();
      const existing = await getGame(trimmed);
      if (!existing) {
        setError("ゲームが見つかりません");
        setLoading(null);
        return;
      }
      if (existing.player2_id) {
        setError("このゲームは既に満員です。観戦する場合は下のボタンからどうぞ。");
        setFullGameId(trimmed);
        setLoading(null);
        return;
      }
      await joinGame(trimmed, player2Id);
      const row = await getGame(trimmed);
      if (row && !row.game_state) {
        const initialState = createInitialState();
        await startGame(trimmed, initialState);
      }
      router.push(`/lostcities/game/${trimmed}?pid=${encodeURIComponent(player2Id)}`);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "参加に失敗しました");
      setLoading(null);
    }
  };

  return (
    <div className="parchment-bg min-h-screen flex flex-col p-4 gap-6 items-center justify-center text-stone-800">
      <Link href="/" className="absolute top-4 left-4 z-20 text-stone-600 hover:text-orange-600 text-sm font-bold underline">
        ← ゲーム選択に戻る
      </Link>
      <div className="text-center space-y-3 fade-in-up">
        <div className="text-7xl drop-shadow-lg animate-float">🔮</div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-orange-600 to-red-600 drop-shadow-sm">
          Lost Cities
        </h1>
        <p className="text-stone-600 font-medium text-sm md:text-base">ロストシティ — 5色の探検路を数字順に伸ばすカード対戦</p>
        {/* 5属性のアイコン */}
        <div className="flex justify-center gap-3 pt-2">
          {COLORS.map((color, i) => (
            <div
              key={color}
              className={`flex flex-col items-center gap-1 bg-white/70 rounded-xl px-3 py-2 shadow border border-amber-200 pop-in fade-delay-${i + 1}`}
            >
              <span className={`text-2xl animate-bob bob-delay-${i}`}>{COLOR_ICONS[color]}</span>
              <span className="text-[10px] font-bold text-stone-500">{COLOR_LABELS[color]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-sm rounded-2xl bg-white/80 p-6 border border-amber-200 flex flex-col gap-6 shadow-lg relative z-10 fade-in-up fade-delay-2">
        <button
          type="button"
          onClick={handleCreate}
          disabled={!!loading}
          className="w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600
            hover:from-amber-400 hover:to-orange-500 text-white font-extrabold text-lg
            shadow-lg shadow-orange-300/60 border-b-4 border-orange-700
            active:border-b-0 active:translate-y-1 disabled:opacity-50 transition-all"
        >
          {loading === "create" ? "道を開いています…" : "🗺️ ロストシティを始める (Host)"}
        </button>

        <div className="border-t-2 border-amber-200 pt-5">
          <p className="text-sm text-stone-600 font-bold mb-2 flex items-center gap-2">
            🎟️ 旅に参加する (Join)
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              placeholder="招待IDを入力"
              className="flex-1 px-3 py-2 rounded-xl border-2 border-amber-200 bg-amber-50 text-stone-800 focus:border-amber-500 focus:outline-none placeholder-stone-400"
              disabled={!!loading}
            />
            <button
              type="button"
              onClick={handleJoin}
              disabled={!!loading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600
                hover:from-emerald-400 hover:to-green-500 text-white font-extrabold shadow
                border-b-4 border-green-700 active:border-b-0 active:translate-y-1
                disabled:opacity-50 transition-all"
            >
              {loading === "join" ? "…" : "参加"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border-2 border-red-300 text-red-700 p-3 text-sm rounded-xl space-y-2 font-medium" role="alert">
            <p>⚠️ {error}</p>
            {fullGameId && (
              <Link
                href={`/lostcities/game/${fullGameId}`}
                className="inline-block px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold hover:from-amber-400 hover:to-orange-500 text-sm shadow"
              >
                👀 観戦する
              </Link>
            )}
          </div>
        )}
      </div>

      <RuleBook gameType="lostcities" />

      <footer className="mt-8 text-center text-stone-500 text-xs max-w-md px-4">
        ※ これは非公式のファンプロジェクトであり、オリジナルのゲームとは関係ありません。
      </footer>
    </div>
  );
}
