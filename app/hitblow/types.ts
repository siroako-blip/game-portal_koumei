/** 1回の予想とその判定結果（誰が予想したかは履歴の並びで判別） */
export interface GuessEntry {
  guess: string;
  hit: number;
  blow: number;
}

/** プレイヤー識別付き履歴エントリ（表示用: 自分の手番 / 相手の手番） */
export interface HistoryEntry {
  player: "player1" | "player2";
  guess: string;
  hit: number;
  blow: number;
}

/** Hit and Blow のゲーム状態（DBの game_state に保存） */
export interface HitBlowGameState {
  phase: "setup" | "play";
  /** Player 1 の秘密の数字（4桁・重複なし） */
  p1Secret: string;
  /** Player 2 の秘密の数字 */
  p2Secret: string;
  /** Player 1 が秘密を設定済みか */
  p1IsSet: boolean;
  /** Player 2 が秘密を設定済みか */
  p2IsSet: boolean;
  /** プレイフェーズでの現在のターン（どちらが予想するか） */
  currentTurn: "player1" | "player2";
  /** P1 の予想履歴（相手＝P2の数字に対する予想） */
  p1History: GuessEntry[];
  /** P2 の予想履歴（相手＝P1の数字に対する予想） */
  p2History: GuessEntry[];
  /** 先に4Hを出した方の勝者（サドンデス） */
  winner: "player1" | "player2" | null;
}
