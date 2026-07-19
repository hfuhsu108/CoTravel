-- ============================================================
-- CoTravel · 階段 1 Schema（建表 + RLS + RPC）
-- 對應 docs/03-資料模型.md。貼進 Supabase SQL Editor 整段執行即可。
-- 本檔可重跑（policy 先 drop、function 用 create or replace、表用 if not exists）。
-- ============================================================

-- ----------------------------------------------------------------
-- 1. 資料表（順序：被參照者在前，故 documents 置於 transports 之前，
--    讓 transports.document_id 可直接 inline 外鍵，免再 alter）
-- ----------------------------------------------------------------

-- 個人資料（對應 auth.users）
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- 旅程
create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  destination text,
  start_date date,
  end_date date,
  cover_image_url text,
  invite_code text unique,                -- 旅程層級邀請碼（階段 1 新增；由 create_trip 產生）
  dest_lat double precision,              -- 目的地座標（功能 3：地圖預設範圍退路；由地點搜尋帶入）
  dest_lng double precision,
  dest_place_id text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
-- 既有資料庫自我修復：補上目的地座標欄（新裝者已由上方 inline 帶入；冪等可重跑）
alter table trips add column if not exists dest_lat double precision;
alter table trips add column if not exists dest_lng double precision;
alter table trips add column if not exists dest_place_id text;

-- 趟次成員（兩人共編的關鍵）
create table if not exists trip_members (
  trip_id uuid references trips(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'member',    -- owner | member
  joined_at timestamptz default now(),
  primary key (trip_id, user_id)
);

-- 每一天
create table if not exists days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  date date not null,
  day_index int not null,                 -- Day1=1, Day2=2...
  created_at timestamptz default now(),
  unique (trip_id, day_index)             -- 防併發重複建立（同趟同一天唯一）
);

-- 既有資料庫自我修復（新裝者已由上方 inline 帶入唯一鍵；此段讓 schema.sql 在舊庫重跑時，
-- 清掉因併發/StrictMode 重複建立的 day 列再補唯一鍵。皆冪等，可安全重跑）。
-- 1) 把指向「重複日」的 items 重新指到保留日（每組 trip_id+day_index 取最早建立者）
update items i
set day_id = k.keep_id
from (
  select id,
         first_value(id) over (partition by trip_id, day_index order by created_at, id) as keep_id
  from days
) k
where i.day_id = k.id and k.id <> k.keep_id;
-- 2) 刪除重複日（保留每組最早者）
delete from days d
using (
  select id,
         first_value(id) over (partition by trip_id, day_index order by created_at, id) as keep_id
  from days
) k
where d.id = k.id and k.id <> k.keep_id;
-- 3) 補唯一鍵（若尚未存在）
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'days_trip_id_day_index_key') then
    alter table days add constraint days_trip_id_day_index_key unique (trip_id, day_index);
  end if;
end $$;

-- 行程項目（定點 / 區域 / 書籤）
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  day_id uuid references days(id) on delete set null,  -- null = 尚未排入（書籤）
  type text not null,                     -- point | area
  status text not null default 'scheduled', -- bookmark | scheduled
  name text not null,
  lat double precision,
  lng double precision,
  google_place_id text,
  photo_url text,
  scheduled_time time,
  time_slot text,
  radius_m int,
  is_bookmarked boolean not null default false,  -- 收藏旗標（功能 2：與 status/day_id 脫鉤，排入某天後仍可保留收藏）
  tags text[] not null default '{}',             -- 清單（功能 2：Google 地圖式；一個地點可在多個清單，取代舊單一 category）
  timezone text,                                 -- 該地點 IANA 時區（功能 5：由座標自動推得；通知換算用）
  alias text,                                    -- 自定義別名（顯示用；空則用 name）
  stay_minutes int,                              -- 停留分鐘（三時間：抵達=scheduled_time、離開=抵達+停留）
  departure_time time,                           -- 離開時間（三時間）
  lodging_auto boolean not null default false,   -- 住宿項目是否為自動產生的頭/尾（手動複製本=false，住宿編輯重產生時不刪）
  order_index int not null default 0,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- 既有資料庫自我修復（功能 2）：補書籤旗標與多標籤欄，回填後移除舊單一 category。皆冪等可重跑。
alter table items add column if not exists is_bookmarked boolean not null default false;
alter table items add column if not exists tags text[] not null default '{}';
alter table items add column if not exists timezone text;  -- 功能 5：地點時區（由座標推得）
alter table items add column if not exists alias text;
alter table items add column if not exists stay_minutes int;
alter table items add column if not exists departure_time time;
alter table items add column if not exists lodging_auto boolean not null default false;
do $$
begin
  -- 舊書籤（status='bookmark'）→ 標記為已收藏
  update items set is_bookmarked = true where status = 'bookmark' and is_bookmarked = false;
  -- 舊單一 category → tags 陣列（僅在欄位仍存在時），再 drop 掉 category
  if exists (
    select 1 from information_schema.columns
    where table_name = 'items' and column_name = 'category'
  ) then
    update items set tags = array[category]
      where category is not null and btrim(category) <> '' and tags = '{}';
    alter table items drop column category;
  end if;
end $$;

-- 區域內的候選店家（不排序）
create table if not exists area_candidates (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references items(id) on delete cascade,  -- 必為 type=area 的 item
  name text not null,
  lat double precision,
  lng double precision,
  google_place_id text,
  chosen boolean default false,
  notes text,
  created_at timestamptz default now()
);

-- 文件匣（中繼資料；實際檔案在 Storage）。連結改走多對多關聯表（document_items / document_transports），
-- 故此表不再有 linked_item_id 欄位。
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  category text not null,                 -- flight | lodging | document | other
  kind text not null default 'file',      -- file（上傳檔案）| note（Markdown 備忘錄，功能 6）
  file_name text not null,                -- 檔案原始檔名；備忘錄則存標題
  storage_path text,                      -- 檔案的 Storage 路徑；備忘錄為 null
  content text,                           -- 備忘錄的 Markdown 內文（kind='note' 時）
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now()
);
-- 既有資料庫自我修復（功能 6）：補備忘錄欄位、並把 storage_path 放寬為可空。冪等可重跑。
alter table documents add column if not exists kind text not null default 'file';
alter table documents add column if not exists content text;
alter table documents alter column storage_path drop not null;

-- 相鄰項目間的交通。連結車票文件改走多對多關聯表（document_transports），故不再有 document_id 欄位。
create table if not exists transports (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  from_item_id uuid references items(id) on delete cascade,
  to_item_id uuid references items(id) on delete cascade,
  mode text not null,                     -- walk | transit | drive | bike | custom | flight
  duration_min int,
  distance_m int,
  custom_label text,                      -- 自定義時用：'新幹線' '包車'
  flight_no text,                         -- 航班編號（功能 5：mode='flight' 時，如 'BR198'）
  cost_text text,                         -- 費用顯示字串，如 '¥240'（幣別多樣，純顯示；階段 3 新增）
  route_polyline text,                    -- Google 路線編碼（可選快取，畫在主地圖）
  -- 航班/跨時區段的起訖當地時間（功能 5）：local 為無時區的當地牆鐘，tz 為各自 IANA 時區。
  -- 兩者 + tz 可算實際飛行時數，並為未來登機通知算出 UTC 時刻（見 src/lib/time.ts）。
  depart_local timestamp,
  depart_tz text,
  arrive_local timestamp,
  arrive_tz text,
  depart_terminal text,                   -- 出發航廈（航班）
  arrive_terminal text,                   -- 抵達航廈（航班）
  steps jsonb,                            -- 路線步驟摘要（多路線選定後存，顯示公車號/轉乘步驟）
  notes text,
  created_at timestamptz default now(),
  unique (from_item_id, to_item_id)       -- 一段交通一列（以相鄰對為鍵 upsert，防併發重複）
);
-- 既有資料庫自我修復（功能 5）：補航班跨時區起訖欄位與航班編號。冪等可重跑。
alter table transports add column if not exists depart_local timestamp;
alter table transports add column if not exists depart_tz text;
alter table transports add column if not exists arrive_local timestamp;
alter table transports add column if not exists arrive_tz text;
alter table transports add column if not exists flight_no text;
alter table transports add column if not exists depart_terminal text;
alter table transports add column if not exists arrive_terminal text;
alter table transports add column if not exists steps jsonb;

-- 文件 ↔ 行程項目 / 交通 的多對多連結（一項目/交通可連多文件，一文件可連多項目/交通）
create table if not exists document_items (
  document_id uuid references documents(id) on delete cascade,
  item_id uuid references items(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (document_id, item_id)
);
create table if not exists document_transports (
  document_id uuid references documents(id) on delete cascade,
  transport_id uuid references transports(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (document_id, transport_id)
);

-- 既有資料庫自我修復：把舊的單一連結欄位（documents.linked_item_id、transports.document_id）
-- 搬進多對多關聯表，再 drop 掉舊欄位。用欄位存在性 guard，可安全重跑（新裝者無此欄位、整段略過）。
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'documents' and column_name = 'linked_item_id'
  ) then
    insert into document_items (document_id, item_id)
      select id, linked_item_id from documents where linked_item_id is not null
      on conflict do nothing;
    alter table documents drop column linked_item_id;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_name = 'transports' and column_name = 'document_id'
  ) then
    insert into document_transports (document_id, transport_id)
      select document_id, id from transports where document_id is not null
      on conflict do nothing;
    alter table transports drop column document_id;
  end if;
end $$;

-- 既有資料庫自我修復（新裝者已由上方 inline 帶入；此段讓 schema.sql 在舊庫重跑時補上階段 3 的
-- cost_text 欄與 (from_item_id,to_item_id) 唯一鍵。皆冪等，可安全重跑）。
alter table transports add column if not exists cost_text text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'transports_from_item_id_to_item_id_key') then
    alter table transports add constraint transports_from_item_id_to_item_id_key
      unique (from_item_id, to_item_id);
  end if;
end $$;

-- 住宿（比照航班：在文件→住宿新增；自動在對應日期頭尾建住宿項目，見 items.lodging_id）。
-- 置於 documents 之後，doc_id 才能 inline 外鍵到訂房單。
create table if not exists lodgings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  name text not null,                     -- 飯店名
  lat double precision,
  lng double precision,
  google_place_id text,
  timezone text,                          -- 由座標推得（住宿以日期為主，tz 備用）
  check_in date not null,                 -- 入住日
  check_out date not null,                -- 退房日
  doc_id uuid references documents(id) on delete set null,  -- 訂房單（選填）
  notes text,                             -- 訂房代號 / 房型…
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
-- 自動產生的住宿項目掛在 lodgings 下，住宿刪除時連帶清掉。items 表先於 lodgings 建立，故以 alter 補欄。
alter table items add column if not exists lodging_id uuid references lodgings(id) on delete cascade;

-- 行李清單（依個人分）
create table if not exists packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  category text,
  is_packed boolean default false,
  created_at timestamptz default now()
);

-- 改動紀錄（給「對方改動通知」用）
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  user_id uuid references auth.users(id),
  action text not null,
  target_summary text,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------
-- 2. 輔助函式（security definer：內部查表時繞過自身 RLS，避免遞迴）
--    set search_path 固定為 public，避免 search_path 被劫持。
-- ----------------------------------------------------------------

-- 目前使用者是否為某 trip 成員
create or replace function is_trip_member(p_trip_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from trip_members
    where trip_id = p_trip_id and user_id = auth.uid()
  );
$$;

-- 目前使用者是否為某 trip 的發起人（行李「發起人可代編旅伴清單」等權限用）
create or replace function is_trip_creator(p_trip_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from trips
    where id = p_trip_id and created_by = auth.uid()
  );
$$;

-- 目前使用者是否與 p_user 同屬某趟（給 profiles 互看頭像/暱稱用）
create or replace function is_co_member(p_user uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from trip_members m1
    join trip_members m2 on m1.trip_id = m2.trip_id
    where m1.user_id = auth.uid() and m2.user_id = p_user
  );
$$;

-- ----------------------------------------------------------------
-- 3. 新使用者自動建 profile（Email / Google 皆適用）
-- ----------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ----------------------------------------------------------------
-- 4. RPC：建立旅程 / 用邀請碼加入（security definer，原子且安全）
-- ----------------------------------------------------------------

-- 建立旅程：產生唯一 6 碼邀請碼 + 把自己加為 owner，一次原子完成。
-- 目的地座標（功能 3）由 client 的地點搜尋帶入；先 drop 舊 4 參數簽章避免多載歧義。
drop function if exists create_trip(text, text, date, date);
create or replace function create_trip(
  p_name text,
  p_destination text default null,
  p_start_date date default null,
  p_end_date date default null,
  p_dest_lat double precision default null,
  p_dest_lng double precision default null,
  p_dest_place_id text default null
)
returns trips
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';  -- 去除易混淆字元 0O1IL
  v_code text;
  v_trip trips;
  i int;
begin
  if v_uid is null then
    raise exception '未登入，無法建立旅程';
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception '旅程名稱不可為空';
  end if;

  -- 產生不重複的邀請碼（碰撞就重試）
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from trips where invite_code = v_code);
  end loop;

  insert into trips (name, destination, start_date, end_date, invite_code, dest_lat, dest_lng, dest_place_id, created_by)
  values (
    btrim(p_name),
    nullif(btrim(coalesce(p_destination, '')), ''),
    p_start_date,
    p_end_date,
    v_code,
    p_dest_lat,
    p_dest_lng,
    nullif(btrim(coalesce(p_dest_place_id, '')), ''),
    v_uid
  )
  returning * into v_trip;

  insert into trip_members (trip_id, user_id, role)
  values (v_trip.id, v_uid, 'owner');

  return v_trip;
end;
$$;

-- 用邀請碼加入旅程：驗證碼、防重複、限兩人上限
create or replace function join_trip_by_code(p_code text)
returns trips
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_trip trips;
  v_count int;
begin
  if v_uid is null then
    raise exception '未登入，無法加入旅程';
  end if;

  select * into v_trip from trips
  where invite_code = upper(btrim(coalesce(p_code, '')));

  if v_trip.id is null then
    raise exception '邀請碼無效';
  end if;

  if exists (select 1 from trip_members where trip_id = v_trip.id and user_id = v_uid) then
    raise exception '你已經在這趟旅程裡了';
  end if;

  select count(*) into v_count from trip_members where trip_id = v_trip.id;
  if v_count >= 2 then
    raise exception '這趟旅程已滿（限兩人共編）';
  end if;

  insert into trip_members (trip_id, user_id, role)
  values (v_trip.id, v_uid, 'member');

  return v_trip;
end;
$$;

-- 清單（tags）改名/合併：DB 端原子更新，避免兩人同時編輯時前端整包讀改寫互相覆蓋。
-- security invoker：沿用 items 的 RLS（限該趟成員可寫），毋須重驗成員身分。
-- 去重用 unnest with ordinality + min(ord) 保留首次出現順序（首個 tag 決定 marker 圖示，不可打亂）。
create or replace function rename_tag_across_trip(p_trip_id uuid, p_from text, p_to text)
returns void
language sql
security invoker
set search_path = public
as $$
  update items set tags = (
    select coalesce(array_agg(elem order by ord), '{}')
    from (
      select elem, min(ord) as ord
      from unnest(array_replace(tags, p_from, p_to)) with ordinality as u(elem, ord)
      group by elem
    ) dedup
  )
  where trip_id = p_trip_id and tags @> array[p_from];
$$;

-- 刪除清單：從所有含該 tag 的 items 移除（景點本身保留）
create or replace function delete_tag_across_trip(p_trip_id uuid, p_tag text)
returns void
language sql
security invoker
set search_path = public
as $$
  update items set tags = array_remove(tags, p_tag)
  where trip_id = p_trip_id and tags @> array[p_tag];
$$;

grant execute on function create_trip(text, text, date, date, double precision, double precision, text) to authenticated;
grant execute on function join_trip_by_code(text) to authenticated;
grant execute on function rename_tag_across_trip(uuid, text, text) to authenticated;
grant execute on function delete_tag_across_trip(uuid, text) to authenticated;

-- ----------------------------------------------------------------
-- 5. Row Level Security
-- ----------------------------------------------------------------
alter table profiles        enable row level security;
alter table trips           enable row level security;
alter table trip_members    enable row level security;
alter table days            enable row level security;
alter table items           enable row level security;
alter table area_candidates enable row level security;
alter table transports      enable row level security;
alter table lodgings        enable row level security;
alter table documents       enable row level security;
alter table document_items      enable row level security;
alter table document_transports enable row level security;
alter table packing_items   enable row level security;
alter table activity_log    enable row level security;

-- profiles：本人或同趟夥伴可讀；本人可寫（夥伴資料唯讀）
drop policy if exists "read self or co-member profiles" on profiles;
create policy "read self or co-member profiles" on profiles
  for select using (id = auth.uid() or is_co_member(id));
drop policy if exists "insert own profile" on profiles;
create policy "insert own profile" on profiles
  for insert with check (id = auth.uid());
drop policy if exists "update own profile" on profiles;
create policy "update own profile" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- trips：成員可讀；建立者可改/刪。
-- 建立一律走 create_trip RPC（故不開放 client 直接 insert，避免產生無碼/無成員的孤兒旅程）
drop policy if exists "members read trips" on trips;
create policy "members read trips" on trips
  for select using (is_trip_member(id));
drop policy if exists "creator update trips" on trips;
create policy "creator update trips" on trips
  for update using (created_by = auth.uid()) with check (created_by = auth.uid());
drop policy if exists "creator delete trips" on trips;
create policy "creator delete trips" on trips
  for delete using (created_by = auth.uid());

-- trip_members：成員可讀成員名單；可移除自己（離開）。
-- 加入成員一律走 RPC（create_trip / join_trip_by_code），故不開放 client 直接 insert。
drop policy if exists "members read trip_members" on trip_members;
create policy "members read trip_members" on trip_members
  for select using (is_trip_member(trip_id));
drop policy if exists "leave own membership" on trip_members;
create policy "leave own membership" on trip_members
  for delete using (user_id = auth.uid());

-- 一般 trip 子表：成員可讀寫
drop policy if exists "members rw days" on days;
create policy "members rw days" on days
  for all using (is_trip_member(trip_id)) with check (is_trip_member(trip_id));

drop policy if exists "members rw items" on items;
create policy "members rw items" on items
  for all using (is_trip_member(trip_id)) with check (is_trip_member(trip_id));

drop policy if exists "members rw transports" on transports;
create policy "members rw transports" on transports
  for all using (is_trip_member(trip_id)) with check (is_trip_member(trip_id));

drop policy if exists "members rw lodgings" on lodgings;
create policy "members rw lodgings" on lodgings
  for all using (is_trip_member(trip_id)) with check (is_trip_member(trip_id));

drop policy if exists "members rw documents" on documents;
create policy "members rw documents" on documents
  for all using (is_trip_member(trip_id)) with check (is_trip_member(trip_id));

-- 多對多連結：成員可讀寫；with check 同時驗證 document 與 item/transport 都屬使用者所在 trip（防跨趟連結）
drop policy if exists "members rw document_items" on document_items;
create policy "members rw document_items" on document_items
  for all using (
    exists (select 1 from documents d where d.id = document_id and is_trip_member(d.trip_id))
  ) with check (
    exists (select 1 from documents d where d.id = document_id and is_trip_member(d.trip_id))
    and exists (select 1 from items i where i.id = item_id and is_trip_member(i.trip_id))
  );

drop policy if exists "members rw document_transports" on document_transports;
create policy "members rw document_transports" on document_transports
  for all using (
    exists (select 1 from documents d where d.id = document_id and is_trip_member(d.trip_id))
  ) with check (
    exists (select 1 from documents d where d.id = document_id and is_trip_member(d.trip_id))
    and exists (select 1 from transports t where t.id = transport_id and is_trip_member(t.trip_id))
  );

-- area_candidates：無 trip_id，透過 item_id join 回 items 判斷成員
drop policy if exists "members rw area_candidates" on area_candidates;
create policy "members rw area_candidates" on area_candidates
  for all using (
    exists (select 1 from items i where i.id = area_candidates.item_id and is_trip_member(i.trip_id))
  ) with check (
    exists (select 1 from items i where i.id = area_candidates.item_id and is_trip_member(i.trip_id))
  );

-- packing_items：成員互看；本人或旅程發起人可寫（發起人可代編旅伴清單）
drop policy if exists "members read packing" on packing_items;
create policy "members read packing" on packing_items
  for select using (is_trip_member(trip_id));
drop policy if exists "owner write packing" on packing_items;
drop policy if exists "owner or creator write packing" on packing_items;
create policy "owner or creator write packing" on packing_items
  for all using (owner_user_id = auth.uid() or is_trip_creator(trip_id))
  with check (owner_user_id = auth.uid() or is_trip_creator(trip_id));

-- activity_log：成員可讀；只能以自己名義寫入
drop policy if exists "members read activity" on activity_log;
create policy "members read activity" on activity_log
  for select using (is_trip_member(trip_id));
drop policy if exists "members insert activity" on activity_log;
create policy "members insert activity" on activity_log
  for insert with check (is_trip_member(trip_id) and user_id = auth.uid());

-- ----------------------------------------------------------------
-- 6. Storage：文件匣 bucket + RLS（階段 4）
--    檔案一律透過 src/lib/storage/ 抽象層存取；路徑慣例 <trip_id>/<uuid>/<檔名>，
--    首段即 trip_id，storage policy 據此判斷成員（重用 is_trip_member）。bucket 為 private。
-- ----------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- bucket=documents 時，依路徑首段 trip_id 判斷是否為該趟成員（讀/寫/刪皆同條件）
drop policy if exists "trip members read documents files" on storage.objects;
create policy "trip members read documents files" on storage.objects
  for select using (
    bucket_id = 'documents'
    and is_trip_member(((storage.foldername(name))[1])::uuid)
  );
drop policy if exists "trip members insert documents files" on storage.objects;
create policy "trip members insert documents files" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and is_trip_member(((storage.foldername(name))[1])::uuid)
  );
drop policy if exists "trip members delete documents files" on storage.objects;
create policy "trip members delete documents files" on storage.objects
  for delete using (
    bucket_id = 'documents'
    and is_trip_member(((storage.foldername(name))[1])::uuid)
  );

-- ----------------------------------------------------------------
-- 7. Realtime publication（階段 6）：把需要即時同步的表加進 supabase_realtime。
--    冪等：publication 不存在先建；已在 publication 內的表跳過，可整段重跑。
--    注意：Realtime 的 DELETE 事件不套 RLS、也不吃 filter（官方行為），
--    故前端一律「收到事件 → 依 tripId refetch」，絕不直接使用事件 payload。
-- ----------------------------------------------------------------
do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['items','area_candidates','transports','lodgings','documents','packing_items','activity_log'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ----------------------------------------------------------------
-- 8. 景點清單 metadata（bookmark_lists）＋ 行李分類（packing_categories）
--    清單仍以 items.tags[] 的「名稱」保留多清單歸屬與既有邏輯；本表以 (trip_id, name)
--    為鍵掛 icon/顏色，供地圖 marker 用。行李分類「各自管理」（owner_user_id 區分），
--    packing_items 由 category 文字改 FK category_id。全段冪等可重跑。
-- ----------------------------------------------------------------

-- 8a. 景點清單 metadata（名稱即 join 鍵；rename/刪除時連同 items.tags 一起改）
create table if not exists bookmark_lists (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  name text not null,                     -- 對應 items.tags 內的清單名
  icon text not null default 'heart',     -- 取自前端 Icon 集的精選子集（預設愛心＝沿用原書籤外觀）
  color text not null default '#f08fb0',  -- 預設粉（沿用原書籤愛心色）
  sort_order int not null default 0,
  created_at timestamptz default now(),
  unique (trip_id, name)
);
alter table bookmark_lists enable row level security;
drop policy if exists "members rw bookmark_lists" on bookmark_lists;
create policy "members rw bookmark_lists" on bookmark_lists
  for all using (is_trip_member(trip_id)) with check (is_trip_member(trip_id));

-- 由既有 items.tags 種子化清單 metadata（出現過的清單名給預設 icon/色；已存在則略過）
insert into bookmark_lists (trip_id, name)
select distinct i.trip_id, tag
from items i, unnest(i.tags) as tag
where tag is not null and length(trim(tag)) > 0
on conflict (trip_id, name) do nothing;

-- 8b. 行李分類（各自管理）
create table if not exists packing_categories (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz default now(),
  unique (trip_id, owner_user_id, name)
);
alter table packing_categories enable row level security;
-- 成員互看（看夥伴清單分組要讀得到其分類名）；只能改自己的
drop policy if exists "members read packing_categories" on packing_categories;
create policy "members read packing_categories" on packing_categories
  for select using (is_trip_member(trip_id));
drop policy if exists "owner write packing_categories" on packing_categories;
create policy "owner write packing_categories" on packing_categories
  for all using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

-- packing_items：category 文字 → FK category_id（先加欄、回填、再清舊欄）
alter table packing_items add column if not exists category_id uuid references packing_categories(id) on delete set null;

-- 種子化每個 (trip, owner) 的預設分類（僅在該 owner 於該趟尚無任何分類時）
insert into packing_categories (trip_id, owner_user_id, name, sort_order)
select t.trip_id, t.owner_user_id, d.name, d.ord
from (select distinct trip_id, owner_user_id from packing_items) t
cross join (values ('證件',0),('電子產品',1),('盥洗',2),('衣物',3),('其他',4)) as d(name, ord)
where not exists (
  select 1 from packing_categories pc
  where pc.trip_id = t.trip_id and pc.owner_user_id = t.owner_user_id
)
on conflict (trip_id, owner_user_id, name) do nothing;

-- 既有 category 文字回填 category_id（含非預設的自訂分類），完成後移除舊欄
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='packing_items' and column_name='category'
  ) then
    insert into packing_categories (trip_id, owner_user_id, name)
    select distinct pi.trip_id, pi.owner_user_id, trim(pi.category)
    from packing_items pi
    where pi.category is not null and length(trim(pi.category)) > 0
    on conflict (trip_id, owner_user_id, name) do nothing;

    update packing_items pi
    set category_id = pc.id
    from packing_categories pc
    where pi.category_id is null
      and pi.category is not null
      and pc.trip_id = pi.trip_id
      and pc.owner_user_id = pi.owner_user_id
      and pc.name = trim(pi.category);

    alter table packing_items drop column category;
  end if;
end $$;

-- 8c. 兩張新表加進 Realtime publication（冪等）
do $$
declare t text;
begin
  foreach t in array array['bookmark_lists','packing_categories'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- 8d. 住宿照片：飯店搜尋時抓到的照片，同步到行程地標（機場/飯店地標不再沒縮圖）。冪等。
alter table lodgings add column if not exists photo_url text;

-- ----------------------------------------------------------------
-- 8e. 文件 ↔ 住宿 的多對多連結（document_lodgings）。
--     住宿改入住/退房日會刪除重建住宿項目（items），連結若掛在 item 會被 cascade 清掉；
--     故掛在 lodging 層。行程的住宿項目改以 lodging_id 動態查此表，
--     後續新增並連到該住宿的文件會自動出現在已排好的住宿日（使用者需求）。
--     置於檔尾：lodgings 與 documents 此時皆已建立。全段冪等可重跑。
-- ----------------------------------------------------------------
create table if not exists document_lodgings (
  document_id uuid references documents(id) on delete cascade,
  lodging_id  uuid references lodgings(id)  on delete cascade,
  created_at  timestamptz default now(),
  primary key (document_id, lodging_id)
);
alter table document_lodgings enable row level security;

-- RLS 比照 document_items：經 documents.trip_id 與 lodgings.trip_id 雙重驗證成員（防跨趟連結）
drop policy if exists "members rw document_lodgings" on document_lodgings;
create policy "members rw document_lodgings" on document_lodgings
  for all using (
    exists (select 1 from documents d where d.id = document_id and is_trip_member(d.trip_id))
  ) with check (
    exists (select 1 from documents d where d.id = document_id and is_trip_member(d.trip_id))
    and exists (select 1 from lodgings l where l.id = lodging_id and is_trip_member(l.trip_id))
  );

-- 既有資料自我修復：把舊的單一訂房單欄位 lodgings.doc_id 帶進多對多表（doc_id 仍保留為主訂房單）
insert into document_lodgings (document_id, lodging_id)
  select doc_id, id from lodgings where doc_id is not null
  on conflict do nothing;

-- ----------------------------------------------------------------
-- 9. 提醒與推播（Web Push 通知功能）
-- ----------------------------------------------------------------

-- 9a. 提醒（掛在行程項目/交通/住宿上；fire_at 為 UTC 觸發時刻）
create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  target_type text not null,                -- 'item' | 'transport' | 'lodging'
  target_id uuid not null,                  -- items.id / transports.id / lodgings.id
  target_name text not null,                -- 顯示用快照（避免反查）
  template text not null default 'custom',  -- 'restaurant' | 'checkin' | 'boarding' | 'checkout' | 'custom'
  message text,                             -- 自訂提醒訊息（選填）
  fire_at timestamptz not null,             -- UTC 觸發時刻（由 toInstantUTC 算出）
  offset_minutes int not null default 0,    -- 提前幾分鐘（UI 顯示/重算用）
  fired boolean not null default false,     -- Edge Function 觸發後標 true
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
alter table reminders enable row level security;
drop policy if exists "members rw reminders" on reminders;
create policy "members rw reminders" on reminders
  for all using (is_trip_member(trip_id)) with check (is_trip_member(trip_id));

-- 9b. 推播訂閱（每人每裝置一筆；Edge Function 用 service_role key 讀，不受 RLS 限制）
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text not null,                   -- PushSubscription.endpoint（唯一識別裝置）
  keys_p256dh text not null,                -- PushSubscription.keys.p256dh
  keys_auth text not null,                  -- PushSubscription.keys.auth
  created_at timestamptz default now(),
  unique (user_id, endpoint)
);
alter table push_subscriptions enable row level security;
drop policy if exists "own subscriptions rw" on push_subscriptions;
create policy "own subscriptions rw" on push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 9c. reminders 加進 Realtime publication（夥伴即時看到對方設的提醒）
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reminders'
  ) then
    alter publication supabase_realtime add table public.reminders;
  end if;
end $$;
