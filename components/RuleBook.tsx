"use client";

import { useState, useCallback } from "react";

// 全ゲーム共通のルールブック。見た目・書き方は Lost Cities のルールモーダルに統一している
// （amber 基調・絵文字付き見出し・「理解した！」フッター）。
// 新しいゲームを追加するときは RuleBookGameType と RULE_CONTENT にエントリを足し、
// 各ゲームのロビー/対戦画面で <RuleBook gameType="..." /> を置くだけでよい。
export type RuleBookGameType =
  | "lostcities"
  | "hitblow"
  | "wordwolf"
  | "loveletter"
  | "ito"
  | "coyote"
  | "deepsea"
  | "nothanks";

// よく使うスタイル（各 body 内で再利用）
const UL = "list-disc pl-5 space-y-2 text-stone-700";
const OL = "list-decimal pl-5 space-y-2 text-stone-700";
const KEY = "font-bold text-stone-900"; // 用語の強調
const HI = "text-amber-700 font-bold"; // 数値・条件の強調

const RULE_CONTENT: Record<
  RuleBookGameType,
  { title: string; subtitle?: string; sections: { heading: string; body: React.ReactNode }[] }
> = {
  lostcities: {
    title: "Lost Cities（ロストシティ）",
    subtitle: "属性の道を切り拓く2人用カードゲーム",
    sections: [
      {
        heading: "🎯 目的",
        body: (
          <p className="text-stone-700">
            5つの属性（<span className="text-red-500">🔥火</span>・<span className="text-blue-500">💧水</span>・
            <span className="text-emerald-600">🍃風</span>・<span className="text-amber-600">⛰️土</span>・
            <span className="text-stone-500">✨光</span>）の「道」にカードを並べ、スコアを競います。
            <br />
            各道には<span className="text-red-600 font-bold">コスト（-20点）</span>がかかり、途中で止めると赤字になります。
          </p>
        ),
      },
      {
        heading: "🎴 カードの種類と出し方",
        body: (
          <ul className={UL}>
            <li>
              <span className={KEY}>数字カード (2〜10):</span> 自分の道に出すときは、
              <span className={HI}>小さい数字から大きい数字の順（昇順）</span>にしか出せません。
            </li>
            <li>
              <span className={KEY}>契約カード (🤝):</span> 得点を倍にするカード。
              <span className={HI}>その道に数字カードを出す前</span>にのみ出せます。1枚で2倍、2枚で3倍、3枚で4倍。
            </li>
          </ul>
        ),
      },
      {
        heading: "🔄 ターンの流れ",
        body: (
          <ol className={OL}>
            <li><span className={KEY}>カードを1枚出す:</span> 自分の道に置くか、捨て札置き場に捨てる。</li>
            <li><span className={KEY}>カードを1枚引く:</span> 山札か、自分が直前に捨てた属性以外の捨て札から引く。</li>
          </ol>
        ),
      },
      {
        heading: "🏆 得点計算",
        body: (
          <>
            <div className="bg-amber-50 p-3 rounded-xl border-2 border-amber-200 font-mono text-sm text-stone-800">
              (数字の合計 − 20) × (契約の枚数 + 1)
            </div>
            <p className="text-stone-700 mt-2 text-xs">
              道に8枚以上あるとボーナス <span className="text-emerald-600">+20点</span>。1枚も置いていない道は 0点（コストもなし）です。山札が尽きたら終了し、合計点の高い人が勝ち。
            </p>
          </>
        ),
      },
    ],
  },
  hitblow: {
    title: "Hit and Blow（ヒットアンドブロー）",
    subtitle: "相手の4桁の数字を推理する2人対戦",
    sections: [
      {
        heading: "🎯 目的",
        body: (
          <p className="text-stone-700">
            相手が決めた<strong>秘密の4桁の数字</strong>を、ヒントを頼りに先に正確に当てた方が勝ちです。
          </p>
        ),
      },
      {
        heading: "🔢 準備",
        body: (
          <p className="text-stone-700">
            各自が <span className={HI}>0〜9 を使った4桁の数字</span>を1つ決めます。
            同じ数字は2回使えません（<span className={HI}>重複なし</span>）。両者が決めるとゲーム開始です。
          </p>
        ),
      },
      {
        heading: "🔄 手番の流れ",
        body: (
          <ul className={UL}>
            <li>先攻（Player 1）から<strong>交互に</strong>、相手の数字を予想して入力する。</li>
            <li>毎回、結果として <span className={KEY}>Hit</span> と <span className={KEY}>Blow</span> の数が返る。</li>
            <li>ターン数に制限はありません。ヒントを積み重ねて絞り込みます。</li>
          </ul>
        ),
      },
      {
        heading: "💡 Hit と Blow",
        body: (
          <ul className={UL}>
            <li><span className={KEY}>Hit（H）:</span> 数字も位置も合っている桁の数。</li>
            <li><span className={KEY}>Blow（B）:</span> 数字は合っているが位置が違う桁の数。</li>
            <li className="text-stone-500">例: 秘密 <strong>1234</strong> に <strong>1243</strong> と予想 → <strong>2H 2B</strong>（1と2がHit、3と4がBlow）。</li>
          </ul>
        ),
      },
      {
        heading: "🏆 勝敗",
        body: (
          <p className="text-stone-700">
            先に <span className={HI}>4 Hit（全桁的中）</span>を出した方の勝ち（サドンデス）です。
          </p>
        ),
      },
    ],
  },
  wordwolf: {
    title: "Word Wolf（ワードウルフ）",
    subtitle: "少数派のウルフを探す会話ゲーム — 3〜8人",
    sections: [
      {
        heading: "🎯 目的",
        body: (
          <p className="text-stone-700">
            全員に似たお題が配られますが、<strong>1人だけ違うお題（ウルフ）</strong>。
            市民はウルフを見つけて追放するのが目標、ウルフは最後まで市民に紛れるのが目標です。
          </p>
        ),
      },
      {
        heading: "🐺 役割と準備",
        body: (
          <ul className={UL}>
            <li><span className={HI}>3〜8人</span>でプレイ。ランダムで<strong>1人だけがウルフ</strong>になります。</li>
            <li>各自に単語が配られる。市民は多数派の単語、ウルフだけ少し違う単語。</li>
            <li>自分の単語は<strong>自分だけ</strong>が見え、自分がどちらの役かは分かりません。</li>
          </ul>
        ),
      },
      {
        heading: "💬 ゲームの流れ",
        body: (
          <ul className={UL}>
            <li>制限時間（既定<span className={HI}>3分</span>）の中で、お題について会話する。</li>
            <li>単語そのものは言わず、「赤いよね」など特徴で探り合う。</li>
            <li>時間切れ、またはホストの終了操作で投票へ進みます。</li>
          </ul>
        ),
      },
      {
        heading: "🗳️ 投票と勝敗",
        body: (
          <ul className={UL}>
            <li>全員が「噛み合わない＝怪しい人」に1票投じる（<strong>自分には投票不可</strong>）。</li>
            <li><span className={KEY}>最多得票者</span>が追放され、正体が公開される。</li>
            <li>追放されたのが<strong>ウルフなら市民の勝ち</strong>、<strong>市民ならウルフの勝ち</strong>。</li>
          </ul>
        ),
      },
    ],
  },
  loveletter: {
    title: "Love Letter（ラブレター）",
    subtitle: "1枚の手札で出し抜く心理戦 — 2〜4人",
    sections: [
      {
        heading: "🎯 目的",
        body: (
          <p className="text-stone-700">
            手札はいつも1枚だけ。毎ターン山札から1枚引いて2枚のうち1枚を場に出し、その効果で他のプレイヤーを脱落させます。
            <strong>最後まで生き残る</strong>か、山札が尽きたときに<strong>一番強い（数字が大きい）カード</strong>を持っていた人が勝ち。
            同数なら<span className={HI}>これまでの捨て札の数字合計が大きい人</span>の勝ちです。
          </p>
        ),
      },
      {
        heading: "🔄 手番の流れ",
        body: (
          <ul className={UL}>
            <li>① 山札から1枚引く（手札が2枚になる）。</li>
            <li>② 2枚のうち1枚を選んで場に出し、その効果を発動する。</li>
            <li>③ 次の人へ。誰か1人になるか山札が尽きるまで繰り返す。</li>
          </ul>
        ),
      },
      {
        heading: "🎴 カード効果（全16枚）",
        body: (
          <ul className={UL}>
            <li><span className={KEY}>8 姫 ×1:</span> 場に出す（捨てる）と即脱落。</li>
            <li><span className={KEY}>7 大臣 ×1:</span> 手札に王(6)か王子(5)が一緒にあるときは、必ず大臣を出す。</li>
            <li><span className={KEY}>6 王 ×1:</span> 相手1人と手札を交換する。</li>
            <li><span className={KEY}>5 王子 ×2:</span> 自分か誰か1人を選び、手札を捨てさせて1枚引き直させる。<span className={HI}>姫を捨てさせたら、その人は脱落（引き直しもできない）。</span></li>
            <li><span className={KEY}>4 僧侶 ×2:</span> 次の自分の番まで、他人の効果を受けない（保護）。</li>
            <li><span className={KEY}>3 男爵 ×2:</span> 相手1人と手札を見せ合い、数字が小さい方が脱落（同数なら両者セーフ）。</li>
            <li><span className={KEY}>2 神父 ×2:</span> 相手1人の手札をこっそり見る。</li>
            <li><span className={KEY}>1 兵士 ×5:</span> 相手1人の手札（2〜8）を予想。当たればその人を脱落させる。</li>
          </ul>
        ),
      },
      {
        heading: "📝 補足",
        body: (
          <p className="text-stone-700">
            僧侶(4)で保護されている相手は指名できません。指名できる相手が誰もいない（全員保護中など）ときは、効果なしでそのカードを捨てるだけになります。
          </p>
        ),
      },
    ],
  },
  ito: {
    title: "ito（イト）",
    subtitle: "数字をたとえ話で伝える協力ゲーム",
    sections: [
      {
        heading: "🎯 目的",
        body: (
          <p className="text-stone-700">
            全員で協力するゲーム。1〜100のカードを配り、お題に沿った「たとえ話」だけを頼りに、場に<strong>小さい順</strong>でカードを出していきます。
          </p>
        ),
      },
      {
        heading: "🃏 手札の配り方",
        body: (
          <p className="text-stone-700">
            2人なら3枚ずつ、3人なら2枚ずつ、4人は2枚と1枚を混ぜて、5人以上は1枚ずつ。カードの数字は<strong>自分だけ</strong>が見えます。
          </p>
        ),
      },
      {
        heading: "📋 基本ルール",
        body: (
          <ul className={UL}>
            <li><span className={KEY}>数字そのものを言ってはいけない。</span></li>
            <li>お題（例：「動物の大きさ」）に沿った言葉で、数字の大きさを表現する。</li>
            <li>「フキダシ」に入力してアピールしよう。</li>
            <li>一番小さいと思った人からカードを出していく。</li>
          </ul>
        ),
      },
      {
        heading: "💥 失敗条件",
        body: (
          <p className="text-stone-700">
            出したカードより小さい数字を、まだ誰かが持っていたら失敗。<strong>ライフが1減り</strong>、その小さいカードは捨てられます（出したカードは場に残ります）。
          </p>
        ),
      },
      {
        heading: "🔄 進行と勝敗",
        body: (
          <ul className={UL}>
            <li>全員が手札を出し切ると<strong>レベルクリア</strong>＝次のレベルへ（手札を配り直し）。</li>
            <li>ライフ（最初は3）が0になると<strong>ゲームオーバー</strong>。</li>
            <li>「お題を変える」は1ゲームに1回だけ使える。</li>
            <li className="text-stone-500">ホストは難易度を選べ、難易度に応じて出題の傾向が変わります。</li>
          </ul>
        ),
      },
    ],
  },
  coyote: {
    title: "Coyote（コヨーテ）",
    subtitle: "合計値を推理してビッド — 2〜10人",
    sections: [
      {
        heading: "🎯 目的",
        body: (
          <p className="text-stone-700">
            場にいる全員のカード合計を推理し、「合計はこの数字以上ある」と数字を宣言し合うゲーム。前の人より大きい数字を宣言するか、無理だと思ったら<strong>「Coyote!」</strong>でチャレンジします。
          </p>
        ),
      },
      {
        heading: "👁️ 自分のカードだけ見えない",
        body: (
          <p className="text-stone-700">
            他人のカードはすべて見えますが、<strong>自分のカードだけは見えません。</strong>見えている情報から、全員の合計値を推理します。
          </p>
        ),
      },
      {
        heading: "🔄 手番の選択",
        body: (
          <ul className={UL}>
            <li>① 前の人より大きい数字を宣言する。</li>
            <li>②「Coyote!」でチャレンジする（直前の宣言者と勝負）。</li>
          </ul>
        ),
      },
      {
        heading: "🏆 勝敗（チャレンジ時）",
        body: (
          <ul className={UL}>
            <li>実際の合計を公開する。</li>
            <li><span className={HI}>合計 &lt; 宣言値</span> → 言い過ぎ。<strong>宣言した人</strong>の負け。</li>
            <li><span className={HI}>合計 ≥ 宣言値</span> → 宣言は妥当。<strong>チャレンジした人</strong>の負け。</li>
            <li>負けた人はライフを1失う。</li>
          </ul>
        ),
      },
      {
        heading: "🎴 カード構成",
        body: (
          <p className="text-stone-700">
            数字カードは <strong>10〜80（10刻み）</strong>。マイナスカードは <strong>−10 ×2・−20 ×2</strong>。0 のカードもあります。
          </p>
        ),
      },
      {
        heading: "✨ 特殊カードと計算順序",
        body: (
          <ul className={UL}>
            <li><span className={KEY}>? (Mystery):</span> 山札から1枚引いてその値を加える（特殊カードを引いたら0）。</li>
            <li><span className={KEY}>MAX=0 (Night):</span> 場の数字（引いた ? の値も含む）で一番大きいもの1枚を0にする。</li>
            <li><span className={KEY}>x2 (Double):</span> 合計を2倍にする（複数あればその数だけ重ねて2倍）。</li>
            <li className="text-stone-500">計算順は <strong>? → MAX=0 → 合計 → x2</strong> の順。</li>
          </ul>
        ),
      },
      {
        heading: "❤️ ライフ",
        body: <p className="text-stone-700">ライフは最初3つ。0になると脱落。最後の1人になったら勝ちです。</p>,
      },
    ],
  },
  deepsea: {
    title: "Deep Sea Adventure（深海探検）",
    subtitle: "酸素を共有して帰還 — 2〜6人",
    sections: [
      {
        heading: "🎯 目的",
        body: (
          <p className="text-stone-700">
            共有の酸素が尽きる前に、海底の遺跡（お宝）を拾って潜水艦に持ち帰る。これを<strong>全3ラウンド</strong>くり返し、合計得点が一番高い人が勝ちです。
          </p>
        ),
      },
      {
        heading: "🫧 酸素ルール（重要）",
        body: (
          <ul className={UL}>
            <li><span className={KEY}>酸素は全員で共有（最初は25）。</span></li>
            <li>自分のターン開始時、<strong>「今持っているお宝の数」だけ酸素が減る。</strong></li>
            <li>酸素が0になるとラウンド終了。そのとき潜水艦に<strong>戻れていない人はお宝を全部失う</strong>（戻れている人は得点化できる）。</li>
          </ul>
        ),
      },
      {
        heading: "🔄 手番の流れ",
        body: (
          <ul className={UL}>
            <li>① 酸素を消費する。</li>
            <li>② 進む向きを決める（潜る／戻る）。</li>
            <li>③ サイコロ2個（各1〜3）を振って移動する。</li>
            <li>④ 止まったマスでお宝を1つ拾う、または手持ちを1つ置く（任意・1回まで）。</li>
          </ul>
        ),
      },
      {
        heading: "👣 移動ルール",
        body: (
          <ul className={UL}>
            <li>進める数 ＝ サイコロの出目 −「持っているお宝の数」（最低0）。</li>
            <li><strong>他人がいるマスは飛び越える（カウントしない）。</strong></li>
          </ul>
        ),
      },
      {
        heading: "🔙 帰り道とラウンド",
        body: (
          <p className="text-stone-700">
            一度「戻る」を選ぶと、もう深くは潜れません。潜水艦まで戻ればそのラウンドは帰還成功。海に落とされたお宝は<strong>3枚1組</strong>になって深部に置かれ、次のラウンドで拾えます。全3ラウンド終了時の合計点で勝負します。
          </p>
        ),
      },
    ],
  },
  nothanks: {
    title: "No Thanks!（ノーサンキュー）",
    subtitle: "カードを押し付け合うゲーム — 3〜5人",
    sections: [
      {
        heading: "🎯 目的",
        body: (
          <p className="text-stone-700">
            カードの数字はマイナス点、チップはプラス点。連番のカードは「最小の数字だけ」マイナスになる。最終スコア（チップ − カード合計）が最も高い人が勝ちです。
          </p>
        ),
      },
      {
        heading: "🔄 流れ",
        body: (
          <ul className={UL}>
            <li>3〜5人でプレイ。カードは3〜35のうち24枚を使用（9枚は除外）。</li>
            <li>各自チップ11枚スタート。場に1枚カードが表向きで出る。</li>
            <li>手番では「チップを1枚払ってパス」か「そのカード（＋場のチップ）を引き取る」のどちらか。</li>
            <li>チップが0の人はパスできないので、必ずカードを取る。</li>
            <li>山札がなくなり、最後のカードが誰かに取られたらゲーム終了。</li>
          </ul>
        ),
      },
      {
        heading: "🏆 得点",
        body: (
          <p className="text-stone-700">
            獲得したカードは連番ごとに「最小の数字1つ」だけマイナスにカウント。残ったチップ1枚＝＋1点。最終スコア ＝ 残りチップ − カード合計（マイナス点）です。
          </p>
        ),
      },
    ],
  },
};

export function RuleBook({ gameType }: { gameType: RuleBookGameType }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((o) => !o), []);
  const content = RULE_CONTENT[gameType];

  return (
    <>
      {/* ルールを開くボタン（画面右上に固定） */}
      <button
        type="button"
        onClick={toggle}
        className="fixed top-3 right-3 z-40 px-3 py-1.5 rounded-full border-2 border-amber-300 bg-amber-50/95 text-amber-800 font-bold hover:bg-amber-100 text-sm shadow-md"
        aria-label="ルールを開く"
      >
        📜 ルール
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div
            className="bg-white text-stone-900 rounded-2xl border border-amber-200 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rulebook-title"
          >
            {/* ヘッダー */}
            <div className="bg-amber-100 p-4 border-b border-amber-200 flex justify-between items-center flex-shrink-0">
              <h2 id="rulebook-title" className="text-lg sm:text-xl font-extrabold text-amber-800">
                📜 {content.title} — ルール
                {content.subtitle && (
                  <span className="block text-xs sm:text-sm font-normal text-stone-500 mt-0.5">
                    {content.subtitle}
                  </span>
                )}
              </h2>
              <button
                onClick={toggle}
                className="p-1 hover:bg-amber-200/80 rounded-full transition-colors flex-shrink-0"
                aria-label="閉じる"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 本文 */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-sm md:text-base leading-relaxed">
              {content.sections.map((section, i) => (
                <section key={i}>
                  <h3 className="text-amber-800 font-bold mb-2 text-lg border-b-2 border-amber-200 pb-1">
                    {section.heading}
                  </h3>
                  <div>{section.body}</div>
                </section>
              ))}
            </div>

            {/* フッター */}
            <div className="bg-amber-100 p-4 border-t border-amber-200 text-center flex-shrink-0">
              <button
                onClick={toggle}
                className="px-8 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl font-bold transition-all shadow-lg border-b-4 border-orange-700 active:border-b-0 active:translate-y-1"
              >
                理解した！
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
