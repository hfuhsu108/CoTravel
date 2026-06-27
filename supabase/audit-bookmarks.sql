-- CoTravel 書籤／行程一致性稽核（唯讀，不修改任何資料）
--
-- 用途：找出「加入書籤會新增重複項目」這個 bug 在修正前殘留的錯亂資料。
-- 操作：Supabase Dashboard → SQL Editor，逐段（〔1〕〔2〕〔3〕）執行，把結果貼回給 Claude 判讀。
-- 安全性：全部都是 SELECT，不會動到任何資料。確認要清理時，會另外提供帶交易（BEGIN/COMMIT）的修正腳本。


-- 〔1〕同一趟、同一 google_place_id 出現多筆 ＝ 同地點重複（你遇到的主因）
--      重點看 statuses 與 day_ids：若同時出現「scheduled＋有 day_id」與「bookmark＋null」，
--      就是「其實已排入某天、書籤清單卻顯示未排入」的那種重複。
select
  i.trip_id,
  t.name                                            as trip_name,
  i.google_place_id,
  count(*)                                          as cnt,
  array_agg(i.id            order by i.created_at)   as item_ids,
  array_agg(i.name          order by i.created_at)   as names,
  array_agg(i.status        order by i.created_at)   as statuses,
  array_agg(i.day_id        order by i.created_at)   as day_ids,
  array_agg(i.is_bookmarked order by i.created_at)   as is_bookmarked
from items i
join trips t on t.id = i.trip_id
where i.google_place_id is not null
group by i.trip_id, t.name, i.google_place_id
having count(*) > 1
order by i.trip_id;


-- 〔2〕status 與 day_id 不一致（正常應為：scheduled ⟺ 有 day_id、bookmark ⟺ 無 day_id）
--      scheduled 卻無 day_id ＝ 排程孤兒（地圖／清單都可能漏顯示）；
--      bookmark  卻有 day_id ＝ 狀態錯亂。兩者都該被修正腳本收斂。
select
  i.id, i.trip_id, t.name as trip_name, i.name,
  i.status, i.day_id, i.is_bookmarked
from items i
join trips t on t.id = i.trip_id
where (i.status = 'scheduled' and i.day_id is null)
   or (i.status = 'bookmark'  and i.day_id is not null)
order by i.trip_id;


-- 〔3〕無 google_place_id、但座標極近（約 30 公尺內）的兩筆 ＝ 可能的同地點重複（手動加的點）
--      手動點沒有 place_id，只能靠座標近似抓。請人工確認 name_a/name_b 是否真為同一地點。
select
  a.trip_id, t.name as trip_name,
  a.id as id_a, a.name as name_a, a.status as status_a, a.day_id as day_a,
  b.id as id_b, b.name as name_b, b.status as status_b, b.day_id as day_b
from items a
join items b on a.trip_id = b.trip_id and a.id < b.id
join trips t on t.id = a.trip_id
where a.google_place_id is null and b.google_place_id is null
  and a.lat is not null and b.lat is not null
  and abs(a.lat - b.lat) < 0.0003
  and abs(a.lng - b.lng) < 0.0003
order by a.trip_id;
