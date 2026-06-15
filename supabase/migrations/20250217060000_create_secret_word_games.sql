-- Word Wolf 会話ゲーム用テーブル
create table if not exists public.secret_word_games (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  player_ids jsonb not null default '[]',
  game_state jsonb
);

comment on column public.secret_word_games.player_ids is 'プレイヤーIDの配列（先頭がHost）';
comment on column public.secret_word_games.game_state is 'SecretWordGameState（phase, messages, votes, result 等）';

alter table public.secret_word_games enable row level security;

create policy "Allow all for secret_word_games"
  on public.secret_word_games
  for all
  using (true)
  with check (true);
