"use client";

import { useState, useCallback } from "react";

export type RuleBookGameType = "loveletter" | "valuetalk" | "midnight" | "abyss" | "nothanks";

const RULE_CONTENT: Record<
  RuleBookGameType,
  { title: string; subtitle?: string; sections: { heading: string; body: React.ReactNode }[] }
> = {
  loveletter: {
    title: "Court Intrigue (Love Letter)",
    subtitle: "王宮の陰謀 — 2〜4人",
    sections: [
      {
        heading: "目的",
        body: (
          <p>
            手札はいつも1枚だけ。毎ターン山札から1枚引いて2枚のうち1枚を場に出し、その効果で他のプレイヤーを脱落させていく。<strong>最後まで生き残る</strong>か、山札が尽きたときに<strong>一番強い（数字が大きい）カード</strong>を持っていた人が勝ちです。
          </p>
        ),
      },
      {
        heading: "手番の流れ",
        body: (
          <ul className="list-disc pl-5 space-y-2 text-stone-700">
            <li>① 山札から1枚引く（手札が2枚になる）。</li>
            <li>② 2枚のうち1枚を選んで場に出し、その効果を発動する。</li>
            <li>③ 次の人へ。誰か1人になるか山札が尽きるまで繰り返す。</li>
          </ul>
        ),
      },
      {
        heading: "カード効果（全16枚）",
        body: (
          <ul className="list-disc pl-5 space-y-2 text-stone-700">
            <li><strong>8 姫 ×1:</strong> 場に出す（捨てる）と即脱落。</li>
            <li><strong>7 大臣 ×1:</strong> 手札に王(6)か王子(5)が一緒にあるときは、必ず大臣を出す。</li>
            <li><strong>6 王 ×1:</strong> 相手1人と手札を交換する。</li>
            <li><strong>5 王子 ×2:</strong> 自分か誰か1人を選び、手札を捨てさせて1枚引き直させる。姫を捨てさせたら、その人は脱落。</li>
            <li><strong>4 僧侶 ×2:</strong> 次の自分の番まで、他人の効果を受けない（保護）。</li>
            <li><strong>3 男爵 ×2:</strong> 相手1人と手札を見せ合い、数字が小さい方が脱落（同数なら両者セーフ）。</li>
            <li><strong>2 神父 ×2:</strong> 相手1人の手札をこっそり見る。</li>
            <li><strong>1 兵士 ×5:</strong> 相手1人の手札（2〜8）を予想。当たればその人を脱落させる。</li>
          </ul>
        ),
      },
      {
        heading: "補足",
        body: (
          <p>
            僧侶(4)で保護されている相手は指名できません。指名できる相手が誰もいない（全員保護中など）ときは、効果なしでそのカードを捨てるだけになります。
          </p>
        ),
      },
    ],
  },
  valuetalk: {
    title: "Value Talk",
    subtitle: "数字をたとえ話で伝える協力ゲーム",
    sections: [
      {
        heading: "目的",
        body: (
          <p>
            全員で協力するゲーム。1〜100のカードを配り、お題に沿った「たとえ話」だけを頼りに、場に<strong>小さい順</strong>でカードを出していきます。
          </p>
        ),
      },
      {
        heading: "手札の配り方",
        body: (
          <p>
            2人なら3枚ずつ、3人なら2枚ずつ、4人は2枚と1枚を混ぜて、5人以上は1枚ずつ。カードの数字は<strong>自分だけ</strong>が見えます。
          </p>
        ),
      },
      {
        heading: "基本ルール",
        body: (
          <ul className="list-disc pl-5 space-y-2 text-stone-700">
            <li><strong>数字そのものを言ってはいけない。</strong></li>
            <li>お題（例：「動物の大きさ」）に沿った言葉で、数字の大きさを表現する。</li>
            <li>「フキダシ」に入力してアピールしよう。</li>
            <li>一番小さいと思った人からカードを出していく。</li>
          </ul>
        ),
      },
      {
        heading: "失敗条件",
        body: (
          <p>
            出したカードより小さい数字を、まだ誰かが持っていたら失敗。<strong>ライフが1減り</strong>、その小さいカードは捨てられます（出したカードは場に残ります）。
          </p>
        ),
      },
      {
        heading: "進行と勝敗",
        body: (
          <ul className="list-disc pl-5 space-y-2 text-stone-700">
            <li>全員が手札を出し切ると<strong>レベルクリア</strong>＝次のレベルへ（手札を配り直し）。</li>
            <li>ライフ（最初は3）が0になると<strong>ゲームオーバー</strong>。</li>
            <li>「お題を変える」は1ゲームに1回だけ使える。</li>
          </ul>
        ),
      },
    ],
  },
  midnight: {
    title: "Midnight Party",
    subtitle: "コヨーテ風・合計値を推理してビッド — 2〜10人",
    sections: [
      {
        heading: "目的",
        body: (
          <p>
            場にいる全員のカード合計を推理し、「合計はこの数字以上ある」と数字を宣言し合うゲーム。前の人より大きい数字を宣言するか、無理だと思ったら「Midnight!」でチャレンジします。
          </p>
        ),
      },
      {
        heading: "自分のカードだけ見えない",
        body: (
          <p>
            他人のカードはすべて見えますが、<strong>自分のカードだけは見えません。</strong>見えている情報から、全員の合計値を推理します。
          </p>
        ),
      },
      {
        heading: "手番の選択",
        body: (
          <ul className="list-disc pl-5 space-y-2 text-stone-700">
            <li>① 前の人より大きい数字を宣言する。</li>
            <li>② 「Midnight!」でチャレンジする（直前の宣言者と勝負）。</li>
          </ul>
        ),
      },
      {
        heading: "勝敗（チャレンジ時）",
        body: (
          <ul className="list-disc pl-5 space-y-2 text-stone-700">
            <li>実際の合計を公開する。</li>
            <li><strong>合計 &lt; 宣言値</strong> → 言い過ぎ。<strong>宣言した人</strong>の負け。</li>
            <li><strong>合計 ≥ 宣言値</strong> → 宣言は妥当。<strong>チャレンジした人</strong>の負け。</li>
            <li>負けた人はライフを1失う。</li>
          </ul>
        ),
      },
      {
        heading: "カード構成",
        body: (
          <p>
            数字カードは <strong>10〜80（10刻み）</strong>。マイナスカードは <strong>−10 と −20</strong>。0 のカードもあります。
          </p>
        ),
      },
      {
        heading: "特殊カードと計算順序",
        body: (
          <ul className="list-disc pl-5 space-y-2 text-stone-700">
            <li><strong>? (Mystery):</strong> 山札から1枚引いてその値を加える（特殊カードを引いたら0）。</li>
            <li><strong>MAX=0 (Night):</strong> 場で一番大きい数字カード1枚を0にする。</li>
            <li><strong>x2 (Double):</strong> 合計を2倍にする（複数あればその数だけ重ねて2倍）。</li>
            <li className="text-stone-500">計算順は <strong>? → MAX=0 → 合計 → x2</strong> の順。</li>
          </ul>
        ),
      },
      {
        heading: "ライフ",
        body: <p>ライフは最初3つ。0になると脱落。最後の1人になったら勝ちです。</p>,
      },
    ],
  },
  abyss: {
    title: "Abyss Salvage",
    subtitle: "深海探検・酸素を共有して帰還 — 2〜6人",
    sections: [
      {
        heading: "目的",
        body: (
          <p>
            共有の酸素が尽きる前に、海底の遺跡（お宝）を拾って潜水艦に持ち帰る。これを<strong>全3ラウンド</strong>くり返し、合計得点が一番高い人が勝ちです。
          </p>
        ),
      },
      {
        heading: "酸素ルール（重要）",
        body: (
          <ul className="list-disc pl-5 space-y-2 text-stone-700">
            <li><strong>酸素は全員で共有（最初は25）。</strong></li>
            <li>自分のターン開始時、<strong>「今持っているお宝の数」だけ酸素が減る。</strong></li>
            <li>酸素が0になるとラウンド終了。そのとき潜水艦に<strong>戻れていない人はお宝を全部失う</strong>（戻れている人は得点化できる）。</li>
          </ul>
        ),
      },
      {
        heading: "手番の流れ",
        body: (
          <ul className="list-disc pl-5 space-y-2 text-stone-700">
            <li>① 酸素を消費する。</li>
            <li>② 進む向きを決める（潜る／戻る）。</li>
            <li>③ サイコロ2個（各1〜3）を振って移動する。</li>
            <li>④ 止まったマスでお宝を1つ拾う、または手持ちを1つ置く（任意・1回まで）。</li>
          </ul>
        ),
      },
      {
        heading: "移動ルール",
        body: (
          <ul className="list-disc pl-5 space-y-2 text-stone-700">
            <li>進める数 ＝ サイコロの出目 −「持っているお宝の数」（最低0）。</li>
            <li><strong>他人がいるマスは飛び越える（カウントしない）。</strong></li>
          </ul>
        ),
      },
      {
        heading: "帰り道とラウンド",
        body: (
          <p>
            一度「戻る」を選ぶと、もう深くは潜れません。潜水艦まで戻ればそのラウンドは帰還成功。海に落とされたお宝は<strong>3枚1組</strong>になって深部に置かれ、次のラウンドで拾えます。全3ラウンド終了時の合計点で勝負します。
          </p>
        ),
      },
    ],
  },
  nothanks: {
    title: "Cursed Gifts (No Thanks!)",
    subtitle: "呪いの贈り物を押し付け合うゲーム — 3〜5人",
    sections: [
      {
        heading: "目的",
        body: (
          <p>
            カードの数字はマイナス点、チップはプラス点。連番のカードは「最小の数字だけ」マイナスになる。最終スコア（チップ − カード合計）が最も高い人が勝ちです。
          </p>
        ),
      },
      {
        heading: "流れ",
        body: (
          <ul className="list-disc pl-5 space-y-2 text-stone-700">
            <li>3〜5人でプレイ。カードは3〜35のうち24枚を使用（9枚は除外）。</li>
            <li>各自チップ11枚スタート。場に1枚カードが表向きで出る。</li>
            <li>手番では「チップを1枚払ってパス」か「そのカード（＋場のチップ）を引き取る」のどちらか。</li>
            <li>チップが0の人はパスできないので、必ずカードを取る。</li>
            <li>山札がなくなり、最後のカードが誰かに取られたらゲーム終了。</li>
          </ul>
        ),
      },
      {
        heading: "得点",
        body: (
          <p>
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
      <button
        type="button"
        onClick={toggle}
        className="fixed top-4 right-4 z-40 w-10 h-10 rounded-full bg-white/95 border-2 border-stone-300 shadow-md flex items-center justify-center text-stone-600 hover:bg-stone-50 hover:border-stone-400 text-lg font-bold"
        aria-label="ルールを開く"
      >
        ?
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={toggle}
            aria-hidden
          />
          <div
            className="fixed inset-4 sm:inset-8 md:inset-10 z-50 flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden max-w-2xl mx-auto max-h-[85vh]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rulebook-title"
          >
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-stone-50">
              <h2 id="rulebook-title" className="text-lg font-bold text-stone-800">
                {content.title}
                {content.subtitle && (
                  <span className="block text-sm font-normal text-stone-500 mt-0.5">
                    {content.subtitle}
                  </span>
                )}
              </h2>
              <button
                type="button"
                onClick={toggle}
                className="w-9 h-9 rounded-full border border-stone-300 text-stone-600 hover:bg-stone-100 flex items-center justify-center text-lg font-bold"
                aria-label="閉じる"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-stone-800">
              <div className="space-y-6">
                {content.sections.map((section, i) => (
                  <section key={i}>
                    <h3 className="text-base font-bold text-stone-900 mb-2 border-b border-stone-200 pb-1">
                      {section.heading}
                    </h3>
                    <div className="text-sm sm:text-base leading-relaxed">
                      {section.body}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
