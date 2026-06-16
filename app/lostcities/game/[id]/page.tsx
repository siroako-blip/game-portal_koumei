"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Card as CardType, CardColor, GameState, PlayerScore } from "@/app/lostcities/types";
import { COLORS, COLOR_LABELS } from "@/app/lostcities/types";
import {
  playCard,
  playCardP2,
  drawCard,
  getDrawOptions,
  canPlayCard,
  calculatePlayerScore,
  restartGame,
} from "@/app/lostcities/logic";
import { Card, COLOR_ICONS } from "@/app/lostcities/components/Card";
import { useSfx } from "@/app/lostcities/components/sfx";
import { updateGameState } from "@/lib/gameDb";
import { useGameRealtime } from "@/app/lostcities/useRealtime";
import { usePresence } from "@/lib/usePresence";
import { PresenceDot } from "@/components/PresenceDot";
import { RuleBook } from "@/components/RuleBook";
import { castRematchVote, rematchCount, hasVotedRematch } from "@/lib/rematch";

const EMOTES = ["👀", "👏", "😱", "🔥"] as const;
const EMOTE_COOLDOWN_MS = 500;
const EMOTE_DISPLAY_DURATION_MS = 2500;

type ActiveEmote = { id: string; emoji: string; x: number; y: number };
type PlayerRole = "player1" | "player2" | "spectator";

/** 道の列ごとの背景色（属性別の薄い色） */
const COLUMN_STYLES: Record<CardColor, string> = {
  red: "bg-red-100/80 border-red-300",
  blue: "bg-sky-100/80 border-sky-300",
  green: "bg-emerald-100/80 border-emerald-300",
  yellow: "bg-amber-100/80 border-amber-300",
  white: "bg-slate-100/80 border-slate-300",
};

function getEmptyPlayerScore(): PlayerScore {
  const emptyExpeditions = COLORS.reduce(
    (acc, c) => ({ ...acc, [c]: [] }),
    {} as Record<CardColor, CardType[]>
  );
  return calculatePlayerScore(emptyExpeditions);
}

function GameContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const gameId = typeof params.id === "string" ? params.id : null;
  const pid = searchParams.get("pid") ?? "";
  const playSfx = useSfx();

  const [activeEmotes, setActiveEmotes] = useState<ActiveEmote[]>([]);
  const emoteCooldownUntil = useRef<number>(0);

  const handleReceiveEmote = useCallback((payload: { emoji: string }) => {
    const id = `emote-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const x = 5 + Math.random() * 18;
    const y = 20 + Math.random() * 45;
    setActiveEmotes((prev) => [...prev, { id, emoji: payload.emoji, x, y }]);
    setTimeout(() => {
      setActiveEmotes((prev) => prev.filter((e) => e.id !== id));
    }, EMOTE_DISPLAY_DURATION_MS);
  }, []);

  const { gameData, loading, error, sendEmote } = useGameRealtime(gameId, {
    onReceiveEmote: handleReceiveEmote,
  });

  const handleSendEmote = useCallback(
    (emoji: string) => {
      const now = Date.now();
      if (now < emoteCooldownUntil.current) return;
      emoteCooldownUntil.current = now + EMOTE_COOLDOWN_MS;
      sendEmote(emoji);
    },
    [sendEmote]
  );

  const host_id = gameData?.player1_id ?? null;
  const guest_id = gameData?.player2_id ?? null;
  const { opponentStatus, player1Status, player2Status } = usePresence(
    gameId,
    pid || null,
    host_id,
    guest_id
  );
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [showDisconnectBanner, setShowDisconnectBanner] = useState(false);
  const [showReconnectMessage, setShowReconnectMessage] = useState(false);
  const prevOpponentStatus = useRef<"online" | "offline" | null>(null);
  const hasSeenOpponentOnline = useRef(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const prevDeckLength = useRef<number | null>(null);

  useEffect(() => {
    if (!gameData?.created_at) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [gameData?.created_at]);
  const elapsedMs = gameData?.created_at ? now - new Date(gameData.created_at).getTime() : 0;
  const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const timerLabel = `${String(Math.floor(elapsedSec / 60)).padStart(2, "0")}:${String(elapsedSec % 60).padStart(2, "0")}`;

  const emptyPlayerScore = useMemo(() => getEmptyPlayerScore(), []);

  const state: GameState | null = gameData?.game_state ?? null;
  const myRole: PlayerRole =
    pid && host_id && pid === host_id
      ? "player1"
      : pid && guest_id && pid === guest_id
        ? "player2"
        : "spectator";

  useEffect(() => {
    if (state && prevDeckLength.current !== null && prevDeckLength.current > 0 && state.deck.length === 0) {
      setResultModalOpen(true);
    }
    prevDeckLength.current = state?.deck.length ?? null;
  }, [state?.deck.length]);

  useEffect(() => {
    if (opponentStatus === null) return;
    if (opponentStatus === "online") hasSeenOpponentOnline.current = true;
    const prev = prevOpponentStatus.current;
    prevOpponentStatus.current = opponentStatus;
    if (prev === "online" && opponentStatus === "offline" && hasSeenOpponentOnline.current) {
      setShowDisconnectBanner(true);
      setShowReconnectMessage(false);
    }
    if (prev === "offline" && opponentStatus === "online") {
      setShowDisconnectBanner(false);
      setShowReconnectMessage(true);
      const t = setTimeout(() => setShowReconnectMessage(false), 3000);
      return () => clearTimeout(t);
    }
  }, [opponentStatus]);

  const applyAndSave = useCallback(
    async (nextState: GameState) => {
      if (!gameId) return;
      setIsSubmitting(true);
      try {
        const toSave = { ...nextState, selectedCard: null };
        await updateGameState(gameId, toSave);
        setSelectedCard(null);
      } finally {
        setIsSubmitting(false);
      }
    },
    [gameId]
  );

  const isMyTurnPlay = state?.phase === "play" && state.currentPlayer === myRole;
  const isMyTurnDraw = state?.phase === "draw" && state.currentPlayer === myRole;
  const isP1Turn = state?.currentPlayer === "player1" && state.phase === "play";
  const isP2Turn = state?.currentPlayer === "player2" && state.phase === "play";
  const isP1Draw = state?.currentPlayer === "player1" && state.phase === "draw";
  const isP2Draw = state?.currentPlayer === "player2" && state.phase === "draw";
  const drawOptions = state && state.phase === "draw" ? getDrawOptions(state) : [];
  const gameOver = state ? state.deck.length === 0 : false;

  const scoreP1: PlayerScore = state ? calculatePlayerScore(state.player1Expeditions) : emptyPlayerScore;
  const scoreP2: PlayerScore = state ? calculatePlayerScore(state.player2Expeditions) : emptyPlayerScore;

  // 合意制再戦: 自分の同意を votes に加え、全員（両者）同意で初めて restartGame。即リセットしない。
  const handleRematch = useCallback(async () => {
    if (myRole === "spectator" || !gameId || !state || !pid) return; // 観戦者は不可
    const allPids = [host_id, guest_id];
    const { votes, allAgreed } = castRematchVote(state.rematchVotes, pid, allPids);
    const next = allAgreed ? restartGame(state) : { ...state, rematchVotes: votes };
    if (!next) return;
    setIsSubmitting(true);
    try {
      await updateGameState(gameId, next);
      if (allAgreed) setResultModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, state, myRole, pid, host_id, guest_id]);

  if (loading || !gameId) {
    return (
      <div className="parchment-bg min-h-screen flex flex-col p-4 gap-4 items-center justify-center">
        <h1 className="text-2xl font-extrabold text-stone-800">🔮 Lost Cities</h1>
        <p className="text-stone-600">⏳ 読み込み中…</p>
      </div>
    );
  }

  if (error || !gameData) {
    return (
      <div className="parchment-bg min-h-screen flex flex-col p-4 gap-4 items-center justify-center">
        <h1 className="text-2xl font-extrabold text-stone-800">🔮 Lost Cities</h1>
        <p className="text-red-600 font-bold">⚠️ ゲームの取得に失敗しました</p>
        <Link href="/lostcities" className="text-orange-600 underline font-medium">ロビーに戻る</Link>
      </div>
    );
  }

  if (gameData.status === "waiting") {
    const isHost = pid === host_id;
    const isSpectatorWaiting = myRole === "spectator";
    return (
      <div className="parchment-bg min-h-screen flex flex-col p-4 gap-4 items-center justify-center text-stone-800">
        <div className="text-6xl animate-bounce">⛺</div>
        <h1 className="text-2xl font-extrabold">🔮 Lost Cities</h1>
        {isSpectatorWaiting ? (
          <p className="text-stone-600">ゲームはまだ開始していません。Hostが相手の参加を待っています。</p>
        ) : isHost ? (
          <>
            <p className="text-stone-600 font-medium">ゲームIDを相手に伝えて待機しています</p>
            <div className="rounded-2xl bg-white/80 p-6 border-2 border-amber-300 shadow-lg">
              <p className="text-xs text-stone-500 mb-1 font-bold">🎟️ ゲームID</p>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xl font-mono font-bold text-orange-700 break-all">{gameData.id}</p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(gameData.id);
                      setCopyFeedback(true);
                      setTimeout(() => setCopyFeedback(false), 2000);
                    } catch { /* ignore */ }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-sm font-bold shadow border-b-2 border-orange-700 active:border-b-0 active:translate-y-0.5"
                >
                  {copyFeedback ? "✅ コピーしました" : "📋 コピー"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="text-stone-600">参加処理中…</p>
        )}
        <Link href="/lostcities" className="text-stone-500 underline font-medium text-sm">← ロビーに戻る</Link>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="parchment-bg min-h-screen flex flex-col p-4 gap-4 items-center justify-center">
        <h1 className="text-2xl font-extrabold text-stone-800">🔮 Lost Cities</h1>
        <p className="text-stone-600">ゲームデータを読み込めません</p>
        <Link href="/lostcities" className="text-orange-600 underline font-medium">ロビーに戻る</Link>
      </div>
    );
  }

  const isSpectator = myRole === "spectator";
  const myHand = myRole === "player1" ? state.player1Hand : state.player2Hand;
  const opponentHandLength = myRole === "player1" ? state.player2Hand.length : state.player1Hand.length;
  const myExpeditions = myRole === "player1" ? state.player1Expeditions : state.player2Expeditions;
  const opponentExpeditions = myRole === "player1" ? state.player2Expeditions : state.player1Expeditions;
  const canPlayOrDiscard = !isSpectator && isMyTurnPlay && selectedCard;
  const canDraw = !isSpectator && isMyTurnDraw && drawOptions.length > 0;

  const handlePlayToExpedition = (color: CardColor) => {
    if (!canPlayOrDiscard || !selectedCard || selectedCard.color !== color || isSubmitting) return;
    if (myRole === "player1" && canPlayCard(state, selectedCard, "expedition", color)) {
      playSfx("play");
      void applyAndSave(playCard(state, selectedCard, "expedition", color));
    }
    if (myRole === "player2") {
      playSfx("play");
      void applyAndSave(playCardP2(state, selectedCard, "expedition", color));
    }
  };

  const handlePlayToDiscard = (color: CardColor) => {
    if (!canPlayOrDiscard || !selectedCard || selectedCard.color !== color || isSubmitting) return;
    playSfx("discard");
    if (myRole === "player1") void applyAndSave(playCard(state, selectedCard, "discard", color));
    if (myRole === "player2") void applyAndSave(playCardP2(state, selectedCard, "discard", color));
  };

  const handleDraw = (source: "deck" | CardColor) => {
    if (!canDraw || !drawOptions.includes(source) || isSubmitting) return;
    playSfx("draw");
    void applyAndSave(drawCard(state, source));
  };

  const selfScore = myRole === "player1" ? scoreP1 : scoreP2;
  const opponentScore = myRole === "player1" ? scoreP2 : scoreP1;
  const selfTotal = selfScore.total;
  const opponentTotal = opponentScore.total;

  const formatLogLine = (log: string, index: number) => {
    const n = index + 1;
    const who = log.startsWith("P1:") ? (isSpectator ? "Player 1" : (myRole === "player1" ? "自分" : "相手")) : (isSpectator ? "Player 2" : (myRole === "player1" ? "相手" : "自分"));
    const text = log.replace(/^P[12]:/, "");
    return `[${n}手前] ${who}: ${text}`;
  };
  const displayLogs = (state.logs ?? []).slice(-3).reverse();

  return (
    <div className="parchment-bg min-h-screen flex flex-col p-4 gap-4 text-stone-800 relative">
      <RuleBook gameType="lostcities" />
      {/* エモート表示オーバーレイ（浮かび上がり＋フェードアウト） */}
      <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
        {activeEmotes.map((e) => (
          <div
            key={e.id}
            className="emote-float absolute text-4xl opacity-90"
            style={{
              right: `${e.x}%`,
              bottom: `${e.y}%`,
              animation: `emoteFloat ${EMOTE_DISPLAY_DURATION_MS}ms ease-out forwards`,
            }}
          >
            {e.emoji}
          </div>
        ))}
      </div>

      {/* エモート送信ボタン（右下） */}
      <div className="fixed bottom-6 right-6 z-30 flex gap-2">
        {EMOTES.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => handleSendEmote(emoji)}
            className="w-12 h-12 rounded-full bg-white/90 border-2 border-amber-300 shadow-lg hover:bg-amber-50 hover:scale-110 active:scale-95 transition-transform flex items-center justify-center text-2xl disabled:opacity-50"
            title="リアクションを送る"
            aria-label={`エモート ${emoji} を送る`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {showDisconnectBanner && (
        <div className="w-full py-2 px-4 rounded-xl bg-red-500 text-white font-bold text-center shadow-lg" role="alert">
          ⚠️ 相手との接続が切れました
        </div>
      )}
      {showReconnectMessage && !showDisconnectBanner && (
        <div className="w-full py-2 px-4 rounded-xl bg-emerald-500 text-white font-bold text-center shadow-lg" role="status">
          ✅ 再接続しました
        </div>
      )}
      {gameOver && resultModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-amber-200 max-w-2xl w-full max-h-[90vh] overflow-auto p-6 text-stone-900">
            <div className="text-center text-5xl mb-2">
              {isSpectator
                ? "🏁"
                : selfTotal > opponentTotal ? "🏆" : selfTotal < opponentTotal ? "😢" : "🤝"}
            </div>
            <h2 className="text-xl font-extrabold text-center mb-4 text-amber-800">ゲーム終了 — 結果</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="rounded-2xl bg-sky-50 p-4 border-2 border-sky-200 shadow-inner">
                <h3 className="font-extrabold text-sky-800 mb-2">🧗 {isSpectator ? "Player 1" : "自分"}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-amber-200">
                        <th className="text-left py-1 pr-2 text-stone-500">属性</th>
                        <th className="text-right py-1 px-1 text-stone-500">基本点</th>
                        <th className="text-right py-1 px-1 text-stone-500">契約</th>
                        <th className="text-right py-1 px-1 text-stone-500">倍率</th>
                        <th className="text-right py-1 px-1 text-stone-500">ボーナス</th>
                        <th className="text-right py-1 pl-2 text-stone-500">合計</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COLORS.map((color) => {
                        const d = selfScore.perColor[color];
                        return (
                          <tr key={color} className="border-b border-amber-100">
                            <td className="py-1 pr-2 text-stone-800 font-bold">{COLOR_ICONS[color]} {COLOR_LABELS[color]}</td>
                            <td className="text-right py-1 px-1 text-stone-800">{d.base}</td>
                            <td className="text-right py-1 px-1 text-stone-800">{d.wagerCount}枚</td>
                            <td className="text-right py-1 px-1 text-stone-800">×{d.multiplier}</td>
                            <td className="text-right py-1 px-1 text-stone-800">{d.bonus}</td>
                            <td className={`text-right py-1 pl-2 font-bold tabular-nums ${d.total > 0 ? "text-emerald-600" : d.total < 0 ? "text-red-500" : "text-stone-400"}`}>{d.total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-amber-300 font-extrabold text-stone-900">
                        <td className="py-2 pr-2" colSpan={5}>合計スコア</td>
                        <td className="text-right py-2 pl-2 tabular-nums text-orange-600">{selfTotal}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              <div className="rounded-2xl bg-rose-50 p-4 border-2 border-rose-200 shadow-inner">
                <h3 className="font-extrabold text-rose-800 mb-2">🏕️ {isSpectator ? "Player 2" : "相手"}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-amber-200">
                        <th className="text-left py-1 pr-2 text-stone-500">属性</th>
                        <th className="text-right py-1 px-1 text-stone-500">基本点</th>
                        <th className="text-right py-1 px-1 text-stone-500">契約</th>
                        <th className="text-right py-1 px-1 text-stone-500">倍率</th>
                        <th className="text-right py-1 px-1 text-stone-500">ボーナス</th>
                        <th className="text-right py-1 pl-2 text-stone-500">合計</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COLORS.map((color) => {
                        const d = opponentScore.perColor[color];
                        return (
                          <tr key={color} className="border-b border-amber-100">
                            <td className="py-1 pr-2 text-stone-800 font-bold">{COLOR_ICONS[color]} {COLOR_LABELS[color]}</td>
                            <td className="text-right py-1 px-1 text-stone-800">{d.base}</td>
                            <td className="text-right py-1 px-1 text-stone-800">{d.wagerCount}枚</td>
                            <td className="text-right py-1 px-1 text-stone-800">×{d.multiplier}</td>
                            <td className="text-right py-1 px-1 text-stone-800">{d.bonus}</td>
                            <td className={`text-right py-1 pl-2 font-bold tabular-nums ${d.total > 0 ? "text-emerald-600" : d.total < 0 ? "text-red-500" : "text-stone-400"}`}>{d.total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-amber-300 font-extrabold text-stone-900">
                        <td className="py-2 pr-2" colSpan={5}>合計スコア</td>
                        <td className="text-right py-2 pl-2 tabular-nums">{opponentTotal}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
            <p className="text-center text-stone-700 mb-4 font-extrabold text-lg">
              {isSpectator
                ? (scoreP1.total > scoreP2.total ? "Player 1 の勝ち！" : scoreP1.total < scoreP2.total ? "Player 2 の勝ち！" : "同点！")
                : (selfTotal > opponentTotal && "自分の勝ち！") || (selfTotal < opponentTotal && "相手の勝ち！") || (selfTotal === opponentTotal && "同点！")}
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              {!isSpectator && (() => {
                // 合意制: 同意人数を表示し、自分が同意済みなら無効化
                const allPids = [host_id, guest_id];
                const { agreed, total } = rematchCount(state.rematchVotes, allPids);
                const voted = hasVotedRematch(state.rematchVotes, pid);
                return (
                  <button
                    type="button"
                    onClick={handleRematch}
                    disabled={isSubmitting || voted}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-extrabold shadow-lg border-b-4 border-orange-700 active:border-b-0 active:translate-y-1 disabled:opacity-50 transition-all"
                  >
                    {voted ? `相手の同意を待っています (${agreed}/${total})` : `🔄 もう一度遊ぶ (${agreed}/${total})`}
                  </button>
                );
              })()}
              <button
                type="button"
                onClick={() => setResultModalOpen(false)}
                className="px-6 py-3 rounded-2xl bg-white text-stone-600 font-extrabold shadow-lg border border-amber-200 border-b-4 border-b-amber-300 hover:bg-amber-50 active:border-b active:translate-y-1 transition-all"
              >
                👀 盤面を見る（閉じる）
              </button>
              <Link href="/lostcities" className="px-6 py-3 rounded-2xl bg-white text-stone-600 font-extrabold shadow-lg border border-amber-200 border-b-4 border-b-amber-300 hover:bg-amber-50 active:border-b active:translate-y-1 transition-all inline-block">
                🏠 ロビーに戻る
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-row flex-wrap items-center justify-between gap-2 sm:gap-4 w-full bg-white/80 rounded-2xl px-4 py-2.5 shadow border border-amber-200">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
          {isSpectator && (
            <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-extrabold shadow">
              👀 観戦モード
            </span>
          )}
          <h1 className="text-xl md:text-2xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-orange-600 to-red-600">
            🔮 Lost Cities
          </h1>
          {gameData?.created_at && (
            <span className="text-stone-600 font-mono text-sm tabular-nums bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 font-bold" title="プレイ時間">
              ⏱ {timerLabel}
            </span>
          )}
          {gameOver && !resultModalOpen && (
            <button
              type="button"
              onClick={() => setResultModalOpen(true)}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-sm font-bold shadow"
            >
              🏆 結果を再表示
            </button>
          )}
          <Link href="/lostcities" className="text-stone-500 text-sm underline hover:text-orange-600 font-bold">← ロビーに戻る</Link>
        </div>
      </div>

      {isSpectator ? (
        <>
          <section className="rounded-2xl bg-white/70 p-4 border border-amber-200 shadow pointer-events-none select-none">
            <p className="text-sm font-extrabold text-stone-600 mb-2 flex items-center gap-1.5">🧗 Player 1 {player1Status !== null && <PresenceDot online={player1Status === "online"} />}</p>
            <p className="text-xs text-stone-500 mb-1 font-bold">🎴 手札</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {state.player1Hand.map((c) => (
                <Card key={c.id} card={c} compact />
              ))}
            </div>
            <p className="text-xs text-stone-500 mb-1 font-bold">🪜 道</p>
            <div className="flex flex-wrap gap-4">
              {COLORS.map((color) => {
                const pts = scoreP1.perColor[color].total;
                return (
                  <div key={color} className="flex flex-col items-center gap-0.5">
                    <span className="text-xs text-stone-500 font-bold">{COLOR_ICONS[color]} {COLOR_LABELS[color]}</span>
                    <span className={`text-sm font-bold tabular-nums ${pts > 0 ? "text-emerald-600" : pts < 0 ? "text-red-500" : "text-stone-400"}`}>{pts > 0 ? `+${pts}` : pts}点</span>
                    <div className={`flex flex-col items-center min-h-[2.5rem] min-w-[2.25rem] rounded-xl border-2 p-1 ${COLUMN_STYLES[color]}`}>
                      {state.player1Expeditions[color].map((c, i) => (
                        <div key={c.id} className={i === 0 ? "" : "-mt-10"}>
                          <Card card={c} compact />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="rounded-2xl bg-gradient-to-b from-amber-200/90 to-orange-200/90 p-4 border-2 border-amber-400 shadow-inner flex flex-wrap items-end gap-6 pointer-events-none select-none">
            <div className="flex items-end gap-4">
              {COLORS.map((color) => {
                const topCard = state.discardPiles[color].length > 0 ? state.discardPiles[color][state.discardPiles[color].length - 1] : null;
                return (
                  <div key={color} className="flex flex-col items-center">
                    <span className="text-xs text-amber-800/80 mb-1 font-bold">{COLOR_ICONS[color]} 捨て札</span>
                    <div className="min-h-[3rem] min-w-[3.5rem] rounded-xl border-2 border-dashed border-amber-500/60 flex flex-wrap gap-0.5 p-1 items-end justify-center bg-amber-100/60">
                      {topCard && <Card card={topCard} compact />}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-amber-800/80 mb-1 font-bold">🔮 山札</span>
              <div className="h-20 w-14 rounded-lg border-2 border-indigo-400/60 bg-gradient-to-br from-indigo-700 via-indigo-800 to-indigo-950 flex items-center justify-center text-sm font-bold text-indigo-100 shadow-md">
                {state.deck.length}
              </div>
            </div>
          </section>
          <section className="rounded-2xl bg-white/70 p-4 border border-amber-200 shadow flex-1 pointer-events-none select-none">
            <p className="text-sm font-extrabold text-stone-600 mb-2 flex items-center gap-1.5">🏕️ Player 2 {player2Status !== null && <PresenceDot online={player2Status === "online"} />}</p>
            <p className="text-xs text-stone-500 mb-1 font-bold">🎴 手札</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {state.player2Hand.map((c) => (
                <Card key={c.id} card={c} compact />
              ))}
            </div>
            <p className="text-xs text-stone-500 mb-1 font-bold">🪜 道</p>
            <div className="flex flex-wrap gap-4">
              {COLORS.map((color) => {
                const pts = scoreP2.perColor[color].total;
                return (
                  <div key={color} className="flex flex-col items-center gap-0.5">
                    <span className="text-xs text-stone-500 font-bold">{COLOR_ICONS[color]} {COLOR_LABELS[color]}</span>
                    <span className={`text-sm font-bold tabular-nums ${pts > 0 ? "text-emerald-600" : pts < 0 ? "text-red-500" : "text-stone-400"}`}>{pts > 0 ? `+${pts}` : pts}点</span>
                    <div className={`flex flex-col items-center min-h-[2.5rem] min-w-[2.25rem] rounded-xl border-2 p-1 ${COLUMN_STYLES[color]}`}>
                      {state.player2Expeditions[color].map((c, i) => (
                        <div key={c.id} className={i === 0 ? "" : "-mt-10"}>
                          <Card card={c} compact />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      ) : (
        <>
      <section className="rounded-2xl bg-white/70 p-4 border border-amber-200 shadow">
        <p className="text-sm font-extrabold text-stone-600 mb-2 flex items-center gap-1.5">
          🏕️ 相手 {opponentStatus !== null && <PresenceDot online={opponentStatus === "online"} />}
          {((myRole === "player1" && isP2Turn) || (myRole === "player2" && isP1Turn)) && (
            <span className="ml-2 px-2.5 py-0.5 rounded-full bg-stone-200 text-stone-500 font-bold text-xs">⏳ 手番です</span>
          )}
          {((myRole === "player1" && isP2Draw) || (myRole === "player2" && isP1Draw)) && (
            <span className="ml-2 px-2.5 py-0.5 rounded-full bg-stone-200 text-stone-500 font-bold text-xs">🃏 1枚引いています</span>
          )}
        </p>
        <div className="flex flex-wrap gap-2 mb-3 items-center">
          <span className="text-xs text-stone-500 font-bold">🎴 手札 {opponentHandLength}枚</span>
          {Array.from({ length: opponentHandLength }).map((_, i) => (
            <Card key={i} card={{ id: `opp-${i}`, color: "red", value: 2 }} faceDown compact />
          ))}
        </div>
        <p className="text-xs text-stone-500 mb-1 font-bold">🪜 プレイしたカード</p>
        <div className="flex flex-wrap gap-4">
          {COLORS.map((color) => {
            const pts = myRole === "player1" ? scoreP2.perColor[color].total : scoreP1.perColor[color].total;
            return (
              <div key={color} className="flex flex-col items-center gap-0.5">
                <span className="text-xs text-stone-500 font-bold">{COLOR_ICONS[color]} {COLOR_LABELS[color]}</span>
                <span className={`text-sm font-bold tabular-nums min-h-[1.5rem] flex items-center justify-center ${pts > 0 ? "text-emerald-600" : pts < 0 ? "text-red-500" : "text-stone-400"}`}>
                  {pts > 0 ? `+${pts}` : pts}点
                </span>
                <div className={`flex flex-col items-center min-h-[2.5rem] min-w-[2.25rem] rounded-xl border-2 p-1 ${COLUMN_STYLES[color]}`}>
                  {opponentExpeditions[color].map((c, i) => (
                    <div key={c.id} className={i === 0 ? "" : "-mt-10"}>
                      <Card card={c} compact />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl bg-gradient-to-b from-amber-200/90 to-orange-200/90 p-4 border-2 border-amber-400 shadow-inner">
        <p className="text-center text-[11px] font-extrabold text-amber-800/80 mb-2 tracking-widest">
          ⛺ キャンプ — 捨て札 & 山札 ⛺
        </p>
        <div className="flex flex-wrap items-end gap-6">
        <div className="flex items-end gap-4">
          {COLORS.map((color) => {
            const canDrawFromThis = canDraw && drawOptions.includes(color);
            const topCard = state.discardPiles[color].length > 0 ? state.discardPiles[color][state.discardPiles[color].length - 1] : null;
            const canDiscardHere = canPlayOrDiscard && selectedCard?.color === color;
            return (
              <div key={color} className="flex flex-col items-center">
                <span className="text-xs text-amber-800/80 mb-1 font-bold">{COLOR_ICONS[color]} 捨て札</span>
                <div
                  className={`min-h-[3rem] min-w-[3.5rem] rounded-xl border-2 border-dashed flex flex-wrap gap-0.5 p-1 items-end justify-center
                    ${canDiscardHere || canDrawFromThis ? "border-amber-600 bg-amber-100 ring-2 ring-amber-500 ring-offset-2 ring-offset-amber-200" : "border-amber-500/50 bg-amber-100/60"}
                    ${canDrawFromThis ? "cursor-pointer hover:bg-amber-50" : canDiscardHere ? "cursor-pointer hover:bg-amber-50" : ""}`}
                  onClick={() => {
                    if (canDrawFromThis) handleDraw(color);
                    if (canDiscardHere) handlePlayToDiscard(color);
                  }}
                  role={(canDiscardHere || canDrawFromThis) ? "button" : undefined}
                  aria-label={canDrawFromThis ? `${COLOR_LABELS[color]}の捨て札から引く` : canDiscardHere ? `${COLOR_LABELS[color]}に捨てる` : undefined}
                >
                  {topCard && <Card card={topCard} compact />}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-amber-800/80 mb-1 font-bold">🔮 山札</span>
          <button
            type="button"
            onClick={() => handleDraw("deck")}
            disabled={!canDraw || !drawOptions.includes("deck")}
            className={`h-20 w-14 rounded-lg border-2 flex items-center justify-center text-sm font-bold transition-all shadow-md relative overflow-hidden
              bg-gradient-to-br from-indigo-700 via-indigo-800 to-indigo-950 text-indigo-100 border-indigo-400/60
              ${canDraw && drawOptions.includes("deck") ? "ring-2 ring-amber-500 ring-offset-2 ring-offset-amber-200 cursor-pointer hover:-translate-y-1" : "opacity-80 cursor-default"}`}
          >
            <span className="absolute inset-1 rounded-md border border-indigo-400/40" />
            {state.deck.length}
          </button>
        </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white/70 p-4 border border-amber-200 shadow flex-1">
        <p className="text-sm font-extrabold text-stone-600 mb-2 flex items-center gap-1.5 flex-wrap">
          🧗 自分
          {isMyTurnPlay && <span className="ml-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-xs animate-pulse shadow">🎴 手番です。手札を選んでから置き場をクリック</span>}
          {isMyTurnDraw && <span className="ml-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-xs animate-pulse shadow">🃏 1枚引いてください</span>}
        </p>
        <p className="text-xs text-stone-500 mb-1 font-bold">🪜 自分の道（属性ごとに昇順で置く）</p>
        <div className="flex flex-wrap gap-4 mb-4">
          {COLORS.map((color) => {
            const myPts = myRole === "player1" ? scoreP1.perColor[color].total : scoreP2.perColor[color].total;
            return (
              <div key={color} className="flex flex-col items-center">
                <span className="text-xs text-stone-500 font-bold">{COLOR_ICONS[color]} {COLOR_LABELS[color]}</span>
                <span className={`text-sm font-bold tabular-nums min-h-[1.5rem] flex items-center justify-center ${myPts > 0 ? "text-emerald-600" : myPts < 0 ? "text-red-500" : "text-stone-400"}`}>
                  {myPts > 0 ? `+${myPts}` : myPts}点
                </span>
                <div
                  className={`min-h-[4rem] min-w-[2.25rem] rounded-xl border-2 p-1 flex flex-col items-center
                    ${canPlayOrDiscard && selectedCard?.color === color
                      ? "border-amber-500 bg-amber-200/70 ring-2 ring-amber-400 animate-pulse cursor-pointer hover:bg-amber-200"
                      : COLUMN_STYLES[color]}`}
                  onClick={() => isMyTurnPlay && selectedCard && handlePlayToExpedition(color)}
                  role={canPlayOrDiscard ? "button" : undefined}
                >
                  {myExpeditions[color].length === 0 && !(canPlayOrDiscard && selectedCard?.color === color) && (
                    <span className="text-xl opacity-20 mt-1">{COLOR_ICONS[color]}</span>
                  )}
                  {myExpeditions[color].map((c, i) => (
                    <div key={c.id} className={i === 0 ? "" : "-mt-10"}>
                      <Card card={c} compact />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-stone-500 mb-1 font-bold">🎴 手札（クリックで選択 → 置き場をクリック）</p>
        <div className="flex flex-wrap gap-2 pt-2">
          {myHand.map((c) => {
            const isSelected = selectedCard?.id === c.id;
            return (
              <div key={c.id} className="relative">
                <Card
                  card={c}
                  selected={isSelected}
                  onClick={() => {
                    if (isMyTurnPlay && !isSubmitting) {
                      playSfx("select");
                      setSelectedCard(c);
                    }
                  }}
                />
                {isSelected && isSubmitting && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-stone-900/50 pointer-events-none">
                    <svg className="animate-spin h-6 w-6 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {isMyTurnDraw && drawOptions.length > 0 && (
          <p className="mt-3 text-xs font-bold text-orange-700 bg-orange-100 border border-orange-200 rounded-full px-3 py-1.5 inline-block">
            💡 山札または捨て札の一番上をクリックして1枚引いてください
          </p>
        )}
      </section>
        </>
      )}

      {displayLogs.length > 0 && (
        <section className="rounded-2xl bg-white/70 p-3 border border-amber-200 shadow">
          <p className="text-xs text-stone-500 font-bold mb-1.5">📜 行動履歴</p>
          <ul className="text-sm text-stone-700 space-y-0.5">
            {displayLogs.map((log, i) => (
              <li key={i}>{formatLogLine(log, i)}</li>
            ))}
          </ul>
        </section>
      )}

      <footer className="text-center text-stone-500 text-xs py-2">
        ※ これは非公式のファンプロジェクトであり、オリジナルのゲームとは関係ありません。
      </footer>
    </div>
  );
}

export default function LostCitiesGamePage() {
  return (
    <Suspense
      fallback={
        <div className="parchment-bg min-h-screen flex flex-col p-4 gap-4 items-center justify-center">
          <h1 className="text-2xl font-extrabold text-stone-800">🔮 Lost Cities</h1>
          <p className="text-stone-600">⏳ 読み込み中…</p>
        </div>
      }
    >
      <GameContent />
    </Suspense>
  );
}
