-- Poker（テキサスホールデム）対戦ゲーム用テーブル
create table if not exists public.poker_games (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  player_ids jsonb not null default '[]',
  game_state jsonb
);

comment on column public.poker_games.player_ids is 'プレイヤーIDの配列（先頭がHost）';
comment on column public.poker_games.game_state is 'PokerGameState（players, deck, community, pot/blinds, phase 等）';

alter table public.poker_games enable row level security;

create policy "Allow all for poker_games"
  on public.poker_games
  for all
  using (true)
  with check (true);
