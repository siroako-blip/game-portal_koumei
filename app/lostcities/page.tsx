"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { createGame, getGame, joinGame, startGame } from "@/lib/gameDb";
import { createInitialState } from "@/app/lostcities/logic";
import { COLOR_ICONS } from "@/app/lostcities/components/Card";
import { COLORS, COLOR_LABELS } from "@/app/lostcities/types";

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
  const [showRules, setShowRules] = useState(false);

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
      <Link href="/" className="absolute top-4 left-4 text-stone-600 hover:text-orange-600 text-sm font-bold underline">
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

      <button
        onClick={() => setShowRules(true)}
        className="text-stone-600 hover:text-orange-600 underline underline-offset-4 text-sm transition-colors flex items-center gap-1 font-bold"
      >
        📜 ゲームのルールを確認する
      </button>

      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white text-stone-900 rounded-2xl border border-amber-200 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-amber-100 p-4 border-b border-amber-200 flex justify-between items-center sticky top-0">
              <h2 className="text-xl font-extrabold text-amber-800">📜 ロストシティ — ルール</h2>
              <button onClick={() => setShowRules(false)} className="p-1 hover:bg-amber-200/80 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6 text-sm md:text-base leading-relaxed">
              <section>
                <h3 className="text-amber-800 font-bold mb-2 text-lg border-b-2 border-amber-200 pb-1">🎯 目的</h3>
                <p className="text-stone-700">
                  5つの属性（<span className="text-red-500">🔥火</span>・<span className="text-blue-500">💧水</span>・<span className="text-emerald-600">🍃風</span>・<span className="text-amber-600">⛰️土</span>・<span className="text-stone-500">✨光</span>）の「道」にカードを並べ、スコアを競います。<br />
                  各道には<span className="text-red-600 font-bold">コスト（-20点）</span>がかかります。途中で止めると赤字になります。
                </p>
              </section>
              <section>
                <h3 className="text-amber-800 font-bold mb-2 text-lg border-b-2 border-amber-200 pb-1">🎴 カードの種類と出し方</h3>
                <ul className="list-disc pl-5 space-y-2 text-stone-700">
                  <li>
                    <span className="font-bold text-stone-900">数字カード (2〜10):</span><br />
                    自分の道に出すときは、<span className="text-amber-700 font-bold">小さい数字から大きい数字の順（昇順）</span>にしか出せません。
                  </li>
                  <li>
                    <span className="font-bold text-stone-900">契約カード (🤝):</span><br />
                    得点を倍にするカードです。<span className="text-amber-700 font-bold">数字カードを出す前</span>にのみ出せます。1枚で2倍、2枚で3倍、3枚で4倍。
                  </li>
                </ul>
              </section>
              <section>
                <h3 className="text-amber-800 font-bold mb-2 text-lg border-b-2 border-amber-200 pb-1">🔄 ターンの流れ</h3>
                <ol className="list-decimal pl-5 space-y-2 text-stone-700">
                  <li><span className="font-bold text-stone-900">カードを1枚出す:</span> 自分の道に置くか、捨て札置き場に捨てる。</li>
                  <li><span className="font-bold text-stone-900">カードを1枚引く:</span> 山札か、自分が捨てた属性以外の捨て札から引く。</li>
                </ol>
              </section>
              <section>
                <h3 className="text-amber-800 font-bold mb-2 text-lg border-b-2 border-amber-200 pb-1">🏆 得点計算</h3>
                <div className="bg-amber-50 p-3 rounded-xl border-2 border-amber-200 font-mono text-sm text-stone-800">
                  (数字の合計 - 20) × (契約の枚数 + 1)
                </div>
                <p className="text-stone-700 mt-2 text-xs">
                  道に8枚以上あるとボーナス <span className="text-emerald-600">+20点</span>。1枚も置いていない道は 0点です。
                </p>
              </section>
            </div>
            <div className="bg-amber-100 p-4 border-t border-amber-200 text-center">
              <button
                onClick={() => setShowRules(false)}
                className="px-8 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl font-bold transition-all shadow-lg border-b-4 border-orange-700 active:border-b-0 active:translate-y-1"
              >
                理解した！
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-8 text-center text-stone-500 text-xs max-w-md px-4">
        ※ これは非公式のファンプロジェクトであり、オリジナルのゲームとは関係ありません。
      </footer>
    </div>
  );
}
