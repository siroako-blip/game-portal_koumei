/**
 * ポーカー（テキサスホールデム）対戦ロジック。
 * 2〜6人・フルベット（フォールド/チェック/コール/レイズ/オールイン）・サイドポット対応。
 *
 * 設計方針（CLAUDE.md準拠）:
 * - 純粋関数。不正な操作は例外を投げず null を返す。状態はイミュータブル更新。
 * - players は座席順の配列で index が player_ids[i] に対応（coyote と同じ流儀。id は持たない）。
 * - ホールカードは「サーバ側で隠す」のではなく、クライアント表示で隠す（カジュアル前提）。
 */

export type Suit = "s" | "h" | "d" | "c"; // spade / heart / diamond / club
export interface Card {
  suit: Suit;
  rank: number; // 2..14（11=J,12=Q,13=K,14=A）
}

export const RANK_LABELS: Record<number, string> = {
  2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", 10: "10",
  11: "J", 12: "Q", 13: "K", 14: "A",
};
export const SUIT_SYMBOLS: Record<Suit, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };
/** 赤いスート（表示色用） */
export const RED_SUITS: Suit[] = ["h", "d"];

export type PokerPhase = "preflop" | "flop" | "turn" | "river" | "showdown" | "gameover";

export interface PokerPlayer {
  stack: number; // チップ残高
  hole: Card[]; // ホールカード2枚（busted/未配布なら空）
  bet: number; // 現ストリートで出しているチップ
  committed: number; // このハンドで出した累計（サイドポット計算用）
  folded: boolean; // このハンドで降りた
  allIn: boolean; // オールイン済み
  acted: boolean; // 現ストリートで行動済みか
  busted: boolean; // チップ0で離脱（以降のハンド不参加）
}

export interface ShowdownPot {
  amount: number;
  winners: number[]; // 座席index（複数=スプリット）
  handName: string;
}

export interface PokerResult {
  pots: ShowdownPot[];
  /** 公開したプレイヤー（降りていない者）のホールと役 */
  revealed: { index: number; hole: Card[]; handName: string }[];
  note?: string;
}

export interface PokerGameState {
  phase: PokerPhase;
  players: PokerPlayer[];
  deck: Card[];
  community: Card[]; // 0..5枚
  buttonIndex: number; // ディーラーボタンの座席
  currentTurn: number; // 行動するプレイヤーの座席（-1: なし）
  currentBet: number; // 現ストリートの最高ベット額
  lastRaise: number; // 直近のレイズ幅（最小レイズ計算用）
  smallBlind: number;
  bigBlind: number;
  handNumber: number;
  result?: PokerResult | null; // ショーダウン/ハンド終了の表示用
  rematchVotes?: string[];
}

export const INITIAL_STACK = 1000;
export const SMALL_BLIND = 10;
export const BIG_BLIND = 20;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function makeDeck(): Card[] {
  const suits: Suit[] = ["s", "h", "d", "c"];
  const deck: Card[] = [];
  for (const suit of suits) {
    for (let rank = 2; rank <= 14; rank++) deck.push({ suit, rank });
  }
  return deck;
}

// ---------- 役判定 ----------

/** 5枚のスコアを比較可能な数値配列で返す（[カテゴリ, タイブレーク...]） */
function scoreFive(cards: Card[]): number[] {
  const ranks = cards.map((c) => c.rank).sort((a, b) => b - a);
  const isFlush = cards.every((c) => c.suit === cards[0]!.suit);
  const uniq = Array.from(new Set(ranks)).sort((a, b) => b - a);

  // ストレート判定（A-2-3-4-5 のホイール対応）
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0]! - uniq[4]! === 4) straightHigh = uniq[0]!;
    else if (uniq[0] === 14 && uniq[1] === 5 && uniq[4] === 2) straightHigh = 5;
  }

  // ランクごとの枚数 → [rank, count] を count降順・rank降順で
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const groups = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const g = (i: number) => groups[i]![0];

  if (isFlush && straightHigh) return [8, straightHigh];
  if (groups[0]![1] === 4) return [7, g(0), g(1)];
  if (groups[0]![1] === 3 && groups[1]![1] >= 2) return [6, g(0), g(1)];
  if (isFlush) return [5, ...ranks];
  if (straightHigh) return [4, straightHigh];
  if (groups[0]![1] === 3) return [3, g(0), g(1), g(2)];
  if (groups[0]![1] === 2 && groups[1]![1] === 2) return [2, g(0), g(1), g(2)];
  if (groups[0]![1] === 2) return [1, g(0), g(1), g(2), g(3)];
  return [0, ...ranks];
}

function cmpScore(a: number[], b: number[]): number {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

const CATEGORY_NAMES = [
  "ハイカード", "ワンペア", "ツーペア", "スリーカード", "ストレート",
  "フラッシュ", "フルハウス", "フォーカード", "ストレートフラッシュ",
];

function handName(score: number[]): string {
  const cat = score[0]!;
  if (cat === 8 && score[1] === 14) return "ロイヤルフラッシュ";
  return CATEGORY_NAMES[cat]!;
}

/** 7枚から最良の5枚を選び、スコアと役名を返す */
export function evaluateSeven(cards: Card[]): { score: number[]; name: string } {
  let best: number[] | null = null;
  // 7枚から2枚除外する21通り
  for (let a = 0; a < cards.length; a++) {
    for (let b = a + 1; b < cards.length; b++) {
      const five = cards.filter((_, i) => i !== a && i !== b);
      const s = scoreFive(five);
      if (!best || cmpScore(s, best) > 0) best = s;
    }
  }
  return { score: best!, name: handName(best!) };
}

// ---------- 座席ユーティリティ ----------

/** このハンドに参加中（降りておらず・離脱しておらず）の座席か */
function isInHand(p: PokerPlayer): boolean {
  return !p.folded && !p.busted;
}
/** まだ行動できる（ベットを動かせる）座席か */
function isActionable(p: PokerPlayer): boolean {
  return !p.folded && !p.busted && !p.allIn;
}

/** from の次の座席から条件を満たす最初の座席を返す（一周して見つからなければ -1） */
function nextSeat(players: PokerPlayer[], from: number, pred: (p: PokerPlayer) => boolean): number {
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n;
    if (pred(players[idx]!)) return idx;
  }
  return -1;
}

function countWhere(players: PokerPlayer[], pred: (p: PokerPlayer) => boolean): number {
  return players.reduce((acc, p) => acc + (pred(p) ? 1 : 0), 0);
}

/** ポット総額（全員の committed の合計） */
export function potSize(state: PokerGameState): number {
  return state.players.reduce((acc, p) => acc + p.committed, 0);
}

// ---------- ハンド開始 ----------

function freshPlayer(stack: number): PokerPlayer {
  return {
    stack,
    hole: [],
    bet: 0,
    committed: 0,
    folded: stack <= 0, // チップ0は離脱扱い
    allIn: false,
    acted: false,
    busted: stack <= 0,
  };
}

/** スタックを引き継いで新しいハンドを配る。button は非busted座席であること。 */
function startHand(
  stacks: number[],
  buttonIndex: number,
  handNumber: number,
  smallBlind: number,
  bigBlind: number
): PokerGameState {
  const players: PokerPlayer[] = stacks.map((s) => freshPlayer(s));
  const deck = shuffle(makeDeck());

  // ホールカードを2枚ずつ（参加者のみ）
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < players.length; i++) {
      const p = players[i]!;
      if (p.busted) continue;
      p.hole.push(deck.shift()!);
    }
  }

  const base: PokerGameState = {
    phase: "preflop",
    players,
    deck,
    community: [],
    buttonIndex,
    currentTurn: -1,
    currentBet: 0,
    lastRaise: bigBlind,
    smallBlind,
    bigBlind,
    handNumber,
    result: null,
  };

  // ブラインド座席を決める
  const activeCount = countWhere(players, (p) => !p.busted);
  let sbSeat: number;
  let bbSeat: number;
  if (activeCount === 2) {
    // ヘッズアップ: ボタン = SB
    sbSeat = buttonIndex;
    bbSeat = nextSeat(players, buttonIndex, (p) => !p.busted);
  } else {
    sbSeat = nextSeat(players, buttonIndex, (p) => !p.busted);
    bbSeat = nextSeat(players, sbSeat, (p) => !p.busted);
  }

  postBlind(players[sbSeat]!, smallBlind);
  postBlind(players[bbSeat]!, bigBlind);
  base.currentBet = players[bbSeat]!.bet;
  base.lastRaise = bigBlind;

  // プリフロップ最初の行動者 = BB の次の行動可能者（ヘッズアップでは結果的にボタン=SB）
  const first = nextSeat(players, bbSeat, isActionable);
  base.currentTurn = first;

  // 行動可能者が2人未満（ブラインドでオールイン等）なら、そのままランナウトしてショーダウンへ
  if (countWhere(players, isActionable) < 2) {
    return runoutToShowdown(base);
  }
  return base;
}

function postBlind(p: PokerPlayer, amount: number): void {
  const pay = Math.min(amount, p.stack);
  p.stack -= pay;
  p.bet += pay;
  p.committed += pay;
  if (p.stack === 0) p.allIn = true;
}

export function createInitialPokerState(playerCount: number): PokerGameState {
  if (playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    throw new Error(`${MIN_PLAYERS}〜${MAX_PLAYERS}人で遊べます（現在: ${playerCount}人）`);
  }
  const stacks = Array(playerCount).fill(INITIAL_STACK);
  return startHand(stacks, 0, 1, SMALL_BLIND, BIG_BLIND);
}

// ---------- アクション ----------

export type PokerAction =
  | { type: "fold" }
  | { type: "check" }
  | { type: "call" }
  | { type: "raise"; to: number } // 合計ベット額（レイズ後の自分の bet）
  | { type: "allin" };

/** 行動可能アクションの一覧（UI用） */
export function legalActions(state: PokerGameState, seat: number) {
  const p = state.players[seat];
  const isTurn = isBettingPhase(state.phase) && state.currentTurn === seat;
  if (!p || !isTurn || !isActionable(p)) {
    return {
      isTurn: false,
      canFold: false, canCheck: false, canCall: false, canRaise: false, canAllIn: false,
      callAmount: 0, minRaiseTo: 0, maxRaiseTo: 0, allInTo: 0,
    };
  }
  const toCall = Math.min(state.currentBet - p.bet, p.stack);
  const maxRaiseTo = p.bet + p.stack; // オールイン額
  const minRaiseTo = Math.min(state.currentBet + state.lastRaise, maxRaiseTo);
  return {
    isTurn: true,
    canFold: true,
    canCheck: p.bet === state.currentBet,
    canCall: toCall > 0,
    callAmount: toCall,
    // 通常レイズ可能（コール額を超えるチップがあり、最小レイズに届く）
    canRaise: p.stack > toCall && maxRaiseTo >= minRaiseTo && minRaiseTo > state.currentBet,
    minRaiseTo,
    maxRaiseTo,
    canAllIn: p.stack > 0,
    allInTo: maxRaiseTo,
  };
}

function isBettingPhase(phase: PokerPhase): boolean {
  return phase === "preflop" || phase === "flop" || phase === "turn" || phase === "river";
}

/** プレイヤーが額 amount まで自分の bet を上げる（チップ移動・committed更新） */
function moveTo(state: PokerGameState, seat: number, to: number): void {
  const p = state.players[seat]!;
  const delta = Math.min(to - p.bet, p.stack);
  p.stack -= delta;
  p.bet += delta;
  p.committed += delta;
  if (p.stack === 0) p.allIn = true;
}

export function applyAction(
  state: PokerGameState,
  seat: number,
  action: PokerAction
): PokerGameState | null {
  if (!isBettingPhase(state.phase)) return null;
  if (state.currentTurn !== seat) return null;
  const p0 = state.players[seat];
  if (!p0 || !isActionable(p0)) return null;

  const legal = legalActions(state, seat);
  // ディープコピー（players をいじるため）
  const next: PokerGameState = {
    ...state,
    players: state.players.map((p) => ({ ...p, hole: [...p.hole] })),
    community: [...state.community],
    deck: [...state.deck],
  };
  const p = next.players[seat]!;

  switch (action.type) {
    case "fold": {
      p.folded = true;
      p.acted = true;
      break;
    }
    case "check": {
      if (!legal.canCheck) return null;
      p.acted = true;
      break;
    }
    case "call": {
      if (!legal.canCall) return null;
      moveTo(next, seat, next.currentBet);
      p.acted = true;
      break;
    }
    case "raise": {
      // 合計ベット額 to へレイズ。最小レイズ以上・オールイン以下。
      if (!legal.canRaise) return null;
      if (action.to < legal.minRaiseTo || action.to > legal.maxRaiseTo) return null;
      moveTo(next, seat, action.to);
      next.lastRaise = p.bet - next.currentBet;
      next.currentBet = p.bet;
      reopenBetting(next, seat);
      p.acted = true;
      break;
    }
    case "allin": {
      if (p.stack <= 0) return null;
      moveTo(next, seat, p.bet + p.stack);
      if (p.bet > next.currentBet) {
        // 通常レイズに満たないオールインでも、ここでは currentBet を更新し再オープン（カジュアル簡略化）
        next.lastRaise = Math.max(next.lastRaise, p.bet - next.currentBet);
        next.currentBet = p.bet;
        reopenBetting(next, seat);
      }
      p.acted = true;
      break;
    }
    default:
      return null;
  }

  return afterAction(next);
}

/** レイズが入ったら、当該プレイヤー以外の行動可能者の acted をリセット（再度行動が必要に） */
function reopenBetting(state: PokerGameState, raiser: number): void {
  state.players.forEach((p, i) => {
    if (i !== raiser && isActionable(p)) p.acted = false;
  });
}

/** 現ストリートのベッティングが完了したか */
function bettingRoundComplete(state: PokerGameState): boolean {
  const actionable = state.players.filter(isActionable);
  if (actionable.length === 0) return true;
  return actionable.every((p) => p.acted && p.bet === state.currentBet);
}

function afterAction(state: PokerGameState): PokerGameState {
  // 降りていない参加者が1人だけ → 即ハンド終了（全員フォールド勝ち）
  const inHandSeats = state.players.map((p, i) => (isInHand(p) ? i : -1)).filter((i) => i >= 0);
  if (inHandSeats.length === 1) {
    return endHandUncontested(state, inHandSeats[0]!);
  }
  if (bettingRoundComplete(state)) {
    return advanceStreet(state);
  }
  const nxt = nextSeat(state.players, state.currentTurn, isActionable);
  if (nxt === -1) return advanceStreet(state);
  return { ...state, currentTurn: nxt };
}

/** 全員フォールドで1人勝ち（ポット全取り。ショーダウンなし） */
function endHandUncontested(state: PokerGameState, winner: number): PokerGameState {
  const pot = potSize(state);
  const players = state.players.map((p) => ({ ...p, hole: [...p.hole], bet: 0, committed: 0 }));
  players[winner]!.stack += pot;
  return {
    ...state,
    players,
    currentTurn: -1,
    phase: "showdown",
    result: {
      pots: [{ amount: pot, winners: [winner], handName: "—" }],
      revealed: [], // フォールド勝ちは手札非公開
      note: "全員がフォールドしました",
    },
  };
}

/** 次のストリートへ。ベットを集約し、コミュニティを配る。river の次はショーダウン。 */
function advanceStreet(state: PokerGameState): PokerGameState {
  const players = state.players.map((p) => ({ ...p, bet: 0, acted: false, hole: [...p.hole] }));
  const deck = [...state.deck];
  const community = [...state.community];
  let phase: PokerPhase = state.phase;

  if (state.phase === "preflop") {
    community.push(deck.shift()!, deck.shift()!, deck.shift()!);
    phase = "flop";
  } else if (state.phase === "flop") {
    community.push(deck.shift()!);
    phase = "turn";
  } else if (state.phase === "turn") {
    community.push(deck.shift()!);
    phase = "river";
  } else if (state.phase === "river") {
    return doShowdown({ ...state, players, deck, community });
  }

  const mid: PokerGameState = {
    ...state,
    players,
    deck,
    community,
    phase,
    currentBet: 0,
    lastRaise: state.bigBlind,
    currentTurn: -1,
  };

  // 行動可能者が2人未満なら、このストリートはベットなしで次へ（ランナウト）
  if (countWhere(players, isActionable) < 2) {
    return advanceStreet(mid);
  }
  // ポストフロップ最初の行動者 = ボタンの次の行動可能者
  mid.currentTurn = nextSeat(players, state.buttonIndex, isActionable);
  return mid;
}

/** 残りのコミュニティを一気に配ってショーダウンへ（全員オールイン等） */
function runoutToShowdown(state: PokerGameState): PokerGameState {
  let s = state;
  // river まで進めて showdown を返すまでループ
  while (isBettingPhase(s.phase)) {
    s = advanceStreet({
      ...s,
      players: s.players.map((p) => ({ ...p, acted: true, bet: p.bet })),
      // bet はそのままにし、advanceStreet 側で 0 化される
    });
  }
  return s;
}

// ---------- ショーダウン（サイドポット分配） ----------

function doShowdown(state: PokerGameState): PokerGameState {
  const players = state.players.map((p) => ({ ...p, hole: [...p.hole] }));
  const inHand = players.map((p, i) => (isInHand(p) ? i : -1)).filter((i) => i >= 0);

  // 役スコアを事前計算
  const scores = new Map<number, { score: number[]; name: string }>();
  for (const i of inHand) {
    scores.set(i, evaluateSeven([...players[i]!.hole, ...state.community]));
  }

  // committed の段階ごとにサイドポットを構築（フォールド分も dead money として最下層に入る）
  const contrib = players.map((p) => p.committed);
  const levels = Array.from(new Set(contrib.filter((c) => c > 0))).sort((a, b) => a - b);

  const builtPots: { amount: number; eligible: number[] }[] = [];
  let prev = 0;
  let carry = 0; // eligible不在の層の積み残し
  for (const L of levels) {
    let amount = 0;
    for (let i = 0; i < players.length; i++) {
      amount += Math.max(0, Math.min(contrib[i]!, L) - prev);
    }
    prev = L;
    const eligible = inHand.filter((i) => contrib[i]! >= L);
    if (eligible.length === 0 || amount <= 0) {
      carry += amount;
      continue;
    }
    builtPots.push({ amount: amount + carry, eligible });
    carry = 0;
  }
  if (carry > 0 && builtPots.length > 0) builtPots[builtPots.length - 1]!.amount += carry;

  // 各ポットの勝者を決定して分配
  const resultPots: ShowdownPot[] = [];
  for (const pot of builtPots) {
    let bestScore: number[] | null = null;
    let winners: number[] = [];
    for (const i of pot.eligible) {
      const s = scores.get(i)!.score;
      if (!bestScore || cmpScore(s, bestScore) > 0) {
        bestScore = s;
        winners = [i];
      } else if (cmpScore(s, bestScore) === 0) {
        winners.push(i);
      }
    }
    const share = Math.floor(pot.amount / winners.length);
    const remainder = pot.amount - share * winners.length;
    winners.forEach((w, idx) => {
      players[w]!.stack += share + (idx < remainder ? 1 : 0); // 端数は先頭の勝者へ
    });
    resultPots.push({ amount: pot.amount, winners, handName: scores.get(winners[0]!)!.name });
  }

  const revealed = inHand.map((i) => ({
    index: i,
    hole: players[i]!.hole,
    handName: scores.get(i)!.name,
  }));

  // ポット分配後はベット/コミットをクリア（残高とポット表示の整合）
  players.forEach((p) => {
    p.bet = 0;
    p.committed = 0;
  });

  return {
    ...state,
    players,
    phase: "showdown",
    currentTurn: -1,
    result: { pots: resultPots, revealed },
  };
}

// ---------- 次のハンド / 終了 / 再戦 ----------

/** ショーダウン表示後、次のハンドを配る。チップを持つ人が1人になったら gameover。 */
export function nextHand(state: PokerGameState): PokerGameState | null {
  if (state.phase !== "showdown") return null;
  const stacks = state.players.map((p) => p.stack);
  const alive = stacks.map((s, i) => (s > 0 ? i : -1)).filter((i) => i >= 0);
  if (alive.length < 2) {
    return { ...state, phase: "gameover", currentTurn: -1 };
  }
  // 次のボタン = 現ボタンの次でチップを持つ座席
  const newButton = nextSeat(
    state.players.map((p) => freshPlayer(p.stack)),
    state.buttonIndex,
    (p) => !p.busted
  );
  return startHand(stacks, newButton, state.handNumber + 1, state.smallBlind, state.bigBlind);
}

/** 再戦：同じメンバーでスタックをリセットして最初から。 */
export function restartGame(state: PokerGameState): PokerGameState | null {
  if (state.phase !== "gameover") return null;
  return createInitialPokerState(state.players.length);
}

/** 勝者（チップを持つ座席）一覧。gameover表示用。 */
export function chipLeaders(state: PokerGameState): number[] {
  return state.players.map((p, i) => (p.stack > 0 ? i : -1)).filter((i) => i >= 0);
}
