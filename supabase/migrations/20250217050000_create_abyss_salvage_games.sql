-- Deep Sea Adventure ボードゲーム用テーブル
create table if not exists public.abyss_salvage_games (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  player_ids jsonb not null default '[]',
  game_state jsonb
);

comment on column public.abyss_salvage_games.player_ids is 'プレイヤーIDの配列（先頭がHost）';
comment on column public.abyss_salvage_games.game_state is 'AbyssGameState（oxygen, round, path, players 等）';

alter table public.abyss_salvage_games enable row level security;

create policy "Allow all for abyss_salvage_games"
  on public.abyss_salvage_games
  for all
  using (true)
  with check (true);
