import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

export function useHitBlowRealtime(gameId: string | null) {
  const [gameData, setGameData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetching = useRef(false);

  useEffect(() => {
    if (!gameId) {
      setLoading(false);
      return;
    }

    const fetchGame = async () => {
      if (isFetching.current) return;
      isFetching.current = true;

      try {
        const { data, error } = await supabase
          .from("hit_blow_games")
          .select("*")
          .eq("id", gameId)
          .single();

        if (error) {
          console.error("Fetch error:", error.message);
        } else if (data) {
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

    fetchGame();

    const channel = supabase
      .channel(`hitblow_${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hit_blow_games", filter: `id=eq.${gameId}` },
        () => fetchGame()
      )
      .subscribe();

    const intervalId = setInterval(fetchGame, 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalId);
    };
  }, [gameId]);

  return { gameData, loading, error };
}
