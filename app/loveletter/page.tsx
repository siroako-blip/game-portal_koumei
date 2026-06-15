"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { createLoveLetterGame, getLoveLetterGame, joinLoveLetterGame } from "@/lib/gameDb";

function generatePlayerId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "pid-" + Math.random().toString(36).slice(2) + "-" + Date.now();
}

export default function LoveLetterLobbyPage() {
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
      const { id } = await createLoveLetterGame(hostId);
      router.push(`/loveletter/game/${id}?pid=${encodeURIComponent(hostId)}`);
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
      const existing = await getLoveLetterGame(trimmed);
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
      if (existing.player_ids.length >= 4) {
        setError("このゲームは満員です。観戦する場合は下のボタンからどうぞ。");
        setFullGameId(trimmed);
        setLoading(null);
        return;
      }
      await joinLoveLetterGame(trimmed, playerId);
      router.push(`/loveletter/game/${trimmed}?pid=${encodeURIComponent(playerId)}`);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "参加に失敗しました");
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 gap-6 items-center justify-center bg-gradient-to-b from-red-950 to-amber-950/80 text-amber-100">
      <Link href="/" className="absolute top-4 left-4 z-20 text-amber-200 hover:text-amber-100 text-sm font-medium underline">
        ← ゲーム選択に戻る
      </Link>
      <div className="text-center space-y-3 fade-in-up">
        <div className="flex justify-center items-end gap-3">
          <span className="text-4xl animate-twinkle">✨</span>
          <span className="text-7xl drop-shadow-lg animate-float">💌</span>
          <span className="text-4xl animate-twinkle">✨</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold drop-shadow-sm tracking-wider font-serif text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-300">
          Love Letter
        </h1>
        <p className="text-amber-200/90 text-sm md:text-base">🏰 ラブレター — 1枚の手札で出し抜く心理戦・2〜4人用</p>
        {/* 宮廷の登場人物 */}
        <div className="flex justify-center gap-3 pt-2">
          {["💂", "🛡️", "🤴", "👸"].map((icon, i) => (
            <div
              key={i}
              className={`w-11 h-11 rounded-xl bg-red-900/70 border border-amber-500/50 shadow
                flex items-center justify-center text-2xl pop-in fade-delay-${i + 1} animate-bob bob-delay-${i}`}
            >
              {icon}
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-sm rounded-xl bg-red-900/50 p-6 border-4 border-amber-600/60 flex flex-col gap-6 shadow-2xl relative z-10 fade-in-up fade-delay-2">
        <button
          type="button"
          onClick={handleCreate}
          disabled={!!loading}
          className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-red-800 to-rose-800 text-amber-50 font-bold text-lg hover:from-red-700 hover:to-rose-700 border-b-4 border-red-950 shadow-lg disabled:opacity-50 transition-all active:border-b-0 active:translate-y-1"
        >
          {loading === "create" ? "⏳ 部屋を開いています…" : "👑 王宮を開く (Host)"}
        </button>

        <div className="border-t-2 border-amber-600/40 pt-5">
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
              className="flex-1 px-3 py-2 rounded-lg border-2 border-amber-600/50 bg-red-950/60 text-amber-50 focus:border-amber-500 focus:outline-none placeholder-amber-400/60"
              disabled={!!loading}
            />
            <button
              type="button"
              onClick={handleJoin}
              disabled={!!loading}
              className="px-4 py-2 rounded-lg bg-red-800 text-amber-50 font-bold hover:bg-red-700 border-2 border-amber-500/70 disabled:opacity-50 transition-colors"
            >
              {loading === "join" ? "…" : "参加"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-950/80 border-l-4 border-red-400 text-amber-100 p-3 text-sm rounded space-y-2 pop-in" role="alert">
            <p>⚠️ {error}</p>
            {fullGameId && (
              <Link
                href={`/loveletter/game/${fullGameId}`}
                className="inline-block px-4 py-2 rounded-lg bg-amber-600 text-red-950 font-bold hover:bg-amber-500 border-2 border-amber-500 text-sm"
              >
                👀 観戦する
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-red-900/30 p-4 border-4 border-amber-600/40 max-w-md text-sm text-amber-100/90 shadow-inner fade-in-up fade-delay-3">
        <p className="font-bold text-amber-50 mb-1 font-serif">📜 ルール概要</p>
        <p>手札から1枚を捨て、その効果を発動。兵士で数字を当てる、男爵で手札比較、王子で手札を捨てさせる… 最後の1人になるか、山札が尽きた時点で手札が強い人が勝ち。2人以上で開始できます。</p>
      </div>

      <footer className="mt-8 text-center text-amber-400/80 text-xs max-w-md px-4">
        ※ これは非公式のファンプロジェクトであり、オリジナルのゲームとは関係ありません。
      </footer>
    </div>
  );
}
