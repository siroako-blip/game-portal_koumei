/**
 * Midnight Party（コヨーテ風）対戦ゲームロジック
 * 自分のカードだけ見えず、合計値を推理してビッド or Midnight! でチャレンジ。
 */

export type MidnightCard = number | "x2" | "MAX=0" | "?";

/** デッキ: 10刻みの大きな数字＋特殊。数字は互いに近すぎずハッタリしやすい構成 */
const NUMBERS_10_80 = [10, 20, 30, 40, 50, 60, 70, 80];
export const FULL_DECK: MidnightCard[] = [
  ...NUMBERS_10_80.flatMap((n) => [n, n]),
  10, 20, 30, 40, 50, 60, 70, 80,
  -10, -10, -20, -20,
  0, 0, 0,
  "x2", "x2", "MAX=0", "MAX=0", "?", "?",
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function isNumericCard(c: MidnightCard): c is number {
  return typeof c === "number";
}

/**
 * 計算ロジック（厳密な順序）
 * 1. ? があれば山札から1枚引いてその値を確定（特殊は0として扱う）
 * 2. MAX=0 があれば場の数字カードの最大1枚を0に
 * 3. 全数字を合計
 * 4. x2 の枚数だけ合計を2倍
 */
export function calculateTotal(
  hands: MidnightCard[][],
  deck: MidnightCard[]
): { total: number; usedDeck: MidnightCard[] } {
  const usedDeck = [...deck];
  const allCards: MidnightCard[] = hands.flat();

  // 1. ? の解決: 山札から1枚引き、数値ならその値、特殊なら0
  const mysteryValues: number[] = [];
  for (const c of allCards) {
    if (c !== "?") continue;
    const drawn = usedDeck.shift();
    const value = drawn !== undefined && isNumericCard(drawn) ? drawn : 0;
    mysteryValues.push(value);
  }

  // 2. MAX=0: 場の「数字カード」の最大を1つだけ0に
  const numberValues: number[] = [
    ...allCards.filter((c): c is number => isNumericCard(c)),
    ...mysteryValues,
  ];
  if (allCards.some((c) => c === "MAX=0") && numberValues.length > 0) {
    const maxVal = Math.max(...numberValues);
    const idx = numberValues.indexOf(maxVal);
    if (idx !== -1) numberValues[idx] = 0;
  }

  // 3. 合計
  let total = numberValues.reduce((a, b) => a + b, 0);

  // 4. x2 の枚数だけ2倍
  const doubleCount = allCards.filter((c) => c === "x2").length;
  for (let i = 0; i < doubleCount; i++) total *= 2;

  return { total, usedDeck };
}

export interface MidnightGameState {
  phase: "bidding" | "challenge_result" | "gameover";
  /** 山札（ラウンドで配り終わった残り。? 解決で消費） */
  deck: MidnightCard[];
  /** hands[i] = プレイヤー i の手札 */
  hands: MidnightCard[][];
  /** 現在の宣言値（誰かがビッドした後の値） */
  currentBid: number;
  /** 現在の宣言をしたプレイヤー index */
  currentBidderIndex: number;
  /** 次に行動するプレイヤー index */
  currentPlayerIndex: number;
  /** 各プレイヤーのライフ（0で脱落） */
  lives: number[];
  round: number;
  /** チャレンジ結果表示用 */
  lastTotal?: number;
  lastLoserIndex?: number;
  /** チャレンジ後に全員オープンした手札（表示用） */
  revealedHands?: MidnightCard[][];
}

const INITIAL_LIVES = 3;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;

/** 1ラウンドで各プレイヤーに配る枚数。山札に ? 用の残りを確保 */
function cardsPerPlayer(playerCount: number): number {
  const reserve = 5; // ? 解決用
  return Math.floor((FULL_DECK.length - reserve) / playerCount);
}

export function createInitialMidnightState(playerCount: number): MidnightGameState {
  if (playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    throw new Error(`2〜10人で遊べます（現在: ${playerCount}人）`);
  }
  const per = cardsPerPlayer(playerCount);
  const totalDealt = per * playerCount;
  const deck = shuffle(FULL_DECK);
  const hands: MidnightCard[][] = [];
  for (let i = 0; i < playerCount; i++) {
    hands.push(deck.splice(0, per));
  }
  const remainingDeck = deck; // 残りは ? 用

  return {
    phase: "bidding",
    deck: remainingDeck,
    hands,
    currentBid: -1,
    currentBidderIndex: -1,
    currentPlayerIndex: 0,
    lives: Array(playerCount).fill(INITIAL_LIVES),
    round: 1,
  };
}

/** 脱落者を除いた「現在のプレイヤー順」での index → 元の playerIndex */
function activePlayerIndices(lives: number[]): number[] {
  return lives
    .map((l, i) => (l > 0 ? i : -1))
    .filter((i) => i >= 0);
}

/** 次に行動するプレイヤーを進める（脱落者スキップ） */
function nextPlayerIndex(state: MidnightGameState): number {
  const active = activePlayerIndices(state.lives);
  const current = state.currentPlayerIndex;
  const idx = active.indexOf(current);
  if (idx === -1) return active[0] ?? 0;
  const next = active[(idx + 1) % active.length];
  return next;
}

/** ビッド: 前の宣言より大きい数字を宣言 */
export function bid(
  state: MidnightGameState,
  playerIndex: number,
  value: number
): MidnightGameState | null {
  if (state.phase !== "bidding") return null;
  if (state.currentPlayerIndex !== playerIndex) return null;
  if (state.lives[playerIndex] <= 0) return null;
  const minBid = state.currentBid < 0 ? 0 : state.currentBid + 1;
  if (value < minBid || !Number.isInteger(value)) return null;

  const next = nextPlayerIndex({ ...state, currentBid: value, currentBidderIndex: playerIndex });
  return {
    ...state,
    currentBid: value,
    currentBidderIndex: playerIndex,
    currentPlayerIndex: next,
  };
}

/** Midnight! チャレンジ。宣言者 vs 前の宣言者のどちらが負けかを判定 */
export function callMidnight(state: MidnightGameState, playerIndex: number): MidnightGameState | null {
  if (state.phase !== "bidding") return null;
  if (state.currentPlayerIndex !== playerIndex) return null;
  if (state.lives[playerIndex] <= 0) return null;
  if (state.currentBid < 0) return null; // 誰もビッドしていない状態では不可

  const { total, usedDeck } = calculateTotal(state.hands, state.deck);
  const bidder = state.currentBidderIndex;
  const challenger = playerIndex;
  // 合計 < 宣言値 → チャレンジした人（Midnight!と言った人）の負け（見込み違い）
  // 合計 >= 宣言値 → 宣言した人（bidder）の負け（オーバーした）
  const bidderLoses = total >= state.currentBid;
  const loserIndex = bidderLoses ? bidder : challenger;

  const newLives = [...state.lives];
  newLives[loserIndex] = Math.max(0, newLives[loserIndex] - 1);

  const active = activePlayerIndices(newLives);
  const gameover = active.length <= 1;

  return {
    ...state,
    phase: gameover ? "gameover" : "challenge_result",
    deck: usedDeck,
    lastTotal: total,
    lastLoserIndex: loserIndex,
    revealedHands: state.hands.map((h) => [...h]),
    lives: newLives,
  };
}

/** チャレンジ結果表示後、次のラウンドを開始（負けた人からスタート、脱落済みなら生存者先頭） */
export function startNextRound(state: MidnightGameState): MidnightGameState | null {
  if (state.phase !== "challenge_result") return null;
  const loserIndex = state.lastLoserIndex ?? 0;
  const active = activePlayerIndices(state.lives);
  const starter =
    state.lives[loserIndex] > 0 ? loserIndex : active[0] ?? 0;
  const playerCount = state.hands.length;
  const per = cardsPerPlayer(playerCount);
  const deck = shuffle(FULL_DECK);
  const hands: MidnightCard[][] = [];
  for (let i = 0; i < playerCount; i++) {
    hands.push(deck.splice(0, per));
  }

  return {
    ...state,
    phase: "bidding",
    deck,
    hands,
    currentBid: -1,
    currentBidderIndex: -1,
    currentPlayerIndex: starter,
    round: state.round + 1,
    lastTotal: undefined,
    lastLoserIndex: undefined,
    revealedHands: undefined,
  };
}

/**
 * 再戦：ゲーム終了後、同じメンバーで最初から遊び直す。ライフ・デッキ・ラウンドをリセット。
 */
export function restartGame(state: MidnightGameState): MidnightGameState | null {
  if (state.phase !== "gameover") return null;
  return createInitialMidnightState(state.hands.length);
}
