// app/lostcities/logic.ts

import type { Card, CardColor, GameState } from "./types";
import type { ColorScoreDetail, PlayerScore } from "./types";
import { COLORS, COLOR_LABELS } from "./types";

const MAX_LOGS = 5;

function appendLog(state: GameState, message: string): string[] {
  const prev = state.logs ?? [];
  return [...prev, message].slice(-MAX_LOGS);
}

let cardIdCounter = 0;
function nextId(): string {
  return `card-${++cardIdCounter}-${Date.now()}`;
}

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const color of COLORS) {
    for (let n = 2; n <= 10; n++) {
      deck.push({ id: nextId(), color, value: n });
    }
    for (let i = 0; i < 3; i++) {
      deck.push({ id: nextId(), color, value: "wager" });
    }
  }
  return shuffle(deck);
}

function shuffle<T>(array: T[]): T[] {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function emptyExpeditions(): Record<CardColor, Card[]> {
  return COLORS.reduce((acc, c) => ({ ...acc, [c]: [] }), {} as Record<CardColor, Card[]>);
}

function emptyDiscards(): Record<CardColor, Card[]> {
  return COLORS.reduce((acc, c) => ({ ...acc, [c]: [] }), {} as Record<CardColor, Card[]>);
}

export function createInitialState(): GameState {
  const deck = createDeck();
  const player1Hand: Card[] = [];
  const player2Hand: Card[] = [];
  for (let i = 0; i < 8; i++) {
    player1Hand.push(deck.pop()!);
    player2Hand.push(deck.pop()!);
  }
  return {
    deck,
    player1Hand,
    player2Hand,
    player1Expeditions: emptyExpeditions(),
    player2Expeditions: emptyExpeditions(),
    discardPiles: emptyDiscards(),
    currentPlayer: "player1",
    selectedCard: null,
    phase: "play",
    lastDiscardedColor: null,
    logs: [],
  };
}

/**
 * 再戦（合意制）。ゲーム終了時（山札が尽きた deck.length === 0）のみ新しい初期状態を返す。
 * 終了していなければ null を返し、呼び出し側は何もしない。
 * 新しい初期状態は rematchVotes を持たないため、投票は自動的にクリアされる。
 */
export function restartGame(state: GameState): GameState | null {
  if (state.deck.length !== 0) return null;
  return createInitialState();
}

function canPlayOnExpedition(column: Card[], card: Card): boolean {
  if (card.value === "wager") {
    return column.length === 0 || column.every((c) => c.value === "wager");
  }
  // 握手カード以外（数字）を取り出す
  const numbers = column.filter((c) => c.value !== "wager") as { value: number }[];
  const lastNum = numbers.length ? numbers[numbers.length - 1].value : 0;
  
  // ★修正: ここで型エラーを防ぐため as number を明示
  return (card.value as number) > lastNum;
}

export function canPlayCard(
  state: GameState,
  card: Card,
  target: "expedition" | "discard",
  color?: CardColor
): boolean {
  // 自分のターンでなければ操作不可
  // 注: page.tsx側でロール判定も行っているので、ここでは基本的なルールのみ
  if (state.phase !== "play") return false;
  
  // 手札にあるか確認（P1/P2どちらの手札かは呼び出し元で制御済みだが念のため）
  const inP1 = state.player1Hand.some(c => c.id === card.id);
  const inP2 = state.player2Hand.some(c => c.id === card.id);
  if (!inP1 && !inP2) return false;

  if (target === "discard") {
    return true;
  }
  if (target === "expedition" && color && color === card.color) {
    // プレイヤーごとの列判定が必要
    // 簡易的に currentPlayer を見て判定
    const column = state.currentPlayer === "player1" 
      ? state.player1Expeditions[color] 
      : state.player2Expeditions[color];
    return canPlayOnExpedition(column, card);
  }
  return false;
}

export function playCard(
  state: GameState,
  card: Card,
  target: "expedition" | "discard",
  color?: CardColor
): GameState {
  if (state.phase !== "play") return state;
  if (!state.player1Hand.some((c) => c.id === card.id)) return state;
  if (
    target === "expedition" &&
    !canPlayOnExpedition(state.player1Expeditions[card.color], card)
  ) {
    return state;
  }

  const next = { ...state };
  next.player1Hand = state.player1Hand.filter((c) => c.id !== card.id);
  next.selectedCard = null;

  if (target === "discard") {
    // 捨て札は必ずカード自身の色の山に置く
    next.discardPiles = { ...state.discardPiles, [card.color]: [...state.discardPiles[card.color], card] };
    next.lastDiscardedColor = card.color;
    next.logs = appendLog(state, `P1:「${COLOR_LABELS[card.color]}」の${card.value === "wager" ? "契約" : card.value}を捨てました`);
  } else {
    next.player1Expeditions = {
      ...state.player1Expeditions,
      [card.color]: [...state.player1Expeditions[card.color], card],
    };
    next.lastDiscardedColor = null;
    next.logs = appendLog(state, `P1:「${COLOR_LABELS[card.color]}」の${card.value === "wager" ? "契約" : card.value}を道に置きました`);
  }

  next.phase = "draw";
  return next;
}

export function playCardP2(
  state: GameState,
  card: Card,
  target: "expedition" | "discard",
  color?: CardColor
): GameState {
  if (state.phase !== "play") return state;
  if (!state.player2Hand.some((c) => c.id === card.id)) return state;
  if (
    target === "expedition" &&
    !canPlayOnExpedition(state.player2Expeditions[card.color], card)
  ) {
    return state;
  }

  const next = { ...state };
  next.player2Hand = state.player2Hand.filter((c) => c.id !== card.id);
  next.selectedCard = null;

  if (target === "discard") {
    // 捨て札は必ずカード自身の色の山に置く
    next.discardPiles = { ...state.discardPiles, [card.color]: [...state.discardPiles[card.color], card] };
    next.lastDiscardedColor = card.color;
    next.logs = appendLog(state, `P2:「${COLOR_LABELS[card.color]}」の${card.value === "wager" ? "契約" : card.value}を捨てました`);
  } else {
    next.player2Expeditions = {
      ...state.player2Expeditions,
      [card.color]: [...state.player2Expeditions[card.color], card],
    };
    next.lastDiscardedColor = null;
    next.logs = appendLog(state, `P2:「${COLOR_LABELS[card.color]}」の${card.value === "wager" ? "契約" : card.value}を道に置きました`);
  }

  next.phase = "draw";
  return next;
}

export function drawCard(
  state: GameState,
  source: "deck" | CardColor
): GameState {
  if (state.phase !== "draw") return state;

  const next = { ...state };
  let drawn: Card | null = null;

  if (source === "deck") {
    if (state.deck.length > 0) {
      drawn = state.deck[state.deck.length - 1];
      next.deck = state.deck.slice(0, -1);
    }
  } else {
    const pile = state.discardPiles[source];
    if (pile.length > 0 && source !== state.lastDiscardedColor) {
      drawn = pile[pile.length - 1];
      next.discardPiles = {
        ...state.discardPiles,
        [source]: pile.slice(0, -1),
      };
    }
  }

  // 無効なドロー（空の山・直前に捨てた色の山）では状態を一切変えない
  if (!drawn) return state;

  const prefix = state.currentPlayer === "player1" ? "P1:" : "P2:";
  if (source === "deck") {
    next.logs = appendLog(state, `${prefix}山札から引きました`);
  } else {
    next.logs = appendLog(state, `${prefix}「${COLOR_LABELS[source]}」の捨て札から引きました`);
  }
  if (state.currentPlayer === "player1") {
    next.player1Hand = [...state.player1Hand, drawn];
  } else {
    next.player2Hand = [...state.player2Hand, drawn];
  }

  next.phase = "play";
  next.currentPlayer = state.currentPlayer === "player1" ? "player2" : "player1";
  next.lastDiscardedColor = null;
  return next;
}

export function getDrawOptions(state: GameState): ("deck" | CardColor)[] {
  const options: ("deck" | CardColor)[] = [];
  if (state.deck.length > 0) options.push("deck");
  const forbidden = state.lastDiscardedColor;
  for (const color of COLORS) {
    if (state.discardPiles[color].length > 0 && color !== forbidden) options.push(color);
  }
  return options;
}

function calculateColorScore(column: Card[]): ColorScoreDetail {
  if (column.length === 0) {
    return { base: 0, wagerCount: 0, multiplier: 1, bonus: 0, total: 0 };
  }
  const numberSum = column
    .filter((c) => c.value !== "wager")
    .reduce((sum, c) => sum + (c.value as number), 0);
  const wagerCount = column.filter((c) => c.value === "wager").length;
  const base = numberSum - 20;
  const multiplier = wagerCount + 1;
  const multiplied = base * multiplier;
  const bonus = column.length >= 8 ? 20 : 0;
  const total = multiplied + bonus;
  return { base, wagerCount, multiplier, bonus, total };
}

export function calculatePlayerScore(
  expeditions: Record<CardColor, Card[]>
): PlayerScore {
  const perColor = COLORS.reduce((acc, color) => {
    acc[color] = calculateColorScore(expeditions[color]);
    return acc;
  }, {} as Record<CardColor, ColorScoreDetail>);
  const total = COLORS.reduce((sum, color) => sum + perColor[color].total, 0);
  return { perColor, total };
}
