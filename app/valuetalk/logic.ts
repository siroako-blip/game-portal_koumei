/**
 * Value Talk（ito風）協力ゲームロジック
 * 1〜100のカードを「お題」に沿ったたとえ話で出し、小さい順に出す協力プレイ。
 */

/** 尺度（スケール）重視のお題セット。1〜100の数値化に適したもの */
export const THEME_SETS = {
  EASY: [
    "動物の大きさ",
    "動物の足の速さ",
    "カバンに入っているものの重さ",
    "コンビニで買えるものの値段",
    "日本の有名な建物の高さ",
    "生き物の寿命の長さ",
    "食べ物のカロリーの高さ",
    "硬い食べ物ランキング",
    "辛い食べ物ランキング",
    "甘い食べ物ランキング",
    "酸っぱい食べ物ランキング",
    "子供に人気のおやつ（人気度）",
    "お寿司のネタの高級感",
    "乗り物のスピード",
    "家電製品の値段",
    "お弁当のおかずの定番度",
    "小学生が好きな給食メニュー",
    "強い昆虫ランキング",
    "重いスポーツ用品",
    "広い場所（部屋〜国レベル）",
    "長い時間（一瞬〜永遠）",
    "熱いもの（温度）",
    "冷たいもの（温度）",
    "うるさい音の大きさ",
    "臭いものレベル",
    "良い香りの強さ",
    "日本人の知名度が高い有名人",
    "世界的に有名なキャラクター",
    "日常でよく使う漢字の画数",
    "家にある家具の大きさ",
    "ボールの大きさ（球技）",
    "人口が多い国や都市",
    "歴史上の出来事の古さ",
    "テレビ番組の視聴率（人気度）",
    "映画の興行収入（ヒット度）",
    "YouTubeで再生されそうな動画ジャンル",
    "本屋で売っていそうな本の厚さ",
    "冷蔵庫に入っているものの賞味期限の長さ",
    "お風呂の温度（水風呂〜熱湯）",
    "人が歩く速さ〜走る速さのシチュエーション",
    "声の大きさ（ささやき〜絶叫）",
    "部屋の明るさ（真っ暗〜直射日光）",
    "服の厚手具合（夏服〜冬服）",
    "犬の大きさ（小型犬〜大型犬）",
    "紙の大きさ（切手〜ポスター）",
    "買い物の待ち時間の長さ",
    "スマートフォンの充電の持ち具合",
    "旅行の移動距離",
    "テストの点数（0点〜100点）の嬉しさ",
    "一ヶ月のお小遣いの金額",
  ],
  NORMAL: [
    "無人島に持っていきたいもの（重要度）",
    "ゾンビと戦うときに頼もしい武器",
    "冷蔵庫に入っていたらテンションが上がるもの",
    "初デートで行きたい場所（好感度）",
    "もらって困るプレゼント（迷惑度）",
    "家にあったら怖いもの（恐怖度）",
    "地味だけど役に立つ文房具（便利度）",
    "なりたい職業ランキング",
    "お金持ちっぽい趣味",
    "実は最強だと思う文房具",
    "言われたら傷つく言葉（ダメージ）",
    "言われたら嬉しい褒め言葉（嬉しさ）",
    "異性にされたらドキッとする仕草",
    "結婚相手に求める条件（重要度）",
    "人生で一度はやってみたいことのスケール",
    "明日世界が終わるとしたら食べたいもの",
    "魔法が一つ使えるなら（便利さ・強力さ）",
    "RPGの職業でなりたいもの",
    "許せないマナー違反（怒り度）",
    "電車で隣に座ってほしくない人",
    "遊園地のアトラクションの絶叫度",
    "最強の夜食（背徳感と美味しさ）",
    "一番モテそうな部活",
    "一番稼げそうな職業",
    "サバイバルで役立つ道具",
    "タイムマシンで行きたい時代の古さ/未来さ",
    "生まれ変わるならなりたい生き物",
    "住みたい街の条件（都会度・便利度）",
    "カバンに入っていると安心するもの",
    "おにぎりの具の「王道」度",
    "焼肉で注文するタイミング（序盤〜終盤）",
    "居酒屋で頼むメニューの「とりあえず」感",
    "鍋に入れたい具材ランキング",
    "パンに合うトッピングの美味しさ",
    "休日の過ごした方の充実度",
    "友達に貸して返ってこなくても許せる金額",
    "遅刻された時の許せる時間",
    "映画館で食べたいポップコーンの味の濃さ",
    "自動販売機にあったら嬉しい飲み物",
    "コンビニのホットスナックの魅力度",
    "屋台で買いたくなるもの",
    "旅行に持っていく荷物の必要性",
    "スマホのバッテリー残量（不安度）",
    "Wi-Fiの速度（ストレス〜快適）",
    "部屋の散らかり具合（許容範囲）",
    "トイレを我慢できる限界度",
    "眠気の強さ",
    "お腹の減り具合",
    "筋肉痛の痛さ",
    "ジェットコースターの怖さ",
  ],
  HARD: [
    "人生で大切にしたいこと（優先度）",
    "「大人になる」ために必要な要素",
    "100年後の未来に残っていてほしいもの",
    "かっこいい必殺技の名前（強そう感）",
    "映画の主人公になりそうな人（主人公補正）",
    "悪役としてのカリスマ性",
    "「愛」を感じる行動の深さ",
    "「正義」だと思う行動",
    "「自由」を感じる瞬間",
    "「幸せ」を感じる瞬間",
    "友達と親友の境界線",
    "仕事とプライベートの優先順位",
    "お金で買えないものの価値",
    "才能と努力の比率（努力寄り〜才能寄り）",
    "嘘の良し悪し（優しい嘘〜悪い嘘）",
    "リスクとリターンのバランス",
    "過去の栄光と未来の希望",
    "リーダーに必要な資質",
    "ユーモアのセンス（寒さ〜爆笑）",
    "知識と知恵の違い",
    "若さと経験の価値",
    "アナログとデジタルの良さ（便利さ〜温かみ）",
    "都会暮らしと田舎暮らしの魅力",
    "独身の自由と結婚の幸福",
    "安定と挑戦のバランス",
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
    const phase = life <= 0 ? "gameover" : "playing";
    const message =
      whoHadSmallest !== undefined
        ? `ブブー！失敗！ Player ${whoHadSmallest.playerIndex + 1} のカード(${smallest})の方が小さかった！`
        : `ブブー！失敗！`;

    // 小さいカードを全員の手札から除去（捨て札）
    const newPlayersCorrected = state.players.map((p, i) => {
      const newHand = p.hand.filter((c) => c >= card);
      const desc: Record<number, string> = {};
      newHand.forEach((c) => {
        if (p.descriptions[c] !== undefined) desc[c] = p.descriptions[c]!;
      });
      return { ...p, hand: newHand, descriptions: desc };
    });

    return {
      ...state,
      phase,
      life,
      players: newPlayersCorrected,
      lastFailure: {
        message,
        playedCard: card,
        playerIndex,
        smallerCards,
      },
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
