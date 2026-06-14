/**
 * Court Intrigue (Love Letter 風) ゲームロジック
 * 2〜4人用。16枚のカード（1=兵士x5, 2=神父x2, 3=男爵x2, 4=僧侶x2, 5=王子x2, 6=王x1, 7=大臣x1, 8=姫x1）
 */

export const CARD_NAMES: Record<number, string> = {
  1: "兵士",
  2: "神父",
  3: "男爵",
  4: "僧侶",
  5: "王子",
  6: "王",
  7: "大臣",
  8: "姫",
};

/** カードが対象選択が必要か（1,2,3,5,6） */
export function cardNeedsTarget(rank: number): boolean {
  return [1, 2, 3, 5, 6].includes(rank);
}

/** 兵士(1)は数字の選択が必要 */
export function cardNeedsGuardGuess(rank: number): boolean {
  return rank === 1;
}

export interface PlayerState {
  hand: number[];
  isEliminated: boolean;
  isProtected: boolean;
  score: number;
}

export interface DiscardEntry {
  playerIndex: number;
  rank: number;
}

export interface LoveLetterGameState {
  phase: "playing" | "finished";
  deck: number[];
  removedCard: number;
  discardPile: DiscardEntry[];
  turnIndex: number;
  players: PlayerState[];
  winner: number | null;
  logs: string[];
  /** 神父(2)で見た手札（actorIndex のプレイヤーだけがUIで見る。次の手番でクリア） */
  lastPriestReveal?: { actorIndex: number; targetIndex: number; rank: number } | null;
}

const DECK_TEMPLATE = [
  1, 1, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 7, 8,
];

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** 初期状態（2〜4人）。1枚をゲームから除外し、各プレイヤーに1枚配る */
export function createInitialLoveLetterState(playerCount: number): LoveLetterGameState {
  if (playerCount < 2 || playerCount > 4) throw new Error("2〜4人でプレイしてください");
  const shuffled = shuffle(DECK_TEMPLATE);
  const removedCard = shuffled.pop()!;
  const deck: number[] = [];
  const players: PlayerState[] = [];
  for (let i = 0; i < playerCount; i++) {
    const card = shuffled.shift()!;
    players.push({
      hand: [card],
      isEliminated: false,
      isProtected: false,
      score: 0,
    });
  }
  // 先手のターン開始＝1枚引く（2枚持ってから1枚捨てる）
  players[0]!.hand.push(shuffled.shift()!);
  shuffled.forEach((c) => deck.push(c));
  return {
    phase: "playing",
    deck,
    removedCard,
    discardPile: [],
    turnIndex: 0,
    players,
    winner: null,
    logs: ["ゲーム開始。"],
  };
}

/** 脱落していないプレイヤー数を返す */
function countAlive(players: PlayerState[]): number {
  return players.filter((p) => !p.isEliminated).length;
}

/** 次の手番のプレイヤーインデックス（脱落者は飛ばす） */
function nextTurnIndex(state: LoveLetterGameState): number {
  const n = state.players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (state.turnIndex + i) % n;
    if (!state.players[idx]!.isEliminated) return idx;
  }
  return state.turnIndex;
}

/** 大臣(7): 手札に王(6)か王子(5)があるなら必ず大臣を捨てなければならない */
export function mustDiscardCountess(hand: number[]): boolean {
  const hasKingOrPrince = hand.includes(6) || hand.includes(5);
  const hasCountess = hand.includes(7);
  return hasCountess && hasKingOrPrince;
}

/** プレイ可能なカード（大臣ルールを考慮）。2枚ある場合、捨てられる方を返す */
export function getDiscardableCards(state: LoveLetterGameState, playerIndex: number): number[] {
  const hand = state.players[playerIndex]!.hand;
  if (hand.length === 0) return [];
  if (mustDiscardCountess(hand)) return [7]; // 大臣のみ捨て可能
  return hand;
}

/** 有効な対象者（自分以外・脱落していない・僧侶で保護されていない） */
export function getValidTargets(state: LoveLetterGameState, actorIndex: number): number[] {
  return state.players
    .map((_, i) => i)
    .filter((i) => i !== actorIndex && !state.players[i]!.isEliminated && !state.players[i]!.isProtected);
}

/** 兵士の「当てる数字」は 2〜8（手札の数字なので1は除く） */
export const GUARD_GUESS_OPTIONS = [2, 3, 4, 5, 6, 7, 8];

export type PlayCardParams = {
  state: LoveLetterGameState;
  playerIndex: number;
  cardRank: number;
  targetIndex?: number;
  guardGuess?: number;
};

/**
 * カードを捨てて効果を適用する。
 * 対象が必要なカード(1,2,3,5,6)は targetIndex 必須。兵士(1)は guardGuess (2-8) 必須。
 */
export function playCard(params: PlayCardParams): LoveLetterGameState | null {
  const { state, playerIndex, cardRank, targetIndex, guardGuess } = params;
  if (state.phase !== "playing") return null;

  const players = state.players.map((p) => ({
    ...p,
    hand: [...p.hand],
  }));
  const player = players[playerIndex];
  if (!player || player.isEliminated) return null;
  if (!player.hand.includes(cardRank)) return null;

  // 大臣ルール
  if (mustDiscardCountess(player.hand) && cardRank !== 7) return null;

  const playerCount = state.players.length;
  const playerNames = (i: number) => (i === playerIndex ? "あなた" : `Player ${i + 1}`);
  let log = "";

  // 手札から捨てるカードを除去
  const handIdx = player.hand.indexOf(cardRank);
  player.hand.splice(handIdx, 1);

  // 捨て札に追加
  const discardPile = [...state.discardPile, { playerIndex, rank: cardRank }];

  // 姫(8): 捨てたら即脱落
  if (cardRank === 8) {
    player.isEliminated = true;
    log = `${playerNames(playerIndex)}が姫を捨てたため、脱落しました。`;
    const alive = countAlive(players);
    if (alive <= 1) {
      const winnerIdx = players.findIndex((p) => !p.isEliminated);
      return {
        ...state,
        players,
        discardPile,
        logs: [...state.logs, log],
        phase: "finished",
        winner: winnerIdx >= 0 ? winnerIdx : null,
        lastPriestReveal: null,
      };
    }
    const next = nextTurnIndex({ ...state, players, discardPile, turnIndex: state.turnIndex });
    return {
      ...state,
      players,
      discardPile,
      turnIndex: next,
      logs: [...state.logs, log],
      lastPriestReveal: null,
    };
  }

  // 大臣(7): 効果なし（捨てただけ）
  if (cardRank === 7) {
    log = `${playerNames(playerIndex)}が大臣を捨てました。`;
    const next = nextTurnIndex({ ...state, players, discardPile, turnIndex: state.turnIndex });
    const countessResult = applyHandmaidClearAndAdvance(state, players, discardPile, next, log);
    return { ...countessResult, lastPriestReveal: null };
  }

  // 以下は対象が必要（王子(5)のみ自分を指名可能）
  if (cardRank !== 5 && targetIndex === playerIndex) return null;

  // 指名できる対象が誰もいない（全員が保護中 or 脱落）場合は、効果なしで捨てるだけ（公式ルール）
  if (targetIndex === undefined && cardRank !== 5) {
    const hasValidTarget = players.some(
      (p, i) => i !== playerIndex && !p.isEliminated && !p.isProtected
    );
    if (hasValidTarget) return null; // 対象がいるのに未指定は不正
    log = `${playerNames(playerIndex)}が${CARD_NAMES[cardRank]}を捨てました（指名できる対象がいないため効果なし）。`;
    const next = nextTurnIndex({ ...state, players, discardPile, turnIndex: state.turnIndex });
    const result = applyHandmaidClearAndAdvance(state, players, discardPile, next, log);
    return { ...result, lastPriestReveal: null };
  }

  const target =
    targetIndex !== undefined ? players[targetIndex]! : player;
  if (targetIndex !== undefined && (!target || target.isEliminated)) return null;
  if (targetIndex !== undefined && targetIndex !== playerIndex && target.isProtected) {
    // 僧侶(4)で保護中のプレイヤーは指名できない（王子(5)も例外ではない）
    return null;
  }

  switch (cardRank) {
    case 1: {
      // 兵士(1): 他者1人に数字(2-8)を宣言。当たれば脱落
      if (guardGuess === undefined || guardGuess < 2 || guardGuess > 8) return null;
      if (targetIndex === undefined) return null;
      const targetHand = target!.hand;
      if (targetHand.length === 0) return null;
      const hit = targetHand[0] === guardGuess;
      if (hit) {
        target!.isEliminated = true;
        log = `${playerNames(playerIndex)}が兵士で${playerNames(targetIndex)}を指名し、数字${guardGuess}を宣言→当たり！${playerNames(targetIndex)}は脱落しました。`;
      } else {
        log = `${playerNames(playerIndex)}が兵士で${playerNames(targetIndex)}を指名し、数字${guardGuess}を宣言→ハズレ。`;
      }
      const alive = countAlive(players);
      if (alive <= 1) {
        const winnerIdx = players.findIndex((p) => !p.isEliminated);
        return {
          ...state,
          players,
          discardPile,
          logs: [...state.logs, log],
          phase: "finished",
          winner: winnerIdx >= 0 ? winnerIdx : null,
          lastPriestReveal: null,
        };
      }
      const next = nextTurnIndex({ ...state, players, discardPile, turnIndex: state.turnIndex });
      const guardResult = applyHandmaidClearAndAdvance(state, players, discardPile, next, log);
      return { ...guardResult, lastPriestReveal: null };
    }

    case 2: {
      // 神父(2): 他者1人の手札を見る（自分だけ見える。lastPriestReveal で表示）
      if (targetIndex === undefined) return null;
      const seen = target!.hand[0];
      log = `${playerNames(playerIndex)}が神父で${playerNames(targetIndex)}の手札を見ました。`;
      const next = nextTurnIndex({ ...state, players, discardPile, turnIndex: state.turnIndex });
      const result = applyHandmaidClearAndAdvance(state, players, discardPile, next, log);
      return { ...result, lastPriestReveal: { actorIndex: playerIndex, targetIndex, rank: seen } };
    }

    case 3: {
      // 男爵(3): 他者1人と手札を見せ合い、小さい方が脱落
      if (targetIndex === undefined) return null;
      const myVal = player.hand[0] ?? 0;
      const theirVal = target!.hand[0] ?? 0;
      if (myVal < theirVal) {
        player.isEliminated = true;
        log = `${playerNames(playerIndex)}が男爵で${playerNames(targetIndex)}と比較→${playerNames(playerIndex)}の手札が小さく、脱落しました。`;
      } else if (theirVal < myVal) {
        target!.isEliminated = true;
        log = `${playerNames(playerIndex)}が男爵で${playerNames(targetIndex)}と比較→${playerNames(targetIndex)}の手札が小さく、脱落しました。`;
      } else {
        log = `${playerNames(playerIndex)}が男爵で${playerNames(targetIndex)}と比較→同点でどちらも脱落しません。`;
      }
      const alive = countAlive(players);
      if (alive <= 1) {
        const winnerIdx = players.findIndex((p) => !p.isEliminated);
        return {
          ...state,
          players,
          discardPile,
          logs: [...state.logs, log],
          phase: "finished",
          winner: winnerIdx >= 0 ? winnerIdx : null,
          lastPriestReveal: null,
        };
      }
      const next = nextTurnIndex({ ...state, players, discardPile, turnIndex: state.turnIndex });
      const baronResult = applyHandmaidClearAndAdvance(state, players, discardPile, next, log);
      return { ...baronResult, lastPriestReveal: null };
    }

    case 4: {
      // 僧侶(4): 次の自分の番まで他者の効果を受けない
      player.isProtected = true;
      log = `${playerNames(playerIndex)}が僧侶を出し、次の番まで保護されました。`;
      const next = nextTurnIndex({ ...state, players, discardPile, turnIndex: state.turnIndex });
      const handmaidResult = applyHandmaidClearAndAdvance(state, players, discardPile, next, log);
      return { ...handmaidResult, lastPriestReveal: null };
    }

    case 5: {
      // 王子(5): 自分か他者1人を指名し、手札を捨てさせ山札から引かせる（山札切れなら除外カード）
      const targetP = targetIndex !== undefined ? players[targetIndex]! : player;
      const targetIdx = targetIndex !== undefined ? targetIndex : playerIndex;
      const forcedDiscard = targetP.hand[0];
      targetP.hand = []; // 捨てる
      const princeDiscardPile =
        forcedDiscard !== undefined
          ? [...discardPile, { playerIndex: targetIdx, rank: forcedDiscard }]
          : discardPile;

      // 姫(8)を捨てさせられたら即脱落（公式ルール）。新しいカードは引けない。
      if (forcedDiscard === 8) {
        targetP.isEliminated = true;
        log = `${playerNames(playerIndex)}が王子で${playerNames(targetIdx)}を指名→姫を捨てさせられ、${playerNames(targetIdx)}は脱落しました。`;
        const alive = countAlive(players);
        if (alive <= 1) {
          const winnerIdx = players.findIndex((p) => !p.isEliminated);
          return {
            ...state,
            players,
            discardPile: princeDiscardPile,
            logs: [...state.logs, log],
            phase: "finished",
            winner: winnerIdx >= 0 ? winnerIdx : null,
            lastPriestReveal: null,
          };
        }
        const next = nextTurnIndex({ ...state, players, discardPile: princeDiscardPile, turnIndex: state.turnIndex });
        const result = applyHandmaidClearAndAdvance(state, players, princeDiscardPile, next, log);
        return { ...result, lastPriestReveal: null };
      }

      const drawn = state.deck.length > 0
        ? state.deck[state.deck.length - 1]!
        : state.removedCard;
      const newDeck = state.deck.length > 0 ? state.deck.slice(0, -1) : [];
      targetP.hand.push(drawn);
      // 捨てさせたカードは公開情報、引いたカードは非公開（ログに出さない）
      log = `${playerNames(playerIndex)}が王子で${playerNames(targetIdx)}を指名し、${CARD_NAMES[forcedDiscard!]}を捨てさせて新しいカードを引かせました。`;
      const next = nextTurnIndex({ ...state, players, discardPile: princeDiscardPile, deck: newDeck, turnIndex: state.turnIndex });
      const princeResult = applyHandmaidClearAndAdvance(
        { ...state, deck: newDeck },
        players,
        princeDiscardPile,
        next,
        log
      );
      return { ...princeResult, lastPriestReveal: null };
    }

    case 6: {
      // 王(6): 相手1人と手札を交換
      if (targetIndex === undefined) return null;
      const myHand = [...player.hand];
      const theirHand = [...target!.hand];
      player.hand = theirHand;
      target!.hand = myHand;
      log = `${playerNames(playerIndex)}が王で${playerNames(targetIndex)}と手札を交換しました。`;
      const next = nextTurnIndex({ ...state, players, discardPile, turnIndex: state.turnIndex });
      const kingResult = applyHandmaidClearAndAdvance(state, players, discardPile, next, log);
      return { ...kingResult, lastPriestReveal: null };
    }

    default:
      return null;
  }
}

/** 手番開始時: 僧侶の保護を解除し、1枚引いてから次の状態へ（playCard の後は「捨てた後」なので、次の手番の人が引く） */
function applyHandmaidClearAndAdvance(
  state: LoveLetterGameState,
  players: PlayerState[],
  discardPile: DiscardEntry[],
  nextTurnIdx: number,
  log: string
): LoveLetterGameState {
  let deck = state.deck;

  // 山札が空なら次の手番は始まらずラウンド終了（最後の1枚を引いた人はターンを終えている）。
  // 生存者の手札（全員1枚）の最大が勝ち。同点なら捨て札の合計が大きい方（公式ルール）。
  if (deck.length === 0) {
    let winnerIdx: number | null = null;
    let bestRank = -1;
    let bestDiscardSum = -1;
    const discardSumOf = (i: number) =>
      discardPile.filter((d) => d.playerIndex === i).reduce((s, d) => s + d.rank, 0);
    players.forEach((p, i) => {
      if (p.isEliminated) return;
      const r = p.hand[0] ?? -1;
      const ds = discardSumOf(i);
      if (r > bestRank || (r === bestRank && ds > bestDiscardSum)) {
        bestRank = r;
        bestDiscardSum = ds;
        winnerIdx = i;
      }
    });
    return {
      ...state,
      players,
      deck,
      discardPile,
      turnIndex: nextTurnIdx,
      phase: "finished",
      winner: winnerIdx,
      logs: [...state.logs, log],
      lastPriestReveal: null,
    };
  }

  const updatedPlayers = players.map((p, i) => {
    if (i !== nextTurnIdx) return p;
    const hand = [...p.hand];
    if (!p.isEliminated) {
      hand.push(deck[deck.length - 1]!);
      deck = deck.slice(0, -1);
    }
    return { ...p, hand, isProtected: false };
  });

  return {
    ...state,
    players: updatedPlayers,
    deck,
    discardPile,
    turnIndex: nextTurnIdx,
    logs: [...state.logs, log],
    lastPriestReveal: null,
  };
}
