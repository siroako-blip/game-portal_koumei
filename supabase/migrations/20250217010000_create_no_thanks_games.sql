-- No Thanks! 用テーブル（3〜5人）
create table if not exists public.no_thanks_games (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  player_ids jsonb not null default '[]',
  game_state jsonb
);

comment on column public.no_thanks_games.player_ids is 'プレイヤーIDの配列（先頭がHost）。3〜5人';
comment on column public.no_thanks_games.game_state is 'NoThanksGameState（deck, currentCard, potChips, playerChips, playerCards 等）';

alter table public.no_thanks_games enable row level security;

create policy "Allow all for no_thanks_games"
  on public.no_thanks_games
  for all
  using (true)
  with check (true);
