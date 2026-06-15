import { supabase } from "@/lib/supabase";
import type { GameState } from "@/app/elemental/types";
import type { HitBlowGameState } from "@/app/hitblow/types";
import type { NoThanksGameState } from "@/app/nothanks/logic";
import type { LoveLetterGameState } from "@/app/loveletter/logic";
import type { ValueTalkGameState } from "@/app/valuetalk/logic";
import type { MidnightGameState } from "@/app/midnight/logic";
import type { AbyssGameState } from "@/app/abyss/logic";
import type { SecretWordGameState } from "@/app/secretword/logic";

/** lost_cities_games の1行。ゲーム状態は game_state JSON に集約 */
export interface LostCitiesGameRow {
  id: string;
  created_at: string;
  status: "waiting" | "playing" | "finished";
  player1_id: string;
  player2_id: string | null;
  game_state: GameState | null;
}

/** hit_blow_games の1行 */
export interface HitBlowGameRow {
  id: string;
  created_at: string;
  status: "waiting" | "playing" | "finished";
  player1_id: string;
  player2_id: string | null;
  game_state: HitBlowGameState | null;
}

/** DB保存時は selectedCard を null にする（UI専用のため） */
function gameStateForDb(state: GameState): GameState {
  return { ...state, selectedCard: null };
}

/** ゲーム作成（Host） */
export async function createGame(hostId: string): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("lost_cities_games")
    .insert({ player1_id: hostId, status: "waiting" })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

/** 1件取得 */
export async function getGame(gameId: string): Promise<LostCitiesGameRow | null> {
  const { data, error } = await supabase
    .from("lost_cities_games")
    .select("*")
    .eq("id", gameId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as LostCitiesGameRow;
}

/** 参加（Join）：player2_id をセット */
export async function joinGame(gameId: string, guestId: string): Promise<void> {
  const { error } = await supabase
    .from("lost_cities_games")
    .update({ player2_id: guestId })
    .eq("id", gameId)
    .is("player2_id", null);
  if (error) throw error;
}

/** ゲーム状態を更新（プレイ・ドロー時）。game_state を丸ごと更新 */
export async function updateGameState(gameId: string, state: GameState): Promise<void> {
  const { error } = await supabase
    .from("lost_cities_games")
    .update({
      game_state: gameStateForDb(state),
      status: state.deck.length === 0 ? "finished" : "playing",
    })
    .eq("id", gameId);
  if (error) throw error;
}

/** ゲーム開始：初期状態を game_state に書き込む */
export async function startGame(gameId: string, initialState: GameState): Promise<void> {
  const { error } = await supabase
    .from("lost_cities_games")
    .update({
      game_state: gameStateForDb(initialState),
      status: "playing",
    })
    .eq("id", gameId);
  if (error) throw error;
}

// ---------- Hit and Blow ----------

/** Hit and Blow ゲーム作成（Host） */
export async function createHitBlowGame(hostId: string): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("hit_blow_games")
    .insert({ player1_id: hostId, status: "waiting" })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

/** Hit and Blow 1件取得 */
export async function getHitBlowGame(gameId: string): Promise<HitBlowGameRow | null> {
  const { data, error } = await supabase
    .from("hit_blow_games")
    .select("*")
    .eq("id", gameId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as HitBlowGameRow;
}

/** Hit and Blow 参加（Join）：player2_id をセット */
export async function joinHitBlowGame(gameId: string, guestId: string): Promise<void> {
  const { error } = await supabase
    .from("hit_blow_games")
    .update({ player2_id: guestId })
    .eq("id", gameId)
    .is("player2_id", null);
  if (error) throw error;
}

/** Hit and Blow ゲーム開始：game_state を書き込む */
export async function startHitBlowGame(gameId: string, initialState: HitBlowGameState): Promise<void> {
  const { error } = await supabase
    .from("hit_blow_games")
    .update({
      game_state: initialState,
      status: "playing",
    })
    .eq("id", gameId);
  if (error) throw error;
}

/** Hit and Blow ゲーム状態を更新（秘密設定・予想送信時など） */
export async function updateHitBlowGameState(gameId: string, state: HitBlowGameState): Promise<void> {
  const { error } = await supabase
    .from("hit_blow_games")
    .update({
      game_state: state,
      status: state.winner ? "finished" : "playing",
    })
    .eq("id", gameId);
  if (error) throw error;
}

// ---------- No Thanks! ----------

/** no_thanks_games の1行（3〜5人用） */
export interface NoThanksGameRow {
  id: string;
  created_at: string;
  status: "waiting" | "playing" | "finished";
  player_ids: string[];
  game_state: NoThanksGameState | null;
}

/** No Thanks! ゲーム作成（Host） */
export async function createNoThanksGame(hostId: string): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("no_thanks_games")
    .insert({ player_ids: [hostId], status: "waiting" })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

/** No Thanks! 1件取得 */
export async function getNoThanksGame(gameId: string): Promise<NoThanksGameRow | null> {
  const { data, error } = await supabase
    .from("no_thanks_games")
    .select("*")
    .eq("id", gameId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  const row = data as { player_ids: string[] | unknown };
  return {
    ...data,
    player_ids: Array.isArray(row.player_ids) ? row.player_ids : [],
  } as NoThanksGameRow;
}

/** No Thanks! 参加（Join）：player_ids に追加。最大5人まで */
export async function joinNoThanksGame(gameId: string, guestId: string): Promise<void> {
  const existing = await getNoThanksGame(gameId);
  if (!existing || existing.status !== "waiting") throw new Error("参加できません");
  if (existing.player_ids.length >= 5) throw new Error("このゲームは満員です");
  if (existing.player_ids.includes(guestId)) return; // 既に参加済み
  const nextIds = [...existing.player_ids, guestId];
  const { error } = await supabase
    .from("no_thanks_games")
    .update({ player_ids: nextIds })
    .eq("id", gameId);
  if (error) throw error;
}

/** No Thanks! ゲーム開始：game_state を書き込む（3人以上で開始） */
export async function startNoThanksGame(gameId: string, initialState: NoThanksGameState): Promise<void> {
  const { error } = await supabase
    .from("no_thanks_games")
    .update({
      game_state: initialState,
      status: "playing",
    })
    .eq("id", gameId);
  if (error) throw error;
}

/** No Thanks! ゲーム状態を更新 */
export async function updateNoThanksGameState(gameId: string, state: NoThanksGameState): Promise<void> {
  const { error } = await supabase
    .from("no_thanks_games")
    .update({
      game_state: state,
      status: state.phase === "finished" ? "finished" : "playing",
    })
    .eq("id", gameId);
  if (error) throw error;
}

// ---------- Love Letter ----------

/** love_letter_games の1行（2〜4人用） */
export interface LoveLetterGameRow {
  id: string;
  created_at: string;
  status: "waiting" | "playing" | "finished";
  player_ids: string[];
  game_state: LoveLetterGameState | null;
}

/** Love Letter ゲーム作成（Host） */
export async function createLoveLetterGame(hostId: string): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("love_letter_games")
    .insert({ player_ids: [hostId], status: "waiting" })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

/** Love Letter 1件取得 */
export async function getLoveLetterGame(gameId: string): Promise<LoveLetterGameRow | null> {
  const { data, error } = await supabase
    .from("love_letter_games")
    .select("*")
    .eq("id", gameId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  const row = data as { player_ids: string[] | unknown };
  return {
    ...data,
    player_ids: Array.isArray(row.player_ids) ? row.player_ids : [],
  } as LoveLetterGameRow;
}

/** Love Letter 参加（Join）：player_ids に追加。最大4人まで */
export async function joinLoveLetterGame(gameId: string, guestId: string): Promise<void> {
  const existing = await getLoveLetterGame(gameId);
  if (!existing || existing.status !== "waiting") throw new Error("参加できません");
  if (existing.player_ids.length >= 4) throw new Error("このゲームは満員です");
  if (existing.player_ids.includes(guestId)) return;
  const nextIds = [...existing.player_ids, guestId];
  const { error } = await supabase
    .from("love_letter_games")
    .update({ player_ids: nextIds })
    .eq("id", gameId);
  if (error) throw error;
}

/** Love Letter ゲーム開始（2人以上で開始） */
export async function startLoveLetterGame(gameId: string, initialState: LoveLetterGameState): Promise<void> {
  const { error } = await supabase
    .from("love_letter_games")
    .update({
      game_state: initialState,
      status: "playing",
    })
    .eq("id", gameId);
  if (error) throw error;
}

/** Love Letter ゲーム状態を更新 */
export async function updateLoveLetterGameState(gameId: string, state: LoveLetterGameState): Promise<void> {
  const { error } = await supabase
    .from("love_letter_games")
    .update({
      game_state: state,
      status: state.phase === "finished" ? "finished" : "playing",
    })
    .eq("id", gameId);
  if (error) throw error;
}

// ---------- ito ----------

/** value_talk_games の1行 */
export interface ValueTalkGameRow {
  id: string;
  created_at: string;
  status: "waiting" | "playing" | "finished";
  player_ids: string[];
  game_state: ValueTalkGameState | null;
}

/** ito ゲーム作成（Host） */
export async function createValueTalkGame(hostId: string): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("value_talk_games")
    .insert({ player_ids: [hostId], status: "waiting" })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

/** ito 1件取得 */
export async function getValueTalkGame(gameId: string): Promise<ValueTalkGameRow | null> {
  const { data, error } = await supabase
    .from("value_talk_games")
    .select("*")
    .eq("id", gameId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  const row = data as { player_ids: string[] | unknown };
  return {
    ...data,
    player_ids: Array.isArray(row.player_ids) ? row.player_ids : [],
  } as ValueTalkGameRow;
}

/** ito 参加（Join）：player_ids に追加 */
export async function joinValueTalkGame(gameId: string, guestId: string): Promise<void> {
  const existing = await getValueTalkGame(gameId);
  if (!existing || existing.status !== "waiting") throw new Error("参加できません");
  if (existing.player_ids.includes(guestId)) return;
  const nextIds = [...existing.player_ids, guestId];
  const { error } = await supabase
    .from("value_talk_games")
    .update({ player_ids: nextIds })
    .eq("id", gameId);
  if (error) throw error;
}

/** ito ゲーム開始（2人以上推奨だが1人でも開始可） */
export async function startValueTalkGame(gameId: string, initialState: ValueTalkGameState): Promise<void> {
  const { error } = await supabase
    .from("value_talk_games")
    .update({
      game_state: initialState,
      status: "playing",
    })
    .eq("id", gameId);
  if (error) throw error;
}

/** ito ゲーム状態を更新 */
export async function updateValueTalkGameState(gameId: string, state: ValueTalkGameState): Promise<void> {
  const { error } = await supabase
    .from("value_talk_games")
    .update({
      game_state: state,
      status: state.phase === "gameover" ? "finished" : "playing",
    })
    .eq("id", gameId);
  if (error) throw error;
}

// ---------- Coyote ----------

/** midnight_party_games の1行 */
export interface MidnightPartyGameRow {
  id: string;
  created_at: string;
  status: "waiting" | "playing" | "finished";
  player_ids: string[];
  game_state: MidnightGameState | null;
}

/** Coyote ゲーム作成（Host） */
export async function createMidnightPartyGame(hostId: string): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("midnight_party_games")
    .insert({ player_ids: [hostId], status: "waiting" })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

/** Coyote 1件取得 */
export async function getMidnightPartyGame(gameId: string): Promise<MidnightPartyGameRow | null> {
  const { data, error } = await supabase
    .from("midnight_party_games")
    .select("*")
    .eq("id", gameId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  const row = data as { player_ids: string[] | unknown };
  return {
    ...data,
    player_ids: Array.isArray(row.player_ids) ? row.player_ids : [],
  } as MidnightPartyGameRow;
}

/** Coyote 参加（Join）：player_ids に追加 */
export async function joinMidnightPartyGame(gameId: string, guestId: string): Promise<void> {
  const existing = await getMidnightPartyGame(gameId);
  if (!existing || existing.status !== "waiting") throw new Error("参加できません");
  if (existing.player_ids.includes(guestId)) return;
  const nextIds = [...existing.player_ids, guestId];
  const { error } = await supabase
    .from("midnight_party_games")
    .update({ player_ids: nextIds })
    .eq("id", gameId);
  if (error) throw error;
}

/** Coyote ゲーム開始（2〜10人） */
export async function startMidnightPartyGame(
  gameId: string,
  initialState: MidnightGameState
): Promise<void> {
  const { error } = await supabase
    .from("midnight_party_games")
    .update({
      game_state: initialState,
      status: "playing",
    })
    .eq("id", gameId);
  if (error) throw error;
}

/** Coyote ゲーム状態を更新 */
export async function updateMidnightPartyGameState(
  gameId: string,
  state: MidnightGameState
): Promise<void> {
  const { error } = await supabase
    .from("midnight_party_games")
    .update({
      game_state: state,
      status: state.phase === "gameover" ? "finished" : "playing",
    })
    .eq("id", gameId);
  if (error) throw error;
}

// ---------- Deep Sea Adventure ----------

/** abyss_salvage_games の1行 */
export interface AbyssSalvageGameRow {
  id: string;
  created_at: string;
  status: "waiting" | "playing" | "finished";
  player_ids: string[];
  game_state: AbyssGameState | null;
}

/** Deep Sea Adventure ゲーム作成（Host） */
export async function createAbyssSalvageGame(hostId: string): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("abyss_salvage_games")
    .insert({ player_ids: [hostId], status: "waiting" })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

/** Deep Sea Adventure 1件取得 */
export async function getAbyssSalvageGame(gameId: string): Promise<AbyssSalvageGameRow | null> {
  const { data, error } = await supabase
    .from("abyss_salvage_games")
    .select("*")
    .eq("id", gameId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  const row = data as { player_ids: string[] | unknown };
  return {
    ...data,
    player_ids: Array.isArray(row.player_ids) ? row.player_ids : [],
  } as AbyssSalvageGameRow;
}

/** Deep Sea Adventure 参加（Join）：player_ids に追加 */
export async function joinAbyssSalvageGame(gameId: string, guestId: string): Promise<void> {
  const existing = await getAbyssSalvageGame(gameId);
  if (!existing || existing.status !== "waiting") throw new Error("参加できません");
  if (existing.player_ids.includes(guestId)) return;
  const nextIds = [...existing.player_ids, guestId];
  const { error } = await supabase
    .from("abyss_salvage_games")
    .update({ player_ids: nextIds })
    .eq("id", gameId);
  if (error) throw error;
}

/** Deep Sea Adventure ゲーム開始（2〜6人） */
export async function startAbyssSalvageGame(
  gameId: string,
  initialState: AbyssGameState
): Promise<void> {
  const { error } = await supabase
    .from("abyss_salvage_games")
    .update({
      game_state: initialState,
      status: "playing",
    })
    .eq("id", gameId);
  if (error) throw error;
}

/** Deep Sea Adventure ゲーム状態を更新 */
export async function updateAbyssSalvageGameState(
  gameId: string,
  state: AbyssGameState
): Promise<void> {
  const { error } = await supabase
    .from("abyss_salvage_games")
    .update({
      game_state: state,
      status: state.phase === "gameover" ? "finished" : "playing",
    })
    .eq("id", gameId);
  if (error) throw error;
}

// ---------- Word Wolf ----------

/** secret_word_games の1行 */
export interface SecretWordGameRow {
  id: string;
  created_at: string;
  status: "waiting" | "playing" | "finished";
  player_ids: string[];
  game_state: SecretWordGameState | null;
}

/** Word Wolf ゲーム作成（Host） */
export async function createSecretWordGame(hostId: string): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("secret_word_games")
    .insert({ player_ids: [hostId], status: "waiting" })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

/** Word Wolf 1件取得 */
export async function getSecretWordGame(gameId: string): Promise<SecretWordGameRow | null> {
  const { data, error } = await supabase
    .from("secret_word_games")
    .select("*")
    .eq("id", gameId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  const row = data as { player_ids: string[] | unknown };
  return {
    ...data,
    player_ids: Array.isArray(row.player_ids) ? row.player_ids : [],
  } as SecretWordGameRow;
}

/** Word Wolf 参加（Join）：player_ids に追加 */
export async function joinSecretWordGame(gameId: string, guestId: string): Promise<void> {
  const existing = await getSecretWordGame(gameId);
  if (!existing || existing.status !== "waiting") throw new Error("参加できません");
  if (existing.player_ids.includes(guestId)) return;
  const nextIds = [...existing.player_ids, guestId];
  const { error } = await supabase
    .from("secret_word_games")
    .update({ player_ids: nextIds })
    .eq("id", gameId);
  if (error) throw error;
}

/** Word Wolf ゲーム開始（3〜8人） */
export async function startSecretWordGame(
  gameId: string,
  initialState: SecretWordGameState
): Promise<void> {
  const { error } = await supabase
    .from("secret_word_games")
    .update({
      game_state: initialState,
      status: "playing",
    })
    .eq("id", gameId);
  if (error) throw error;
}

/** Word Wolf ゲーム状態を更新 */
export async function updateSecretWordGameState(
  gameId: string,
  state: SecretWordGameState
): Promise<void> {
  const { error } = await supabase
    .from("secret_word_games")
    .update({
      game_state: state,
      status: state.phase === "result" ? "finished" : "playing",
    })
    .eq("id", gameId);
  if (error) throw error;
}
