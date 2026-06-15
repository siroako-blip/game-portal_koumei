"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type PresenceStatus = "online" | "offline";

/**
 * Supabase Realtime Presence でルーム内の接続ユーザーを監視する共通フック（内部用）。
 * チャンネル名: room_presence_${gameId}
 * track ペイロード: { user_id, online_at }
 * 返り値: 現在オンラインの userId 一覧。
 */
function usePresenceChannel(gameId: string | null, userId: string | null): string[] {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!gameId) return;

    const channelName = `room_presence_${gameId}`;
    const channel = supabase.channel(
      channelName,
      userId ? { config: { presence: { key: userId } } } : { config: {} }
    );

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      setOnlineUsers(Object.keys(state));
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED" && userId) {
        await channel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => {
      if (userId) {
        void channel.untrack();
      }
      supabase.removeChannel(channel);
    };
  }, [gameId, userId]);

  return onlineUsers;
}

/**
 * 2人対戦用のプレゼンスフック（lostcities / hitblow が使用）。
 * 相手・各プレイヤーのオンライン状態を返す。
 */
export function usePresence(
  gameId: string | null,
  userId: string | null,
  player1Id: string | null,
  player2Id: string | null
) {
  const onlineUsers = usePresenceChannel(gameId, userId);

  const opponentStatus = useMemo((): PresenceStatus | null => {
    if (!player1Id || !player2Id) return null;
    if (userId === player1Id) return onlineUsers.includes(player2Id) ? "online" : "offline";
    if (userId === player2Id) return onlineUsers.includes(player1Id) ? "online" : "offline";
    return null;
  }, [userId, player1Id, player2Id, onlineUsers]);

  const player1Status = useMemo((): PresenceStatus | null => {
    if (!player1Id) return null;
    return onlineUsers.includes(player1Id) ? "online" : "offline";
  }, [player1Id, onlineUsers]);

  const player2Status = useMemo((): PresenceStatus | null => {
    if (!player2Id) return null;
    return onlineUsers.includes(player2Id) ? "online" : "offline";
  }, [player2Id, onlineUsers]);

  return { onlineUsers, opponentStatus, player1Status, player2Status };
}

/**
 * 多人数（3人以上）対応のプレゼンスフック。
 * playerIds の各プレイヤーがオンラインかどうかを判定する isOnline を返す。
 */
export function usePresenceMany(
  gameId: string | null,
  userId: string | null
) {
  const onlineUsers = usePresenceChannel(gameId, userId);

  const isOnline = useCallback(
    (playerId: string | null | undefined): boolean =>
      !!playerId && onlineUsers.includes(playerId),
    [onlineUsers]
  );

  return { onlineUsers, isOnline };
}
