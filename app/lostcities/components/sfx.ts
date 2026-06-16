"use client";

import { useCallback, useRef } from "react";

/**
 * ロストシティの効果音（SFX）再生フック。
 * - 音源は public/sfx/*.mp3 を参照（未配置でも無音で落ちないだけ）。
 * - ON/OFF は localStorage("lostcities-sfx") を再生のたびに読むため、
 *   BgmPlayer 側のトグルと即座に同期する（"off" のとき無音）。
 * - 同じ音が重なっても切れないよう、キャッシュした要素を cloneNode して鳴らす。
 */
export type SfxKey = "select" | "play" | "discard" | "draw";

const SFX_SRC: Record<SfxKey, string> = {
  select: "/sfx/select.mp3", // 手札を選ぶ
  play: "/sfx/play.mp3", // 道にカードを出す
  discard: "/sfx/discard.mp3", // カードを捨てる
  draw: "/sfx/draw.mp3", // 山札・捨て札から引く
};

export const SFX_STORAGE_KEY = "lostcities-sfx";
const VOLUME = 0.5;

export function useSfx() {
  // キーごとの「原本」Audio をキャッシュ（再ダウンロードを避ける）
  const protos = useRef<Partial<Record<SfxKey, HTMLAudioElement>>>({});

  return useCallback((key: SfxKey) => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(SFX_STORAGE_KEY) === "off") return;

    let proto = protos.current[key];
    if (!proto) {
      proto = new Audio(SFX_SRC[key]);
      proto.preload = "auto";
      protos.current[key] = proto;
    }
    // clone して鳴らすことで連続再生・重なりに対応（再生後は自然にGC）
    const node = proto.cloneNode(true) as HTMLAudioElement;
    node.volume = VOLUME;
    void node.play().catch(() => {
      /* 自動再生制限や未配置時は黙って無視 */
    });
  }, []);
}
