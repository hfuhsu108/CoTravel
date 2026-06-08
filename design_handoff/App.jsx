/* ============ App shell ============ */
function StatusBar(){
  return (
    <div className="statusbar">
      <span className="num">9:41</span>
      <div className="sb-r">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="7" width="3" height="5" rx="1"/><rect x="4.5" y="4.5" width="3" height="7.5" rx="1"/><rect x="9" y="2" width="3" height="10" rx="1"/><rect x="13.5" y="0" width="3" height="12" rx="1"/></svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M8 2.5c2 0 3.8.8 5.1 2l1.2-1.3A9 9 0 0 0 8 .7 9 9 0 0 0 1.7 3.2L2.9 4.5A7 7 0 0 1 8 2.5Z"/><path d="M8 6c1.1 0 2.1.4 2.8 1.2l1.3-1.3A6 6 0 0 0 8 4a6 6 0 0 0-4.1 1.9l1.3 1.3A4 4 0 0 1 8 6Z" opacity=".9"/><circle cx="8" cy="10" r="1.8"/></svg>
        <svg width="26" height="13" viewBox="0 0 26 13" fill="none"><rect x="1" y="1" width="21" height="11" rx="3" stroke="currentColor" strokeWidth="1.2" opacity=".5"/><rect x="2.5" y="2.5" width="16" height="8" rx="1.6" fill="currentColor"/><rect x="23.5" y="4.5" width="1.6" height="4" rx="1" fill="currentColor" opacity=".5"/></svg>
      </div>
    </div>
  );
}

function BottomNav({ tab, onTab }){
  const items = [{k:"map",ico:"map",label:"地圖"},{k:"docs",ico:"doc",label:"文件"},{k:"packing",ico:"bag",label:"行李"}];
  return (
    <div className="botnav">
      {items.map(it=>(
        <button key={it.k} className={tab===it.k?"active":""} onClick={()=>onTab(it.k)}>
          <span className="nav-ico"><Ico name={it.ico} size={22} fill={false}/></span>{it.label}
        </button>
      ))}
    </div>
  );
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "primary": "#7a6cf0",
  "pink": "#f08fb0"
}/*EDITMODE-END*/;

// curated theme pairs [name, primary, pink]
const THEMES = [
  ["薰衣草", "#7a6cf0", "#f08fb0"],
  ["海洋藍", "#3a76f0", "#f0896a"],
  ["森林綠", "#2f9e8f", "#f0a64b"],
  ["暖橘",   "#e8745b", "#e0608a"],
  ["桃紫",   "#e8688f", "#8a6cf0"],
  ["石墨青", "#5b6470", "#3bb9a0"],
];

function ThemePresets({ primary, pink, onPick }){
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,padding:"2px 0 4px"}}>
      {THEMES.map(([name,p,k])=>{
        const on = primary===p && pink===k;
        return (
          <button key={name} onClick={()=>onPick(p,k)} style={{display:"flex",alignItems:"center",gap:9,
            border:on?"2px solid "+p:"1.5px solid rgba(0,0,0,.1)",background:on?"rgba(0,0,0,.03)":"transparent",
            borderRadius:11,padding:"8px 10px",cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:12.5,color:"inherit"}}>
            <span style={{display:"flex"}}>
              <span style={{width:16,height:16,borderRadius:"50%",background:p,border:"2px solid #fff",boxShadow:"0 0 0 1px rgba(0,0,0,.08)"}}/>
              <span style={{width:16,height:16,borderRadius:"50%",background:k,border:"2px solid #fff",marginLeft:-6,boxShadow:"0 0 0 1px rgba(0,0,0,.08)"}}/>
            </span>
            {name}
          </button>
        );
      })}
    </div>
  );
}

function App(){
  const [t,setTweak] = useTweaks(TWEAK_DEFAULTS);
  React.useEffect(()=>{
    const r = document.documentElement;
    r.style.setProperty("--primary", t.primary);
    r.style.setProperty("--pink", t.pink);
  },[t.primary,t.pink]);

  const [route,setRoute] = useState("login");   // login | list | trip
  const [tab,setTab] = useState("map");          // map | docs | packing
  const [trip,setTrip] = useState(TRIPS[0]);
  const [sheet,setSheet] = useState(null);       // newTrip | profile | upload | addPack
  const [detail,setDetail] = useState(null);
  const [emptyList,setEmptyList] = useState(false);
  const [collapsed,setCollapsed] = useState(false);
  const [showRoute,setShowRoute] = useState(true);
  const [offline,setOffline] = useState(false);

  function openTrip(t){ setTrip(t); setRoute("trip"); setTab("map"); setCollapsed(false); }

  const darkStatus = false;

  return (
    <div id="stage">
      <div className="phone">
        <div className="notch"/>
        <StatusBar/>
        <div className="phone-screen">

          {route==="login" && <LoginScreen onLogin={()=>setRoute("list")}/>}

          {route==="list" && (
            <TripListScreen empty={emptyList} onOpen={openTrip}
              onNew={()=>setSheet("newTrip")} onProfile={()=>setSheet("profile")}/>
          )}

          {route==="trip" && (
            <div className="screen">
              <div style={{flex:1,position:"relative",overflow:"hidden"}}>
                {tab==="map" && <MainScreen trip={trip} onBack={()=>setRoute("list")}
                  onOpenItem={(it)=>setDetail(it)} onNavTab={setTab}
                  collapsed={collapsed} setCollapsed={setCollapsed}
                  showRoute={showRoute} setShowRoute={setShowRoute}/>}
                {tab==="docs" && <DocsScreen offline={offline} setOffline={setOffline} onUpload={()=>setSheet("upload")}/>}
                {tab==="packing" && <PackingScreen onAdd={()=>setSheet("addPack")}/>}
              </div>
              <BottomNav tab={tab} onTab={(t)=>setTab(t)}/>
            </div>
          )}

          {/* detail slide-in */}
          {detail && <DetailSheet item={detail} onClose={()=>setDetail(null)} onNavTab={(t)=>{setDetail(null);setTab(t);}}/>}

          {/* sheets */}
          {sheet==="newTrip" && <NewTripSheet onClose={()=>setSheet(null)}/>}
          {sheet==="profile" && <ProfileSheet onClose={()=>setSheet(null)}/>}
          {sheet==="upload" && <UploadSheet onClose={()=>setSheet(null)}/>}
          {sheet==="addPack" && <AddPackSheet onClose={()=>setSheet(null)}/>}
        </div>
      </div>

      {/* desktop-only demo controls outside the device */}
      <div className="deskpanel">
        <div className="dp-title">同行 · 旅遊共編 App</div>
        <div className="dp-sub">手機直式高擬真原型</div>
        <div className="dp-group">
          <span className="dp-label">快速跳轉</span>
          <div className="dp-btns">
            <button onClick={()=>setRoute("login")} className={route==="login"?"on":""}>0 登入</button>
            <button onClick={()=>{setRoute("list");setEmptyList(false);}} className={route==="list"&&!emptyList?"on":""}>① 列表</button>
            <button onClick={()=>openTrip(TRIPS[0])} className={route==="trip"&&tab==="map"?"on":""}>② 主畫面</button>
            <button onClick={()=>{setRoute("trip");setTab("docs");}} className={route==="trip"&&tab==="docs"?"on":""}>④ 文件</button>
            <button onClick={()=>{setRoute("trip");setTab("packing");}} className={route==="trip"&&tab==="packing"?"on":""}>⑤ 行李</button>
          </div>
        </div>
        <div className="dp-group">
          <span className="dp-label">狀態切換</span>
          <div className="dp-btns">
            <button onClick={()=>{setRoute("list");setEmptyList(e=>!e);}} className={emptyList?"on":""}>旅程空狀態</button>
            <button onClick={()=>{setRoute("trip");setTab("map");setCollapsed(c=>!c);}} className={collapsed?"on":""}>側欄收合</button>
            <button onClick={()=>{setRoute("trip");setTab("docs");setOffline(o=>!o);}} className={offline?"on":""}>離線模式</button>
          </div>
        </div>
        <div className="dp-hint">控制列僅在桌面寬版顯示，方便預覽各畫面與狀態。手機上請用 App 內的導覽操作。</div>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="配色主題" />
        <ThemePresets primary={t.primary} pink={t.pink} onPick={(p,k)=>setTweak({primary:p,pink:k})} />
        <TweakSection label="自訂顏色" />
        <TweakColor label="主色（你）" value={t.primary}
          options={["#7a6cf0","#3a76f0","#2f9e8f","#e8745b","#e8688f","#5b6470"]}
          onChange={(v)=>setTweak("primary",v)} />
        <TweakColor label="夥伴色（另一半）" value={t.pink}
          options={["#f08fb0","#f0896a","#f0a64b","#e0608a","#8a6cf0","#3bb9a0"]}
          onChange={(v)=>setTweak("pink",v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
