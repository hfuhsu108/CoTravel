/* ============ screen 0: Login / Pairing & screen 1: Trip List ============ */
const { useState } = React;

/* ---------- shared brand mark ---------- */
function Logo({ size=58 }){
  return (
    <div style={{width:size,height:size,borderRadius:size*0.3,background:"linear-gradient(150deg,var(--primary),color-mix(in srgb,var(--primary) 55%,#fff))",
      display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 10px 24px rgba(122,108,240,.4)",position:"relative",flex:"none"}}>
      <span style={{color:"#fff",display:"flex"}}><Ico name="pin" size={size*0.5} fill/></span>
      <span style={{position:"absolute",right:-4,bottom:-4,width:size*0.42,height:size*0.42,borderRadius:"50%",
        background:"var(--pink)",border:"3px solid var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}>
        <Ico name="heart" size={size*0.2} fill/></span>
    </div>
  );
}

/* ================= LOGIN ================= */
function LoginScreen({ onLogin }){
  const [mode,setMode] = useState(null); // null | pair | join
  return (
    <div className="screen" style={{background:
      "radial-gradient(700px 420px at 50% -8%, var(--primary-soft) 0%, transparent 60%), linear-gradient(180deg,#fff,var(--primary-softer) 55%, var(--pink-soft))"}}>
      <div className="scroll" style={{display:"flex",flexDirection:"column",padding:"0 30px"}}>
        <div style={{flex:"0 0 132px"}}/>
        <div className="fadeup" style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center"}}>
          <Logo size={76}/>
          <h1 style={{fontSize:31,marginTop:24,letterSpacing:"-.02em"}}>同行</h1>
          <p style={{margin:"10px 0 0",color:"var(--ink-2)",fontSize:16,lineHeight:1.5,maxWidth:240}}>
            兩人一起，把行程排好。<br/>地圖、文件、行李，一個 App 全搞定。</p>
        </div>

        <div style={{flex:"0 0 46px"}}/>

        {!mode && (
          <div className="fadeup" style={{display:"flex",flexDirection:"column",gap:12}}>
            <button className="btn btn-ghost btn-block" style={{height:54}}>
              <span style={{color:"#4285F4",display:"flex"}}><Ico name="google" size={20} fill/></span>使用 Google 登入</button>
            <button className="btn btn-block" style={{height:54,background:"var(--ink)",color:"#fff"}} onClick={onLogin}>
              <Ico name="mail" size={19}/> 使用 Email 登入</button>
            <div style={{textAlign:"center",color:"var(--ink-3)",fontSize:13,margin:"6px 0"}}>— 第一次使用 —</div>
            <div style={{display:"flex",gap:10}}>
              <button className="btn btn-soft" style={{flex:1,flexDirection:"column",padding:"16px 8px",gap:7}} onClick={()=>setMode("pair")}>
                <Ico name="sparkle" size={22}/><span style={{fontSize:14}}>建立配對</span></button>
              <button className="btn btn-soft" style={{flex:1,flexDirection:"column",padding:"16px 8px",gap:7}} onClick={()=>setMode("join")}>
                <Ico name="users" size={22}/><span style={{fontSize:14}}>用邀請碼加入</span></button>
            </div>
          </div>
        )}

        {mode==="pair" && (
          <div className="fadeup card" style={{padding:22}}>
            <div className="t-eyebrow" style={{marginBottom:10}}>建立配對</div>
            <p style={{margin:"0 0 16px",color:"var(--ink-2)",fontSize:14,lineHeight:1.5}}>把這組邀請碼傳給另一半，對方輸入後就能一起編行程。</p>
            <div style={{display:"flex",gap:8,justifyContent:"center",margin:"4px 0 18px"}}>
              {["L","O","V","E","2","6"].map((c,i)=>(
                <div key={i} className="num" style={{width:42,height:52,borderRadius:13,background:"var(--primary-soft)",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:800,color:"var(--primary-deep)"}}>{c}</div>
              ))}
            </div>
            <button className="btn btn-primary btn-block" onClick={onLogin}>分享邀請碼並開始</button>
            <button className="btn btn-block" style={{background:"transparent",color:"var(--ink-3)",marginTop:4}} onClick={()=>setMode(null)}>返回</button>
          </div>
        )}

        {mode==="join" && (
          <div className="fadeup card" style={{padding:22}}>
            <div className="t-eyebrow" style={{marginBottom:10}}>輸入邀請碼</div>
            <div className="field"><label>另一半給你的 6 碼邀請碼</label>
              <input defaultValue="" placeholder="例如 LOVE26" style={{textTransform:"uppercase",letterSpacing:".3em",textAlign:"center",fontWeight:800,fontFamily:"var(--ff-round)"}}/></div>
            <button className="btn btn-primary btn-block" onClick={onLogin}>加入伴侶</button>
            <button className="btn btn-block" style={{background:"transparent",color:"var(--ink-3)",marginTop:4}} onClick={()=>setMode(null)}>返回</button>
          </div>
        )}
        <div style={{flex:1,minHeight:30}}/>
        <p style={{textAlign:"center",color:"var(--ink-4)",fontSize:12,margin:"16px 0 30px"}}>登入即表示同意服務條款與隱私權政策</p>
      </div>
    </div>
  );
}

/* ================= TRIP LIST ================= */
function coverBg(kind){
  if(kind==="warm") return "ph warm";
  if(kind==="cool") return "ph cool";
  return "ph";
}
function TripCard({ t, big, onOpen }){
  const live = t.status==="ongoing";
  return (
    <button onClick={()=>onOpen(t)} className="card fadeup" style={{padding:0,overflow:"hidden",border:0,cursor:"pointer",
      textAlign:"left",width:"100%",display:"block",
      boxShadow:live?"0 14px 32px rgba(122,108,240,.22)":"var(--sh-2)",
      outline:live?"2px solid var(--primary)":"none"}}>
      <div className={coverBg(t.cover)} style={{height:big?138:104,alignItems:"flex-end"}}>
        {t.cover==="map" && <MiniMapBg/>}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(20,12,40,.5))"}}/>
        <span style={{position:"absolute",top:10,left:12,zIndex:2}}>{t.coverLabel}</span>
        <div style={{position:"absolute",top:10,right:10,zIndex:3}}>
          {live ? <span className="chip chip-live"><span className="dot" style={{animation:"none"}}/>{t.badge}</span>
            : t.status==="upcoming" ? <span className="chip" style={{background:"rgba(255,255,255,.92)",color:"var(--primary-deep)"}}>{t.badge}</span>
            : <span className="chip" style={{background:"rgba(255,255,255,.85)",color:"var(--ink-2)"}}>{t.badge}</span>}
        </div>
        <div style={{position:"relative",zIndex:2,padding:"0 14px 12px",color:"#fff",width:"100%",display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
          <div>
            <div style={{fontSize:big?22:18,fontWeight:800,textShadow:"0 1px 6px rgba(0,0,0,.3)"}}>{t.name}</div>
            <div className="num" style={{fontSize:13,opacity:.95,fontWeight:600,marginTop:2,textShadow:"0 1px 4px rgba(0,0,0,.3)"}}>{t.range}</div>
          </div>
          <div className="av-pair">
            <div className="av av-ring" style={{width:28,height:28,fontSize:12}}>{ME.initial}</div>
            <div className="av b av-ring" style={{width:28,height:28,fontSize:12}}>{PARTNER.initial}</div>
          </div>
        </div>
      </div>
    </button>
  );
}
function MiniMapBg(){
  return (
    <svg viewBox="0 0 393 140" width="100%" height="100%" style={{position:"absolute",inset:0}} preserveAspectRatio="xMidYMid slice">
      <rect width="393" height="140" fill="var(--map-bg)"/>
      <path d="M-10 96 C60 80 120 120 200 104 C280 90 360 110 410 96 L410 150 L-10 150Z" fill="var(--map-water)"/>
      <rect x="40" y="20" width="70" height="48" rx="12" fill="var(--map-park)"/>
      <g stroke="#fff" strokeWidth="9" fill="none"><path d="M0 50H393"/><path d="M150 0V140"/><path d="M280 0V140"/></g>
      <g stroke="var(--map-road-minor)" strokeWidth="4" fill="none"><path d="M0 90H393"/><path d="M70 0V140"/></g>
      <circle cx="200" cy="62" r="6" fill="var(--primary)" stroke="#fff" strokeWidth="2"/>
    </svg>
  );
}

function GroupHeader({ icon, title, count, color, collapsible, open, onToggle }){
  return (
    <div className="row" style={{justifyContent:"space-between",margin:"22px 4px 12px"}}>
      <div className="row" style={{gap:9}}>
        <span style={{color,display:"flex"}}><Ico name={icon} size={19} fill={icon==="pin"}/></span>
        <h3 style={{fontSize:16}}>{title}</h3>
        <span className="chip gray" style={{padding:"2px 9px"}}>{count}</span>
      </div>
      {collapsible && <button className="icon-btn bare" onClick={onToggle} style={{width:28,height:28}}>
        <span style={{transform:open?"rotate(0)":"rotate(-90deg)",transition:"transform .2s",display:"flex"}}><Ico name="chevD" size={18}/></span></button>}
    </div>
  );
}

function TripListScreen({ onOpen, onNew, onProfile, empty }){
  const [pastOpen,setPastOpen] = useState(false);
  const ongoing = TRIPS.filter(t=>t.status==="ongoing");
  const upcoming = TRIPS.filter(t=>t.status==="upcoming");
  const past = TRIPS.filter(t=>t.status==="past");

  if(empty){
    return (
      <div className="screen">
        <div className="appbar"><div className="row" style={{gap:10}}><Logo size={32}/><h1>同行</h1></div>
          <div className="av av-online" style={{width:38,height:38}} onClick={onProfile}>{ME.initial}</div></div>
        <div className="scroll" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"0 36px",gap:8}}>
          <div className="ph" style={{width:170,height:140,borderRadius:24,marginBottom:8}}><span>空狀態插圖</span></div>
          <h2 style={{fontSize:21}}>還沒有任何旅程</h2>
          <p style={{color:"var(--ink-2)",fontSize:15,lineHeight:1.55,maxWidth:250}}>建立第一趟旅程，邀請另一半，一起在地圖上排出完美行程。</p>
          <button className="btn btn-primary" style={{marginTop:14}} onClick={onNew}><Ico name="plus" size={19}/> 建立第一趟旅程</button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="appbar">
        <div className="row" style={{gap:10}}><Logo size={32}/><h1>同行</h1></div>
        <div className="av av-online" style={{width:38,height:38,cursor:"pointer"}} onClick={onProfile}>{ME.initial}</div>
      </div>
      <div className="scroll" style={{padding:"4px 16px 30px"}}>
        <GroupHeader icon="pin" title="進行中" count={ongoing.length} color="var(--ok)"/>
        {ongoing.map(t=><div key={t.id} style={{marginBottom:14}}><TripCard t={t} big onOpen={onOpen}/></div>)}

        <GroupHeader icon="plane" title="即將出發" count={upcoming.length} color="var(--primary)"/>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {upcoming.map(t=><TripCard key={t.id} t={t} onOpen={onOpen}/>)}
        </div>

        <GroupHeader icon="clock" title="過往旅程" count={past.length} color="var(--ink-3)" collapsible open={pastOpen} onToggle={()=>setPastOpen(o=>!o)}/>
        {pastOpen && <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {past.map(t=><div key={t.id} style={{opacity:.82}}><TripCard t={t} onOpen={onOpen}/></div>)}
        </div>}
      </div>
      <button className="fab" onClick={onNew} style={{bottom:30}}><Ico name="plus" size={28}/></button>
    </div>
  );
}

/* ---------- create trip sheet ---------- */
function NewTripSheet({ onClose }){
  return (
    <>
      <div className="scrim" onClick={onClose}/>
      <div className="sheet" style={{paddingBottom:34}}>
        <div className="grip"/>
        <div style={{padding:"6px 22px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h2 style={{fontSize:20}}>建立新旅程</h2>
          <button className="icon-btn bare" onClick={onClose}><Ico name="x" size={20}/></button>
        </div>
        <div className="scroll" style={{padding:"18px 22px 0"}}>
          <div className="field"><label>旅程名稱</label><input placeholder="例如：大阪 5 日"/></div>
          <div className="field"><label>目的地</label><input placeholder="搜尋城市或地區"/></div>
          <div style={{display:"flex",gap:12}}>
            <div className="field" style={{flex:1}}><label>出發日</label><input type="date" defaultValue="2026-07-12"/></div>
            <div className="field" style={{flex:1}}><label>結束日</label><input type="date" defaultValue="2026-07-16"/></div>
          </div>
          <div className="field"><label>邀請同伴</label>
            <div className="row card" style={{padding:"10px 12px",boxShadow:"none",border:"1.5px solid var(--line-strong)",borderRadius:13}}>
              <div className="av b" style={{width:34,height:34,fontSize:14}}>{PARTNER.initial}</div>
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14}}>{PARTNER.name}</div><div style={{fontSize:12,color:"var(--ink-3)"}}>已配對・自動加入</div></div>
              <span className="chip ok">夥伴</span>
            </div>
          </div>
        </div>
        <div style={{padding:"8px 22px 0"}}>
          <button className="btn btn-primary btn-block" onClick={onClose}><Ico name="sparkle" size={18}/> 建立旅程</button>
        </div>
      </div>
    </>
  );
}

/* ---------- profile sheet ---------- */
function ProfileSheet({ onClose }){
  return (
    <>
      <div className="scrim" onClick={onClose}/>
      <div className="sheet" style={{paddingBottom:34}}>
        <div className="grip"/>
        <div style={{padding:"14px 22px 4px",display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
          <div className="av av-online" style={{width:64,height:64,fontSize:24}}>{ME.initial}</div>
          <h2 style={{fontSize:20}}>{ME.name}</h2>
          <span className="chip pink"><Ico name="heart" size={13} fill/> 已與 {PARTNER.name} 配對</span>
        </div>
        <div style={{padding:"14px 16px 0"}}>
          {[{i:"gear",t:"帳號設定"},{i:"users",t:"管理配對"},{i:"bell",t:"通知設定"},{i:"cloud",t:"離線下載管理"}].map((r,k)=>(
            <div key={k} className="row" style={{padding:"15px 8px",borderBottom:"1px solid var(--line)"}}>
              <span style={{color:"var(--ink-2)",display:"flex"}}><Ico name={r.i} size={20}/></span>
              <span style={{flex:1,fontWeight:600}}>{r.t}</span>
              <Ico name="chevR" size={18}/></div>
          ))}
          <button className="btn btn-block" style={{marginTop:16,color:"var(--danger)",background:"var(--pink-soft)"}} onClick={onClose}>登出</button>
        </div>
      </div>
    </>
  );
}

Object.assign(window,{Logo,LoginScreen,TripListScreen,NewTripSheet,ProfileSheet,MiniMapBg});
