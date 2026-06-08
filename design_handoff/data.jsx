/* ============ mock data ============ */
const ME = { id:"me", name:"宥宥", initial:"宥", cls:"" };
const PARTNER = { id:"pa", name:"小柔", initial:"柔", cls:"b" };

// ---- icon helper (inline svg, stroke=currentColor) ----
function Ico({d, name, size=22, fill=false, sw=1.9}){
  const paths = ICONS[name];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill?"currentColor":"none"}
      stroke={fill?"none":"currentColor"} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {paths}
    </svg>
  );
}
const ICONS = {
  map:(<><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/></>),
  doc:(<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></>),
  bag:(<><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></>),
  bell:(<><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></>),
  back:(<path d="M15 5l-7 7 7 7"/>),
  plus:(<><path d="M12 5v14M5 12h14"/></>),
  gear:(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 2.6 14H2.5a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 4 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9 2.6V2.5a2 2 0 0 1 4 0v.1A1.6 1.6 0 0 0 15 4a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 21.4 9h.1a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/></>),
  chevR:(<path d="M9 6l6 6-6 6"/>),
  chevD:(<path d="M6 9l6 6 6-6"/>),
  star:(<path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 17l-5.3 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z"/>),
  clock:(<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>),
  pin:(<><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/></>),
  walk:(<><circle cx="13" cy="4.5" r="1.6"/><path d="M11 21l1.5-6-2.5-2 1-5 3 2 2 1M9.5 11 8 21"/></>),
  train:(<><rect x="6" y="3" width="12" height="14" rx="3"/><path d="M6 12h12M9 21l-2-3M15 21l2-3"/><circle cx="9.5" cy="8" r="0"/></>),
  car:(<><path d="M5 16v2M19 16v2"/><path d="M3 13l1.5-5A2 2 0 0 1 6.4 6.5h11.2A2 2 0 0 1 19.5 8L21 13v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3Z"/><circle cx="7" cy="13.5" r="1"/><circle cx="17" cy="13.5" r="1"/></>),
  search:(<><circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/></>),
  list:(<><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></>),
  layers:(<><path d="M12 3 2 8l10 5 10-5-10-5ZM2 13l10 5 10-5M2 16l10 5 10-5"/></>),
  nav:(<path d="M3 11l18-8-8 18-2-7-8-3Z"/>),
  link:(<><path d="M10 14a4 4 0 0 0 6 .5l3-3a4 4 0 0 0-6-6l-1.5 1.5"/><path d="M14 10a4 4 0 0 0-6-.5l-3 3a4 4 0 0 0 6 6L12.5 17"/></>),
  upload:(<><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 20h14"/></>),
  cloud:(<path d="M7 18a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.6 1.5A3.5 3.5 0 0 1 17 18H7Z"/>),
  cloudoff:(<><path d="M7 18a4 4 0 0 1-.5-8M9 6.5A5.5 5.5 0 0 1 17.1 11.5 3.5 3.5 0 0 1 18 18"/><path d="m3 3 18 18"/></>),
  check:(<path d="M5 12.5 10 17l9-10"/>),
  x:(<path d="M6 6l12 12M18 6 6 18"/>),
  plane:(<path d="M10.5 19l1-4 7.5-4.5a1.6 1.6 0 0 0-1.5-2.8L13 9 8 6.5l-1.5.9L9 10l-3 1.7-2-1-1 .8 2.5 2 .8 2.8 .8-1 1.6-2.7 2 4.2 1.3-1.5Z"/>),
  bed:(<><path d="M3 18v-6h18v6M3 12V8a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1h4V8a2 2 0 0 1 2-2h3"/><path d="M3 18v2M21 18v2"/></>),
  id:(<><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="8.5" cy="11" r="2"/><path d="M5 16c.7-1.5 2-2 3.5-2s2.8.5 3.5 2M15 9h4M15 13h3"/></>),
  ticket:(<><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z"/><path d="M14 6v10"/></>),
  heart:(<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z"/>),
  bookmark:(<path d="M7 4h10v16l-5-3-5 3V4Z"/>),
  edit:(<><path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="M14 6l4 4"/></>),
  trash:(<><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13"/></>),
  move:(<><path d="M12 3v18M3 12h18M8 7l4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4M17 8l4 4-4 4"/></>),
  google:(<path d="M21 12.2c0-.7-.1-1.3-.2-1.9H12v3.7h5.1a4.4 4.4 0 0 1-1.9 2.9v2.4h3.1c1.8-1.7 2.7-4.1 2.7-7.1Z M12 21c2.4 0 4.5-.8 6-2.2l-3.1-2.4c-.8.6-1.9.9-2.9.9-2.3 0-4.2-1.5-4.9-3.6H3.9v2.5A9 9 0 0 0 12 21Z M7.1 13.7a5.4 5.4 0 0 1 0-3.4V7.8H3.9a9 9 0 0 0 0 8.4l3.2-2.5Z M12 6.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 3.9 7.8l3.2 2.5C7.8 8.1 9.7 6.6 12 6.6Z"/>),
  sparkle:(<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/>),
  users:(<><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="8" r="2.4"/><path d="M16 14a5 5 0 0 1 5 5"/></>),
  camera:(<><path d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L18 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z" transform="translate(0 1)"/><circle cx="12" cy="13" r="3.4"/></>),
  mail:(<><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></>),
};

// ---- trips ----
const TRIPS = [
  { id:"osaka", name:"大阪 5 日", dest:"大阪・關西", range:"2026/07/12 – 07/16",
    status:"ongoing", badge:"進行中・Day 2", days:5, cover:"warm", coverLabel:"大阪 城市照" },
  { id:"kyoto", name:"京都賞楓", dest:"京都", range:"2026/11/20 – 11/24",
    status:"upcoming", badge:"還有 30 天", count:30, cover:"map", coverLabel:"京都 地圖預覽" },
  { id:"okinawa", name:"沖繩跳島", dest:"沖繩", range:"2026/09/01 – 09/05",
    status:"upcoming", badge:"還有 92 天", count:92, cover:"cool", coverLabel:"沖繩 海景照" },
  { id:"tokyo", name:"東京跨年", dest:"東京", range:"2025/12/29 – 2026/01/02",
    status:"past", badge:"已結束", cover:"map", coverLabel:"東京 地圖預覽" },
  { id:"tainan", name:"台南小旅行", dest:"台南", range:"2025/10/10 – 10/12",
    status:"past", badge:"已結束", cover:"warm", coverLabel:"台南 老街照" },
];

// ---- day itinerary for the Osaka trip (Day 2) ----
// type: place | area | transit (transit sits between two items)
const DAY2 = [
  { type:"place", n:1, name:"大阪城公園", time:"09:00", rating:4.6, thumb:"cool", thumbLabel:"大阪城",
    addr:"大阪市中央区大阪城1-1", hours:"09:00–17:00", note:"天守閣門票記得帶，早點到避開人潮。", doc:true, by:"me" },
  { type:"transit", mode:"train", label:"御堂筋線", time:"25 分", dist:"4.2 km", by:"pa" },
  { type:"area", name:"心齋橋", period:"下午", cands:5, by:"pa",
    label:"心齋橋・下午", note:"逛街＋找午餐，看哪間人少就進。",
    candidates:[
      {name:"一蘭 道頓堀店", tag:"拉麵", pick:true, rating:4.3},
      {name:"PABLO 起司塔", tag:"甜點", pick:false, rating:4.1},
      {name:"大丸百貨", tag:"購物", pick:false, rating:4.4},
      {name:"唐吉訶德", tag:"藥妝", pick:true, rating:4.2},
      {name:"北極星蛋包飯", tag:"洋食", pick:false, rating:4.0},
    ]},
  { type:"transit", mode:"walk", label:"步行", time:"8 分", dist:"650 m", by:"me" },
  { type:"place", n:2, name:"道頓堀", time:"18:00", rating:4.5, thumb:"warm", thumbLabel:"道頓堀",
    addr:"大阪市中央区道頓堀1丁目", hours:"全天", note:"固力果跑跑人拍照，晚餐吃章魚燒。", doc:false, by:"me" },
  { type:"transit", mode:"train", label:"地下鐵", time:"15 分", dist:"3.1 km", by:"me" },
  { type:"place", n:3, name:"梅田藍天大廈", time:"20:30", rating:4.7, thumb:"cool", thumbLabel:"空中庭園",
    addr:"大阪市北区大淀中1-1-88", hours:"09:30–22:30", note:"夜景！買套票比較划算。", doc:true, by:"pa" },
];

const DAYS = [
  {d:1, date:"7/12 六", label:"關西機場 → 難波"},
  {d:2, date:"7/13 日", label:"市區一日", current:true},
  {d:3, date:"7/14 一", label:"環球影城"},
  {d:4, date:"7/15 二", label:"奈良一日"},
  {d:5, date:"7/16 三", label:"購物 → 回程"},
];

// map markers (x,y in % of map area)
const MARKERS = [
  { kind:"place", n:1, x:62, y:24, name:"大阪城公園" },
  { kind:"area", x:40, y:58, name:"心齋橋・下午", r:60 },
  { kind:"place", n:2, x:43, y:64, name:"道頓堀" },
  { kind:"place", n:3, x:24, y:34, name:"梅田藍天大廈" },
  { kind:"bookmark", state:"want", x:30, y:78, name:"通天閣" },
  { kind:"bookmark", state:"want", x:78, y:70, name:"環球影城" },
  { kind:"bookmark", state:"planned", x:55, y:44, name:"黑門市場" },
];
// route connects place pins in order
const ROUTE = [[24,34],[62,24],[40,58],[43,64]];

// ---- documents ----
const DOCS = {
  flight:[
    {name:"長榮 BR132 去程", type:"電子機票・PDF", by:"me", off:true, link:"7/12 關西機場", ico:"plane"},
    {name:"長榮 BR177 回程", type:"電子機票・PDF", by:"pa", off:true, link:"7/16 關西機場", ico:"plane"},
    {name:"關西機場 HARUKA 特急票", type:"車票・PDF", by:"me", off:false, ico:"ticket"},
  ],
  hotel:[
    {name:"難波 APA Hotel 訂房單", type:"住宿・PDF", by:"pa", off:true, link:"7/12–7/16 住宿", ico:"bed"},
    {name:"飯店地圖＋交通", type:"圖片・PNG", by:"me", off:false, ico:"doc"},
  ],
  papers:[
    {name:"護照影本（宥宥）", type:"證件・PDF", by:"me", off:true, ico:"id"},
    {name:"護照影本（小柔）", type:"證件・PDF", by:"pa", off:true, ico:"id"},
    {name:"旅遊保險保單", type:"保險・PDF", by:"me", off:false, ico:"doc"},
    {name:"國際駕照", type:"證件・JPG", by:"pa", off:false, ico:"id"},
  ],
  other:[
    {name:"JR West Pass 兌換券", type:"票券・PDF", by:"me", off:true, link:"7/14 環球影城", ico:"ticket"},
    {name:"環球影城門票", type:"票券・PDF", by:"pa", off:true, link:"7/14 環球影城", ico:"ticket"},
  ],
};
const DOC_TABS = [{k:"flight",label:"機票",ico:"plane"},{k:"hotel",label:"住宿",ico:"bed"},{k:"papers",label:"文件",ico:"id"},{k:"other",label:"其他",ico:"ticket"}];

// ---- packing ----
const PACK_ME = [
  {cat:"證件", items:[{t:"護照",on:true},{t:"機票截圖",on:true},{t:"信用卡 / 現金",on:true},{t:"駕照",on:false}]},
  {cat:"電子產品", items:[{t:"手機充電器",on:true},{t:"行動電源",on:true},{t:"轉接頭",on:false},{t:"相機",on:true}]},
  {cat:"盥洗", items:[{t:"牙刷牙膏",on:true},{t:"保養品",on:false},{t:"隱形眼鏡",on:true}]},
  {cat:"衣物", items:[{t:"換洗衣物 ×5",on:true},{t:"薄外套",on:false},{t:"泳衣",on:false}]},
];
const PACK_PA = [
  {cat:"證件", items:[{t:"護照",on:true},{t:"現金",on:true},{t:"悠遊卡",on:false}]},
  {cat:"電子產品", items:[{t:"耳機",on:true},{t:"充電線",on:true},{t:"自拍棒",on:true}]},
  {cat:"盥洗", items:[{t:"化妝品",on:true},{t:"卸妝",on:true},{t:"防曬",on:true}]},
  {cat:"衣物", items:[{t:"洋裝 ×2",on:true},{t:"睡衣",on:true},{t:"拖鞋",on:false}]},
];
function packStat(list){let t=0,d=0;list.forEach(g=>g.items.forEach(i=>{t++;if(i.on)d++;}));return{t,d};}

Object.assign(window,{ME,PARTNER,Ico,ICONS,TRIPS,DAY2,DAYS,MARKERS,ROUTE,DOCS,DOC_TABS,PACK_ME,PACK_PA,packStat});
