"use client";

import { useCallback, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { PokerGameState, Card, PokerAction } from "@/app/poker/logic";
import {
  legalActions,
  applyAction,
  createInitialPokerState,
  nextHand,
  restartGame,
  potSize,
  chipLeaders,
  RANK_LABELS,
  SUIT_SYMBOLS,
  RED_SUITS,
} from "@/app/poker/logic";
import { usePokerRealtime } from "@/app/poker/useRealtime";
import { usePresenceMany } from "@/lib/usePresence";
import { PresenceDot } from "@/components/PresenceDot";
import { startPokerGame, updatePokerGameState } from "@/lib/gameDb";
import { castRematchVote, rematchCount, hasVotedRematch } from "@/lib/rematch";
import { RuleBook } from "@/components/RuleBook";

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;

const PHASE_LABELS: Record<string, string> = {
  preflop: "プリフロップ",
  flop: "フロップ",
  turn: "ターン",
  river: "リバー",
  showdown: "ショーダウン",
  gameover: "終了",
};

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
      className="px-2 py-1 rounded border border-amber-400 bg-emerald-800/80 hover:bg-amber-500/30 text-amber-200 text-sm font-medium"
    >
      {copied ? "コピーしました" : "📋 コピー"}
    </button>
  );
}

function CardView({ card, faceDown }: { card?: Card; faceDown?: boolean }) {
  if (faceDown || !card) {
    return (
      <div
        className="w-10 h-14 sm:w-11 sm:h-16 rounded-md bg-gradient-to-br from-amber-700 to-amber-900 border-2 border-amber-300/60 shadow-inner flex items-center justify-center text-amber-200/80 text-lg"
        aria-hidden
      >
        🂠
      </div>
    );
  }
  const red = RED_SUITS.includes(card.suit);
  return (
    <div className="w-10 h-14 sm:w-11 sm:h-16 rounded-md bg-white border-2 border-stone-300 shadow flex flex-col items-center justify-center leading-none">
      <span className={`text-base font-extrabold ${red ? "text-red-600" : "text-stone-900"}`}>
        {RANK_LABELS[card.rank]}
      </span>
      <span className={`text-lg ${red ? "text-red-600" : "text-stone-900"}`}>
        {SUIT_SYMBOLS[card.suit]}
      </span>
    </div>
  );
}

function GameContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const gameId = typeof params.id === "string" ? params.id : null;
  const pid = searchParams.get("pid") ?? "";

  const { gameData, loading, error } = usePokerRealtime(gameId);
  const playerIds: string[] = Array.isArray(gameData?.player_ids) ? gameData.player_ids : [];
  const { isOnline } = usePresenceMany(gameId, pid || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [raiseInput, setRaiseInput] = useState("");

  const playerIndex = pid ? playerIds.indexOf(pid) : -1;
  const myIndex = playerIndex >= 0 ? playerIndex : -1;
  const isHost = myIndex === 0;
  const isSpectator = myIndex < 0;
  const state: PokerGameState | null = gameData?.game_state ?? null;

  const handleStartGame = useCallback(async () => {
    if (!gameId || !isHost || playerIds.length < MIN_PLAYERS || playerIds.length > MAX_PLAYERS) return;
    setIsSubmitting(true);
    try {
      const initialState = createInitialPokerState(playerIds.length);
      await startPokerGame(gameId, initialState);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, isHost, playerIds.length]);

  const submitAction = useCallback(
    async (action: PokerAction) => {
      if (isSpectator || myIndex < 0 || !gameId || !state) return;
      const next = applyAction(state, myIndex, action);
      if (!next) return;
      setIsSubmitting(true);
      setRaiseInput("");
      try {
        await updatePokerGameState(gameId, next);
      } finally {
        setIsSubmitting(false);
      }
    },
    [gameId, state, myIndex, isSpectator]
  );

  const handleNextHand = useCallback(async () => {
    if (!gameId || !state) return;
    const next = nextHand(state);
    if (!next) return;
    setIsSubmitting(true);
    try {
      await updatePokerGameState(gameId, next);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, state]);

  const handleRematch = useCallback(async () => {
    if (isSpectator || !gameId || !state || !pid) return;
    const { votes, allAgreed } = castRematchVote(state.rematchVotes, pid, playerIds);
    const next = allAgreed ? restartGame(state) : { ...state, rematchVotes: votes };
    if (!next) return;
    setIsSubmitting(true);
    try {
      await updatePokerGameState(gameId, next);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, state, pid, playerIds, isSpectator]);

  if (loading || !gameId) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-gradient-to-b from-green-950 via-emerald-950 to-green-950 text-emerald-100">
        <h1 className="text-2xl font-bold font-serif text-amber-200">Poker</h1>
        <p className="text-emerald-300">読み込み中…</p>
      </div>
    );
  }

  if (error || !gameData) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-gradient-to-b from-green-950 to-emerald-950 text-emerald-100">
        <h1 className="text-2xl font-bold font-serif">Poker</h1>
        <p className="text-red-400">ゲームの取得に失敗しました</p>
        <Link href="/poker" className="text-amber-400 underline font-medium">ロビーに戻る</Link>
      </div>
    );
  }

  if (gameData.status === "waiting") {
    const canStart = playerIds.length >= MIN_PLAYERS && playerIds.length <= MAX_PLAYERS;
    return (
      <div className="min-h-screen flex flex-col p-4 gap-6 items-center justify-center bg-gradient-to-b from-green-950 via-emerald-950 to-green-950 text-emerald-100">
        <h1 className="text-3xl font-bold font-serif text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-200">Poker</h1>
        <p className="text-emerald-300">テキサスホールデム</p>
        <div className="rounded-2xl bg-emerald-900/60 p-6 border-2 border-amber-500/50 shadow-xl max-w-md w-full">
          <p className="text-sm text-amber-200 font-medium mb-2">
            参加者: {playerIds.length}人（{MIN_PLAYERS}〜{MAX_PLAYERS}人で開始）
          </p>
          {isHost && (
            <>
              <p className="text-xs text-emerald-400 mb-2">ゲームID（仲間に伝えてください）</p>
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <p className="font-mono font-bold text-amber-200 break-all">{gameData.id}</p>
                <CopyButton text={gameData.id} />
              </div>
              <button
                type="button"
                onClick={handleStartGame}
                disabled={!canStart || isSubmitting}
                className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-emerald-950 font-bold hover:from-amber-400 hover:to-yellow-500 border-2 border-amber-400/80 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "開始中…" : "ゲームを開始する"}
              </button>
            </>
          )}
          {!isHost && !isSpectator && <p className="text-emerald-300 text-sm">Hostがゲームを開始するまでお待ちください。</p>}
          {isSpectator && <p className="text-emerald-400 text-sm">観戦中です。</p>}
        </div>
        <Link href="/poker" className="text-amber-400 underline font-medium">ロビーに戻る</Link>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-gradient-to-b from-green-950 to-emerald-950 text-emerald-100">
        <h1 className="text-2xl font-bold font-serif">Poker</h1>
        <p className="text-emerald-400">ゲームデータを読み込めません</p>
        <Link href="/poker" className="text-amber-400 underline font-medium">ロビーに戻る</Link>
      </div>
    );
  }

  const playerLabel = (i: number) => (isSpectator ? `P${i + 1}` : i === myIndex ? "あなた" : `P${i + 1}`);
  const pot = potSize(state);
  const la = legalActions(state, myIndex);
  const isMyTurn = la.isTurn && !isSpectator;

  // ショーダウン公開情報
  const revealedMap = new Map<number, { hole: Card[]; handName: string }>();
  state.result?.revealed.forEach((r) => revealedMap.set(r.index, { hole: r.hole, handName: r.handName }));
  const winnerSet = new Set<number>();
  state.result?.pots.forEach((p) => p.winners.forEach((w) => winnerSet.add(w)));

  // 各座席のホールカード表示内容
  const holeFor = (i: number): { cards: (Card | undefined)[]; faceDown: boolean; handName?: string } => {
    const p = state.players[i]!;
    if (p.busted) return { cards: [], faceDown: false };
    if (state.phase === "showdown" && revealedMap.has(i)) {
      const r = revealedMap.get(i)!;
      return { cards: r.hole, faceDown: false, handName: r.handName };
    }
    if (i === myIndex && !isSpectator) {
      return { cards: p.hole, faceDown: false };
    }
    // 他人・観戦者：伏せ（枚数分の裏面）
    return { cards: p.hole.map(() => undefined), faceDown: true };
  };

  const raiseValue = raiseInput === "" ? NaN : parseInt(raiseInput, 10);
  const canSubmitRaise =
    isMyTurn && la.canRaise && Number.isInteger(raiseValue) && raiseValue >= la.minRaiseTo && raiseValue <= la.maxRaiseTo;

  return (
    <div className="min-h-screen flex flex-col p-4 gap-4 bg-gradient-to-b from-green-950 via-emerald-950 to-green-950 text-emerald-50">
      <RuleBook gameType="poker" />
      <div className="flex flex-wrap items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 flex-wrap">
          {isSpectator && (
            <span className="px-3 py-1.5 rounded-lg bg-amber-500/30 text-amber-200 text-sm font-bold border border-amber-400/50">
              👀 観戦
            </span>
          )}
          <h1 className="text-2xl font-bold font-serif text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-200">Poker</h1>
          <span className="text-emerald-300 text-sm">ハンド {state.handNumber}・{PHASE_LABELS[state.phase]}</span>
        </div>
        <Link href="/poker" className="text-amber-400 text-sm underline hover:text-amber-300 font-medium">ロビーに戻る</Link>
      </div>

      {/* テーブル中央：コミュニティ・ポット */}
      <section className="rounded-2xl bg-emerald-800/40 border-2 border-amber-600/30 shadow-inner p-4 flex flex-col items-center gap-3">
        <div className="flex items-center gap-4 text-amber-100 text-sm font-bold">
          <span>💰 ポット: {pot}</span>
          {state.currentBet > 0 && state.phase !== "showdown" && (
            <span className="text-emerald-200">コール額: {state.currentBet}</span>
          )}
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardView key={i} card={state.community[i]} faceDown={false} />
          ))}
        </div>
      </section>

      {/* ショーダウン結果 */}
      {state.phase === "showdown" && state.result && (
        <div className="rounded-xl bg-amber-900/40 border-2 border-amber-500/60 p-4 text-center space-y-3">
          <p className="text-lg font-bold text-amber-200">ショーダウン</p>
          {state.result.note && <p className="text-emerald-200 text-sm">{state.result.note}</p>}
          <div className="space-y-1 text-sm">
            {state.result.pots.map((p, i) => (
              <p key={i} className="text-amber-100">
                {state.result!.pots.length > 1 ? `ポット${i + 1}: ` : "獲得: "}
                <span className="font-bold text-yellow-200">{p.amount}</span> →{" "}
                {p.winners.map((w) => playerLabel(w)).join(", ")}
                {p.handName !== "—" && <span className="text-emerald-300">（{p.handName}）</span>}
              </p>
            ))}
          </div>
          {!isSpectator && (
            <button
              type="button"
              onClick={handleNextHand}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-emerald-950 font-bold hover:from-amber-400 hover:to-yellow-500 border-2 border-amber-400 disabled:opacity-50"
            >
              {isSubmitting ? "…" : "次のハンド ▶"}
            </button>
          )}
        </div>
      )}

      {/* ゲームオーバー */}
      {state.phase === "gameover" && (
        <div className="rounded-xl bg-emerald-900/60 border-2 border-amber-500/50 p-6 text-center space-y-4">
          <p className="text-xl font-bold text-amber-200">ゲーム終了</p>
          <p className="text-emerald-200">
            勝者: {chipLeaders(state).map((i) => `${playerLabel(i)}（💰${state.players[i]!.stack}）`).join(", ") || "—"}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {!isSpectator && (() => {
              const { agreed, total } = rematchCount(state.rematchVotes, playerIds);
              const voted = hasVotedRematch(state.rematchVotes, pid);
              return (
                <button
                  type="button"
                  onClick={handleRematch}
                  disabled={!!isSubmitting || voted}
                  className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 border-2 border-emerald-400 disabled:opacity-50"
                >
                  {voted ? `みんなの同意を待っています (${agreed}/${total})` : `🔄 もう一度遊ぶ (${agreed}/${total})`}
                </button>
              );
            })()}
            <Link href="/poker" className="inline-block px-6 py-3 rounded-xl bg-amber-500 text-emerald-950 font-bold hover:bg-amber-400">
              ロビーに戻る
            </Link>
          </div>
        </div>
      )}

      {/* プレイヤー席 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 flex-1">
        {state.players.map((p, i) => {
          const hole = holeFor(i);
          const isTurnSeat = state.currentTurn === i && state.phase !== "showdown" && state.phase !== "gameover";
          return (
            <section
              key={i}
              className={`rounded-xl p-3 border-2 shadow-lg transition-colors ${
                p.folded || p.busted ? "opacity-60 " : ""
              }${
                isTurnSeat
                  ? "bg-emerald-700/70 border-amber-400"
                  : i === myIndex
                    ? "bg-emerald-900/80 border-amber-500/50"
                    : "bg-emerald-900/50 border-emerald-600/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-bold text-amber-100 flex items-center gap-1.5">
                  {playerLabel(i)}
                  <PresenceDot online={isOnline(playerIds[i])} />
                  {i === state.buttonIndex && (
                    <span className="ml-1 w-5 h-5 rounded-full bg-white text-emerald-900 text-[10px] font-extrabold flex items-center justify-center" title="ディーラーボタン">D</span>
                  )}
                  {winnerSet.has(i) && state.phase === "showdown" && <span className="text-yellow-300">🏆</span>}
                </p>
                <span className="text-xs font-bold text-yellow-200">💰{p.stack}</span>
              </div>
              <div className="flex gap-1.5 mb-2 min-h-[3.5rem] items-center">
                {p.busted ? (
                  <span className="text-emerald-400 text-xs">離脱</span>
                ) : (
                  hole.cards.map((c, j) => <CardView key={j} card={c} faceDown={hole.faceDown} />)
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {p.bet > 0 && <span className="px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-100 font-bold">ベット {p.bet}</span>}
                {p.folded && !p.busted && <span className="text-red-300 font-bold">フォールド</span>}
                {p.allIn && <span className="text-yellow-300 font-bold">オールイン</span>}
                {hole.handName && <span className="text-emerald-200">{hole.handName}</span>}
              </div>
            </section>
          );
        })}
      </div>

      {/* アクションパネル */}
      {!isSpectator && myIndex >= 0 && (
        <section className="rounded-xl bg-emerald-900/70 p-4 border-2 border-amber-500/40 flex flex-col gap-3">
          {isMyTurn ? (
            <>
              <p className="text-amber-200 text-sm font-bold">あなたの番です</p>
              <div className="flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  onClick={() => submitAction({ type: "fold" })}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-red-700 text-white font-bold hover:bg-red-600 border-2 border-red-500 disabled:opacity-50"
                >
                  フォールド
                </button>
                {la.canCheck ? (
                  <button
                    type="button"
                    onClick={() => submitAction({ type: "check" })}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-500 border-2 border-emerald-400 disabled:opacity-50"
                  >
                    チェック
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => submitAction({ type: "call" })}
                    disabled={isSubmitting || !la.canCall}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-500 border-2 border-emerald-400 disabled:opacity-50"
                  >
                    コール {la.callAmount}
                  </button>
                )}
                {la.canRaise && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={la.minRaiseTo}
                      max={la.maxRaiseTo}
                      value={raiseInput}
                      onChange={(e) => setRaiseInput(e.target.value)}
                      placeholder={String(la.minRaiseTo)}
                      disabled={isSubmitting}
                      className="w-24 px-2 py-2 rounded-lg border-2 border-amber-500/50 bg-emerald-950 text-amber-100 font-bold text-center focus:border-amber-400 focus:outline-none disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => submitAction({ type: "raise", to: raiseValue })}
                      disabled={!canSubmitRaise || isSubmitting}
                      className="px-4 py-2 rounded-lg bg-amber-500 text-emerald-950 font-bold hover:bg-amber-400 border-2 border-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      レイズ
                    </button>
                  </div>
                )}
                {la.canAllIn && (
                  <button
                    type="button"
                    onClick={() => submitAction({ type: "allin" })}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-red-600 text-white font-bold hover:from-amber-500 hover:to-red-500 border-2 border-amber-400 disabled:opacity-50"
                  >
                    オールイン ({la.allInTo})
                  </button>
                )}
              </div>
              {la.canRaise && (
                <p className="text-emerald-400 text-xs">レイズは合計 {la.minRaiseTo}〜{la.maxRaiseTo} で入力</p>
              )}
            </>
          ) : (
            <p className="text-emerald-300 text-sm">
              {state.phase === "showdown" || state.phase === "gameover"
                ? "ハンド終了"
                : `${playerLabel(state.currentTurn)} の番を待っています`}
            </p>
          )}
        </section>
      )}

      <footer className="text-center text-emerald-600 text-xs py-2">
        ※ これは非公式のファンプロジェクトであり、オリジナルのゲームとは関係ありません。
      </footer>
    </div>
  );
}

export default function PokerGamePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-gradient-to-b from-green-950 to-emerald-950 text-emerald-100">
          <h1 className="text-2xl font-bold font-serif">Poker</h1>
          <p className="text-emerald-300">読み込み中…</p>
        </div>
      }
    >
      <GameContent />
    </Suspense>
  );
}
