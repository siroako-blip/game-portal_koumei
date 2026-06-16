"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ポーカー専用のBGMコントロール（BGMのみ。効果音はなし）。
 * - 音源は public/bgm/poker.mp3 を参照（未配置でも無音で落ちないだけ）。
 * - ブラウザの自動再生制限に対応: ON でも最初のユーザー操作（クリック/タップ/キー）で再生開始。
 * - ON/OFF は localStorage("poker-bgm") に記憶。
 * - poker/layout.tsx に1つだけ置くことで、ロビー⇄対戦画面の遷移でも途切れない。
 * - 画面左下に配置（右上=ルールブック との衝突を避ける）。
 */
const BGM_STORAGE_KEY = "poker-bgm";
const BGM_SRC = "/bgm/poker.mp3";
const BGM_VOLUME = 0.4;

export function BgmPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [bgmEnabled, setBgmEnabled] = useState(true);
  const [bgmPlaying, setBgmPlaying] = useState(false);

  // 初回マウント時に保存済み設定を反映
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(BGM_STORAGE_KEY) === "off") setBgmEnabled(false);
  }, []);

  // bgmEnabled に応じて再生/停止。自動再生がブロックされたら初回操作で再開。
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

  const bgmOn = bgmEnabled && bgmPlaying;

  return (
    <>
      {/* loop で連続再生 */}
      <audio ref={audioRef} src={BGM_SRC} loop preload="auto" />
      <div className="fixed bottom-4 left-4 z-50">
        <button
          type="button"
          onClick={toggleBgm}
          aria-label={bgmEnabled ? "BGMをオフにする" : "BGMをオンにする"}
          title={bgmEnabled ? "BGM: ON" : "BGM: OFF"}
          className="w-11 h-11 rounded-full bg-emerald-900/80 backdrop-blur border border-amber-400/60 shadow-lg text-amber-200 text-xl flex items-center justify-center hover:bg-emerald-800 active:translate-y-0.5 transition-all"
        >
          {bgmOn ? "🎵" : "🔇"}
        </button>
      </div>
    </>
  );
}
