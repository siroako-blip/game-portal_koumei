-- Love Letter 用テーブル（2〜4人）
create table if not exists public.love_letter_games (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  player_ids jsonb not null default '[]',
  game_state jsonb
);

comment on column public.love_letter_games.player_ids is 'プレイヤーIDの配列（先頭がHost）。2〜4人';
comment on column public.love_letter_games.game_state is 'LoveLetterGameState（deck, players, turnIndex 等）';

alter table public.love_letter_games enable row level security;

create policy "Allow all for love_letter_games"
  on public.love_letter_games
  for all
  using (true)
  with check (true);
