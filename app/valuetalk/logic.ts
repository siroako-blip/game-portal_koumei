/**
 * ito（イト）協力ゲームロジック
 * 1〜100のカードを「お題」に沿ったたとえ話で出し、小さい順に出す協力プレイ。
 */

/** 尺度（スケール）重視のお題セット。1〜100の数値化に適したもの */
export const THEME_SETS = {
  // 客観的で誰でも順序が一致しやすい尺度。例（モノの名前）を挙げて数字を表現する
  EASY: [
    "動物の体の大きさ",
    "動物の足の速さ",
    "動物の体重の重さ",
    "生き物の寿命の長さ",
    "魚の大きさ",
    "鳥の体の大きさ",
    "昆虫の大きさ",
    "恐竜の大きさ",
    "果物・野菜の大きさ",
    "球技で使うボールの大きさ",
    "楽器の大きさ",
    "乗り物のスピード",
    "乗り物の大きさ",
    "乗り物に乗れる人数",
    "建物・タワーの高さ",
    "世界の山の高さ",
    "川の長さ",
    "橋の長さ",
    "食べ物の辛さ",
    "食べ物の甘さ",
    "食べ物の硬さ",
    "食べ物のカロリーの高さ",
    "飲み物の炭酸の強さ",
    "コーヒー・お茶の苦さ",
    "麺の太さ",
    "持ち歩くものの重さ",
    "家電の値段",
    "コンビニ商品の値段",
    "文房具の値段",
    "服の値段",
    "おもちゃ・ゲームの値段",
    "乗り物の値段",
    "国の人口の多さ",
    "国の面積の広さ",
    "都市の人口の多さ",
    "紙・本のサイズの大きさ",
    "家具の大きさ",
    "部屋・場所の広さ",
    "音の大きさ（音を出すもの）",
    "匂いの強さ（においの強いもの）",
    "深さ（海・湖・穴）",
    "ジャンプ力のある生き物",
    "飲み物の温度（冷たい→熱い）",
    "食べ物の賞味期限の長さ",
    "充電の持ち（電子機器）",
    "移動にかかる時間（近所→海外）",
    "スポーツ用品の重さ",
    "犬種の大きさ",
    "木の高さ（種類別）",
    "海の生き物の大きさ",
  ],
  // 尺度ははっきりしているが、人気・好み・主観が入って順序がややブレるもの
  NORMAL: [
    "動物の人気",
    "食べ物のみんなが好きな度",
    "お寿司のネタの高級感",
    "給食メニューの人気",
    "おにぎりの具の人気",
    "アイス・お菓子の満足度",
    "ファストフードの人気",
    "鍋の具材の人気",
    "ピザのトッピングの人気",
    "居酒屋の定番メニューの人気",
    "コンビニスイーツの満足度",
    "都道府県の知名度",
    "観光地の人気",
    "有名人の知名度",
    "アニメ・ゲームキャラの人気",
    "スポーツの盛り上がり度",
    "部活の人気",
    "習い事の人気",
    "職業の人気",
    "職業の年収の高さ",
    "趣味のお金のかかり具合",
    "家電の便利さ",
    "文房具の便利さ",
    "アプリを使う頻度",
    "SNSの利用者の多さ",
    "動画ジャンルの再生されやすさ",
    "季節の行事の盛り上がり",
    "祝日のうれしさ",
    "もらって嬉しいプレゼント度",
    "デートスポットの好感度",
    "旅行先の遠さ（国内）",
    "遊園地アトラクションの絶叫度",
    "ホラージャンルの怖さ",
    "辛い食べ物への挑戦度",
    "運動のきつさ",
    "家事のめんどくささ",
    "早起きのつらさ（曜日別）",
    "通勤・通学の混み具合",
    "待ち時間のイライラ度",
    "自分へのご褒美のうれしさ",
    "二度寝の気持ちよさ",
    "夜食の背徳感",
    "欲しい最新ガジェット度",
    "防災グッズの必要度",
    "キャンプ道具の必要度",
    "無人島に持っていく優先度",
    "一人暮らしで先に買う家電の優先度",
    "風邪のときに食べたい度",
    "サウナの整い度",
    "推しへの愛の強さ",
  ],
  // 尺度は一本だが、知識や議論が必要で順序を合わせにくいもの
  HARD: [
    "歴史上の人物の偉大さ",
    "偉人・有名人の世界的な知名度",
    "発明の人類への影響の大きさ",
    "出来事の歴史的な重大さ",
    "国の経済力（GDP）の大きさ",
    "企業の規模の大きさ",
    "必殺技の強そう感",
    "漫画・アニメキャラの強さ",
    "RPGの職業の強さ",
    "魔法・超能力の便利さ",
    "神話の神々の強さ",
    "モンスター・怪獣の強さ",
    "ことわざの教訓の重み",
    "四字熟語のかっこよさ",
    "罪の重さ（軽犯罪→重罪）",
    "マナー違反の悪質さ",
    "嘘の罪悪感（優しい嘘→悪質な嘘）",
    "お願いごとの図々しさ",
    "約束の重さ",
    "秘密の言いにくさ",
    "人生の選択の後悔の大きさ",
    "感動する場面の涙腺レベル",
    "言葉のグサッとくる度",
    "プレッシャーの大きさ（場面別）",
  ],
};

/** お題を1つランダムに選ぶ用（全カテゴリを結合した配列） */
export const ALL_THEMES = [
  ...THEME_SETS.EASY,
  ...THEME_SETS.NORMAL,
  ...THEME_SETS.HARD,
];

/** お題の難易度（game_state.difficulty に保存） */
export type ValueTalkDifficulty = "EASY" | "NORMAL" | "HARD" | "MIXED" | "GRADUAL";

export interface PlayerState {
  hand: number[];
  descriptions: Record<number, string>; // card number -> たとえ話
}

export interface PlayedCard {
  card: number;
  description: string;
  playerIndex: number;
}

export interface LastFailure {
  message: string;
  playedCard: number;
  playerIndex: number;
  smallerCards: { playerIndex: number; card: number }[];
}

export interface ValueTalkGameState {
  phase: "playing" | "failed" | "cleared" | "gameover";
  theme: string;
  life: number;
  level: number;
  deck: number[];
  played_cards: PlayedCard[];
  players: PlayerState[];
  lastFailure?: LastFailure | null;
  /** お題を変えるをまだ使っていないか（未設定は false 扱い） */
  themeChangeUsed?: boolean;
  /** お題の難易度（ロビーでHostが選択。未設定は MIXED 扱い） */
  difficulty?: ValueTalkDifficulty;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** 難易度とレベルに応じてお題を1つ選ぶ（GRADUALはレベル1-2:EASY, 3-5:NORMAL, 6+:HARD） */
export function getNewTheme(difficulty: ValueTalkDifficulty, level: number): string {
  const d = difficulty ?? "MIXED";
  if (d === "EASY") return pickRandom(THEME_SETS.EASY);
  if (d === "NORMAL") return pickRandom(THEME_SETS.NORMAL);
  if (d === "HARD") return pickRandom(THEME_SETS.HARD);
  if (d === "MIXED") return pickRandom(ALL_THEMES);
  if (d === "GRADUAL") {
    if (level <= 2) return pickRandom(THEME_SETS.EASY);
    if (level <= 5) return pickRandom(THEME_SETS.NORMAL);
    return pickRandom(THEME_SETS.HARD);
  }
  return pickRandom(ALL_THEMES);
}

/** 参加人数に応じた手札枚数配列（2人:3枚ずつ, 3人:2枚ずつ, 4人:2,2,1,1のランダム, 5人以上:1枚ずつ） */
function getHandCounts(playerCount: number): number[] {
  if (playerCount <= 0) return [];
  if (playerCount === 2) return [3, 3];
  if (playerCount === 3) return [2, 2, 2];
  if (playerCount === 4) {
    const whoGets2 = shuffle([0, 1, 2, 3]).slice(0, 2);
    return [0, 1, 2, 3].map((i) => (whoGets2.includes(i) ? 2 : 1));
  }
  return Array.from({ length: playerCount }, () => 1);
}

/** 初期状態（参加人数に応じた手札配布。difficulty は game_state に保存） */
export function createInitialValueTalkState(
  playerCount: number,
  difficulty: ValueTalkDifficulty = "MIXED"
): ValueTalkGameState {
  if (playerCount < 1) throw new Error("1人以上でプレイしてください");
  const fullDeck = Array.from({ length: 100 }, (_, i) => i + 1);
  const shuffled = shuffle(fullDeck);
  const theme = getNewTheme(difficulty, 1);
  const handCounts = getHandCounts(playerCount);
  const players: PlayerState[] = [];
  for (let i = 0; i < playerCount; i++) {
    const hand: number[] = [];
    for (let j = 0; j < handCounts[i]!; j++) {
      if (shuffled.length > 0) hand.push(shuffled.shift()!);
    }
    players.push({ hand, descriptions: {} });
  }
  const deck = shuffled;
  return {
    phase: "playing",
    theme,
    life: 3,
    level: 1,
    deck,
    played_cards: [],
    players,
    lastFailure: null,
    themeChangeUsed: false,
    difficulty: difficulty ?? "MIXED",
  };
}

/** 手札に残っている全カード（全プレイヤー） */
function getAllRemainingCards(players: PlayerState[]): number[] {
  return players.flatMap((p) => p.hand);
}

/** たとえ話を更新（UIから呼ぶ。サーバーに送るのは playCard 時でよいが、他プレイヤーにも見せるため state に保存） */
export function updateDescription(
  state: ValueTalkGameState,
  playerIndex: number,
  card: number,
  text: string
): ValueTalkGameState {
  if (state.phase !== "playing") return state;
  const player = state.players[playerIndex];
  if (!player || !player.hand.includes(card)) return state;
  const nextPlayers = state.players.map((p, i) => {
    if (i !== playerIndex) return p;
    return {
      ...p,
      descriptions: { ...p.descriptions, [card]: text },
    };
  });
  return { ...state, players: nextPlayers };
}

/** カードを出す。失敗時はライフ減少・小さいカードを捨てて継続 */
export function playCard(
  state: ValueTalkGameState,
  playerIndex: number,
  card: number,
  description: string
): ValueTalkGameState {
  if (state.phase !== "playing" && state.phase !== "failed") return state;
  const player = state.players[playerIndex];
  if (!player || !player.hand.includes(card)) return state;

  const handWithoutCard = player.hand.filter((c) => c !== card);
  const otherPlayersHands = state.players.map((p, i) =>
    i === playerIndex ? handWithoutCard : p.hand
  );
  const allRemaining = otherPlayersHands.flat();
  const anySmaller = allRemaining.some((c) => c < card);

  if (anySmaller) {
    // 失敗：まだ誰かの手札に自分より小さいカードがある
    const smallerCards: { playerIndex: number; card: number }[] = [];
    state.players.forEach((p, i) => {
      p.hand.forEach((c) => {
        if (c < card) smallerCards.push({ playerIndex: i, card: c });
      });
    });
    const smallest = smallerCards.length > 0 ? Math.min(...smallerCards.map((x) => x.card)) : card;
    const whoHadSmallest = smallerCards.find((x) => x.card === smallest);
    const life = state.life - 1;
    const message =
      whoHadSmallest !== undefined
        ? `ブブー！失敗！ Player ${whoHadSmallest.playerIndex + 1} のカード(${smallest})の方が小さかった！`
        : `ブブー！失敗！`;
    const failureInfo: LastFailure = {
      message,
      playedCard: card,
      playerIndex,
      smallerCards,
    };

    // 出したカードは場に置かれたまま（ito公式）。小さいカードは全員の手札から捨て札に。
    const played_cards = [...state.played_cards, { card, description, playerIndex }];
    const newPlayersCorrected = state.players.map((p, i) => {
      const baseHand = i === playerIndex ? handWithoutCard : p.hand;
      const newHand = baseHand.filter((c) => c > card);
      const desc: Record<number, string> = {};
      newHand.forEach((c) => {
        if (p.descriptions[c] !== undefined) desc[c] = p.descriptions[c]!;
      });
      return { ...p, hand: newHand, descriptions: desc };
    });

    if (life <= 0) {
      return {
        ...state,
        phase: "gameover",
        life,
        players: newPlayersCorrected,
        played_cards,
        lastFailure: failureInfo,
      };
    }

    // 失敗で全員の手札が空になったら次のレベルへ（失敗情報は表示用に残す）
    if (newPlayersCorrected.every((p) => p.hand.length === 0)) {
      const nextLevel = state.level + 1;
      const dealt = dealNextLevel({ ...state, life, players: newPlayersCorrected }, nextLevel);
      return { ...dealt, lastFailure: failureInfo };
    }

    return {
      ...state,
      phase: "playing",
      life,
      players: newPlayersCorrected,
      played_cards,
      lastFailure: failureInfo,
    };
  }

  // 成功：場に出す
  const newPlayers = state.players.map((p, i) =>
    i === playerIndex
      ? { ...p, hand: handWithoutCard, descriptions: (() => {
          const d = { ...p.descriptions };
          delete d[card];
          return d;
        })() }
      : p
  );

  const played_cards = [...state.played_cards, { card, description, playerIndex }];
  const allHandsEmpty = newPlayers.every((p) => p.hand.length === 0);

  if (allHandsEmpty) {
    const nextLevel = state.level + 1;
    return dealNextLevel(
      { ...state, level: nextLevel },
      nextLevel
    );
  }

  return {
    ...state,
    phase: "playing",
    players: newPlayers,
    played_cards,
    lastFailure: null,
  };
}

/** レベルクリア時の次のレベル配布（参加人数に応じた手札配布ルールを使用） */
function dealNextLevel(
  state: ValueTalkGameState,
  nextLevel: number
): ValueTalkGameState {
  const playerCount = state.players.length;
  const handCounts = getHandCounts(playerCount);
  const need = handCounts.reduce((a, b) => a + b, 0);
  let deck = [...state.deck];
  if (deck.length < need) {
    deck = shuffle(Array.from({ length: 100 }, (_, i) => i + 1));
  }
  const nextPlayers: PlayerState[] = [];
  for (let i = 0; i < playerCount; i++) {
    const hand: number[] = [];
    for (let j = 0; j < handCounts[i]!; j++) {
      if (deck.length > 0) hand.push(deck.shift()!);
    }
    nextPlayers.push({ hand, descriptions: {} });
  }
  const diff = state.difficulty ?? "MIXED";
  const nextTheme =
    diff === "GRADUAL" ? getNewTheme(diff, nextLevel) : state.theme;

  return {
    ...state,
    phase: "playing",
    level: nextLevel,
    theme: nextTheme,
    deck,
    played_cards: [],
    players: nextPlayers,
    lastFailure: null,
  };
}

/** お題をランダムに変更（1回のみ使用可能）。難易度に応じたリストから選ぶ */
export function changeTheme(state: ValueTalkGameState): ValueTalkGameState | null {
  if (state.phase !== "playing" || state.themeChangeUsed) return null;
  const diff = state.difficulty ?? "MIXED";
  const level = state.level ?? 1;
  const list =
    diff === "EASY"
      ? THEME_SETS.EASY
      : diff === "NORMAL"
        ? THEME_SETS.NORMAL
        : diff === "HARD"
          ? THEME_SETS.HARD
          : diff === "GRADUAL"
            ? level <= 2
              ? THEME_SETS.EASY
              : level <= 5
                ? THEME_SETS.NORMAL
                : THEME_SETS.HARD
            : ALL_THEMES;
  const otherThemes = list.filter((t) => t !== state.theme);
  const newTheme = otherThemes.length > 0 ? pickRandom(otherThemes) : pickRandom(list);
  return {
    ...state,
    theme: newTheme,
    themeChangeUsed: true,
  };
}

/**
 * 再戦：ゲーム終了後に同じメンバーで最初から遊び直す。
 * - phase を playing、life を初期値(3)、level を 1 にリセット
 * - played_cards を空に、deck を 1〜100 で再生成・シャッフル
 * - themeChangeUsed を false にし、getNewTheme で新しいお題をセット
 * - 参加人数に応じて手札を再配布（2人:3枚ずつ、3人:2枚ずつ、4人:2,2,1,1 など）
 */
export function restartGame(state: ValueTalkGameState): ValueTalkGameState {
  const playerCount = state.players.length;
  const difficulty = state.difficulty ?? "MIXED";
  const fullDeck = shuffle(Array.from({ length: 100 }, (_, i) => i + 1));
  const newTheme = getNewTheme(difficulty, 1);
  const handCounts = getHandCounts(playerCount);
  const players: PlayerState[] = [];
  for (let i = 0; i < playerCount; i++) {
    const hand: number[] = [];
    for (let j = 0; j < handCounts[i]!; j++) {
      if (fullDeck.length > 0) hand.push(fullDeck.shift()!);
    }
    players.push({ hand, descriptions: {} });
  }
  return {
    ...state,
    phase: "playing",
    life: 3,
    level: 1,
    theme: newTheme,
    deck: fullDeck,
    played_cards: [],
    players,
    lastFailure: null,
    themeChangeUsed: false,
    difficulty: state.difficulty ?? "MIXED",
  };
}

/** 再戦（restartGame のエイリアス。互換用） */
export function resetGame(state: ValueTalkGameState): ValueTalkGameState {
  return restartGame(state);
}
