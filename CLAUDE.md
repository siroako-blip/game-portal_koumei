# CLAUDE.md

このファイルは、このリポジトリで作業する際の開発方針・規約をまとめたものです。
コードを変更する前に必ず目を通してください。

## プロジェクト概要

複数の定番ボードゲームをオンラインで対戦できる**ゲームポータル**です。
トップページ（`app/page.tsx`）から各ゲームを選び、Supabase Realtime を使ってリアルタイム対戦します。

> ⚠️ フォルダ名は「lost city」ですが、現在は単一ゲームではなく**マルチゲームのポータル**に発展しています。
> `README.md` はロストシティ単体だった頃の記述が一部残っており古い箇所があります。実装の正は本ファイルとコードです。

収録ゲーム（`app/<game>/` のディレクトリ名 → 表示名）:

| ディレクトリ | 表示名 | 人数 | DBテーブル |
| --- | --- | --- | --- |
| `lostcities` | Lost Cities（ロストシティ） | 2人 | `lost_cities_games` |
| `hitblow` | Hit and Blow | 2人 | `hit_blow_games` |
| `nothanks` | No Thanks! | 3〜5人 | `no_thanks_games` |
| `loveletter` | Love Letter | 2〜4人 | `love_letter_games` |
| `ito` | ito | 協力 | `ito_games` |
| `coyote` | Coyote | 2〜10人 | `coyote_games` |
| `deepsea` | Deep Sea Adventure | 2〜6人 | `deep_sea_games` |
| `wordwolf` | Word Wolf | 3〜8人 | `word_wolf_games` |
| `poker` | Poker（テキサスホールデム） | 2〜6人 | `poker_games` |

> ℹ️ ディレクトリ名・コード識別子・DBテーブル名はすべて正式名称に統一済み。旧コードネーム（`value_talk_games` / `midnight_party_games` / `abyss_salvage_games` / `secret_word_games`）から `supabase/migrations/20260615000000_rename_codename_tables.sql` でリネームした。**この rename SQL は本番 Supabase の SQL Editor で実行する必要がある**（実行前は旧テーブル名のまま）。

## 技術スタック

- **Next.js 14（App Router）** + React 18
- **TypeScript**（`strict: true`）
- **Tailwind CSS 3**
- **Supabase**（`@supabase/supabase-js`）— DB + Realtime + Presence
- パスエイリアス: `@/*` → リポジトリルート（例: `@/lib/supabase`、`@/app/lostcities/types`）

## ディレクトリ構成

```
app/
  page.tsx              ... ポータル（ゲーム一覧）。新規ゲームは GAMES 配列に追加
  layout.tsx            ... ルートレイアウト（lang="ja"、viewport 設定）
  globals.css           ... 全ゲーム共通の背景・アニメーション定義
  <game>/
    page.tsx            ... ロビー（Host作成 / Join参加）
    game/[id]/page.tsx  ... 対戦画面（状態同期・操作UI）
    logic.ts            ... 純粋なゲームロジック + 状態型（GameState）
    useRealtime.ts      ... そのゲーム用の Realtime 購読フック
    types.ts            ... 型定義（logic.ts に同梱するゲームもある）
    components/         ... そのゲーム専用のUI部品（必要な場合のみ）
lib/
  supabase.ts           ... Supabase クライアント（シングルトン）
  gameDb.ts             ... 全ゲームの CRUD（create/get/join/start/update）を集約
  usePresence.ts        ... 接続状態監視（usePresence=2人用 / usePresenceMany=多人数用）
components/
  PresenceDot.tsx       ... オンライン/オフライン表示ドット
  RuleBook.tsx          ... ルール説明モーダル（RuleBookGameType で対象ゲームを指定）
supabase/migrations/    ... ゲームごとの CREATE TABLE SQL
```

**1ゲーム = 1フォルダで自己完結**が基本方針です。ゲーム間で共有するのは `lib/` と `components/` のみ。

## アーキテクチャの中核パターン

新しいゲームを足すときも既存ゲームを直すときも、以下のパターンに揃えてください。

### 1. 状態は `game_state`（JSONB）に集約

- ゲームの全状態を1つの `GameState` オブジェクトにまとめ、DB 行の `game_state` カラム（jsonb）に丸ごと保存する。
- DB 行のトップレベルは固定スキーマ: `id` / `created_at` / `status` / プレイヤーID / `game_state`。
  - 2人用ゲーム: `player1_id` / `player2_id`（`lostcities`, `hitblow`）
  - 多人数ゲーム: `player_ids`（jsonb 配列、**先頭が Host**）
- `status` は `'waiting' | 'playing' | 'finished'` の3値。

### 2. `logic.ts` は純粋関数

- ロジックは副作用なしの純粋関数で書く（DB アクセスや React に依存しない）。
- 状態を進める関数は**新しい state を返す**（イミュータブル更新。`{ ...state, ... }`）。
- **不正な操作には例外を投げず `null` を返す**（手番違い・フェーズ違いなど）。呼び出し側は `null` なら何もしない。
- 初期状態生成 `createInitial...State()`、再戦 `restartGame()` も logic.ts に置く。
- ランダムは `shuffle()`（Fisher–Yates）を各 logic.ts に内包。

### 3. DB アクセスは `lib/gameDb.ts` 経由

- ゲームごとに `create / get / join / start / update...GameState` 関数を用意し、命名・実装を既存に揃える。
- `get` は `PGRST116`（行なし）を `null` に変換する。
- `update...GameState` は state を見て `status` を `finished` に切り替える（終了判定はゲームごとに異なる: `deck` が空 / `phase === 'finished'` / `winner` あり 等）。
- `join` は `status !== 'waiting'`・満員・参加済みをチェックしてから `player_ids` に追記。

### 4. Realtime は「購読 + ポーリング + 差分検知」

各ゲームの `useRealtime.ts` は同じ形:

- `supabase.channel('<game>_<id>').on('postgres_changes', ...)` で購読し、変更時に再取得。
- 加えて `setInterval(fetchGame, 1000)` の**1秒ポーリングを保険として併用**（Realtime 取りこぼし対策）。
- 取得データは `JSON.stringify` で前回と比較し、**変化がなければ state を更新しない**（不要な再描画防止）。
- `isFetching` ref で多重フェッチを防ぐ。`player_ids` は `Array.isArray` で正規化。
- クリーンアップで `removeChannel` と `clearInterval` を必ず行う。

### 5. プレイヤー識別は localStorage / URL の `pid`

- ログイン機構はない。ロビーで `crypto.randomUUID()` 等で `playerId` を生成し、`?pid=...` で対戦画面に渡す。
- 接続状態は `usePresence`（2人用）/ `usePresenceMany`（多人数用）で Presence チャンネル（`room_presence_<id>`）を監視。

### 6. Supabase テーブル（マイグレーション）

`supabase/migrations/` に `YYYYMMDDHHMMSS_create_<table>.sql` を追加:

- `id uuid primary key default gen_random_uuid()`、`created_at timestamptz default now()`、`status` に CHECK 制約。
- 多人数は `player_ids jsonb not null default '[]'`、状態は `game_state jsonb`。
- **RLS を有効化し、現状は allow-all ポリシー**（認証なしのカジュアル用途のため）。カラムに `comment` を付ける。

## コーディング規約

- 画面・フックを含むクライアントコンポーネントの先頭に `"use client";`。`logic.ts` と `gameDb.ts` は付けない。
- **コメント・UIテキストは日本語**。意図や注意点（モバイル対応・排他制御など）を簡潔に残す。
- TypeScript は strict。配列アクセスの `noUncheckedIndexedAccess` 的な書き方（`arr[i]!`、`?? 0`）に倣う。
- import は `@/...` のエイリアスを使う（相対パスの `../../` を避ける）。
- Tailwind ユーティリティでスタイリング。共通アニメ（`fade-in-up`, `animate-float`, `animate-bob` など）は `globals.css` 定義を再利用。
- 各画面に「← ゲーム選択に戻る」リンクと、フッターに非公式ファンプロジェクトの免責文を入れる（既存に倣う）。

## 新しいゲームを追加する手順

1. `supabase/migrations/` にテーブル作成 SQL を追加（Supabase の SQL Editor で実行 + Realtime 有効化）。
2. `app/<game>/logic.ts` に `GameState` 型と純粋関数群を実装。
3. `lib/gameDb.ts` に `Row` 型と `create/get/join/start/update...GameState` を追加。
4. `app/<game>/useRealtime.ts` を既存からコピーしてテーブル名・チャンネル名を変更。
5. `app/<game>/page.tsx`（ロビー）と `app/<game>/game/[id]/page.tsx`（対戦画面）を実装。
6. `app/page.tsx` の `GAMES` 配列にエントリ（href・アイコン・色・人数タグ等）を追加。
7. 必要なら `components/RuleBook.tsx` の `RuleBookGameType` とルール文を追加。

## コマンド

```bash
npm install
cp .env.example .env.local   # NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY を設定
npm run dev      # 開発サーバ（http://localhost:3000）
npm run build    # 本番ビルド
npm run start    # 本番起動
npm run lint     # next lint
```

## 開発ログ（DEVLOG.md）と履歴の扱い

- **過去の経緯（なぜこう変わってきたか）が必要なときだけ** `DEVLOG.md` を読む。通常の作業では読み込まない（トークン節約）。「今どうなっているか」は本ファイルとコードが正。
- **節目となる開発を終えたら `DEVLOG.md` のいちばん上に追記する**（逆時系列）。フォーマットは `DEVLOG.md` 冒頭参照。「何を・なぜ」を1〜数行で。細かな修正は不要、方針転換・機能追加・大きなリファクタなど節目のみ。

## コミットメッセージ規約

- 1行目は **`<種別>: 日本語で要約`**（50字目安）。種別: `feat`（機能追加）/ `fix`（バグ修正）/ `refactor` / `style`（見た目・整形）/ `docs` / `chore`。
- **何を変えたかが一目で分かる具体的な要約**にする（例: `feat: No Thanks! にオンライン表示を追加`）。`Fix typescript error` のような曖昧・重複するメッセージは避ける。
- 必要なら2行目以降（空行を挟む）に **なぜ** を補足。
- 関連する節目は `DEVLOG.md` への追記とセットで行う。

## 注意事項

- `.env.local` はコミットしない（`.gitignore` 済み）。Supabase の URL / anon key が必要。
- DB のセキュリティは現状 allow-all。**機密データを扱わない**前提のカジュアル対戦用途。
- このプロジェクトは非公式のファンプロジェクトであり、オリジナルゲームとは無関係。
