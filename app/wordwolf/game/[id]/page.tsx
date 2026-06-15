"use client";

import { useCallback, useState, Suspense, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { WordWolfGameState, WordWolfMessage } from "@/app/wordwolf/logic";
import {
  getPlayerWord,
  endDiscussion,
  addMessage,
  vote,
  getRemainingDiscussionSeconds,
  createInitialWordWolfState,
  restartWordWolfGame,
} from "@/app/wordwolf/logic";
import { useWordWolfRealtime } from "@/app/wordwolf/useRealtime";
import {
  startWordWolfGame,
  updateWordWolfGameState,
} from "@/lib/gameDb";
import { usePresenceMany } from "@/lib/usePresence";
import { PresenceDot } from "@/components/PresenceDot";
import { castRematchVote, rematchCount, hasVotedRematch } from "@/lib/rematch";

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 8;

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
      className="px-2 py-1 rounded border border-emerald-400 bg-emerald-900/80 hover:bg-emerald-500/30 text-emerald-200 text-sm font-medium"
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

  const { gameData, loading, error } = useWordWolfRealtime(gameId);
  const playerIds: string[] = Array.isArray(gameData?.player_ids) ? gameData.player_ids : [];
  const { isOnline } = usePresenceMany(gameId, pid || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [votingModalOpen, setVotingModalOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const playerIndex = pid ? playerIds.indexOf(pid) : -1;
  const myIndex = playerIndex >= 0 ? playerIndex : -1;
  const isHost = myIndex === 0;
  const isSpectator = myIndex < 0;
  const state: WordWolfGameState | null = gameData?.game_state ?? null;

  const playerLabel = useCallback(
    (i: number) => (isSpectator ? `P${i + 1}` : i === myIndex ? "あなた" : `P${i + 1}`),
    [myIndex, isSpectator]
  );

  useEffect(() => {
    if (!state || state.phase !== "discussion") return;
    const update = () => setRemainingSeconds(getRemainingDiscussionSeconds(state));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [state?.phase, state?.discussionEndsAt]);

  useEffect(() => {
    if (state?.phase === "discussion" && remainingSeconds <= 0 && state.discussionEndsAt > 0) {
      const next = endDiscussion(state);
      if (next && gameId) {
        updateWordWolfGameState(gameId, next);
      }
    }
  }, [state, remainingSeconds, gameId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state?.messages?.length]);

  const handleStartGame = useCallback(async () => {
    if (!gameId || !isHost || playerIds.length < MIN_PLAYERS || playerIds.length > MAX_PLAYERS) return;
    setIsSubmitting(true);
    try {
      const initialState = createInitialWordWolfState(playerIds.length);
      await startWordWolfGame(gameId, initialState);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, isHost, playerIds.length]);

  const handleSendMessage = useCallback(async () => {
    if (!gameId || !state || isSpectator || myIndex < 0) return;
    const author = playerLabel(myIndex);
    const next = addMessage(state, author, chatInput);
    if (!next) return;
    setChatInput("");
    setIsSubmitting(true);
    try {
      await updateWordWolfGameState(gameId, next);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, state, myIndex, isSpectator, chatInput, playerLabel]);

  const handleVote = useCallback(
    async (targetIndex: number) => {
      if (!gameId || !state || isSpectator || myIndex < 0) return;
      const next = vote(state, myIndex, targetIndex);
      if (!next) return;
      setVotingModalOpen(false);
      setIsSubmitting(true);
      try {
        await updateWordWolfGameState(gameId, next);
      } finally {
        setIsSubmitting(false);
      }
    },
    [gameId, state, myIndex, isSpectator]
  );

  // 再戦は合意制：自分の同意を votes に加え、全員同意で初めて restart する。
  const handleRematch = useCallback(async () => {
    if (isSpectator || !gameId || !state || !pid) return;
    const { votes, allAgreed } = castRematchVote(state.rematchVotes, pid, playerIds);
    const next = allAgreed ? restartWordWolfGame(state) : { ...state, rematchVotes: votes };
    if (!next) return;
    setIsSubmitting(true);
    try {
      await updateWordWolfGameState(gameId, next);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, state, isSpectator, pid, playerIds]);

  if (loading || !gameId) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-gradient-to-b from-emerald-950 via-teal-950 to-emerald-950 text-emerald-100">
        <h1 className="text-2xl font-bold font-serif text-emerald-200">Word Wolf</h1>
        <p className="text-emerald-300/80">読み込み中…</p>
      </div>
    );
  }

  if (error || !gameData) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-gradient-to-b from-emerald-950 to-teal-950 text-emerald-100">
        <h1 className="text-2xl font-bold font-serif">Word Wolf</h1>
        <p className="text-red-400">ゲームの取得に失敗しました</p>
        <Link href="/wordwolf" className="text-emerald-400 underline font-medium">ロビーに戻る</Link>
      </div>
    );
  }

  if (gameData.status === "waiting") {
    const canStart = playerIds.length >= MIN_PLAYERS && playerIds.length <= MAX_PLAYERS;
    return (
      <div className="min-h-screen flex flex-col p-4 gap-6 items-center justify-center bg-gradient-to-b from-emerald-950 via-teal-950 to-emerald-950 text-emerald-100">
        <h1 className="text-3xl font-bold font-serif text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-300">
          Word Wolf
        </h1>
        <p className="text-emerald-300/80">ワードウルフ</p>
        <div className="rounded-2xl bg-emerald-900/60 p-6 border-2 border-emerald-500/40 shadow-xl max-w-md w-full">
          <p className="text-sm text-emerald-200 font-medium mb-2">
            参加者: {playerIds.length}人（{MIN_PLAYERS}〜{MAX_PLAYERS}人で開始）
          </p>
          {isHost && (
            <>
              <p className="text-xs text-emerald-400/80 mb-2">ゲームID（仲間に伝えてください）</p>
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <p className="font-mono font-bold text-emerald-200 break-all">{gameData.id}</p>
                <CopyButton text={gameData.id} />
              </div>
              <button
                type="button"
                onClick={handleStartGame}
                disabled={!canStart || isSubmitting}
                className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold hover:from-emerald-400 hover:to-teal-500 border-2 border-emerald-400/60 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "開始中…" : "ゲームを開始する"}
              </button>
            </>
          )}
          {!isHost && !isSpectator && (
            <p className="text-emerald-300/80 text-sm">Hostがゲームを開始するまでお待ちください。</p>
          )}
          {isSpectator && <p className="text-emerald-400/80 text-sm">観戦中です。</p>}
        </div>
        <Link href="/wordwolf" className="text-emerald-400 underline font-medium">ロビーに戻る</Link>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-gradient-to-b from-emerald-950 to-teal-950 text-emerald-100">
        <h1 className="text-2xl font-bold font-serif">Word Wolf</h1>
        <p className="text-emerald-400/80">ゲームデータを読み込めません</p>
        <Link href="/wordwolf" className="text-emerald-400 underline font-medium">ロビーに戻る</Link>
      </div>
    );
  }

  const myWord = myIndex >= 0 ? getPlayerWord(state, myIndex) : "";
  const showVotingModal = state.phase === "voting" && !isSpectator && votingModalOpen;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-emerald-950 via-teal-950 to-emerald-950 text-emerald-100">
      <header className="flex-shrink-0 flex flex-wrap items-center justify-between gap-2 p-4 border-b border-emerald-500/30">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-bold font-serif text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-300">
            Word Wolf
          </h1>
          <span className="px-2 py-1 rounded-lg bg-emerald-800/60 text-emerald-200 text-sm font-medium">
            あなたのお題: {myWord}
          </span>
        </div>
        <Link href="/wordwolf" className="text-emerald-400 text-sm underline hover:text-emerald-300 font-medium">
          ロビーに戻る
        </Link>
      </header>

      {/* プレイヤー一覧（オンライン状態） */}
      <div className="flex-shrink-0 px-4 py-2 bg-emerald-900/40 border-b border-emerald-500/20 flex flex-wrap gap-x-4 gap-y-1 items-center">
        {playerIds.map((p, i) => (
          <span key={p ?? i} className="inline-flex items-center gap-1.5 text-sm text-emerald-100">
            {playerLabel(i)}
            <PresenceDot online={isOnline(playerIds[i])} />
          </span>
        ))}
      </div>

      {/* タイマー（議論中のみ・目立つ表示） */}
      {state.phase === "discussion" && (
        <div className="flex-shrink-0 px-4 py-3 bg-emerald-900/70 border-b border-emerald-500/30 text-center">
          <p className="text-xs text-emerald-300/90 mb-1">議論時間</p>
          <p
            className={`text-3xl font-mono font-bold ${
              remainingSeconds <= 30 ? "text-red-400 animate-pulse" : "text-emerald-200"
            }`}
          >
            {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, "0")}
          </p>
          {remainingSeconds <= 0 && <p className="text-sm text-emerald-400 mt-1">投票へ…</p>}
        </div>
      )}

      {/* 投票フェーズ: 投票モーダルを開くボタン */}
      {state.phase === "voting" && !isSpectator && (
        <div className="flex-shrink-0 p-4 border-b border-emerald-500/30 flex justify-center">
          {state.votes[myIndex] >= 0 ? (
            <p className="text-emerald-200">
              投票済み: {playerLabel(state.votes[myIndex])} さん
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setVotingModalOpen(true)}
              className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 border-2 border-emerald-400"
            >
              投票する（噛み合わないと思う人を選ぶ）
            </button>
          )}
        </div>
      )}

      {/* チャットログ（LINE風吹き出し） */}
      <main className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {state.messages.length === 0 && state.phase === "discussion" && (
          <p className="text-center text-emerald-400/70 text-sm">「赤いよね」「丸いよね」など、お題に触れずに会話してみよう</p>
        )}
        {state.messages.map((msg: WordWolfMessage, i: number) => (
          <div
            key={i}
            className={`flex ${msg.author === "あなた" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                msg.author === "あなた"
                  ? "bg-emerald-500/80 text-white rounded-br-md"
                  : "bg-emerald-900/60 text-emerald-100 border border-emerald-500/30 rounded-bl-md"
              }`}
            >
              <p className="text-xs text-emerald-300/90 mb-0.5">{msg.author}</p>
              <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </main>

      {/* チャット入力（画面下部固定） */}
      {state.phase === "discussion" && !isSpectator && (
        <div className="flex-shrink-0 p-4 bg-emerald-950/90 border-t border-emerald-500/30">
          <div className="flex gap-2 max-w-2xl mx-auto">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
              placeholder="メッセージを入力..."
              className="flex-1 px-4 py-3 rounded-xl border-2 border-emerald-500/50 bg-emerald-900/60 text-emerald-100 placeholder-emerald-400/60 focus:border-emerald-400 focus:outline-none"
              disabled={!!isSubmitting}
            />
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!!isSubmitting || !chatInput.trim()}
              className="px-5 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              送信
            </button>
          </div>
        </div>
      )}

      {/* 投票モーダル */}
      {showVotingModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setVotingModalOpen(false)}
        >
          <div
            className="rounded-2xl bg-emerald-900 border-2 border-emerald-500/50 shadow-xl max-w-sm w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-emerald-100 text-center">誰が噛み合わないと思う？</h2>
            <p className="text-sm text-emerald-300/80 text-center">投票で追放する人を選んでください</p>
            <div className="flex flex-col gap-2">
              {Array.from({ length: state.assignments.length }, (_, i) => i)
                .filter((i) => i !== myIndex)
                .map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleVote(i)}
                        disabled={!!isSubmitting}
                        className="w-full px-4 py-3 rounded-xl bg-emerald-800/80 hover:bg-emerald-700/80 text-emerald-100 font-medium border border-emerald-500/40 disabled:opacity-50"
                      >
                        {playerLabel(i)} さんに投票
                      </button>
                    ))}
            </div>
            <button
              type="button"
              onClick={() => setVotingModalOpen(false)}
              className="w-full py-2 text-emerald-400 text-sm hover:text-emerald-300"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 結果発表 */}
      {state.phase === "result" && state.result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="rounded-2xl bg-emerald-900 border-2 border-emerald-500/50 shadow-xl max-w-md w-full p-6 space-y-4 text-center">
            <h2 className="text-xl font-bold text-emerald-100">結果発表</h2>
            <p className="text-emerald-200">
              追放された人: <span className="font-bold">{playerLabel(state.result.exiledIndex)}</span> さん
            </p>
            <p className="text-lg">
              {state.result.wasWolf ? "正体はウルフでした！" : "市民でした…"}
            </p>
            <p className={`text-2xl font-bold ${state.result.citizensWin ? "text-emerald-400" : "text-amber-400"}`}>
              {state.result.citizensWin ? "市民の勝ち！" : "ウルフの勝ち！"}
            </p>
            <p className="text-sm text-emerald-300/80">
              お題は「{state.majorityWord}」と「{state.minorityWord}」でした
            </p>
            <div className="flex flex-wrap gap-3 justify-center mt-4">
              {/* 再戦は合意制：観戦者には非表示。全員が同意すると新しいお題で再開 */}
              {!isSpectator && (() => {
                const { agreed, total } = rematchCount(state.rematchVotes, playerIds);
                const voted = hasVotedRematch(state.rematchVotes, pid);
                return (
                  <button
                    type="button"
                    onClick={handleRematch}
                    disabled={!!isSubmitting || voted}
                    className="inline-block px-6 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {voted ? `みんなの同意を待っています (${agreed}/${total})` : `もう一度遊ぶ (${agreed}/${total})`}
                  </button>
                );
              })()}
              <Link
                href="/wordwolf"
                className="inline-block px-6 py-3 rounded-xl bg-emerald-700 text-white font-bold hover:bg-emerald-600"
              >
                ロビーに戻る
              </Link>
            </div>
          </div>
        </div>
      )}

      <footer className="flex-shrink-0 text-center text-emerald-500/70 text-xs py-2">
        ※ これは非公式のファンプロジェクトです
      </footer>
    </div>
  );
}

export default function WordWolfGamePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-gradient-to-b from-emerald-950 to-teal-950 text-emerald-100">
          <h1 className="text-2xl font-bold font-serif">Word Wolf</h1>
          <p className="text-emerald-300/80">読み込み中…</p>
        </div>
      }
    >
      <GameContent />
    </Suspense>
  );
}
