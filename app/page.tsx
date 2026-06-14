"use client";

import Link from "next/link";

type GameEntry = {
  href: string;
  icon: string;
  title: string;
  desc: string;
  cardClass: string;
  titleClass: string;
  descClass: string;
  iconBgClass: string;
};

const GAMES: GameEntry[] = [
  {
    href: "/elemental",
    icon: "🔮",
    title: "Elemental Paths (Card Game)",
    desc: "精霊の道 — 5つの属性を極めるカード対戦",
    cardClass:
      "bg-stone-100 border-amber-700/50 hover:bg-amber-50 hover:border-amber-600",
    titleClass: "text-stone-900 group-hover:text-amber-800",
    descClass: "text-stone-600",
    iconBgClass: "bg-amber-200/70",
  },
  {
    href: "/hitblow",
    icon: "🎯",
    title: "Hit and Blow (Logic Game)",
    desc: "数字当て推理ゲーム — 2人対戦",
    cardClass:
      "bg-stone-100 border-amber-700/50 hover:bg-amber-50 hover:border-amber-600",
    titleClass: "text-stone-900 group-hover:text-amber-800",
    descClass: "text-stone-600",
    iconBgClass: "bg-orange-200/70",
  },
  {
    href: "/nothanks",
    icon: "🎁",
    title: "Cursed Gifts (No Thanks!)",
    desc: "呪いの贈り物 — 3〜5人用",
    cardClass:
      "bg-purple-950/80 border-purple-700/50 hover:bg-purple-900/80 hover:border-purple-600",
    titleClass: "text-purple-100 group-hover:text-purple-200",
    descClass: "text-purple-300",
    iconBgClass: "bg-purple-800/80",
  },
  {
    href: "/loveletter",
    icon: "💌",
    title: "Court Intrigue (Love Letter)",
    desc: "王宮の陰謀 — 2〜4人用",
    cardClass:
      "bg-red-950/80 border-amber-700/50 hover:bg-red-900/80 hover:border-amber-600",
    titleClass: "text-amber-100 group-hover:text-amber-50",
    descClass: "text-amber-200/90",
    iconBgClass: "bg-red-900/80",
  },
  {
    href: "/valuetalk",
    icon: "💬",
    title: "Value Talk (協力)",
    desc: "数字をたとえ話で伝える ito風ゲーム",
    cardClass:
      "bg-orange-100 border-orange-300 hover:bg-orange-50 hover:border-orange-400",
    titleClass: "text-orange-900 group-hover:text-orange-800",
    descClass: "text-orange-600",
    iconBgClass: "bg-orange-200/80",
  },
  {
    href: "/midnight",
    icon: "🌙",
    title: "Midnight Party (対戦)",
    desc: "合計値を推理してビッド — コヨーテ風 2〜10人",
    cardClass:
      "bg-purple-950/80 border-fuchsia-600/50 hover:bg-purple-900/80 hover:border-fuchsia-500",
    titleClass: "text-fuchsia-200 group-hover:text-fuchsia-100",
    descClass: "text-purple-300",
    iconBgClass: "bg-fuchsia-900/70",
  },
  {
    href: "/abyss",
    icon: "🤿",
    title: "Abyss Salvage (ボード)",
    desc: "深海探検 — 遺跡を拾い酸素を共有して帰還 2〜6人",
    cardClass:
      "bg-slate-900/90 border-cyan-600/50 hover:bg-slate-800 hover:border-cyan-500",
    titleClass: "text-cyan-200 group-hover:text-cyan-100",
    descClass: "text-cyan-300/90",
    iconBgClass: "bg-cyan-900/70",
  },
  {
    href: "/secretword",
    icon: "🐺",
    title: "Secret Word (会話)",
    desc: "ワードウルフ風 — お題を推理してウルフを当てる 3〜8人",
    cardClass:
      "bg-emerald-950/90 border-emerald-600/50 hover:bg-emerald-900/80 hover:border-emerald-500",
    titleClass: "text-emerald-200 group-hover:text-emerald-100",
    descClass: "text-emerald-300/90",
    iconBgClass: "bg-emerald-900/70",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col p-6 gap-8 items-center justify-center bg-gradient-to-b from-stone-100 to-orange-50/60 text-stone-900">
      <div className="text-center space-y-3 fade-in-up">
        <div className="flex justify-center items-end gap-2 text-4xl">
          <span className="animate-bob">🎲</span>
          <span className="text-6xl animate-float drop-shadow-lg">🏰</span>
          <span className="animate-bob bob-delay-2">🃏</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold drop-shadow-sm tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-orange-600 to-rose-600">
          ゲームポータル
        </h1>
        <p className="text-stone-600 text-sm md:text-base">
          ✨ 遊びたいゲームを選んでください ✨
        </p>
      </div>

      <div className="w-full max-w-md flex flex-col gap-4">
        {GAMES.map((game, i) => (
          <Link
            key={game.href}
            href={game.href}
            className={`w-full px-5 py-4 rounded-xl border-4 shadow-lg transition-all text-left group
              hover:-translate-y-1 hover:shadow-xl active:translate-y-0 active:shadow-md
              fade-in-up fade-delay-${i + 1} flex items-center gap-4 ${game.cardClass}`}
          >
            <span
              className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner
                group-hover-wiggle group-hover:scale-110 transition-transform ${game.iconBgClass}`}
            >
              {game.icon}
            </span>
            <span className="min-w-0">
              <span className={`block text-lg md:text-xl font-bold ${game.titleClass}`}>
                {game.title}
              </span>
              <span className={`block text-sm mt-0.5 ${game.descClass}`}>{game.desc}</span>
            </span>
            <span className="ml-auto text-2xl opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
              ▶️
            </span>
          </Link>
        ))}
      </div>

      <footer className="mt-8 text-center text-stone-500 text-xs max-w-md px-4 fade-in-up fade-delay-8">
        ※ これは非公式のファンプロジェクトであり、オリジナルのゲームとは関係ありません。
      </footer>
    </div>
  );
}
