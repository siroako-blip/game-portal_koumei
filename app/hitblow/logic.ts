import type { GuessEntry, HitBlowGameState } from "./types";

const DIGITS = 4;

/** 予想が有効か（4桁・重複なし・数字のみ） */
export function isValidGuess(guess: string): boolean {
  if (guess.length !== DIGITS) return false;
  const seen = new Set<string>();
  for (const c of guess) {
    if (c < "0" || c > "9") return false;
    if (seen.has(c)) return false;
    seen.add(c);
  }
  return true;
}

/** Hit（場所も数字も一致）と Blow（数字は一致するが場所が違う）を計算 */
export function checkHitBlow(secret: string, guess: string): { hit: number; blow: number } {
  let hit = 0;
  const secretArr = secret.split("");
  const guessArr = guess.split("");
  for (let i = 0; i < secret.length; i++) {
    if (secretArr[i] === guessArr[i]) hit++;
  }
  let matchCount = 0;
  for (const c of "0123456789") {
    const inSecret = (secret.match(new RegExp(c, "g")) || []).length;
    const inGuess = (guess.match(new RegExp(c, "g")) || []).length;
    matchCount += Math.min(inSecret, inGuess);
  }
  const blow = matchCount - hit;
  return { hit, blow };
}

/** セットアップ用の初期状態（両者が秘密を入力するまで待つ） */
export function createInitialHitBlowState(): HitBlowGameState {
  return {
    phase: "setup",
    p1Secret: "",
    p2Secret: "",
    p1IsSet: false,
    p2IsSet: false,
    currentTurn: "player1",
    p1History: [],
    p2History: [],
    winner: null,
  };
}

/** 自分の秘密を設定する（セットアップフェーズ）。両者設定済みなら play に移行 */
export function setSecret(
  state: HitBlowGameState,
  player: "player1" | "player2",
  secret: string
): HitBlowGameState {
  if (state.phase !== "setup" || !isValidGuess(secret)) return state;
  const next = { ...state };
  if (player === "player1") {
    next.p1Secret = secret;
    next.p1IsSet = true;
  } else {
    next.p2Secret = secret;
    next.p2IsSet = true;
  }
  if (next.p1IsSet && next.p2IsSet) {
    next.phase = "play";
    next.currentTurn = "player1";
  }
  return next;
}

/** 予想をコールする（プレイフェーズ）。4Hで即勝利・サドンデス */
export function submitGuess(
  state: HitBlowGameState,
  guess: string
): HitBlowGameState {
  if (state.phase !== "play" || state.winner) return state;
  if (!isValidGuess(guess)) return state;

  const next = { ...state };
  if (state.currentTurn === "player1") {
    const targetSecret = state.p2Secret;
    const { hit, blow } = checkHitBlow(targetSecret, guess);
    const entry: GuessEntry = { guess, hit, blow };
    next.p1History = [...state.p1History, entry];
    if (hit === DIGITS) {
      next.winner = "player1";
    } else {
      next.currentTurn = "player2";
    }
  } else {
    const targetSecret = state.p1Secret;
    const { hit, blow } = checkHitBlow(targetSecret, guess);
    const entry: GuessEntry = { guess, hit, blow };
    next.p2History = [...state.p2History, entry];
    if (hit === DIGITS) {
      next.winner = "player2";
    } else {
      next.currentTurn = "player1";
    }
  }
  return next;
}

/** 履歴を「自分の手番 / 相手の手番」で時系列表示用にマージ */
export function getMergedHistory(state: HitBlowGameState): { player: "player1" | "player2"; guess: string; hit: number; blow: number }[] {
  const out: { player: "player1" | "player2"; guess: string; hit: number; blow: number }[] = [];
  let i1 = 0;
  let i2 = 0;
  let turn: "player1" | "player2" = "player1";
  while (i1 < state.p1History.length || i2 < state.p2History.length) {
    if (turn === "player1" && i1 < state.p1History.length) {
      const e = state.p1History[i1]!;
      out.push({ player: "player1", guess: e.guess, hit: e.hit, blow: e.blow });
      i1++;
      turn = "player2";
    } else if (turn === "player2" && i2 < state.p2History.length) {
      const e = state.p2History[i2]!;
      out.push({ player: "player2", guess: e.guess, hit: e.hit, blow: e.blow });
      i2++;
      turn = "player1";
    } else {
      break;
    }
  }
  return out;
}
