"use client";

import { useCallback, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { MidnightGameState, MidnightCard } from "@/app/midnight/logic";
import {
  bid,
  callMidnight,
  startNextRound,
  createInitialMidnightState,
  restartGame,
} from "@/app/midnight/logic";
import { useMidnightRealtime } from "@/app/midnight/useRealtime";
import { usePresenceMany } from "@/lib/usePresence";
import { PresenceDot } from "@/components/PresenceDot";
import {
  startMidnightPartyGame,
  updateMidnightPartyGameState,
} from "@/lib/gameDb";
import { RuleBook } from "@/components/RuleBook";

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [text]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="px-2 py-1 rounded border border-fuchsia-400 bg-purple-800/80 hover:bg-fuchsia-500/30 text-fuchsia-200 text-sm font-medium"
    >
      {copied ? "コピーしました" : "📋 コピー"}
    </button>
  );
}

function cardLabel(c: MidnightCard): string {
  if (typeof c === "number") return String(c);
  return c;
}

function GameContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const gameId = typeof params.id === "string" ? params.id : null;
  const pid = searchParams.get("pid") ?? "";

  const { gameData, loading, error } = useMidnightRealtime(gameId);
  const playerIds: string[] = Array.isArray(gameData?.player_ids) ? gameData.player_ids : [];
  const { isOnline } = usePresenceMany(gameId, pid || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bidInput, setBidInput] = useState("");

  const playerIndex = pid ? playerIds.indexOf(pid) : -1;
  const myIndex = playerIndex >= 0 ? playerIndex : -1;
  const isHost = myIndex === 0;
  const isSpectator = myIndex < 0;
  const state: MidnightGameState | null = gameData?.game_state ?? null;

  const handleStartGame = useCallback(async () => {
    if (!gameId || !isHost || playerIds.length < MIN_PLAYERS || playerIds.length > MAX_PLAYERS) return;
    setIsSubmitting(true);
    try {
      const initialState = createInitialMidnightState(playerIds.length);
      await startMidnightPartyGame(gameId, initialState);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, isHost, playerIds.length]);

  const handleBid = useCallback(
    async (value: number) => {
      if (isSpectator || myIndex < 0 || !gameId || !state) return;
      const next = bid(state, myIndex, value);
      if (!next) return;
      setIsSubmitting(true);
      setBidInput("");
      try {
        await updateMidnightPartyGameState(gameId, next);
      } finally {
        setIsSubmitting(false);
      }
    },
    [gameId, state, myIndex, isSpectator]
  );

  const handleMidnight = useCallback(async () => {
    if (isSpectator || myIndex < 0 || !gameId || !state) return;
    const next = callMidnight(state, myIndex);
    if (!next) return;
    setIsSubmitting(true);
    try {
      await updateMidnightPartyGameState(gameId, next);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, state, myIndex, isSpectator]);

  const handleNextRound = useCallback(async () => {
    if (!gameId || !state) return;
    const next = startNextRound(state);
    if (!next) return;
    setIsSubmitting(true);
    try {
      await updateMidnightPartyGameState(gameId, next);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, state]);

  const handleRestart = useCallback(async () => {
    if (!gameId || !state) return;
    const next = restartGame(state);
    if (!next) return;
    setIsSubmitting(true);
    try {
      await updateMidnightPartyGameState(gameId, next);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, state]);

  if (loading || !gameId) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-gradient-to-b from-purple-950 via-indigo-950 to-purple-950 text-purple-100">
        <h1 className="text-2xl font-bold font-serif text-fuchsia-200">Coyote</h1>
        <p className="text-purple-300">読み込み中…</p>
      </div>
    );
  }

  if (error || !gameData) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-gradient-to-b from-purple-950 to-indigo-950 text-purple-100">
        <h1 className="text-2xl font-bold font-serif">Coyote</h1>
        <p className="text-red-400">ゲームの取得に失敗しました</p>
        <Link href="/midnight" className="text-fuchsia-400 underline font-medium">
          ロビーに戻る
        </Link>
      </div>
    );
  }

  if (gameData.status === "waiting") {
    const canStart = playerIds.length >= MIN_PLAYERS && playerIds.length <= MAX_PLAYERS;
    return (
      <div className="min-h-screen flex flex-col p-4 gap-6 items-center justify-center bg-gradient-to-b from-purple-950 via-indigo-950 to-purple-950 text-purple-100">
        <h1 className="text-3xl font-bold font-serif text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 to-cyan-300">
          Coyote
        </h1>
        <p className="text-purple-300">合計値を推理してビッド</p>
        <div className="rounded-2xl bg-purple-900/60 p-6 border-2 border-fuchsia-500/50 shadow-xl max-w-md w-full">
          <p className="text-sm text-fuchsia-200 font-medium mb-2">
            参加者: {playerIds.length}人（{MIN_PLAYERS}〜{MAX_PLAYERS}人で開始）
          </p>
          {isHost && (
            <>
              <p className="text-xs text-purple-400 mb-2">ゲームID（仲間に伝えてください）</p>
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <p className="font-mono font-bold text-fuchsia-200 break-all">{gameData.id}</p>
                <CopyButton text={gameData.id} />
              </div>
              <button
                type="button"
                onClick={handleStartGame}
                disabled={!canStart || isSubmitting}
                className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-bold hover:from-fuchsia-400 hover:to-purple-500 border-2 border-fuchsia-400/80 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "開始中…" : "ゲームを開始する"}
              </button>
            </>
          )}
          {!isHost && !isSpectator && (
            <p className="text-purple-300 text-sm">Hostがゲームを開始するまでお待ちください。</p>
          )}
          {isSpectator && <p className="text-purple-400 text-sm">観戦中です。</p>}
        </div>
        <Link href="/midnight" className="text-fuchsia-400 underline font-medium">
          ロビーに戻る
        </Link>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-gradient-to-b from-purple-950 to-indigo-950 text-purple-100">
        <h1 className="text-2xl font-bold font-serif">Coyote</h1>
        <p className="text-purple-400">ゲームデータを読み込めません</p>
        <Link href="/midnight" className="text-fuchsia-400 underline font-medium">
          ロビーに戻る
        </Link>
      </div>
    );
  }

  const playerLabel = (i: number) =>
    isSpectator ? `P${i + 1}` : i === myIndex ? "あなた" : `P${i + 1}`;
  const minBid = state.currentBid < 0 ? 0 : state.currentBid + 1;
  const isMyTurn = state.phase === "bidding" && state.currentPlayerIndex === myIndex && state.lives[myIndex] > 0;
  const bidValue = bidInput === "" ? NaN : parseInt(bidInput, 10);
  const canBid = isMyTurn && !isSpectator && !isSubmitting && Number.isInteger(bidValue) && bidValue >= minBid;
  const canMidnight = isMyTurn && !isSpectator && !isSubmitting && state.currentBid >= 0;

  return (
    <div className="min-h-screen flex flex-col p-4 gap-4 bg-gradient-to-b from-purple-950 via-indigo-950 to-purple-950 text-purple-100">
      <RuleBook gameType="midnight" />
      <div className="flex flex-wrap items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 flex-wrap">
          {isSpectator && (
            <span className="px-3 py-1.5 rounded-lg bg-fuchsia-500/30 text-fuchsia-200 text-sm font-bold border border-fuchsia-400/50">
              👀 観戦
            </span>
          )}
          <h1 className="text-2xl font-bold font-serif text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 to-cyan-300">
            Coyote
          </h1>
          <span className="text-purple-300 text-sm">ラウンド {state.round}</span>
        </div>
        <Link href="/midnight" className="text-fuchsia-400 text-sm underline hover:text-fuchsia-300 font-medium">
          ロビーに戻る
        </Link>
      </div>

      {/* ライフ・現在の宣言 */}
      <section className="rounded-xl bg-purple-900/60 p-4 border border-fuchsia-500/40 shadow-inner flex flex-wrap items-center gap-4">
        <span className="text-fuchsia-200 font-bold">
          現在の宣言: {state.currentBid < 0 ? "—" : state.currentBid}
          {state.currentBid >= 0 && (
            <span className="text-purple-400 text-sm font-normal ml-1">
              （{playerLabel(state.currentBidderIndex)}）
            </span>
          )}
        </span>
        <div className="flex flex-wrap gap-3">
          {state.lives.map((life, i) => (
            <span
              key={i}
              className={`px-2 py-1 rounded text-sm font-bold ${
                i === myIndex ? "bg-fuchsia-500/40 text-fuchsia-100" : "bg-purple-800/60 text-purple-200"
              } ${life === 0 ? "opacity-50 line-through" : ""}`}
            >
              {playerLabel(i)} ♥{life} <PresenceDot online={isOnline(playerIds[i])} />
            </span>
          ))}
        </div>
        {state.phase === "bidding" && (
          <span className="text-cyan-300 text-sm">
            手番: {playerLabel(state.currentPlayerIndex)}
            {isMyTurn && " ← あなた"}
          </span>
        )}
      </section>

      {/* チャレンジ結果（全員のカードを表向きで表示・自分のカードも表示） */}
      {state.phase === "challenge_result" && (
        <div className="rounded-xl bg-fuchsia-900/50 border-2 border-fuchsia-500/60 p-6 text-center space-y-4">
          <p className="text-2xl font-bold text-fuchsia-200">
            合計値: <span className="text-cyan-300">{state.lastTotal}</span>
          </p>
          <p className="text-fuchsia-200">
            {state.lastLoserIndex !== undefined && (
              <>
                <span className="font-bold text-red-400">{playerLabel(state.lastLoserIndex)}</span> がライフを1失いました
              </>
            )}
          </p>
          <p className="text-sm text-fuchsia-300/90">全員の手札（結果発表のため全公開）</p>
          {state.revealedHands && (
            <div className="flex flex-wrap justify-center gap-4 text-left">
              {state.revealedHands.map((hand, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-4 py-3 border ${
                    i === myIndex ? "bg-fuchsia-800/60 border-fuchsia-400/60" : "bg-purple-900/80 border-fuchsia-500/30"
                  }`}
                >
                  <p className="text-sm font-bold text-fuchsia-200 mb-1.5">
                    {playerLabel(i)}
                    {i === myIndex && <span className="ml-2 text-fuchsia-400 text-xs">（あなた）</span>}
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {hand.map((c, j) => (
                      <span
                        key={j}
                        className="inline-flex items-center justify-center min-w-[2.5rem] py-1 px-1.5 rounded bg-purple-800 text-fuchsia-100 font-bold text-base"
                      >
                        {cardLabel(c)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {!isSpectator && (
            <button
              type="button"
              onClick={handleNextRound}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-bold hover:from-fuchsia-400 hover:to-purple-500 border-2 border-fuchsia-400 disabled:opacity-50"
            >
              {isSubmitting ? "…" : "次のラウンド"}
            </button>
          )}
        </div>
      )}

      {/* ゲームオーバー（最終手札を全公開・誰が何を持っていたか確認可能） */}
      {state.phase === "gameover" && (
        <div className="rounded-xl bg-purple-900/60 border-2 border-fuchsia-500/50 p-6 text-center space-y-4">
          <p className="text-xl font-bold text-fuchsia-200">ゲームオーバー</p>
          <p className="text-purple-300">
            勝者:{" "}
            {state.lives
              .map((l, i) => (l > 0 ? playerLabel(i) : null))
              .filter(Boolean)
              .join(", ") || "—"}
          </p>
          {(state.revealedHands ?? state.hands).length > 0 && (
            <div className="text-left">
              <p className="text-sm font-bold text-fuchsia-200 mb-2">最終手札（全員分・自分のカードも表示）</p>
              <div className="flex flex-wrap justify-center gap-4">
                {(state.revealedHands ?? state.hands).map((hand, i) => (
                  <div
                    key={i}
                    className={`rounded-lg px-4 py-3 border ${
                      i === myIndex ? "bg-fuchsia-800/60 border-fuchsia-400/60" : "bg-purple-900/80 border-fuchsia-500/30"
                    }`}
                  >
                    <p className="text-sm font-bold text-fuchsia-200 mb-1.5">
                      {playerLabel(i)}
                      {i === myIndex && <span className="ml-2 text-fuchsia-400 text-xs">（あなた）</span>}
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
                      {hand.map((c, j) => (
                        <span
                          key={j}
                          className="inline-flex items-center justify-center min-w-[2.5rem] py-1 px-1.5 rounded bg-purple-800 text-fuchsia-100 font-bold text-base"
                        >
                          {cardLabel(c)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-3 justify-center">
            {!isSpectator && (
              <button
                type="button"
                onClick={handleRestart}
                disabled={!!isSubmitting}
                className="px-6 py-3 rounded-xl bg-cyan-600 text-white font-bold hover:bg-cyan-500 border-2 border-cyan-400 disabled:opacity-50"
              >
                🔄 もう一度遊ぶ
              </button>
            )}
            <Link
              href="/midnight"
              className="inline-block px-6 py-3 rounded-xl bg-fuchsia-500 text-white font-bold hover:bg-fuchsia-400"
            >
              ロビーに戻る
            </Link>
          </div>
        </div>
      )}

      {/* 手札エリア（ビッド中のみ） */}
      {state.phase === "bidding" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 flex-1">
            {state.hands.map((hand, i) => (
              <section
                key={i}
                className={`rounded-xl p-4 border-2 shadow-lg ${
                  i === myIndex
                    ? "bg-fuchsia-950/80 border-fuchsia-500/60"
                    : "bg-purple-900/60 border-fuchsia-500/30"
                }`}
              >
                <p className="text-sm font-bold text-fuchsia-200 mb-2 flex items-center gap-2">
                  {playerLabel(i)}
                  {state.currentPlayerIndex === i && state.lives[i] > 0 && (
                    <span className="text-cyan-400 text-xs">手番</span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(i === myIndex && state.phase === "bidding") ? (
                    // ビッド中のみ自分のカードは隠す（結果・ゲームオーバー時は下のブロックで全公開）
                    hand.map((_, j) => (
                      <div
                        key={j}
                        className="w-12 h-14 rounded-lg bg-gradient-to-br from-purple-800 to-indigo-900 border-2 border-fuchsia-500/50 flex items-center justify-center text-2xl text-fuchsia-400/80 font-bold shadow-inner"
                        aria-hidden
                      >
                        ?
                      </div>
                    ))
                  ) : (
                    hand.map((c, j) => (
                      <div
                        key={j}
                        className="min-w-[2.5rem] py-2 px-2 rounded-lg bg-purple-800/80 border border-fuchsia-400/40 flex items-center justify-center text-lg font-bold text-fuchsia-100"
                      >
                        {cardLabel(c)}
                      </div>
                    ))
                  )}
                </div>
              </section>
            ))}
          </div>

          {/* 宣言・Midnight! */}
          {!isSpectator && state.lives[myIndex] > 0 && (
            <section className="rounded-xl bg-purple-900/60 p-4 border-2 border-fuchsia-500/40 flex flex-wrap items-center gap-4">
              <p className="text-fuchsia-200 text-sm">
                {isMyTurn ? `宣言は ${minBid} 以上で入力` : "手番が回ってくるまで待ちましょう"}
              </p>
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  type="number"
                  min={minBid}
                  value={bidInput}
                  onChange={(e) => setBidInput(e.target.value)}
                  placeholder={String(minBid)}
                  disabled={!isMyTurn || isSubmitting}
                  className="w-24 px-3 py-2 rounded-lg border-2 border-fuchsia-500/50 bg-purple-950 text-fuchsia-100 font-bold text-center focus:border-fuchsia-400 focus:outline-none disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => handleBid(bidValue)}
                  disabled={!canBid}
                  className="px-4 py-2 rounded-xl bg-cyan-600 text-white font-bold hover:bg-cyan-500 border-2 border-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  宣言
                </button>
                <button
                  type="button"
                  onClick={handleMidnight}
                  disabled={!canMidnight}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-red-600 text-white font-bold hover:from-fuchsia-500 hover:to-red-500 border-2 border-fuchsia-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Midnight!
                </button>
              </div>
            </section>
          )}
        </>
      )}

      <footer className="text-center text-purple-500 text-xs py-2">
        ※ これは非公式のファンプロジェクトであり、オリジナルのゲームとは関係ありません。
      </footer>
    </div>
  );
}

export default function MidnightPartyGamePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-gradient-to-b from-purple-950 to-indigo-950 text-purple-100">
          <h1 className="text-2xl font-bold font-serif">Coyote</h1>
          <p className="text-purple-300">読み込み中…</p>
        </div>
      }
    >
      <GameContent />
    </Suspense>
  );
}
