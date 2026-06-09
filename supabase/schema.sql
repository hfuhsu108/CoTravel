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
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

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
  category text,
  order_index int not null default 0,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

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

-- 文件匣（中繼資料；實際檔案在 Storage）
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  category text not null,                 -- flight | lodging | document | other
  file_name text not null,
  storage_path text not null,
  linked_item_id uuid references items(id) on delete set null,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- 相鄰項目間的交通（document_id inline 外鍵，免事後 alter）
create table if not exists transports (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  from_item_id uuid references items(id) on delete cascade,
  to_item_id uuid references items(id) on delete cascade,
  mode text not null,                     -- walk | transit | drive | bike | custom
  duration_min int,
  distance_m int,
  custom_label text,
  route_polyline text,
  document_id uuid references documents(id) on delete set null,
  notes text,
  created_at timestamptz default now()
);

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

-- 建立旅程：產生唯一 6 碼邀請碼 + 把自己加為 owner，一次原子完成
create or replace function create_trip(
  p_name text,
  p_destination text default null,
  p_start_date date default null,
  p_end_date date default null
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

  insert into trips (name, destination, start_date, end_date, invite_code, created_by)
  values (
    btrim(p_name),
    nullif(btrim(coalesce(p_destination, '')), ''),
    p_start_date,
    p_end_date,
    v_code,
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

grant execute on function create_trip(text, text, date, date) to authenticated;
grant execute on function join_trip_by_code(text) to authenticated;

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
alter table documents       enable row level security;
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

drop policy if exists "members rw documents" on documents;
create policy "members rw documents" on documents
  for all using (is_trip_member(trip_id)) with check (is_trip_member(trip_id));

-- area_candidates：無 trip_id，透過 item_id join 回 items 判斷成員
drop policy if exists "members rw area_candidates" on area_candidates;
create policy "members rw area_candidates" on area_candidates
  for all using (
    exists (select 1 from items i where i.id = area_candidates.item_id and is_trip_member(i.trip_id))
  ) with check (
    exists (select 1 from items i where i.id = area_candidates.item_id and is_trip_member(i.trip_id))
  );

-- packing_items：成員互看，但只能改自己的
drop policy if exists "members read packing" on packing_items;
create policy "members read packing" on packing_items
  for select using (is_trip_member(trip_id));
drop policy if exists "owner write packing" on packing_items;
create policy "owner write packing" on packing_items
  for all using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

-- activity_log：成員可讀；只能以自己名義寫入
drop policy if exists "members read activity" on activity_log;
create policy "members read activity" on activity_log
  for select using (is_trip_member(trip_id));
drop policy if exists "members insert activity" on activity_log;
create policy "members insert activity" on activity_log
  for insert with check (is_trip_member(trip_id) and user_id = auth.uid());
