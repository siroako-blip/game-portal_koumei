"use client";

import Link from "next/link";

type GameEntry = {
  href: string;
  icon: string;
  title: string;
  subtitle: string;
  desc: string;
  /** 上半分パネルのグラデーション */
  panelClass: string;
  /** パネルに薄く散らす装飾アイコン */
  decoIcon: string;
  /** カテゴリバッジ */
  tag: string;
  tagClass: string;
};

const GAMES: GameEntry[] = [
  {
    href: "/elemental",
    icon: "🔮",
    title: "Elemental Paths",
    subtitle: "精霊の道",
    desc: "5つの属性を極めるカード対戦",
    panelClass: "bg-gradient-to-br from-amber-400 via-orange-500 to-red-500",
    decoIcon: "🌿",
    tag: "カード · 2人",
    tagClass: "bg-amber-100 text-amber-800",
  },
  {
    href: "/hitblow",
    icon: "🎯",
    title: "Hit and Blow",
    subtitle: "数字当て推理",
    desc: "ヒントを頼りに4桁を当てる",
    panelClass: "bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500",
    decoIcon: "🔢",
    tag: "推理 · 2人",
    tagClass: "bg-yellow-100 text-yellow-800",
  },
  {
    href: "/nothanks",
    icon: "🎁",
    title: "Cursed Gifts",
    subtitle: "呪いの贈り物",
    desc: "チップで回避か、引き取るか",
    panelClass: "bg-gradient-to-br from-fuchsia-500 via-purple-600 to-purple-900",
    decoIcon: "👻",
    tag: "カード · 3〜5人",
    tagClass: "bg-purple-100 text-purple-800",
  },
  {
    href: "/loveletter",
    icon: "💌",
    title: "Court Intrigue",
    subtitle: "王宮の陰謀",
    desc: "1枚の手札で宮廷を出し抜く",
    panelClass: "bg-gradient-to-br from-rose-500 via-red-600 to-red-900",
    decoIcon: "👑",
    tag: "カード · 2〜4人",
    tagClass: "bg-rose-100 text-rose-800",
  },
  {
    href: "/valuetalk",
    icon: "💬",
    title: "Value Talk",
    subtitle: "たとえ話で伝える",
    desc: "数字をたとえて小さい順に並べる",
    panelClass: "bg-gradient-to-br from-orange-300 via-orange-400 to-amber-500",
    decoIcon: "💭",
    tag: "協力 · ito風",
    tagClass: "bg-orange-100 text-orange-800",
  },
  {
    href: "/midnight",
    icon: "🌙",
    title: "Midnight Party",
    subtitle: "合計値を推理",
    desc: "見えない自分の数字を読み合う",
    panelClass: "bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-800",
    decoIcon: "✨",
    tag: "対戦 · 2〜10人",
    tagClass: "bg-fuchsia-100 text-fuchsia-800",
  },
  {
    href: "/abyss",
    icon: "🤿",
    title: "Abyss Salvage",
    subtitle: "深海探検",
    desc: "酸素を共有し遺跡を持ち帰る",
    panelClass: "bg-gradient-to-br from-cyan-400 via-teal-500 to-blue-800",
    decoIcon: "🫧",
    tag: "ボード · 2〜6人",
    tagClass: "bg-cyan-100 text-cyan-800",
  },
  {
    href: "/secretword",
    icon: "🐺",
    title: "Secret Word",
    subtitle: "ワードウルフ風",
    desc: "1人だけ違うお題を見抜く",
    panelClass: "bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-800",
    decoIcon: "🌲",
    tag: "会話 · 3〜8人",
    tagClass: "bg-emerald-100 text-emerald-800",
  },
];

export default function HomePage() {
  return (
    <div className="portal-grid-bg min-h-screen text-stone-900 relative overflow-hidden">
      {/* ゆっくり漂う装飾オーブ（やわらかい色のにじみ） */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-orange-300/25 blur-3xl animate-drift" />
      <div className="pointer-events-none absolute top-1/3 -right-28 w-96 h-96 rounded-full bg-sky-300/20 blur-3xl animate-drift drift-delay" />
      <div className="pointer-events-none absolute -bottom-28 left-1/4 w-80 h-80 rounded-full bg-fuchsia-300/20 blur-3xl animate-drift" />

      {/* 背景に浮かぶゲームモチーフ（薄く・ゆっくり動く）
          スマホ等の狭い画面ではカードと重なって読みにくいので非表示、sm以上で表示 */}
      <div className="hidden sm:block pointer-events-none absolute inset-0 overflow-hidden select-none" aria-hidden>
        {/* その場で浮遊＋ゆらぎ */}
        <span className="absolute top-[12%] left-[6%] text-6xl opacity-[0.26] animate-float-icon float-d1">🎲</span>
        <span className="absolute top-[24%] right-[10%] text-7xl opacity-[0.24] animate-float-icon float-d3">🃏</span>
        <span className="absolute top-[58%] left-[12%] text-6xl opacity-[0.24] animate-float-icon float-d5">🎯</span>
        <span className="absolute top-[70%] right-[14%] text-7xl opacity-[0.22] animate-float-icon float-d2">🧩</span>
        <span className="absolute top-[42%] left-[46%] text-5xl opacity-[0.20] animate-float-icon float-d6">🎮</span>
        {/* ゆっくり回転 */}
        <span className="absolute top-[85%] left-[40%] text-6xl opacity-[0.24] animate-spin-slow">♠️</span>
        <span className="absolute top-[8%] left-[68%] text-5xl opacity-[0.24] animate-spin-slow float-d4">♦️</span>
        {/* 斜めに横断していく */}
        <span className="absolute bottom-0 left-[20%] text-5xl [--float-opacity:0.28] animate-float-across float-d2">♥️</span>
        <span className="absolute bottom-0 left-[55%] text-6xl [--float-opacity:0.26] animate-float-across float-d5">♣️</span>
        <span className="absolute bottom-0 left-[80%] text-5xl [--float-opacity:0.28] animate-float-across float-d7">🎲</span>
      </div>

      <div className="relative mx-auto max-w-3xl px-4 py-10 md:py-14">
        {/* ヘッダー */}
        <header className="text-center space-y-3 mb-10 fade-in-up">
          <div className="flex justify-center items-end gap-2 text-3xl">
            <span className="animate-bob">🎲</span>
            <span className="text-5xl animate-float drop-shadow">🎮</span>
            <span className="animate-bob bob-delay-2">🃏</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600">
            ゲームポータル
          </h1>
          <p className="text-stone-500 text-sm">遊びたいゲームを選んでください</p>
        </header>

        {/* 2列グリッド */}
        <div className="grid grid-cols-2 gap-3 md:gap-5">
          {GAMES.map((game, i) => (
            <Link
              key={game.href}
              href={game.href}
              className={`group rounded-2xl bg-white border border-stone-200 shadow-sm overflow-hidden
                hover:shadow-xl hover:-translate-y-1 hover:border-stone-300
                active:translate-y-0 active:shadow-md transition-all
                fade-in-up fade-delay-${i + 1} flex flex-col`}
            >
              {/* 上半分：テーマ色パネル */}
              <div
                className={`relative h-24 md:h-28 ${game.panelClass} flex items-center justify-center overflow-hidden`}
              >
                {/* 背景に薄く散らす装飾 */}
                <span className="absolute -top-2 -left-2 text-5xl opacity-15 select-none rotate-12">
                  {game.decoIcon}
                </span>
                <span className="absolute -bottom-3 -right-1 text-6xl opacity-15 select-none -rotate-12">
                  {game.decoIcon}
                </span>
                {/* メインアイコン */}
                <span className="relative text-4xl md:text-5xl drop-shadow-lg group-hover:scale-110 group-hover-wiggle transition-transform">
                  {game.icon}
                </span>
                {/* カテゴリタグ */}
                <span
                  className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${game.tagClass}`}
                >
                  {game.tag}
                </span>
              </div>

              {/* 下半分：白地の情報 */}
              <div className="p-3 md:p-4 flex flex-col gap-0.5 flex-1">
                <span className="text-[11px] font-bold text-stone-400 leading-none">
                  {game.subtitle}
                </span>
                <span className="text-sm md:text-base font-extrabold text-stone-800 leading-snug">
                  {game.title}
                </span>
                <span className="text-xs text-stone-500 mt-1 leading-snug">{game.desc}</span>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-orange-600 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                  あそぶ <span aria-hidden>→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>

        <footer className="mt-10 text-center text-stone-400 text-xs fade-in-up fade-delay-8">
          ※ これは非公式のファンプロジェクトであり、オリジナルのゲームとは関係ありません。
        </footer>
      </div>
    </div>
  );
}
