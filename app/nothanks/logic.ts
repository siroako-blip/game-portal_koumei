/**
 * Cursed Gifts (No Thanks!) ゲームロジック
 * カード 3〜35（33枚）、うち9枚をランダムに除外して24枚でプレイ。
 * 各プレイヤーにチップ11枚。手番で「チップを払ってパス」か「カードを引き取る」の2択。
 */

/** ゲーム状態（DBの game_state に保存） */
export interface NoThanksGameState {
  phase: "playing" | "finished";
  /** 山札（先頭がトップ） */
  deck: number[];
  /** 場に出ている現在のカード（null はゲーム開始前 or 終了後） */
  currentCard: number | null;
  /** 現在のカードの上に乗っているチップ数 */
  potChips: number;
  /** 現在手番のプレイヤーインデックス（0-based） */
  currentPlayerIndex: number;
  /** 各プレイヤーの残りチップ数（player_ids の順） */
  playerChips: number[];
  /** 各プレイヤーが引き取ったカード（player_ids の順） */
  playerCards: number[][];
}

const CARD_MIN = 3;
const CARD_MAX = 35;
const TOTAL_CARDS = CARD_MAX - CARD_MIN + 1; // 33
const REMOVE_COUNT = 9;
const DECK_SIZE = TOTAL_CARDS - REMOVE_COUNT; // 24
const CHIPS_PER_PLAYER = 11;

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** フルデック（3〜35）から9枚をランダムに除外し、24枚の山札を作る */
function createDeck(): number[] {
  const full = Array.from({ length: TOTAL_CARDS }, (_, i) => CARD_MIN + i);
  const shuffled = shuffle(full);
  return shuffled.slice(0, DECK_SIZE);
}

/** プレイヤー人数で初期状態を作成（3〜5人）。最初の1枚は場に出す */
export function createInitialNoThanksState(playerCount: number): NoThanksGameState {
  if (playerCount < 3 || playerCount > 5) throw new Error("3〜5人でプレイしてください");
  const deck = createDeck();
  const top = deck.pop()!; // 1枚場に出す
  return {
    phase: "playing",
    deck,
    currentCard: top,
    potChips: 0,
    currentPlayerIndex: 0,
    playerChips: Array.from({ length: playerCount }, () => CHIPS_PER_PLAYER),
    playerCards: Array.from({ length: playerCount }, () => []),
  };
}

/** チップを払ってパスする */
export function payChip(
  state: NoThanksGameState,
  playerIndex: number,
  playerCount: number
): NoThanksGameState | null {
  if (state.phase !== "playing" || state.currentCard === null) return null;
  if (state.currentPlayerIndex !== playerIndex) return null;
  if (state.playerChips[playerIndex]! < 1) return null;

  const next: NoThanksGameState = {
    ...state,
    playerChips: [...state.playerChips],
  };
  next.playerChips[playerIndex] = next.playerChips[playerIndex]! - 1;
  next.potChips = state.potChips + 1;
  next.currentPlayerIndex = (state.currentPlayerIndex + 1) % playerCount;
  return next;
}

/** カードを引き取る（カード＋ポットのチップを取得し、山札から次の1枚を場に出す。手番はそのまま） */
export function takeCard(
  state: NoThanksGameState,
  playerIndex: number,
  playerCount: number
): NoThanksGameState | null {
  if (state.phase !== "playing" || state.currentCard === null) return null;
  if (state.currentPlayerIndex !== playerIndex) return null;

  const next: NoThanksGameState = {
    ...state,
    playerChips: [...state.playerChips],
    playerCards: state.playerCards.map((cards, i) =>
      i === playerIndex ? [...cards, state.currentCard!] : cards
    ),
  };
  next.playerChips[playerIndex] = (next.playerChips[playerIndex] ?? 0) + state.potChips;
  next.potChips = 0;

  if (state.deck.length === 0) {
    next.currentCard = null;
    next.phase = "finished";
    return next;
  }

  const newDeck = [...state.deck];
  const drawn = newDeck.pop()!;
  next.deck = newDeck;
  next.currentCard = drawn;
  next.currentPlayerIndex = state.currentPlayerIndex; // 手番はそのまま
  return next;
}

/** 連番は最小値のみカウントして合計点を計算（カードのマイナス点＝ペナルティ） */
export function scoreForCards(cards: number[]): number {
  if (cards.length === 0) return 0;
  const sorted = [...cards].sort((a, b) => a - b);
  let sum = 0;
  let runMin = sorted[0]!;
  for (let i = 1; i <= sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i];
    if (curr === undefined || curr !== prev + 1) {
      sum += runMin;
      if (curr !== undefined) runMin = curr;
    }
  }
  return sum;
}

/** 各プレイヤーの得点（カードはマイナス、チップはプラス）。合計 = チップ - カードスコア */
export function calculateScores(state: NoThanksGameState): number[] {
  return state.playerCards.map((cards, i) => {
    const chipCount = state.playerChips[i] ?? 0;
    const cardPenalty = scoreForCards(cards);
    return chipCount - cardPenalty;
  });
}

/** 勝者インデックス（同点なら先にそのスコアに到達した方＝インデックスが小さい方） */
export function getWinnerIndex(state: NoThanksGameState): number | null {
  if (state.phase !== "finished") return null;
  const scores = calculateScores(state);
  let best = scores[0]!;
  let bestIndex = 0;
  for (let i = 1; i < scores.length; i++) {
    if (scores[i]! > best) {
      best = scores[i]!;
      bestIndex = i;
    }
  }
  return bestIndex;
}

/**
 * 再戦：同じメンバーで最初から遊び直す。
 * phase を playing、deck を再生成、potChips を 0、全プレイヤーのチップ 11 枚・カード空・手番は先頭に。
 */
export function restartGame(state: NoThanksGameState): NoThanksGameState | null {
  if (state.phase !== "finished") return null;
  const playerCount = state.playerChips.length;
  const deck = createDeck();
  const top = deck.pop()!;
  return {
    phase: "playing",
    deck,
    currentCard: top,
    potChips: 0,
    currentPlayerIndex: 0,
    playerChips: Array.from({ length: playerCount }, () => CHIPS_PER_PLAYER),
    playerCards: Array.from({ length: playerCount }, () => []),
  };
}
