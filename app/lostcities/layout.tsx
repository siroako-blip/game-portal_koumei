import type { ReactNode } from "react";
import { BgmPlayer } from "@/app/lostcities/components/BgmPlayer";

/**
 * ロストシティ配下（ロビー /lostcities と対戦画面 /lostcities/game/[id]）共通レイアウト。
 * BGMプレイヤーをここに1つだけ置くことで、クライアント遷移しても音楽が途切れない。
 */
export default function LostCitiesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <BgmPlayer />
    </>
  );
}
