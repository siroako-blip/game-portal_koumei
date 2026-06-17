/**
 * Deep Sea Adventure（深海探検）ボードゲームロジック
 * 正式ルールに基づく実装：酸素共有・移動・飛び越え・ラウンド終了・盤面圧縮。
 */

// ========== データ構造 ==========

export type PathCellType = "ruin" | "blank" | "stack";

/** 1マスを表す。ruin=通常チップ(count=1), blank=跡地, stack=没収チップの塊(count=1〜3) */
export interface PathCell {
  type: PathCellType;
  level: number;
  score: number;
  count: number;
  /** stack のときのみ：中身のチップ（拾う時に holdingLoot に加える） */
  value?: Loot[];
}

/** お宝1つ（レベルと得点） */
export interface Loot {
  level: number;
  score: number;
}

/** プレイヤー状態 */
export interface DeepSeaPlayerState {
  position: number;
  holdingLoot: Loot[];
  score: number;
  direction: "down" | "up";
  isReturned: boolean;
}

export type DeepSeaPhase = "playing" | "round_result" | "gameover";

export interface DeepSeaGameState {
  phase: DeepSeaPhase;
  oxygen: number;
  round: number;
  path: PathCell[];
  players: DeepSeaPlayerState[];
  currentPlayerIndex: number;
  oxygenConsumedThisTurn?: boolean;
  movedThisTurn?: boolean;
  /** このターンに「拾う/置く」を実行済みか（1ターンに1回まで） */
  actionDoneThisTurn?: boolean;
  roundForfeited?: boolean;
  lastDice?: [number, number];
  /** 再戦の同意者 pid 配列（合意制。全員同意で restart） */
  rematchVotes?: string[];
}

export const OXYGEN_MAX = 25;
export const TOTAL_ROUNDS = 3;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;

// ========== ヘルパー ==========

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createBlankCell(): PathCell {
  return { type: "blank", level: 0, score: 0, count: 0 };
}

function createRuinCell(level: number, score: number): PathCell {
  return { type: "ruin", level, score, count: 1 };
}

/** 盤面から blank を除いた path のディープコピー */
function copyPathWithoutBlanks(path: PathCell[]): PathCell[] {
  return path
    .filter((c) => c.type !== "blank")
    .map((c) => {
      if (c.type === "stack" && c.value) {
        return { ...c, value: [...c.value] };
      }
      return { ...c };
    });
}

// ========== 初期化 ==========

/**
 * 初期パス（潜水艦は position -1 で表現するため path には含めない）。
 *
 * チップの得点は公式ルール準拠の固定値:
 *   Lv1: 0〜3 / Lv2: 4〜7 / Lv3: 8〜11 / Lv4: 12〜15（各値2枚 = レベルごと8枚、計32枚）。
 * 並びは「浅い→深い」（潜水艦に近いほど低レベル＝低得点、最深部が高レベル＝高得点）。
 * 同一レベル内の順序だけランダムにシャッフルする（伏せ札なので位置はランダム、レベルは深さ順を維持）。
 */
export function createInitialPath(): PathCell[] {
  const path: PathCell[] = [];
  for (let level = 1; level <= 4; level++) {
    const base = (level - 1) * 4; // Lv1=0, Lv2=4, Lv3=8, Lv4=12
    const cells: PathCell[] = [];
    for (let v = 0; v <= 3; v++) {
      const score = base + v;
      cells.push(createRuinCell(level, score));
      cells.push(createRuinCell(level, score)); // 同じ得点を2枚ずつ
    }
    path.push(...shuffle(cells));
  }
  return path;
}

export function createInitialDeepSeaState(playerCount: number): DeepSeaGameState {
  if (playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    throw new Error(`2〜6人で遊べます（現在: ${playerCount}人）`);
  }
  const players: DeepSeaPlayerState[] = [];
  for (let i = 0; i < playerCount; i++) {
    players.push({
      position: -1,
      holdingLoot: [],
      score: 0,
      direction: "down",
      isReturned: false,
    });
  }
  return {
    phase: "playing",
    oxygen: OXYGEN_MAX,
    round: 1,
    path: createInitialPath(),
    players,
    currentPlayerIndex: 0,
  };
}

// ========== ターン進行（handleTurn の各ステップ） ==========

/**
 * 1. 酸素消費
 * holdingLoot.length だけ oxygen を減らす。0未満にはせず 0 で止める。
 * 酸素が 0 になったら true を返し、呼び出し側で endRound へ。
 */
export function consumeOxygen(
  state: DeepSeaGameState
): { next: DeepSeaGameState; oxygenDepleted: boolean } | null {
  if (state.phase !== "playing") return null;
  if (state.oxygenConsumedThisTurn) return null;
  const player = state.players[state.currentPlayerIndex];
  const consumption = player.holdingLoot.length;
  const newOxygen = Math.max(0, state.oxygen - consumption);
  const next: DeepSeaGameState = {
    ...state,
    oxygen: newOxygen,
    oxygenConsumedThisTurn: true,
  };
  return { next, oxygenDepleted: newOxygen <= 0 };
}

/**
 * 方向転換: down → up にのみ変更可能。up → down は不可。
 */
export function switchDirectionToUp(
  state: DeepSeaGameState,
  playerIndex: number
): DeepSeaGameState | null {
  if (state.phase !== "playing") return null;
  if (state.currentPlayerIndex !== playerIndex) return null;
  if (!state.oxygenConsumedThisTurn) return null;
  if (state.movedThisTurn) return null; // 方向転換は移動前のみ
  const player = state.players[playerIndex];
  if (player.direction !== "down") return null;
  const players = [...state.players];
  players[playerIndex] = { ...player, direction: "up" };
  return { ...state, players };
}

export function rollDice(): [number, number] {
  const d1 = 1 + Math.floor(Math.random() * 3);
  const d2 = 1 + Math.floor(Math.random() * 3);
  return [d1, d2];
}

/**
 * 2. 移動
 * 移動力 = ダイス合計 - holdingLoot.length（最低0）。
 * 他のプレイヤーがいるマスは歩数に数えずスキップ（飛び越え）。
 * 潜水艦(-1)に着いたら isReturned = true。
 */
export function movePlayer(
  state: DeepSeaGameState,
  playerIndex: number,
  diceTotal: number,
  lastDice: [number, number]
): DeepSeaGameState | null {
  if (state.phase !== "playing") return null;
  if (state.currentPlayerIndex !== playerIndex) return null;
  if (!state.oxygenConsumedThisTurn || state.movedThisTurn) return null;
  const player = state.players[playerIndex];
  const movePower = Math.max(0, diceTotal - player.holdingLoot.length);
  const dir = player.direction === "down" ? 1 : -1;
  const pathLen = state.path.length;

  let pos = player.position;
  let stepsLeft = movePower;

  while (stepsLeft > 0) {
    const nextPos = pos + dir;
    if (nextPos < -1 || nextPos >= pathLen) break;
    const otherPlayerHere =
      nextPos >= 0 &&
      state.players.some((p, i) => i !== playerIndex && p.position === nextPos);
    pos = nextPos;
    if (!otherPlayerHere) stepsLeft--;
  }

  const players = [...state.players];
  players[playerIndex] = {
    ...player,
    position: pos,
    isReturned: pos === -1,
  };
  return {
    ...state,
    players,
    lastDice,
    movedThisTurn: true,
  };
}

/**
 * 3. アクション: 拾う（マスのチップを holdingLoot に加え、マスを blank に）
 */
export function pickUpLoot(
  state: DeepSeaGameState,
  playerIndex: number
): DeepSeaGameState | null {
  if (state.phase !== "playing") return null;
  if (state.currentPlayerIndex !== playerIndex) return null;
  if (!state.movedThisTurn || state.actionDoneThisTurn) return null; // 行動は移動後に1回まで
  const player = state.players[playerIndex];
  if (player.position < 0) return null;
  const cell = state.path[player.position];
  if (!cell) return null;
  let added: Loot[] = [];
  if (cell.type === "ruin") {
    added = [{ level: cell.level, score: cell.score }];
  } else if (cell.type === "stack" && cell.value && cell.value.length > 0) {
    added = [...cell.value];
  } else return null;

  const path = [...state.path];
  path[player.position] = createBlankCell();
  const players = [...state.players];
  players[playerIndex] = {
    ...player,
    holdingLoot: [...player.holdingLoot, ...added],
  };
  return { ...state, path, players, actionDoneThisTurn: true };
}

/**
 * 3. アクション: 置く（holdingLoot から1つ置き、マスを ruin に）
 */
export function putDownLoot(
  state: DeepSeaGameState,
  playerIndex: number
): DeepSeaGameState | null {
  if (state.phase !== "playing") return null;
  if (state.currentPlayerIndex !== playerIndex) return null;
  if (!state.movedThisTurn || state.actionDoneThisTurn) return null; // 行動は移動後に1回まで
  const player = state.players[playerIndex];
  if (player.position < 0 || player.holdingLoot.length === 0) return null;
  const cell = state.path[player.position];
  if (!cell || cell.type !== "blank") return null;
  const loot = player.holdingLoot[player.holdingLoot.length - 1];
  const path = [...state.path];
  path[player.position] = createRuinCell(loot.level, loot.score);
  const players = [...state.players];
  players[playerIndex] = {
    ...player,
    holdingLoot: player.holdingLoot.slice(0, -1),
  };
  return { ...state, path, players, actionDoneThisTurn: true };
}

/**
 * ターン終了（次のプレイヤーへ）。酸素・移動フラグをリセット。
 * 帰還済み（isReturned）のプレイヤーは手番を飛ばす（酸素を消費させない）。
 */
export function endTurn(state: DeepSeaGameState): DeepSeaGameState {
  const n = state.players.length;
  let nextIndex = state.currentPlayerIndex;
  for (let i = 1; i <= n; i++) {
    const idx = (state.currentPlayerIndex + i) % n;
    if (!state.players[idx].isReturned) {
      nextIndex = idx;
      break;
    }
  }
  return {
    ...state,
    currentPlayerIndex: nextIndex,
    oxygenConsumedThisTurn: false,
    movedThisTurn: false,
    actionDoneThisTurn: false,
  };
}

// ========== ラウンド終了処理 (endRound) ==========

/** 全員が戻ったか（isReturned） */
function allReturned(state: DeepSeaGameState): boolean {
  return state.players.every((p) => p.isReturned);
}

/**
 * ラウンド終了処理（厳密な4ステップ）
 * 1. 生存者判定（isReturned で score 加算 or 没収して droppedChips へ）
 * 2. 没収チップを3枚1組スタックにして path 最後尾に追加
 * 3. 盤面圧縮（blank を全て削除）
 * 4. 次ラウンド準備（round+1, oxygen=25, 全員リセット）。3ラウンド後は gameover
 */
export function endRound(
  state: DeepSeaGameState,
  oxygenDepleted: boolean
): DeepSeaGameState {
  const playerCount = state.players.length;
  const newScores: number[] = [];
  const droppedChips: Loot[] = [];

  // 1. 生存者判定
  // 帰還済み（isReturned）なら酸素切れでも獲得物を得点化できる。
  // 没収されるのは海中に残ったプレイヤーの分だけ。
  for (let i = 0; i < playerCount; i++) {
    const p = state.players[i];
    if (p.isReturned) {
      const add = p.holdingLoot.reduce((s, l) => s + l.score, 0);
      newScores[i] = p.score + add;
    } else {
      newScores[i] = p.score;
      droppedChips.push(...p.holdingLoot);
    }
  }

  // 2. 没収チップの再配置（3枚1組のスタックを path 最後尾に追加）
  let path = copyPathWithoutBlanks(state.path);
  if (droppedChips.length > 0) {
    for (let i = 0; i < droppedChips.length; i += 3) {
      const chunk = droppedChips.slice(i, i + 3);
      const level = chunk.reduce((max, l) => Math.max(max, l.level), 0);
      const score = chunk.reduce((s, l) => s + l.score, 0);
      path.push({
        type: "stack",
        level,
        score,
        count: chunk.length,
        value: [...chunk],
      });
    }
  }

  // 3. 盤面圧縮は copyPathWithoutBlanks で既に blank を除去済み

  // 4. 次ラウンド準備
  const isGameOver = state.round >= TOTAL_ROUNDS;
  const nextRound = Math.min(state.round + 1, TOTAL_ROUNDS);
  const next: DeepSeaGameState = {
    phase: isGameOver ? "gameover" : "round_result",
    oxygen: OXYGEN_MAX,
    round: nextRound,
    path,
    players: newScores.map((score) => ({
      position: -1,
      holdingLoot: [],
      score,
      direction: "down",
      isReturned: false,
    })),
    currentPlayerIndex: 0,
    roundForfeited: oxygenDepleted,
  };
  return next;
}

// ========== 公開API（UI から呼ぶ用） ==========

/** 酸素消費を実行。0なら即 endRound して返す。 */
export function applyOxygenAndMaybeFinishRound(
  state: DeepSeaGameState
): DeepSeaGameState | null {
  const result = consumeOxygen(state);
  if (!result) return null;
  const { next, oxygenDepleted } = result;
  if (oxygenDepleted) return endRound(next, true);
  return next;
}

/** 全員帰還でラウンド終了 */
export function checkAllReturnedAndFinishRound(
  state: DeepSeaGameState
): DeepSeaGameState | null {
  if (state.phase !== "playing") return null;
  if (!allReturned(state)) return null;
  return endRound(state, false);
}

/** ターン終了し、全員戻っていれば endRound */
export function endTurnAndMaybeFinishRound(state: DeepSeaGameState): DeepSeaGameState {
  const next = endTurn(state);
  if (allReturned(next)) return endRound(next, false);
  return next;
}

/**
 * 再戦：ゲーム終了後、同じメンバーで最初から遊び直す。
 * 人数を維持して初期状態を作り直す（盤面・酸素・得点・ラウンドをリセット）。
 */
export function restartDeepSeaGame(state: DeepSeaGameState): DeepSeaGameState | null {
  if (state.phase !== "gameover") return null;
  return createInitialDeepSeaState(state.players.length);
}
