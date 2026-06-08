/* ============ screen 2: Main (map + day sidebar) & screen 3: Detail ============ */

function ModeIco({mode,size=18}){ return <Ico name={mode==="walk"?"walk":mode==="car"?"car":"train"} size={size}/>; }
function modeWord(m){ return m==="walk"?"步行":m==="car"?"開車":"大眾運輸"; }

/* ---- day sidebar item cards ---- */
function TransitRow({ it, onClick }){
  return (
    <button onClick={onClick} style={{display:"flex",alignItems:"center",gap:9,margin:"0 0 0 19px",padding:"7px 12px",
      background:"transparent",border:0,cursor:"pointer",color:"var(--ink-3)",position:"relative",width:"calc(100% - 19px)",whiteSpace:"nowrap"}}>
      <span style={{position:"absolute",left:-19,top:"-6px",bottom:"-6px",width:2,
        backgroundImage:"linear-gradient(var(--line-strong) 60%, transparent 0)",backgroundSize:"2px 8px"}}/>
      <span style={{display:"flex",color:"var(--ink-2)"}}><ModeIco mode={it.mode}/></span>
      <span style={{fontSize:13,fontWeight:600,color:"var(--ink-2)"}}>{it.label}</span>
      <span className="num" style={{fontSize:13,fontWeight:700,color:"var(--ink-2)"}}>· {it.time}</span>
      <span style={{flex:1}}/>
      <span style={{display:"flex"}}><Ico name="chevR" size={15}/></span>
    </button>
  );
}

function PlaceCard({ it, selected, onSelect }){
  return (
    <div onClick={onSelect} className="card" style={{padding:10,display:"flex",gap:11,cursor:"pointer",alignItems:"center",
      boxShadow:selected?"0 0 0 2px var(--primary), var(--sh-2)":"var(--sh-1)",transition:"box-shadow .2s"}}>
      <div style={{position:"relative",flex:"none"}}>
        <div className={"ph "+(it.thumb==="warm"?"warm":it.thumb==="cool"?"cool":"")} style={{width:58,height:58,borderRadius:14}}/>
        <span style={{position:"absolute",top:-7,left:-7,width:24,height:24,borderRadius:"50%",background:"var(--primary)",
          color:"#fff",fontWeight:800,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",
          border:"2px solid #fff",fontFamily:"var(--ff-round)"}}>{it.n}</span>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div className="row" style={{justifyContent:"space-between"}}>
          <div style={{fontWeight:800,fontSize:15.5}}>{it.name}</div>
          {it.doc && <span style={{color:"var(--primary)",display:"flex"}}><Ico name="link" size={16}/></span>}
        </div>
        <div className="row" style={{gap:8,marginTop:3}}>
          {it.time && <span className="num chip" style={{padding:"2px 8px",fontSize:12}}><Ico name="clock" size={12}/>{it.time}</span>}
          <span className="num" style={{fontSize:12.5,color:"var(--ink-3)",fontWeight:700,display:"flex",alignItems:"center",gap:3}}>
            <span style={{color:"var(--warn)",display:"flex"}}><Ico name="star" size={12} fill/></span>{it.rating}</span>
        </div>
      </div>
    </div>
  );
}

function AreaCard({ it, selected, onSelect }){
  const [open,setOpen] = useState(false);
  return (
    <div className="card" style={{padding:0,overflow:"hidden",boxShadow:selected?"0 0 0 2px var(--primary), var(--sh-2)":"var(--sh-1)"}}>
      <div onClick={onSelect} style={{padding:10,display:"flex",gap:11,cursor:"pointer",alignItems:"center"}}>
        <div style={{width:58,height:58,borderRadius:"50%",flex:"none",background:"rgba(122,108,240,.14)",
          border:"2px dashed var(--primary)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--primary-deep)"}}>
          <Ico name="layers" size={22}/></div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:800,fontSize:15.5}}>{it.name}</div>
          <div className="row" style={{gap:7,marginTop:4}}>
            <span className="chip" style={{padding:"2px 9px",fontSize:12}}>{it.period}</span>
            <span style={{fontSize:12.5,color:"var(--ink-3)",fontWeight:700}}>{it.cands} 個候選</span>
          </div>
        </div>
        <button className="icon-btn bare" onClick={(e)=>{e.stopPropagation();setOpen(o=>!o);}} style={{width:28,height:28}}>
          <span style={{transform:open?"rotate(0)":"rotate(-90deg)",transition:"transform .2s",display:"flex"}}><Ico name="chevD" size={18}/></span></button>
      </div>
      {open && <div style={{padding:"0 12px 12px"}}>
        {it.candidates.map((c,i)=>(
          <div key={i} className="row" style={{padding:"8px 0",borderTop:"1px solid var(--line)",gap:9}}>
            <span className={"ck "+(c.pick?"on":"")} style={{width:20,height:20,borderRadius:6}}>{c.pick&&<Ico name="check" size={13}/>}</span>
            <span style={{flex:1,fontSize:14,fontWeight:c.pick?700:500}}>{c.name}</span>
            <span className="chip gray" style={{padding:"1px 8px",fontSize:11}}>{c.tag}</span>
          </div>
        ))}
      </div>}
    </div>
  );
}

/* ================= MAIN SCREEN ================= */
function MainScreen({ trip, onBack, onOpenItem, onNavTab, collapsed, setCollapsed, showRoute, setShowRoute }){
  const [dayIdx,setDayIdx] = useState(1); // Day 2
  const [selName,setSelName] = useState(null);
  const [popup,setPopup] = useState(null);
  const [banner,setBanner] = useState(true);
  const [bellOpen,setBellOpen] = useState(true);

  const day = DAYS[dayIdx];

  function handleMarker(m){ setSelName(m.name); setPopup(m); }

  return (
    <div className="screen" style={{background:"var(--map-bg)"}}>
      {/* MAP background */}
      <StylizedMap dim={!collapsed} showRoute={showRoute} selected={selName} onMarker={handleMarker}/>

      {/* top bar */}
      <div style={{position:"absolute",top:0,left:0,right:0,zIndex:30,padding:"54px 12px 0"}}>
        <div className="row" style={{justifyContent:"space-between",gap:8}}>
          <button className="icon-btn" onClick={onBack}><Ico name="back" size={20}/></button>
          <div style={{flex:1,textAlign:"center",lineHeight:1.1}}>
            <div style={{fontWeight:800,fontSize:16}}>{trip.name}</div>
            <div className="num" style={{fontSize:11.5,color:"var(--ink-3)",fontWeight:700}}>{trip.range}</div>
          </div>
          <div className="row" style={{gap:6}}>
            <div className="av-pair">
              <div className="av av-ring av-online" style={{width:32,height:32,fontSize:13}}>{ME.initial}</div>
              <div className="av b av-ring av-online" style={{width:32,height:32,fontSize:13}}>{PARTNER.initial}</div>
            </div>
            <button className="icon-btn" style={{position:"relative"}} onClick={()=>{setBellOpen(true);setBanner(true);}}>
              <Ico name="bell" size={19}/>
              {bellOpen && <span style={{position:"absolute",top:7,right:8,width:9,height:9,borderRadius:"50%",background:"var(--danger)",border:"2px solid #fff"}}/>}
            </button>
          </div>
        </div>
        {/* day tabs */}
        <div style={{display:"flex",gap:7,overflowX:"auto",padding:"12px 2px 4px",scrollbarWidth:"none"}}>
          {DAYS.map((d,i)=>(
            <button key={d.d} onClick={()=>setDayIdx(i)} style={{flex:"none",border:0,cursor:"pointer",borderRadius:13,
              padding:"7px 13px",fontFamily:"var(--ff)",fontWeight:700,fontSize:13,boxShadow:"var(--sh-1)",
              background:i===dayIdx?"var(--primary)":"rgba(255,255,255,.92)",color:i===dayIdx?"#fff":"var(--ink-2)",
              display:"flex",flexDirection:"column",alignItems:"center",lineHeight:1.25,backdropFilter:"blur(4px)"}}>
              <span className="num">Day {d.d}</span>
              <span className="num" style={{fontSize:10.5,opacity:.85,fontWeight:600}}>{d.date}</span>
            </button>
          ))}
        </div>
      </div>

      {/* change banner */}
      {banner && (
        <div className="banner" style={{top:158}} onClick={()=>setBanner(false)}>
          <div className="av b" style={{width:30,height:30,fontSize:12}}>{PARTNER.initial}</div>
          <div style={{flex:1,fontSize:13,lineHeight:1.4}}><b>{PARTNER.name}</b> 把「梅田藍天大廈」加到 Day 2</div>
          <span style={{display:"flex",opacity:.7}}><Ico name="x" size={16}/></span>
        </div>
      )}

      {/* marker popup card */}
      {popup && (
        <div className="fadeup" style={{position:"absolute",left:16,right:16,bottom:collapsed?96:"auto",
          top:collapsed?"auto":270,zIndex:55}} >
          <div className="card" style={{padding:0,overflow:"hidden",boxShadow:"var(--sh-3)"}}>
            <div style={{display:"flex"}}>
              <div className={"ph "+(popup.kind==="bookmark"?"warm":"cool")} style={{width:96,flex:"none"}}><span>{popup.name}</span></div>
              <div style={{flex:1,padding:"11px 12px",minWidth:0}}>
                <div className="row" style={{justifyContent:"space-between"}}>
                  <div style={{fontWeight:800,fontSize:15}}>{popup.name}</div>
                  <button className="icon-btn bare" style={{width:24,height:24}} onClick={()=>{setPopup(null);setSelName(null);}}><Ico name="x" size={16}/></button>
                </div>
                {popup.kind==="bookmark"
                  ? <span className={"chip "+(popup.state==="want"?"pink":"ok")} style={{marginTop:6}}>
                      {popup.state==="want"?"想去・尚未排入":"已排入行程"}</span>
                  : <div className="num" style={{fontSize:12.5,color:"var(--ink-3)",fontWeight:700,marginTop:5,display:"flex",alignItems:"center",gap:4}}>
                      <span style={{color:"var(--warn)",display:"flex"}}><Ico name="star" size={13} fill/></span>4.5 · 大阪市中央区</div>}
                <div className="row" style={{gap:7,marginTop:10}}>
                  <button className="btn btn-primary btn-sm" style={{flex:1}} onClick={()=>onOpenItem(DAY2[0])}><Ico name="plus" size={15}/>加入某天</button>
                  <button className="btn btn-ghost btn-sm" onClick={()=>onNavTab("docs")}><Ico name="doc" size={15}/>看文件</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* collapsed handle */}
      {collapsed && (
        <button onClick={()=>setCollapsed(false)} style={{position:"absolute",left:"50%",transform:"translateX(-50%)",
          bottom:150,zIndex:45,border:0,cursor:"pointer",background:"var(--surface)",borderRadius:99,padding:"10px 18px",
          boxShadow:"var(--sh-3)",display:"flex",gap:8,alignItems:"center",fontWeight:800,fontSize:13,color:"var(--primary-deep)",whiteSpace:"nowrap"}}>
          <Ico name="list" size={17}/> Day 2 行程（{DAY2.filter(i=>i.type!=="transit").length} 個地點）<Ico name="chevD" size={16}/></button>
      )}

      {/* day sidebar panel */}
      {!collapsed && (
        <div style={{position:"absolute",left:0,right:0,bottom:0,top:208,zIndex:50,background:"var(--bg)",
          borderRadius:"26px 26px 0 0",boxShadow:"0 -10px 40px rgba(40,28,90,.2)",display:"flex",flexDirection:"column",
          animation:"slideup .3s cubic-bezier(.2,.8,.2,1)"}}>
          <div style={{padding:"6px 0 0"}}><div className="grip"/></div>
          <div className="row" style={{justifyContent:"space-between",padding:"4px 18px 12px"}}>
            <div>
              <div style={{fontWeight:800,fontSize:17}}>{day.date}・Day {day.d}</div>
              <div style={{fontSize:12.5,color:"var(--ink-3)",fontWeight:600}}>{day.label}</div>
            </div>
            <div className="row" style={{gap:6}}>
              <button className={"icon-btn "+(showRoute?"":"bare")} title="路線" onClick={()=>setShowRoute(r=>!r)}
                style={{color:showRoute?"var(--primary-deep)":"var(--ink-3)",background:showRoute?"var(--primary-soft)":"transparent",border:showRoute?"1px solid var(--primary-soft)":"1px solid var(--line)"}}>
                <Ico name="nav" size={18}/></button>
              <button className="icon-btn" onClick={()=>setCollapsed(true)} title="收合"><Ico name="chevD" size={18}/></button>
            </div>
          </div>
          <div className="scroll" style={{padding:"0 16px 110px"}}>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {DAY2.map((it,i)=>{
                if(it.type==="transit") return <TransitRow key={i} it={it} onClick={()=>onOpenItem({...it,_kind:"transit"})}/>;
                if(it.type==="area") return <div key={i} style={{margin:"4px 0"}}><AreaCard it={it} selected={selName===it.label} onSelect={()=>onOpenItem({...it,_kind:"area"})}/></div>;
                return <div key={i} style={{margin:"4px 0"}}><PlaceCard it={it} selected={selName===it.name} onSelect={()=>onOpenItem({...it,_kind:"place"})}/></div>;
              })}
            </div>
            <button className="btn btn-soft btn-block" style={{marginTop:14,borderRadius:14,border:"1.5px dashed var(--primary)"}}><Ico name="plus" size={18}/> 加項目</button>
          </div>
        </div>
      )}

      {/* search bar + view toggle — only meaningful when collapsed/full map */}
      {collapsed && (
        <div style={{position:"absolute",left:14,right:14,bottom:96,zIndex:46,display:"flex",gap:9}}>
          <div className="card row" style={{flex:1,padding:"12px 14px",gap:9,boxShadow:"var(--sh-3)"}}>
            <span style={{color:"var(--ink-3)",display:"flex"}}><Ico name="search" size={19}/></span>
            <span style={{color:"var(--ink-3)",fontSize:14.5,fontWeight:600}}>搜尋景點…</span>
          </div>
          <button className="card" style={{width:50,display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:"var(--sh-3)",color:"var(--primary-deep)",border:0,cursor:"pointer"}} onClick={()=>setCollapsed(false)}>
            <Ico name="list" size={21}/></button>
        </div>
      )}
    </div>
  );
}

/* ================= DETAIL SHEETS ================= */
function DetailSheet({ item, onClose, onNavTab }){
  const kind = item._kind || (item.type) || "place";
  return (
    <div className="slidein">
      {/* hero */}
      <div style={{position:"relative",flex:"none"}}>
        {kind==="transit"
          ? <div className="ph" style={{height:200}}><MiniRouteMap/></div>
          : <div className={"ph "+(item.thumb==="warm"||kind==="area"?"warm":"cool")} style={{height:210}}><span>{item.thumbLabel||item.name} 大圖</span></div>}
        <button className="icon-btn" onClick={onClose} style={{position:"absolute",top:54,left:14,background:"rgba(255,255,255,.92)"}}><Ico name="back" size={20}/></button>
        <div className="av-pair" style={{position:"absolute",top:54,right:14}}>
          <div className={"av av-ring "+(item.by==="pa"?"b":"")} style={{width:30,height:30,fontSize:12}}>{item.by==="pa"?PARTNER.initial:ME.initial}</div>
        </div>
      </div>

      <div className="scroll" style={{padding:"18px 20px 30px"}}>
        {kind==="place" && <PlaceDetail item={item} onNavTab={onNavTab}/>}
        {kind==="area" && <AreaDetail item={item}/>}
        {kind==="transit" && <TransitDetail item={item} onNavTab={onNavTab}/>}
      </div>
    </div>
  );
}

function DetailHead({ title, sub, badge }){
  return (
    <div style={{marginBottom:14}}>
      {badge}
      <h1 style={{fontSize:25,letterSpacing:"-.02em",marginTop:6}}>{title}</h1>
      {sub && <div style={{color:"var(--ink-2)",fontSize:14,marginTop:5}}>{sub}</div>}
    </div>
  );
}
function InfoRow({ ico, label, value }){
  return (
    <div className="row" style={{padding:"12px 0",borderBottom:"1px solid var(--line)",gap:12}}>
      <span style={{color:"var(--ink-3)",display:"flex"}}><Ico name={ico} size={19}/></span>
      <span style={{color:"var(--ink-3)",fontSize:13.5,fontWeight:700,width:62}}>{label}</span>
      <span style={{flex:1,fontSize:14.5,fontWeight:600}}>{value}</span>
    </div>
  );
}

function PlaceDetail({ item, onNavTab }){
  return (
    <>
      <DetailHead title={item.name}
        sub={<span style={{display:"flex",alignItems:"center",gap:5}}>
          <span style={{color:"var(--warn)",display:"flex"}}><Ico name="star" size={15} fill/></span>
          <b className="num" style={{color:"var(--ink)"}}>{item.rating}</b> · 景點 · 大阪</span>}
        badge={<span className="chip">Day 2 · 第 {item.n} 站</span>}/>
      <InfoRow ico="pin" label="地址" value={item.addr}/>
      <InfoRow ico="clock" label="營業" value={item.hours}/>
      <InfoRow ico="clock" label="造訪時間" value={<span className="num">{item.time}　<span style={{color:"var(--primary)",fontWeight:700}}>編輯</span></span>}/>
      <div style={{margin:"16px 0"}}>
        <div className="t-eyebrow" style={{marginBottom:8}}>備註</div>
        <div className="card" style={{padding:"13px 15px",boxShadow:"none",background:"var(--surface-2)",border:"1px solid var(--line)",fontSize:14.5,lineHeight:1.55,color:"var(--ink-2)"}}>{item.note}</div>
      </div>
      <div style={{display:"flex",gap:10,marginBottom:10}}>
        <button className="btn btn-ghost" style={{flex:1}} onClick={()=>onNavTab&&onNavTab("docs")}><Ico name="link" size={17}/>連結文件</button>
        <button className="btn btn-primary" style={{flex:1}}><Ico name="nav" size={17}/>導航</button>
      </div>
      <div style={{display:"flex",gap:10}}>
        <button className="btn btn-soft" style={{flex:1}}><Ico name="move" size={16}/>移到其他天</button>
        <button className="btn" style={{flex:1,background:"var(--pink-soft)",color:"var(--danger)"}}><Ico name="trash" size={16}/>移除</button>
      </div>
    </>
  );
}

function AreaDetail({ item }){
  const [cands,setCands] = useState(item.candidates.map(c=>c.pick));
  return (
    <>
      <DetailHead title={item.name} badge={<span className="chip"><Ico name="layers" size={13}/> 區域 · {item.period}</span>}
        sub={item.note}/>
      <div className="card" style={{padding:0,overflow:"hidden",marginBottom:18,boxShadow:"var(--sh-1)"}}>
        <div className="ph" style={{height:120}}><span>圈選範圍縮圖</span>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{width:90,height:90,borderRadius:"50%",border:"2.5px dashed var(--primary)",background:"rgba(122,108,240,.12)"}}/>
          </div>
        </div>
      </div>
      <div className="row" style={{justifyContent:"space-between",marginBottom:10}}>
        <div className="t-eyebrow">候選店家（{item.cands}）</div>
        <span style={{fontSize:12.5,color:"var(--ink-3)",fontWeight:700}}>勾選＝今天就去這間</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:9}}>
        {item.candidates.map((c,i)=>(
          <div key={i} className="card row" style={{padding:10,boxShadow:"var(--sh-1)",gap:11}}>
            <span onClick={()=>setCands(a=>a.map((v,j)=>j===i?!v:v))} className={"ck "+(cands[i]?"on":"")}>{cands[i]&&<Ico name="check" size={15}/>}</span>
            <div className="ph cool" style={{width:44,height:44,borderRadius:11,flex:"none"}}/>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:14.5}}>{c.name}</div>
              <div className="num" style={{fontSize:12,color:"var(--ink-3)",fontWeight:700,display:"flex",alignItems:"center",gap:3,marginTop:2}}>
                <span style={{color:"var(--warn)",display:"flex"}}><Ico name="star" size={11} fill/></span>{c.rating}</div>
            </div>
            <span className="chip gray" style={{fontSize:11}}>{c.tag}</span>
          </div>
        ))}
      </div>
      <button className="btn btn-soft btn-block" style={{marginTop:14,border:"1.5px dashed var(--primary)"}}><Ico name="plus" size={17}/> 新增候選店家</button>
    </>
  );
}

function TransitDetail({ item, onNavTab }){
  const [mode,setMode] = useState(item.mode);
  const modes = [{k:"walk",t:"步行"},{k:"train",t:"大眾運輸"},{k:"car",t:"開車"},{k:"custom",t:"自定義"}];
  return (
    <>
      <DetailHead title={<span className="row" style={{gap:9,fontSize:21}}>大阪城公園 <span style={{color:"var(--ink-4)",display:"flex"}}><Ico name="chevR" size={20}/></span> 心齋橋</span>}
        badge={<span className="chip"><Ico name="train" size={13}/> 交通</span>}/>
      <div className="seg" style={{marginBottom:16}}>
        {modes.map(m=><button key={m.k} className={mode===m.k?"on":""} onClick={()=>setMode(m.k)}>{m.t}</button>)}
      </div>
      <div className="card" style={{padding:0,overflow:"hidden",marginBottom:16,boxShadow:"var(--sh-1)"}}>
        <div className="ph" style={{height:140}}><MiniRouteMap/></div>
      </div>
      {mode!=="custom" ? (
        <div className="row" style={{justifyContent:"space-around",padding:"4px 0 8px",marginBottom:8}}>
          <div style={{textAlign:"center"}}><div className="num" style={{fontSize:26,fontWeight:800,color:"var(--primary-deep)"}}>25</div><div style={{fontSize:12,color:"var(--ink-3)",fontWeight:700}}>分鐘</div></div>
          <div style={{width:1,background:"var(--line)"}}/>
          <div style={{textAlign:"center"}}><div className="num" style={{fontSize:26,fontWeight:800,color:"var(--primary-deep)"}}>4.2</div><div style={{fontSize:12,color:"var(--ink-3)",fontWeight:700}}>公里</div></div>
          <div style={{width:1,background:"var(--line)"}}/>
          <div style={{textAlign:"center"}}><div className="num" style={{fontSize:26,fontWeight:800,color:"var(--primary-deep)"}}>¥240</div><div style={{fontSize:12,color:"var(--ink-3)",fontWeight:700}}>車資</div></div>
        </div>
      ) : (
        <div className="fadeup">
          <div className="field"><label>交通方式</label><select defaultValue="新幹線"><option>新幹線</option><option>包車</option><option>渡輪</option><option>計程車</option></select></div>
          <div style={{display:"flex",gap:12}}>
            <div className="field" style={{flex:1}}><label>預估時間</label><input defaultValue="25 分"/></div>
            <div className="field" style={{flex:1}}><label>費用</label><input defaultValue="¥240"/></div>
          </div>
          <div className="field"><label>備註</label><input placeholder="例如：搭御堂筋線，記得用 ICOCA"/></div>
          <button className="btn btn-ghost btn-block" style={{marginBottom:8}} onClick={()=>onNavTab&&onNavTab("docs")}><Ico name="link" size={17}/> 連結車票文件</button>
        </div>
      )}
      <button className="btn btn-primary btn-block"><Ico name="nav" size={17}/> 開啟路線導航</button>
    </>
  );
}

function MiniRouteMap(){
  return (
    <svg viewBox="0 0 393 200" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
      <rect width="393" height="200" fill="var(--map-bg)"/>
      <path d="M-10 150 C80 130 140 170 240 150 C320 134 410 150 410 150 L410 220 L-10 220Z" fill="var(--map-water)"/>
      <rect x="60" y="30" width="80" height="55" rx="14" fill="var(--map-park)"/>
      <g stroke="#fff" strokeWidth="11" fill="none"><path d="M0 70H393"/><path d="M0 130H393"/><path d="M180 0V200"/></g>
      <g stroke="var(--map-road-minor)" strokeWidth="5" fill="none"><path d="M90 0V200"/><path d="M300 0V200"/></g>
      <polyline points="70,50 180,70 250,130 320,150" fill="none" stroke="var(--primary)" strokeWidth="4" strokeDasharray="2 9" strokeLinecap="round"/>
      <g><circle cx="70" cy="50" r="9" fill="var(--primary)" stroke="#fff" strokeWidth="3"/></g>
      <g><circle cx="320" cy="150" r="9" fill="var(--pink)" stroke="#fff" strokeWidth="3"/></g>
    </svg>
  );
}

Object.assign(window,{MainScreen,DetailSheet,MiniRouteMap});
