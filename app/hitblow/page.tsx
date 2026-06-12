"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { createHitBlowGame, getHitBlowGame, joinHitBlowGame, startHitBlowGame } from "@/lib/gameDb";
import { createInitialHitBlowState } from "@/app/hitblow/logic";

function generatePlayerId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "pid-" + Math.random().toString(36).slice(2) + "-" + Date.now();
}

export default function HitBlowLobbyPage() {
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
      const { id } = await createHitBlowGame(player1Id);
      router.push(`/hitblow/game/${id}?pid=${encodeURIComponent(player1Id)}`);
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
      const existing = await getHitBlowGame(trimmed);
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
      await joinHitBlowGame(trimmed, player2Id);
      const row = await getHitBlowGame(trimmed);
      if (row && !row.game_state) {
        const initialState = createInitialHitBlowState();
        await startHitBlowGame(trimmed, initialState);
      }
      router.push(`/hitblow/game/${trimmed}?pid=${encodeURIComponent(player2Id)}`);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "参加に失敗しました");
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 gap-6 items-center justify-center bg-gradient-to-b from-stone-100 to-orange-50/60 text-stone-900">
      <Link href="/" className="absolute top-4 left-4 text-stone-600 hover:text-amber-600 text-sm font-medium underline">
        ゲーム選択に戻る
      </Link>
      <div className="text-center space-y-2">
        <h1 className="text-4xl md:text-5xl font-bold text-stone-900 drop-shadow-sm tracking-wider">
          Hit and Blow
        </h1>
        <p className="text-stone-600 text-sm md:text-base">数字当て推理ゲーム — 2人対戦</p>
      </div>

      <div className="w-full max-w-sm rounded-xl bg-stone-100 p-6 border-4 border-amber-700/50 flex flex-col gap-6 shadow-2xl relative z-10">
        <button
          type="button"
          onClick={handleCreate}
          disabled={!!loading}
          className="w-full px-6 py-4 rounded-xl bg-amber-600 text-white font-bold text-lg hover:bg-amber-500 border-2 border-amber-700 shadow-lg disabled:opacity-50 transition-all active:scale-95"
        >
          {loading === "create" ? "作成中…" : "ゲームを作成 (Host)"}
        </button>

        <div className="border-t-2 border-amber-700/40 pt-5">
          <p className="text-sm text-stone-700 font-bold mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-amber-500 rounded-full" />
            ゲームに参加 (Join)
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              placeholder="招待IDを入力"
              className="flex-1 px-3 py-2 rounded-lg border-2 border-amber-700/50 bg-stone-50 text-stone-900 focus:border-amber-600 focus:outline-none placeholder-stone-400"
              disabled={!!loading}
            />
            <button
              type="button"
              onClick={handleJoin}
              disabled={!!loading}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-500 border-2 border-amber-700 disabled:opacity-50 transition-colors"
            >
              {loading === "join" ? "…" : "参加"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-800 p-3 text-sm rounded space-y-2" role="alert">
            <p>{error}</p>
            {fullGameId && (
              <Link
                href={`/hitblow/game/${fullGameId}`}
                className="inline-block px-4 py-2 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-500 border-2 border-amber-700 text-sm"
              >
                観戦する
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-amber-50/80 p-4 border-4 border-amber-800 max-w-md text-sm text-stone-700 shadow-inner">
        <p className="font-bold text-amber-900 mb-1 font-serif">ルール</p>
        <p>両者が4桁の秘密の数字を設定後、先攻（Player 1）から交互に相手の数字を予想。H（位置も数字も一致）とB（数字のみ一致）のヒントで先に4Hを出した方が勝ち（サドンデス）。</p>
      </div>

      <footer className="mt-8 text-center text-stone-500 text-xs max-w-md px-4">
        ※ これは非公式のファンプロジェクトであり、オリジナルのゲームとは関係ありません。
      </footer>
    </div>
  );
}
