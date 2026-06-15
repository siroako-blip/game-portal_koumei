-- Coyote 対戦ゲーム用テーブル
create table if not exists public.midnight_party_games (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  player_ids jsonb not null default '[]',
  game_state jsonb
);

comment on column public.midnight_party_games.player_ids is 'プレイヤーIDの配列（先頭がHost）';
comment on column public.midnight_party_games.game_state is 'MidnightGameState（deck, hands, currentBid, lives 等）';

alter table public.midnight_party_games enable row level security;

create policy "Allow all for midnight_party_games"
  on public.midnight_party_games
  for all
  using (true)
  with check (true);
