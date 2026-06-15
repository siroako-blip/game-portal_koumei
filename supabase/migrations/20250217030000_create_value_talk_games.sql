-- ito 協力ゲーム用テーブル
create table if not exists public.value_talk_games (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  player_ids jsonb not null default '[]',
  game_state jsonb
);

comment on column public.value_talk_games.player_ids is 'プレイヤーIDの配列（先頭がHost）';
comment on column public.value_talk_games.game_state is 'ValueTalkGameState（theme, life, level, deck, played_cards, players 等）';

alter table public.value_talk_games enable row level security;

create policy "Allow all for value_talk_games"
  on public.value_talk_games
  for all
  using (true)
  with check (true);
