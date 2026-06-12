/**
 * Secret Word（ワードウルフ風）会話ゲームロジック
 * 多数派は同じ単語、少数派（ウルフ）1人のみ別単語。議論→投票→結果。
 */

/** 似ている単語ペア [多数派の単語, 少数派の単語] */
export const WORD_PAIRS: [string, string][] = [
  // 食べ物
  ["うどん", "そば"],
  ["おにぎり", "サンドイッチ"],
  ["焼肉", "すき焼き"],
  ["カレー", "シチュー"],
  ["コーヒー", "紅茶"],
  ["マクドナルド", "ケンタッキー"],
  // 学校・生活
  ["数学", "理科"],
  ["遠足", "修学旅行"],
  ["掃除", "洗濯"],
  ["Youtube", "TikTok"],
  ["犬", "猫"],
  // 恋愛
  ["初デート", "プロポーズ"],
  ["恋人", "親友"],
  ["手をつなぐ", "ハグする"],
  // ファンタジー
  ["幽霊", "宇宙人"],
  ["タイムマシン", "どこでもドア"],
  ["勇者", "魔王"],
];

export interface SecretWordMessage {
  author: string;
  text: string;
  timestamp: number;
}

export type SecretWordPhase = "discussion" | "voting" | "result";

export interface SecretWordGameState {
  phase: SecretWordPhase;
  /** 多数派の単語（市民） */
  majorityWord: string;
  /** 少数派の単語（ウルフ） */
  minorityWord: string;
  /** assignments[i] === 0 → 市民, 1 → ウルフ */
  assignments: number[];
  /** 議論終了時刻（Unix ms）。0なら未設定 */
  discussionEndsAt: number;
  /** 議論時間（秒） */
  discussionDurationSeconds: number;
  /** 投票: votes[i] = プレイヤー i が投票した先の index（-1 は未投票） */
  votes: number[];
  messages: SecretWordMessage[];
  /** 結果表示用: 追放されたプレイヤー index, ウルフだったか, 市民の勝ちか */
  result?: {
    exiledIndex: number;
    wasWolf: boolean;
    citizensWin: boolean;
  };
}

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 8;
const DEFAULT_DISCUSSION_SECONDS = 3 * 60;

function pickRandomPair(): [string, string] {
  const pair = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];
  return [...pair];
}

/**
 * 1人をランダムにウルフ（少数派）に割り当て、残りは市民（多数派）
 */
function assignRoles(playerCount: number): number[] {
  const assignments = new Array(playerCount).fill(0);
  const wolfIndex = Math.floor(Math.random() * playerCount);
  assignments[wolfIndex] = 1;
  return assignments;
}

export function createInitialSecretWordState(playerCount: number): SecretWordGameState {
  if (playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    throw new Error(`3〜8人で遊べます（現在: ${playerCount}人）`);
  }
  const [majorityWord, minorityWord] = pickRandomPair();
  const now = Date.now();
  return {
    phase: "discussion",
    majorityWord,
    minorityWord,
    assignments: assignRoles(playerCount),
    discussionEndsAt: now + DEFAULT_DISCUSSION_SECONDS * 1000,
    discussionDurationSeconds: DEFAULT_DISCUSSION_SECONDS,
    votes: new Array(playerCount).fill(-1),
    messages: [],
  };
}

/** プレイヤー index の持つ単語を返す（表示用） */
export function getPlayerWord(state: SecretWordGameState, playerIndex: number): string {
  return state.assignments[playerIndex] === 0 ? state.majorityWord : state.minorityWord;
}

/** 議論フェーズを終了し、投票フェーズへ */
export function endDiscussion(state: SecretWordGameState): SecretWordGameState | null {
  if (state.phase !== "discussion") return null;
  return {
    ...state,
    phase: "voting",
  };
}

/** メッセージを追加（author は表示名） */
export function addMessage(
  state: SecretWordGameState,
  author: string,
  text: string
): SecretWordGameState | null {
  if (state.phase !== "discussion") return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  const message: SecretWordMessage = {
    author,
    text: trimmed,
    timestamp: Date.now(),
  };
  return {
    ...state,
    messages: [...state.messages, message],
  };
}

/** 投票する（voterIndex が targetIndex に投票）。全員投票済みなら結果へ遷移 */
export function vote(
  state: SecretWordGameState,
  voterIndex: number,
  targetIndex: number
): SecretWordGameState | null {
  if (state.phase !== "voting") return null;
  if (voterIndex === targetIndex) return null;
  if (targetIndex < 0 || targetIndex >= state.votes.length) return null;
  const votes = [...state.votes];
  votes[voterIndex] = targetIndex;
  const next = { ...state, votes };
  if (allVoted(next)) {
    const exiledIndex = getMostVotedIndex(next);
    return {
      ...next,
      phase: "result",
      result: {
        exiledIndex,
        wasWolf: next.assignments[exiledIndex] === 1,
        citizensWin: next.assignments[exiledIndex] === 1,
      },
    };
  }
  return next;
}

/** 全員投票済みか */
function allVoted(state: SecretWordGameState): boolean {
  return state.votes.every((v) => v >= 0);
}

/** 最多得票者の index を返す（同数の場合は先にその得票に達した人＝最初の同点） */
function getMostVotedIndex(state: SecretWordGameState): number {
  const counts = new Array(state.votes.length).fill(0);
  for (const v of state.votes) {
    if (v >= 0) counts[v]++;
  }
  let maxCount = 0;
  let maxIndex = 0;
  for (let i = 0; i < counts.length; i++) {
    if (counts[i] > maxCount) {
      maxCount = counts[i];
      maxIndex = i;
    }
  }
  return maxIndex;
}

/** 投票を確定し、結果を計算して result フェーズへ（全員投票前でも強制終了用） */
export function finishVoting(state: SecretWordGameState): SecretWordGameState | null {
  if (state.phase !== "voting") return null;
  const exiledIndex = getMostVotedIndex(state);
  const wasWolf = state.assignments[exiledIndex] === 1;
  const citizensWin = wasWolf;
  return {
    ...state,
    phase: "result",
    result: {
      exiledIndex,
      wasWolf,
      citizensWin,
    },
  };
}

/** 残り時間（秒）。討論フェーズで discussionEndsAt から計算 */
export function getRemainingDiscussionSeconds(state: SecretWordGameState): number {
  if (state.phase !== "discussion") return 0;
  const remaining = Math.ceil((state.discussionEndsAt - Date.now()) / 1000);
  return Math.max(0, remaining);
}
