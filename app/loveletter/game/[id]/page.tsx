"use client";

import { useCallback, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { LoveLetterGameState } from "@/app/loveletter/logic";
import {
  CARD_NAMES,
  cardNeedsTarget,
  cardNeedsGuardGuess,
  getDiscardableCards,
  getValidTargets,
  GUARD_GUESS_OPTIONS,
  playCard,
  createInitialLoveLetterState,
} from "@/app/loveletter/logic";
import { useLoveLetterRealtime } from "@/app/loveletter/useRealtime";
import { startLoveLetterGame, updateLoveLetterGameState } from "@/lib/gameDb";
import { RuleBook } from "@/components/RuleBook";

type PlayerRole = number | "spectator";

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
      className="px-2 py-1 rounded border border-amber-500/60 bg-amber-900/50 hover:bg-amber-800/50 text-amber-100 text-sm font-medium"
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

  const { gameData, loading, error } = useLoveLetterRealtime(gameId);
  const playerIds: string[] = Array.isArray(gameData?.player_ids) ? gameData.player_ids : [];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);
  const [guardGuess, setGuardGuess] = useState<number | null>(null);
  const [showGuardModal, setShowGuardModal] = useState(false);

  const playerIndex = pid ? playerIds.indexOf(pid) : -1;
  const myRole: PlayerRole = playerIndex >= 0 ? playerIndex : "spectator";
  const myIndex = myRole === "spectator" ? -1 : (myRole as number);
  const isHost = myIndex === 0;
  const isSpectator = myRole === "spectator";

  const state: LoveLetterGameState | null = gameData?.game_state ?? null;

  const handleStartGame = useCallback(async () => {
    if (!gameId || !isHost || playerIds.length < 2) return;
    setIsSubmitting(true);
    try {
      const initialState = createInitialLoveLetterState(playerIds.length);
      await startLoveLetterGame(gameId, initialState);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, isHost, playerIds.length]);

  const submitPlay = useCallback(
    async (cardRank: number, targetIndex?: number, guess?: number) => {
      if (isSpectator || myIndex < 0 || !gameId || !state) return;
      const next = playCard({
        state,
        playerIndex: myIndex,
        cardRank,
        targetIndex,
        guardGuess: guess,
      });
      if (!next) return;
      setIsSubmitting(true);
      setSelectedCard(null);
      setSelectedTarget(null);
      setGuardGuess(null);
      setShowGuardModal(false);
      try {
        await updateLoveLetterGameState(gameId, next);
      } finally {
        setIsSubmitting(false);
      }
    },
    [gameId, state, myIndex, isSpectator]
  );

  const handleCardClick = useCallback(
    (rank: number) => {
      if (isSpectator || !state || state.phase !== "playing" || state.turnIndex !== myIndex) return;
      const discardable = getDiscardableCards(state, myIndex);
      if (!discardable.includes(rank)) return;

      if (cardNeedsGuardGuess(rank)) {
        setSelectedCard(rank);
        setSelectedTarget(null);
        setShowGuardModal(true);
        return;
      }
      if (cardNeedsTarget(rank)) {
        setSelectedCard(rank);
        setSelectedTarget(null);
        setShowGuardModal(false);
        return;
      }
      submitPlay(rank);
    },
    [state, myIndex, isSpectator, submitPlay]
  );

  const handleTargetClick = useCallback(
    (targetIdx: number) => {
      if (selectedCard === null || !state) return;
      const valid = getValidTargets(state, myIndex);
      if (!valid.includes(targetIdx)) return;
      if (selectedCard === 1) {
        setSelectedTarget(targetIdx);
        return;
      }
      setSelectedTarget(targetIdx);
      submitPlay(selectedCard, targetIdx);
    },
    [selectedCard, state, myIndex, submitPlay]
  );

  const handleGuardSubmit = useCallback(() => {
    if (selectedCard !== 1 || selectedTarget === null || guardGuess === null) return;
    submitPlay(selectedCard, selectedTarget, guardGuess);
  }, [selectedCard, selectedTarget, guardGuess, submitPlay]);

  if (loading || !gameId) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-red-950 text-amber-100">
        <h1 className="text-2xl font-bold font-serif">Court Intrigue</h1>
        <p className="text-amber-200">読み込み中…</p>
      </div>
    );
  }

  if (error || !gameData) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-red-950 text-amber-100">
        <h1 className="text-2xl font-bold font-serif">Court Intrigue</h1>
        <p className="text-red-300">ゲームの取得に失敗しました</p>
        <Link href="/loveletter" className="text-amber-200 underline font-medium">ロビーに戻る</Link>
      </div>
    );
  }

  if (gameData.status === "waiting") {
    const canStart = playerIds.length >= 2 && isHost;
    return (
      <div className="min-h-screen flex flex-col p-4 gap-6 items-center justify-center bg-gradient-to-b from-red-950 to-amber-950/80 text-amber-100">
        <h1 className="text-3xl font-bold font-serif text-amber-50">Court Intrigue</h1>
        <p className="text-amber-200">王宮の陰謀 — 2〜4人でプレイ</p>
        <div className="rounded-xl bg-red-900/50 p-6 border-4 border-amber-600/60 shadow-2xl max-w-md w-full">
          <p className="text-sm text-amber-200 font-medium mb-2">参加者: {playerIds.length}人</p>
          {playerIds.length < 2 && <p className="text-amber-300 text-sm mb-4">2人以上でゲームを開始できます。</p>}
          {isHost && (
            <>
              <p className="text-xs text-amber-400 mb-2">ゲームID（相手に伝えてください）</p>
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <p className="font-mono font-bold text-amber-100 break-all">{gameData.id}</p>
                <CopyButton text={gameData.id} />
              </div>
              <button
                type="button"
                onClick={handleStartGame}
                disabled={!canStart || isSubmitting}
                className="w-full px-6 py-4 rounded-xl bg-red-800 text-amber-50 font-bold hover:bg-red-700 border-2 border-amber-500/70 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "開始中…" : "ゲームを開始する"}
              </button>
            </>
          )}
          {!isHost && !isSpectator && <p className="text-amber-200 text-sm">Hostがゲームを開始するまでお待ちください。</p>}
          {isSpectator && <p className="text-amber-200 text-sm">観戦中です。</p>}
        </div>
        <Link href="/loveletter" className="text-amber-200 underline font-medium">ロビーに戻る</Link>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-red-950 text-amber-100">
        <h1 className="text-2xl font-bold font-serif">Court Intrigue</h1>
        <p className="text-amber-200">ゲームデータを読み込めません</p>
        <Link href="/loveletter" className="text-amber-200 underline font-medium">ロビーに戻る</Link>
      </div>
    );
  }

  const isMyTurn = !isSpectator && state.phase === "playing" && state.turnIndex === myIndex;
  const discardable = isMyTurn ? getDiscardableCards(state, myIndex) : [];
  const validTargets = isMyTurn && selectedCard !== null ? getValidTargets(state, myIndex) : [];
  const canTargetSelf = isMyTurn && selectedCard === 5; // 王子(5)のみ自分を指名可能

  const playerLabel = (i: number) => (isSpectator ? `Player ${i + 1}` : i === myIndex ? "あなた" : `Player ${i + 1}`);

  return (
    <div className="min-h-screen flex flex-col p-4 gap-4 bg-gradient-to-b from-red-950 to-amber-950/80 text-amber-100">
      <RuleBook gameType="loveletter" />
      <div className="flex flex-wrap items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 flex-wrap">
          {isSpectator && (
            <span className="px-3 py-1.5 rounded-lg bg-amber-700/80 text-amber-50 text-sm font-bold border-2 border-amber-500/70 shadow-lg">
              👀 観戦モード
            </span>
          )}
          <h1 className="text-2xl font-bold font-serif text-amber-50">Court Intrigue</h1>
          {state.phase === "playing" && (
            <span className="text-amber-200 text-sm">
              手番: {playerLabel(state.turnIndex)}
            </span>
          )}
        </div>
        <Link href="/loveletter" className="text-amber-200 text-sm underline hover:text-amber-100 font-medium">
          ロビーに戻る
        </Link>
      </div>

      {/* プレイヤーエリア */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {state.players.map((p, i) => (
          <section
            key={i}
            className={`rounded-xl p-4 border-4 shadow-xl ${
              state.phase === "playing" && state.turnIndex === i
                ? "bg-amber-900/50 border-amber-500/80"
                : "bg-red-900/40 border-amber-700/50"
            } ${p.isEliminated ? "opacity-60 grayscale" : ""}`}
          >
            <p className="text-sm font-bold text-amber-100 mb-2 flex items-center gap-1.5">
              {playerLabel(i)}
              {p.isProtected && <span className="text-xs text-amber-400">（保護中）</span>}
              {p.isEliminated && <span className="text-xs text-red-300">脱落</span>}
            </p>
            <p className="text-xs text-amber-300 mb-1">手札:</p>
            <div className="flex flex-wrap gap-2 min-h-[3rem]">
              {i === myIndex && !isSpectator ? (
                p.hand.map((rank, j) => {
                  const canSelect = isMyTurn && discardable.includes(rank);
                  return (
                    <button
                      key={j}
                      type="button"
                      onClick={() => handleCardClick(rank)}
                      disabled={!canSelect || isSubmitting}
                      className={`w-14 h-20 rounded-lg border-2 font-bold text-amber-50 shadow-lg transition-all ${
                        canSelect
                          ? "bg-red-800 border-amber-400 hover:ring-2 hover:ring-amber-400 cursor-pointer"
                          : "bg-red-900/80 border-amber-700/50 cursor-default opacity-80"
                      }`}
                    >
                      <span className="text-lg">{rank}</span>
                      <span className="block text-xs mt-0.5">{CARD_NAMES[rank]}</span>
                    </button>
                  );
                })
              ) : (
                p.hand.map((_, j) => (
                  <div
                    key={j}
                    className="w-14 h-20 rounded-lg border-2 border-amber-700/60 bg-red-900/80 flex items-center justify-center text-amber-500"
                  >
                    ?
                  </div>
                ))
              )}
            </div>
            {isMyTurn && selectedCard !== null && cardNeedsTarget(selectedCard) && !cardNeedsGuardGuess(selectedCard) && (
              <p className="text-xs text-amber-400 mt-2">対象を選んでください</p>
            )}
            {isMyTurn && selectedCard !== null && validTargets.includes(i) && (
              <button
                type="button"
                onClick={() => handleTargetClick(i)}
                disabled={isSubmitting}
                className="mt-2 px-3 py-1.5 rounded-lg bg-amber-600 text-red-950 font-bold text-sm hover:bg-amber-500 disabled:opacity-50"
              >
                このプレイヤーを選択
              </button>
            )}
            {isMyTurn && canTargetSelf && i === myIndex && (
              <button
                type="button"
                onClick={() => submitPlay(5, myIndex)}
                disabled={isSubmitting}
                className="mt-2 px-3 py-1.5 rounded-lg bg-amber-600 text-red-950 font-bold text-sm hover:bg-amber-500 disabled:opacity-50"
              >
                自分を選択（王子）
              </button>
            )}
          </section>
        ))}
      </div>

      {/* 対象選択（兵士用: 対象選んだあと数字モーダル） */}
      {showGuardModal && selectedCard === 1 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-red-900 border-4 border-amber-600 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-amber-50 mb-2 font-serif">兵士 — 当てる数字を選んでください（2〜8）</h3>
            {selectedTarget === null ? (
              <p className="text-amber-200 text-sm mb-3">先に対象のプレイヤーを選んでください。</p>
            ) : (
              <div className="flex flex-wrap gap-2 mb-4">
                {GUARD_GUESS_OPTIONS.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setGuardGuess(num)}
                    className={`w-12 h-12 rounded-lg font-bold border-2 ${
                      guardGuess === num
                        ? "bg-amber-500 text-red-950 border-amber-400"
                        : "bg-red-800 text-amber-50 border-amber-600 hover:bg-red-700"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowGuardModal(false);
                  setSelectedCard(null);
                  setSelectedTarget(null);
                  setGuardGuess(null);
                }}
                className="px-4 py-2 rounded-lg bg-stone-600 text-white font-medium"
              >
                キャンセル
              </button>
              {selectedTarget !== null && guardGuess !== null && (
                <button
                  type="button"
                  onClick={handleGuardSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-amber-600 text-red-950 font-bold hover:bg-amber-500 disabled:opacity-50"
                >
                  宣言する
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 神父で見た手札（自分だけ表示） */}
      {state.lastPriestReveal && state.lastPriestReveal.actorIndex === myIndex && (
        <div className="rounded-xl bg-amber-800/80 p-3 border-2 border-amber-500 text-amber-50 text-sm font-medium">
          🔍 神父で見た手札: {playerLabel(state.lastPriestReveal.targetIndex)} の手札は <span className="font-bold">{CARD_NAMES[state.lastPriestReveal.rank]}</span> でした。
        </div>
      )}

      {/* ログ */}
      <section className="rounded-xl bg-red-900/40 p-4 border-4 border-amber-700/50 shadow-inner flex-1 max-h-48 overflow-y-auto">
        <p className="text-xs text-amber-400 font-bold mb-2 border-b border-amber-600/50 pb-1">ログ</p>
        <ul className="text-sm text-amber-100 space-y-1">
          {state.logs.slice().reverse().map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </section>

      {/* ゲーム終了 */}
      {state.phase === "finished" && state.winner !== null && (
        <div className="rounded-xl bg-amber-900/50 p-4 border-4 border-amber-500 text-center">
          <p className="text-lg font-bold text-amber-50 font-serif">
            {isSpectator
              ? `${playerLabel(state.winner)} の勝ち！`
              : state.winner === myIndex
                ? "あなたの勝ち！"
                : `${playerLabel(state.winner)} の勝ち！`}
          </p>
        </div>
      )}

      <footer className="text-center text-amber-500/80 text-xs py-2">
        ※ これは非公式のファンプロジェクトであり、オリジナルのゲームとは関係ありません。
      </footer>
    </div>
  );
}

export default function LoveLetterGamePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-red-950 text-amber-100">
          <h1 className="text-2xl font-bold font-serif">Court Intrigue</h1>
          <p className="text-amber-200">読み込み中…</p>
        </div>
      }
    >
      <GameContent />
    </Suspense>
  );
}
