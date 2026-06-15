/**
 * 合意制の再戦を扱う共通ユーティリティ（全ゲーム共有）。
 *
 * 仕様:
 * - 再戦の同意は各ゲームの `game_state.rematchVotes`（同意したプレイヤーの pid 配列）に保存する。
 * - 終了画面で「再戦に同意」を押すと自分の pid が votes に加わるだけで、即リセットはしない。
 * - ルーム内の全プレイヤーが同意した時点で初めて logic.ts の restartGame() を呼び新ゲームへ。
 * - これにより「誰か1人が押すと全員が新ゲームに引き込まれる」即リセットを防ぐ。
 *
 * 各ゲームの GameState には `rematchVotes?: string[]` を追加しておくこと。
 * restartGame() は新しい初期状態を返す（rematchVotes を持たない＝自動的にクリアされる）。
 */

/** rematchVotes を string[] に正規化（未定義・不正値は空配列） */
export function normalizeRematchVotes(votes: unknown): string[] {
  return Array.isArray(votes)
    ? votes.filter((v): v is string => typeof v === "string")
    : [];
}

/**
 * 自分の同意を加えた新しい投票配列と、全員が同意したか（allAgreed）を返す。
 * @param currentVotes 現在の state.rematchVotes
 * @param myPid 操作したプレイヤーの pid
 * @param allPlayerIds ルーム内の全プレイヤー pid（2人用は [player1_id, player2_id]）
 */
export function castRematchVote(
  currentVotes: unknown,
  myPid: string,
  allPlayerIds: (string | null | undefined)[]
): { votes: string[]; allAgreed: boolean } {
  const base = normalizeRematchVotes(currentVotes);
  const votes = base.includes(myPid) ? base : [...base, myPid];
  const eligible = allPlayerIds.filter((id): id is string => !!id);
  const allAgreed = eligible.length > 0 && eligible.every((id) => votes.includes(id));
  return { votes, allAgreed };
}

/** 表示用: 同意人数 / 全体人数 */
export function rematchCount(
  votes: unknown,
  allPlayerIds: (string | null | undefined)[]
): { agreed: number; total: number } {
  const v = normalizeRematchVotes(votes);
  const eligible = allPlayerIds.filter((id): id is string => !!id);
  return {
    agreed: eligible.filter((id) => v.includes(id)).length,
    total: eligible.length,
  };
}

/** 指定プレイヤーがすでに再戦に同意済みか */
export function hasVotedRematch(votes: unknown, pid: string | null | undefined): boolean {
  return !!pid && normalizeRematchVotes(votes).includes(pid);
}
