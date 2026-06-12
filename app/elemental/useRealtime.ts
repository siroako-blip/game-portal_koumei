import { useCallback, useEffect, useState, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type EmotePayload = { emoji: string };

export type UseGameRealtimeOptions = {
  onReceiveEmote?: (payload: EmotePayload) => void;
};

export function useGameRealtime(
  gameId: string | null,
  options?: UseGameRealtimeOptions
) {
  const [gameData, setGameData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetching = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onReceiveEmoteRef = useRef(options?.onReceiveEmote);
  onReceiveEmoteRef.current = options?.onReceiveEmote;

  useEffect(() => {
    if (!gameId) {
      setLoading(false);
      return;
    }

    // データを強制的に取りに行く関数
    const fetchGame = async () => {
      if (isFetching.current) return;
      isFetching.current = true;

      try {
        const { data, error } = await supabase
          .from("lost_cities_games")
          .select("*")
          .eq("id", gameId)
          .single();

        if (error) {
           console.error("Fetch error:", error.message);
        } else if (data) {
           // データに変更があれば更新（画面がチラつくのを防ぐ判定付き）
           setGameData((prev: any) => {
             if (JSON.stringify(prev) !== JSON.stringify(data)) {
               return data;
             }
             return prev;
           });
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
        isFetching.current = false;
      }
    };

    // 1. 初回実行
    fetchGame();

    // 2. リアルタイム監視（postgres_changes + broadcast）
    const channel = supabase
      .channel(`room_${gameId}`, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lost_cities_games", filter: `id=eq.${gameId}` },
        () => fetchGame()
      )
      .on(
        "broadcast",
        { event: "emote" },
        (payload: any) => {
          const data = payload?.payload as EmotePayload | undefined;
          if (data?.emoji) {
            onReceiveEmoteRef.current?.(data);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // 3. 【最強の保険】1秒ごとに強制チェック
    const intervalId = setInterval(fetchGame, 1000);

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
      clearInterval(intervalId);
    };
  }, [gameId]);

  const sendEmote = useCallback((emoji: string) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "emote",
      payload: { emoji },
    });
  }, []);

  return { gameData, loading, error, sendEmote };
}