-- 旧コードネームのDBテーブル名を正式ゲーム名へリネーム
-- ディレクトリ/コード識別子は既に正式名に統一済み。DBテーブルだけ旧名が残っていたため、
-- 既存の lost_cities_games / hit_blow_games 等の命名規約（読みやすい名前の snake_case + _games）に合わせる。
--
-- ⚠️ Supabase の SQL Editor で実行すること。
--    テーブルの rename は OID を保持するため、RLS・Realtime publication の設定はそのまま引き継がれる。
--    （もし Realtime が止まる場合は Database → Replication で対象テーブルを再追加すること）
--
-- このスクリプトは冪等（idempotent）。途中まで実行済み・本番のポリシー名がマイグレーションと異なる場合でも
-- 安全に再実行できる:
--   - 旧テーブルが残っていればリネーム、既にリネーム済みなら何もしない（IF EXISTS 相当のチェック）
--   - ポリシーは名前に依存せず「対象テーブルの既存ポリシーを全削除 → 正式名で allow-all を貼り直し」

do $$
declare
  m record;
  p record;
begin
  for m in
    select * from (values
      ('value_talk_games',    'ito_games'),       -- ito
      ('midnight_party_games', 'coyote_games'),    -- coyote / Coyote
      ('abyss_salvage_games',  'deep_sea_games'),  -- deepsea / Deep Sea Adventure
      ('secret_word_games',    'word_wolf_games')  -- wordwolf / Word Wolf
    ) as t(old_name, new_name)
  loop
    -- 旧テーブルが残っていればリネーム
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = m.old_name) then
      execute format('alter table public.%I rename to %I', m.old_name, m.new_name);
    end if;

    -- 新テーブルが存在するなら、RLS を有効化し、既存ポリシーを全削除して正式名で allow-all を貼り直す
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = m.new_name) then
      execute format('alter table public.%I enable row level security', m.new_name);

      for p in
        select policyname from pg_policies
        where schemaname = 'public' and tablename = m.new_name
      loop
        execute format('drop policy %I on public.%I', p.policyname, m.new_name);
      end loop;

      execute format(
        'create policy %I on public.%I for all using (true) with check (true)',
        'Allow all for ' || m.new_name, m.new_name
      );
    end if;
  end loop;
end $$;
