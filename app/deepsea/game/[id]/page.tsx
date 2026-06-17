"use client";

import { useCallback, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { DeepSeaGameState } from "@/app/deepsea/logic";
import {
  applyOxygenAndMaybeFinishRound,
  switchDirectionToUp,
  rollDice,
  movePlayer,
  pickUpLoot,
  putDownLoot,
  endTurnAndMaybeFinishRound,
  createInitialDeepSeaState,
  restartDeepSeaGame,
  OXYGEN_MAX,
  TOTAL_ROUNDS,
} from "@/app/deepsea/logic";
import { useDeepSeaRealtime } from "@/app/deepsea/useRealtime";
import {
  startDeepSeaGame,
  updateDeepSeaGameState,
} from "@/lib/gameDb";
import { RuleBook } from "@/components/RuleBook";
import { usePresenceMany } from "@/lib/usePresence";
import { PresenceDot } from "@/components/PresenceDot";
import { castRematchVote, rematchCount, hasVotedRematch } from "@/lib/rematch";

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;

const PLAYER_COLORS = ["#22d3ee", "#a78bfa", "#34d399", "#fb923c", "#f472b6", "#facc15"];

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
      className="px-2 py-1 rounded border border-cyan-400 bg-slate-800/80 hover:bg-cyan-500/20 text-cyan-200 text-sm font-medium"
    >
      {copied ? "コピーしました" : "📋 コピー"}
    </button>
  );
}

function GameContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const gameId = typeof params.id === "string" ? params.id : null;
  const pid = searchParams.get("pid") ?? "";

  const { gameData, loading, error } = useDeepSeaRealtime(gameId);
  const playerIds: string[] = Array.isArray(gameData?.player_ids) ? gameData.player_ids : [];
  const { isOnline } = usePresenceMany(gameId, pid || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const playerIndex = pid ? playerIds.indexOf(pid) : -1;
  const myIndex = playerIndex >= 0 ? playerIndex : -1;
  const isHost = myIndex === 0;
  const isSpectator = myIndex < 0;
  const state: DeepSeaGameState | null = gameData?.game_state ?? null;

  const handleStartGame = useCallback(async () => {
    if (!gameId || !isHost || playerIds.length < MIN_PLAYERS || playerIds.length > MAX_PLAYERS) return;
    setIsSubmitting(true);
    try {
      const initialState = createInitialDeepSeaState(playerIds.length);
      await startDeepSeaGame(gameId, initialState);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, isHost, playerIds.length]);

  const handleConsumeOxygen = useCallback(async () => {
    if (!gameId || !state || isSpectator) return;
    const next = applyOxygenAndMaybeFinishRound(state);
    if (!next) return;
    setIsSubmitting(true);
    try {
      await updateDeepSeaGameState(gameId, next);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, state, isSpectator]);

  const handleSwitchDirectionUp = useCallback(async () => {
    if (!gameId || !state || isSpectator || myIndex < 0) return;
    const next = switchDirectionToUp(state, myIndex);
    if (!next) return;
    setIsSubmitting(true);
    try {
      await updateDeepSeaGameState(gameId, next);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, state, myIndex, isSpectator]);

  const handleRollAndMove = useCallback(async () => {
    if (!gameId || !state || isSpectator || myIndex < 0) return;
    const [d1, d2] = rollDice();
    const next = movePlayer(state, myIndex, d1 + d2, [d1, d2]);
    if (!next) return;
    setIsSubmitting(true);
    try {
      await updateDeepSeaGameState(gameId, next);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, state, myIndex, isSpectator]);

  const handlePickUp = useCallback(async () => {
    if (!gameId || !state || isSpectator || myIndex < 0) return;
    const next = pickUpLoot(state, myIndex);
    if (!next) return;
    setIsSubmitting(true);
    try {
      await updateDeepSeaGameState(gameId, next);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, state, myIndex, isSpectator]);

  const handlePutDown = useCallback(async () => {
    if (!gameId || !state || isSpectator || myIndex < 0) return;
    const next = putDownLoot(state, myIndex);
    if (!next) return;
    setIsSubmitting(true);
    try {
      await updateDeepSeaGameState(gameId, next);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, state, myIndex, isSpectator]);

  const handleEndTurn = useCallback(async () => {
    if (!gameId || !state || isSpectator) return;
    const next = endTurnAndMaybeFinishRound(state);
    setIsSubmitting(true);
    try {
      await updateDeepSeaGameState(gameId, next);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, state, isSpectator]);

  const handleNextRound = useCallback(async () => {
    if (!gameId || !state) return;
    const next = { ...state, phase: "playing" as const, roundForfeited: undefined };
    setIsSubmitting(true);
    try {
      await updateDeepSeaGameState(gameId, next);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, state]);

  // 再戦は合意制：自分の同意を votes に加え、全員同意で初めて restart する。
  const handleRematch = useCallback(async () => {
    if (isSpectator || !gameId || !state || !pid) return;
    const { votes, allAgreed } = castRematchVote(state.rematchVotes, pid, playerIds);
    const next = allAgreed ? restartDeepSeaGame(state) : { ...state, rematchVotes: votes };
    if (!next) return;
    setIsSubmitting(true);
    try {
      await updateDeepSeaGameState(gameId, next);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, state, isSpectator, pid, playerIds]);

  if (loading || !gameId) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 text-cyan-100">
        <h1 className="text-2xl font-bold font-serif text-cyan-200">Deep Sea Adventure</h1>
        <p className="text-cyan-300/80">読み込み中…</p>
      </div>
    );
  }

  if (error || !gameData) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-gradient-to-b from-slate-950 to-blue-950 text-cyan-100">
        <h1 className="text-2xl font-bold font-serif">Deep Sea Adventure</h1>
        <p className="text-red-400">ゲームの取得に失敗しました</p>
        <Link href="/deepsea" className="text-cyan-400 underline font-medium">ロビーに戻る</Link>
      </div>
    );
  }

  if (gameData.status === "waiting") {
    const canStart = playerIds.length >= MIN_PLAYERS && playerIds.length <= MAX_PLAYERS;
    return (
      <div className="min-h-screen flex flex-col p-4 gap-6 items-center justify-center bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 text-cyan-100">
        <h1 className="text-3xl font-bold font-serif text-transparent bg-clip-text bg-gradient-to-b from-cyan-200 to-teal-400">
          Deep Sea Adventure
        </h1>
        <p className="text-cyan-200/80">深海探検</p>
        <div className="rounded-2xl bg-slate-900/70 p-6 border-2 border-cyan-500/40 shadow-xl max-w-md w-full">
          <p className="text-sm text-cyan-200 font-medium mb-2">
            参加者: {playerIds.length}人（{MIN_PLAYERS}〜{MAX_PLAYERS}人で開始）
          </p>
          {isHost && (
            <>
              <p className="text-xs text-slate-400 mb-2">ゲームID（仲間に伝えてください）</p>
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <p className="font-mono font-bold text-cyan-200 break-all">{gameData.id}</p>
                <CopyButton text={gameData.id} />
              </div>
              <button
                type="button"
                onClick={handleStartGame}
                disabled={!canStart || isSubmitting}
                className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-bold hover:from-cyan-500 hover:to-teal-500 border-2 border-cyan-400/60 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "開始中…" : "ゲームを開始する"}
              </button>
            </>
          )}
          {!isHost && !isSpectator && (
            <p className="text-cyan-300/80 text-sm">Hostがゲームを開始するまでお待ちください。</p>
          )}
          {isSpectator && <p className="text-slate-400 text-sm">観戦中です。</p>}
        </div>
        <Link href="/deepsea" className="text-cyan-400 underline font-medium">ロビーに戻る</Link>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-gradient-to-b from-slate-950 to-blue-950 text-cyan-100">
        <h1 className="text-2xl font-bold font-serif">Deep Sea Adventure</h1>
        <p className="text-slate-400">ゲームデータを読み込めません</p>
        <Link href="/deepsea" className="text-cyan-400 underline font-medium">ロビーに戻る</Link>
      </div>
    );
  }

  const playerLabel = (i: number) => (isSpectator ? `P${i + 1}` : i === myIndex ? "あなた" : `P${i + 1}`);
  const isMyTurn = state.phase === "playing" && state.currentPlayerIndex === myIndex;
  const myPos = state.players[myIndex]?.position ?? -1;
  const currentCell = myPos >= 0 ? state.path[myPos] ?? null : null;
  const canPickUp = currentCell?.type === "ruin" || currentCell?.type === "stack";
  const canDrop = currentCell?.type === "blank" && state.players[myIndex]?.holdingLoot.length > 0;

  return (
    <div className="min-h-screen flex flex-col p-4 gap-4 bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 text-cyan-100">
      <RuleBook gameType="deepsea" />
      <div className="flex flex-wrap items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 flex-wrap">
          {isSpectator && (
            <span className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-200 text-sm font-bold border border-cyan-400/50">
              👀 観戦
            </span>
          )}
          <h1 className="text-2xl font-bold font-serif text-transparent bg-clip-text bg-gradient-to-b from-cyan-200 to-teal-400">
            Deep Sea Adventure
          </h1>
          <span className="text-cyan-200/80 text-sm">ラウンド {state.round} / {TOTAL_ROUNDS}</span>
        </div>
        <Link href="/deepsea" className="px-3 py-1.5 rounded-full border-2 border-cyan-400/50 bg-slate-800/70 text-cyan-200 font-bold text-sm hover:bg-slate-700 transition-colors">
          🚪 退出
        </Link>
      </div>

      {/* 酸素メーター（目立つバー） */}
      <section className="rounded-xl bg-slate-900/80 p-4 border-2 border-cyan-500/40 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-cyan-200 font-bold">酸素</span>
          <span className={`font-mono font-bold text-lg ${state.oxygen <= 5 ? "text-red-400 animate-pulse" : "text-cyan-300"}`}>
            {state.oxygen} / {OXYGEN_MAX}
          </span>
        </div>
        <div className="h-8 rounded-full bg-slate-800 overflow-hidden border border-cyan-500/30">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-cyan-500 to-teal-500"
            style={{ width: `${(state.oxygen / OXYGEN_MAX) * 100}%` }}
          />
        </div>
      </section>

      {/* プレイヤー一覧（オンライン状態） */}
      <section className="rounded-lg bg-slate-800/50 px-4 py-2 border border-cyan-500/20 flex flex-wrap gap-x-4 gap-y-1 items-center">
        {state.players.map((_, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 text-sm text-cyan-100">
            <span
              className="inline-block w-3 h-3 rounded-full border border-slate-900"
              style={{ backgroundColor: PLAYER_COLORS[i % PLAYER_COLORS.length] }}
            />
            {playerLabel(i)}
            <PresenceDot online={isOnline(playerIds[i])} />
          </span>
        ))}
      </section>

      {/* 自分の持ち物（重さ） */}
      {!isSpectator && state.players[myIndex] && (
        <section className="rounded-lg bg-slate-800/60 px-4 py-2 border border-cyan-500/30 flex items-center gap-2">
          <span className="text-cyan-200 font-medium">持ち物（重さ）:</span>
          <span className="font-bold text-cyan-300">{state.players[myIndex].holdingLoot.length} 個の遺跡</span>
          {state.players[myIndex].holdingLoot.length > 0 && (
            <span className="text-slate-400 text-sm">→ 移動時は出目から {state.players[myIndex].holdingLoot.length} 引く</span>
          )}
        </section>
      )}

      {/* 盤面（横長リスト）。先頭＝潜水艦（position -1）、以降＝path[0], path[1], ... */}
      <section className="rounded-xl bg-slate-900/60 p-4 border-2 border-cyan-500/30 overflow-x-auto">
        <p className="text-cyan-200/80 text-sm mb-2 font-medium">パス（左＝潜水艦 → 右＝最深部）</p>
        <div className="flex gap-1 min-h-[72px] items-end pb-8">
          {/* 潜水艦マス（position -1） */}
          <div className="flex-shrink-0 w-12 flex flex-col items-center gap-1">
            <div className="w-11 h-14 rounded-lg border-2 flex flex-col items-center justify-center bg-cyan-900/60 border-cyan-500/50 text-cyan-200">
              <span className="text-xs">潜水艦</span>
            </div>
            <div className="flex gap-0.5 justify-center flex-wrap">
              {state.players
                .map((p, i) => (p.position === -1 ? i : -1))
                .filter((i) => i >= 0)
                .map((i) => (
                  <div
                    key={i}
                    className="w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: PLAYER_COLORS[i % PLAYER_COLORS.length] }}
                    title={playerLabel(i)}
                  >
                    {i + 1}
                  </div>
                ))}
            </div>
          </div>
          {state.path.map((cell, idx) => {
            const playersHere = state.players
              .map((p, i) => (p.position === idx ? i : -1))
              .filter((i) => i >= 0);
            return (
              <div
                key={idx}
                className="flex-shrink-0 w-12 flex flex-col items-center gap-1"
              >
                <div
                  className={`w-11 h-14 rounded-lg border-2 flex flex-col items-center justify-center ${
                    cell.type === "ruin"
                      ? "bg-amber-900/60 border-amber-500/60 text-amber-200"
                      : cell.type === "stack"
                        ? "bg-amber-800/70 border-amber-600/60 text-amber-200"
                        : "bg-slate-800/80 border-slate-600 text-slate-500"
                  }`}
                >
                  {cell.type === "ruin" ? (
                    <>
                      <span className="text-xs">Lv.{cell.level}</span>
                      <span className="text-[10px] text-slate-400">?</span>
                    </>
                  ) : cell.type === "stack" ? (
                    <span className="text-xs">{cell.count}枚</span>
                  ) : (
                    <span className="text-xs">—</span>
                  )}
                </div>
                <div className="flex gap-0.5 justify-center flex-wrap">
                  {playersHere.map((i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: PLAYER_COLORS[i % PLAYER_COLORS.length] }}
                      title={playerLabel(i)}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ラウンド結果 */}
      {state.phase === "round_result" && (
        <div className="rounded-xl bg-slate-900/80 border-2 border-cyan-500/50 p-6 space-y-4">
          <p className="text-xl font-bold text-cyan-200">
            {state.roundForfeited ? "酸素切れ！このラウンドの獲得物は没収されました。" : "ラウンド終了"}
          </p>
          <div className="flex flex-wrap gap-4">
            {state.players.map((p, i) => (
              <span key={i} className="px-3 py-1.5 rounded-lg bg-slate-800 text-cyan-200 font-medium">
                {playerLabel(i)}: 総得点 {p.score}
              </span>
            ))}
          </div>
          {/* phase==="round_result" の時点で必ず次ラウンドが存在する（最終ラウンド後は gameover）。
              round は endRound で既に加算済みのため state.round で判定すると最終ラウンド前で
              ボタンが消えて進めなくなる。観戦者以外なら誰でも次へ進められる。 */}
          {!isSpectator && (
            <button
              type="button"
              onClick={handleNextRound}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl bg-cyan-600 text-white font-bold hover:bg-cyan-500 border-2 border-cyan-400 disabled:opacity-50"
            >
              {isSubmitting ? "…" : "次のラウンドへ"}
            </button>
          )}
        </div>
      )}

      {/* ゲームオーバー */}
      {state.phase === "gameover" && (
        <div className="rounded-xl bg-slate-900/80 border-2 border-cyan-500/50 p-6 space-y-4">
          <p className="text-xl font-bold text-cyan-200">ゲーム終了</p>
          <p className="text-cyan-200/90">最終得点</p>
          <div className="flex flex-wrap gap-4">
            {state.players
              .map((p, i) => ({ i, score: p.score }))
              .sort((a, b) => b.score - a.score)
              .map(({ i, score }) => (
                <span key={i} className="px-3 py-1.5 rounded-lg bg-cyan-900/50 text-cyan-100 font-bold">
                  {playerLabel(i)}: {score} 点
                </span>
              ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            {!isSpectator && (() => {
              const { agreed, total } = rematchCount(state.rematchVotes, playerIds);
              const voted = hasVotedRematch(state.rematchVotes, pid);
              return (
                <button
                  type="button"
                  onClick={handleRematch}
                  disabled={isSubmitting || voted}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-bold hover:from-cyan-500 hover:to-teal-500 border-b-4 border-teal-800 active:border-b-0 active:translate-y-1 disabled:opacity-50 transition-all"
                >
                  {voted ? `みんなの同意を待っています (${agreed}/${total})` : `🔄 もう一度遊ぶ (${agreed}/${total})`}
                </button>
              );
            })()}
            <Link
              href="/deepsea"
              className="inline-block px-6 py-3 rounded-xl bg-slate-700 text-white font-bold hover:bg-slate-600"
            >
              ロビーに戻る
            </Link>
          </div>
        </div>
      )}

      {/* プレイ中：手番・アクション */}
      {state.phase === "playing" && !isSpectator && (
        <section className="rounded-xl bg-slate-900/70 p-4 border-2 border-cyan-500/40 space-y-3">
          <p className="text-cyan-200 font-medium">
            手番: {playerLabel(state.currentPlayerIndex)}
            {isMyTurn && " ← あなた"}
          </p>
          {state.lastDice && (
            <p className="text-sm text-cyan-300/90">
              直前の出目: {state.lastDice[0]} + {state.lastDice[1]} = {state.lastDice[0] + state.lastDice[1]}
            </p>
          )}
          {isMyTurn && (
            <div className="flex flex-wrap gap-2 items-center">
              {!state.oxygenConsumedThisTurn && (
                <button
                  type="button"
                  onClick={handleConsumeOxygen}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-500 border border-amber-500 disabled:opacity-50"
                >
                  酸素消費（ターン開始）
                </button>
              )}
              {state.oxygenConsumedThisTurn && !state.movedThisTurn && (
                <>
                  {state.players[myIndex].direction === "down" && (
                    <button
                      type="button"
                      onClick={handleSwitchDirectionUp}
                      disabled={isSubmitting}
                      className="px-4 py-2 rounded-lg bg-teal-600 text-white font-bold hover:bg-teal-500 border border-teal-500 disabled:opacity-50"
                    >
                      戻るに切り替え
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleRollAndMove}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-bold hover:bg-cyan-500 border border-cyan-500 disabled:opacity-50"
                  >
                    サイコロを振って移動
                  </button>
                </>
              )}
              {state.oxygenConsumedThisTurn && state.movedThisTurn && (
                <>
                  {canPickUp && (
                    <button
                      type="button"
                      onClick={handlePickUp}
                      disabled={isSubmitting}
                      className="px-4 py-2 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-500 disabled:opacity-50"
                    >
                      遺跡を拾う
                    </button>
                  )}
                  {canDrop && (
                    <button
                      type="button"
                      onClick={handlePutDown}
                      disabled={isSubmitting}
                      className="px-4 py-2 rounded-lg bg-slate-600 text-white font-bold hover:bg-slate-500 disabled:opacity-50"
                    >
                      遺跡を置く
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleEndTurn}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg bg-teal-600 text-white font-bold hover:bg-teal-500 disabled:opacity-50"
                  >
                    ターン終了
                  </button>
                </>
              )}
            </div>
          )}
        </section>
      )}

      <footer className="text-center text-slate-500 text-xs py-2">
        ※ これは非公式のファンプロジェクトであり、オリジナルのゲームとは関係ありません。
      </footer>
    </div>
  );
}

export default function DeepSeaGamePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-gradient-to-b from-slate-950 to-blue-950 text-cyan-100">
          <h1 className="text-2xl font-bold font-serif">Deep Sea Adventure</h1>
          <p className="text-cyan-300/80">読み込み中…</p>
        </div>
      }
    >
      <GameContent />
    </Suspense>
  );
}
