import type { ReactNode } from "react";
import { BgmPlayer } from "@/app/poker/components/BgmPlayer";

/**
 * ポーカー配下（ロビー /poker と対戦画面 /poker/game/[id]）共通レイアウト。
 * BGMプレイヤーをここに1つだけ置くことで、クライアント遷移しても音楽が途切れない。
 */
export default function PokerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <BgmPlayer />
    </>
  );
}
