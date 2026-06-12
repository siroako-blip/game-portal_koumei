export type CardColor = "red" | "green" | "blue" | "white" | "yellow";

export type CardValue = number | "wager"; // 2-10 or wager (契約カード)

export interface Card {
  id: string;
  color: CardColor;
  value: CardValue;
}

export type PlayerId = "player1" | "player2";

// 各属性の「道」: 先に wager のみ、その後は数字の昇順
export type ExpeditionColumn = Card[];

export interface GameState {
  deck: Card[];
  player1Hand: Card[];
  player2Hand: Card[];
  player1Expeditions: Record<CardColor, ExpeditionColumn>;
  player2Expeditions: Record<CardColor, ExpeditionColumn>;
  discardPiles: Record<CardColor, Card[]>;
  currentPlayer: PlayerId;
  selectedCard: Card | null;
  phase: "play" | "draw";
  lastDiscardedColor: CardColor | null;
  /** 行動履歴（最新5件のみ保持。古いゲームデータでは未定義のため state.logs ?? [] で参照すること） */
  logs?: string[];
}

export const COLORS: CardColor[] = ["red", "green", "blue", "white", "yellow"];

/** 5属性の表示ラベル（Fire=火, Water=水, Wind=風, Earth=土, Light=光） */
export const COLOR_LABELS: Record<CardColor, string> = {
  red: "火",
  blue: "水",
  green: "風",
  yellow: "土",
  white: "光",
};

/** 1色分の得点内訳（結果画面用） */
export interface ColorScoreDetail {
  base: number;
  wagerCount: number;
  multiplier: number;
  bonus: number;
  total: number;
}

/** 1プレイヤー分の得点（色ごと＋合計） */
export interface PlayerScore {
  perColor: Record<CardColor, ColorScoreDetail>;
  total: number;
}
