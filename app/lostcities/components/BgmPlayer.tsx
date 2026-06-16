"use client";

import { useEffect, useRef, useState } from "react";
import { SFX_STORAGE_KEY } from "@/app/lostcities/components/sfx";

/**
 * ロストシティ専用のオーディオコントロール（BGM + 効果音のON/OFF）。
 * - BGM音源は public/bgm/lostcities.mp3 を参照（未配置でも無音で落ちないだけ）。
 * - ブラウザの自動再生制限に対応: ON でも最初のユーザー操作（クリック/タップ/キー）で再生開始。
 * - BGMのON/OFFは localStorage("lostcities-bgm")、効果音は localStorage("lostcities-sfx") に記憶。
 *   効果音の実再生は useSfx 側が再生時に同キーを読む（ここはトグル＝書き込みのみ）。
 * - lostcities/layout.tsx に1つだけ置くことで、ロビー⇄対戦画面の遷移でも途切れない。
 * - 画面左下に配置（右下=エモート / 右上=ルールブック との衝突を避ける）。
 */
const BGM_STORAGE_KEY = "lostcities-bgm";
const BGM_SRC = "/bgm/lostcities.mp3";
const BGM_VOLUME = 0.4;

export function BgmPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // BGMを再生したいか（ユーザー設定）。初期値は localStorage 優先、なければ ON。
  const [bgmEnabled, setBgmEnabled] = useState(true);
  // 実際に音が鳴っているか（自動再生がブロックされている間は false）。
  const [bgmPlaying, setBgmPlaying] = useState(false);
  // 効果音のON/OFF（既定 ON）。
  const [sfxEnabled, setSfxEnabled] = useState(true);

  // 初回マウント時に保存済みの設定を反映
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(BGM_STORAGE_KEY) === "off") setBgmEnabled(false);
    if (window.localStorage.getItem(SFX_STORAGE_KEY) === "off") setSfxEnabled(false);
  }, []);

  // bgmEnabled の変化に応じて再生/停止。自動再生がブロックされたら初回操作で再開。
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = BGM_VOLUME;

    if (!bgmEnabled) {
      audio.pause();
      setBgmPlaying(false);
      return;
    }

    let cancelled = false;
    const tryPlay = () => {
      audio
        .play()
        .then(() => {
          if (!cancelled) setBgmPlaying(true);
        })
        .catch(() => {
          if (!cancelled) setBgmPlaying(false);
        });
    };

    tryPlay();

    // 自動再生がブロックされた場合の保険: 最初のユーザー操作で再生
    const onFirstInteraction = () => {
      if (audioRef.current && bgmEnabled) tryPlay();
    };
    window.addEventListener("pointerdown", onFirstInteraction, { once: true });
    window.addEventListener("keydown", onFirstInteraction, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };
  }, [bgmEnabled]);

  const toggleBgm = () => {
    setBgmEnabled((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(BGM_STORAGE_KEY, next ? "on" : "off");
      }
      return next;
    });
  };

  const toggleSfx = () => {
    setSfxEnabled((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SFX_STORAGE_KEY, next ? "on" : "off");
      }
      return next;
    });
  };

  const bgmOn = bgmEnabled && bgmPlaying;

  const btnClass =
    "w-11 h-11 rounded-full bg-white/80 backdrop-blur border border-amber-200 shadow-lg " +
    "text-stone-700 text-xl flex items-center justify-center hover:bg-amber-50 active:translate-y-0.5 transition-all";

  return (
    <>
      {/* loop で連続再生 */}
      <audio ref={audioRef} src={BGM_SRC} loop preload="auto" />
      <div className="fixed bottom-4 left-4 z-50 flex gap-2">
        <button
          type="button"
          onClick={toggleBgm}
          aria-label={bgmEnabled ? "BGMをオフにする" : "BGMをオンにする"}
          title={bgmEnabled ? "BGM: ON" : "BGM: OFF"}
          className={btnClass}
        >
          {bgmOn ? "🎵" : "🔇"}
        </button>
        <button
          type="button"
          onClick={toggleSfx}
          aria-label={sfxEnabled ? "効果音をオフにする" : "効果音をオンにする"}
          title={sfxEnabled ? "効果音: ON" : "効果音: OFF"}
          className={btnClass}
        >
          {sfxEnabled ? "🔔" : "🔕"}
        </button>
      </div>
    </>
  );
}
