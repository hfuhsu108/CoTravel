/* ============ screen 4: Docs & screen 5: Packing ============ */

/* ================= DOCS ================= */
function DocsScreen({ offline, setOffline, onUpload }){
  const [tab,setTab] = useState("flight");
  const list = DOCS[tab];
  const visible = offline ? list.filter(d=>d.off) : list;
  const grayed = offline ? list.filter(d=>!d.off) : [];

  return (
    <div className="screen">
      <div className="appbar" style={{paddingBottom:8}}>
        <h1>文件匣</h1>
        <button className={"icon-btn"} onClick={()=>setOffline(o=>!o)} title="離線模式"
          style={{width:"auto",padding:"0 12px",gap:7,color:offline?"#b9762a":"var(--ink-2)",
            background:offline?"var(--warn-soft)":"var(--surface)",border:offline?"1px solid #f3dcc0":"1px solid var(--line)"}}>
          <Ico name={offline?"cloudoff":"cloud"} size={18}/>
          <span style={{fontSize:12.5,fontWeight:700,whiteSpace:"nowrap"}}>{offline?"離線中":"線上"}</span>
        </button>
      </div>

      {/* tabs */}
      <div style={{display:"flex",gap:7,padding:"4px 16px 12px",overflowX:"auto",scrollbarWidth:"none"}}>
        {DOC_TABS.map(t=>{
          const on = tab===t.k, n = DOCS[t.k].length;
          return (
            <button key={t.k} onClick={()=>setTab(t.k)} style={{flex:"none",border:0,cursor:"pointer",borderRadius:13,
              padding:"9px 14px",fontFamily:"var(--ff)",fontWeight:700,fontSize:13.5,display:"flex",alignItems:"center",gap:7,
              background:on?"var(--primary)":"var(--surface)",color:on?"#fff":"var(--ink-2)",boxShadow:"var(--sh-1)"}}>
              <Ico name={t.ico} size={16}/>{t.label}
              <span className="num" style={{fontSize:11,opacity:.85,background:on?"rgba(255,255,255,.25)":"var(--line)",padding:"1px 6px",borderRadius:99}}>{n}</span>
            </button>
          );
        })}
      </div>

      {offline && <div style={{margin:"0 16px 10px"}}><span className="chip warn"><Ico name="cloudoff" size={13}/> 離線模式：僅顯示已快取文件</span></div>}

      <div className="scroll" style={{padding:"2px 16px 110px"}}>
        {visible.length===0 ? (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",padding:"40px 20px",gap:8}}>
            <div className="ph" style={{width:120,height:96,borderRadius:18}}><span>空狀態</span></div>
            <h3 style={{fontSize:17,marginTop:6}}>這個分類還沒有文件</h3>
            <p style={{color:"var(--ink-2)",fontSize:14,lineHeight:1.5}}>上傳機票、訂房單或證件影本，<br/>出國時一鍵就能找到。</p>
            <button className="btn btn-soft" style={{marginTop:6}} onClick={onUpload}><Ico name="upload" size={17}/> 上傳文件</button>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            {visible.map((d,i)=><DocRow key={i} d={d}/>)}
            {grayed.map((d,i)=><DocRow key={"g"+i} d={d} disabled/>)}
          </div>
        )}
      </div>
      <button className="fab" onClick={onUpload}><Ico name="upload" size={24}/></button>
    </div>
  );
}

function DocRow({ d, disabled }){
  return (
    <div className="card row" style={{padding:12,gap:12,opacity:disabled?.5:1,boxShadow:disabled?"none":"var(--sh-1)",
      filter:disabled?"grayscale(.6)":"none",alignItems:"flex-start"}}>
      <div style={{width:46,height:54,borderRadius:11,flex:"none",background:"var(--primary-soft)",
        display:"flex",alignItems:"center",justifyContent:"center",color:"var(--primary-deep)"}}>
        <Ico name={d.ico} size={22}/></div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:700,fontSize:14.5,lineHeight:1.3}}>{d.name}</div>
        <div style={{fontSize:12.5,color:"var(--ink-3)",fontWeight:600,marginTop:2}}>{d.type}</div>
        <div className="row" style={{gap:6,marginTop:8,flexWrap:"wrap"}}>
          <div className={"av "+(d.by==="pa"?"b":"")} style={{width:20,height:20,fontSize:10}}>{d.by==="pa"?PARTNER.initial:ME.initial}</div>
          {d.off
            ? <span className="chip ok" style={{padding:"2px 8px",fontSize:11}}><Ico name="cloud" size={12}/>離線可用</span>
            : <span className="chip gray" style={{padding:"2px 8px",fontSize:11}}><Ico name="cloudoff" size={12}/>未快取</span>}
          {d.link && <span className="chip" style={{padding:"2px 8px",fontSize:11}}><Ico name="link" size={12}/>{d.link}</span>}
        </div>
      </div>
      <button className="icon-btn bare" style={{width:26,height:26}}><Ico name="chevR" size={18}/></button>
    </div>
  );
}

function UploadSheet({ onClose }){
  return (
    <>
      <div className="scrim" onClick={onClose}/>
      <div className="sheet" style={{paddingBottom:34}}>
        <div className="grip"/>
        <div style={{padding:"6px 22px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h2 style={{fontSize:20}}>上傳文件</h2>
          <button className="icon-btn bare" onClick={onClose}><Ico name="x" size={20}/></button>
        </div>
        <div className="scroll" style={{padding:"16px 22px 0"}}>
          <div className="ph" style={{height:120,borderRadius:18,marginBottom:16,flexDirection:"column",gap:8}}>
            <Ico name="upload" size={28}/><span>拖曳檔案或點擊選取（PDF / 圖片）</span>
          </div>
          <div className="field"><label>選擇分類</label>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {DOC_TABS.map((t,i)=>(
                <button key={t.k} className={"chip "+(i===0?"":"gray")} style={{padding:"9px 14px",fontSize:13,cursor:"pointer",border:0}}>
                  <Ico name={t.ico} size={14}/>{t.label}</button>
              ))}
            </div>
          </div>
          <div className="field" style={{marginTop:6}}><label>連結到行程項目（選填）</label>
            <select defaultValue=""><option value="">不連結</option><option>Day 2 · 大阪城公園</option><option>Day 3 · 環球影城</option><option>7/12 關西機場</option></select></div>
          <label className="row" style={{gap:10,padding:"4px 2px 12px",cursor:"pointer"}}>
            <span className="ck on" style={{width:24,height:24}}><Ico name="check" size={15}/></span>
            <span style={{fontWeight:600,fontSize:14}}>下載供離線使用</span>
          </label>
        </div>
        <div style={{padding:"4px 22px 0"}}>
          <button className="btn btn-primary btn-block" onClick={onClose}><Ico name="upload" size={18}/> 上傳</button>
        </div>
      </div>
    </>
  );
}

/* ================= PACKING ================= */
function PackingScreen({ onAdd }){
  const [who,setWho] = useState("me");
  const mine = who==="me";
  const [data,setData] = useState({me:PACK_ME,pa:PACK_PA});
  const list = mine ? data.me : data.pa;
  const {t,d} = packStat(list);
  const pct = Math.round(d/t*100);

  function toggle(ci,ii){
    if(!mine) return; // partner is read-only
    setData(prev=>{
      const copy = JSON.parse(JSON.stringify(prev));
      copy.me[ci].items[ii].on = !copy.me[ci].items[ii].on;
      return copy;
    });
  }

  return (
    <div className="screen">
      <div className="appbar" style={{paddingBottom:10}}><h1>行李清單</h1>
        <div className="av-pair"><div className="av av-online" style={{width:32,height:32,fontSize:13}}>{ME.initial}</div>
          <div className="av b av-online" style={{width:32,height:32,fontSize:13}}>{PARTNER.initial}</div></div>
      </div>

      {/* person tabs */}
      <div style={{padding:"0 16px 12px"}}>
        <div className="seg">
          <button className={mine?"on":""} onClick={()=>setWho("me")}>我的行李</button>
          <button className={!mine?"on":""} onClick={()=>setWho("pa")}>{PARTNER.name}的行李</button>
        </div>
      </div>

      {/* progress */}
      <div style={{padding:"0 16px 12px"}}>
        <div className="card" style={{padding:"14px 16px",boxShadow:"var(--sh-1)"}}>
          <div className="row" style={{justifyContent:"space-between",marginBottom:9}}>
            <div className="row" style={{gap:8}}>
              <div className={"av "+(mine?"":"b")} style={{width:26,height:26,fontSize:11}}>{mine?ME.initial:PARTNER.initial}</div>
              <span style={{fontWeight:700,fontSize:14}}>{mine?"已打包進度":PARTNER.name+"的進度"}</span>
              {!mine && <span className="chip gray" style={{fontSize:11}}>唯讀</span>}
            </div>
            <span className="num" style={{fontWeight:800,fontSize:15,color:"var(--primary-deep)",whiteSpace:"nowrap"}}>{d}/{t} 已打包</span>
          </div>
          <div className="bar"><i style={{width:pct+"%",background:mine?"linear-gradient(90deg,var(--primary),#9b8cf6)":"linear-gradient(90deg,var(--pink),#f4a9c2)"}}/></div>
        </div>
      </div>

      <div className="scroll" style={{padding:"2px 16px 110px"}}>
        {list.map((g,ci)=>(
          <div key={ci} style={{marginBottom:18}}>
            <div className="t-eyebrow" style={{margin:"4px 4px 9px"}}>{g.cat}</div>
            <div className="card" style={{padding:"4px 14px",boxShadow:"var(--sh-1)"}}>
              {g.items.map((it,ii)=>(
                <label key={ii} className="row" style={{padding:"13px 0",borderBottom:ii<g.items.length-1?"1px solid var(--line)":"none",
                  gap:13,cursor:mine?"pointer":"default"}} onClick={()=>toggle(ci,ii)}>
                  <span className={"ck "+(mine?"":"b ")+(it.on?"on":"")} style={mine?{}:{opacity:.85}}>{it.on&&<Ico name="check" size={15}/>}</span>
                  <span style={{flex:1,fontSize:15,fontWeight:600,color:it.on?"var(--ink-3)":"var(--ink)",
                    textDecoration:it.on?"line-through":"none",textDecorationColor:"var(--ink-4)"}}>{it.t}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        {!mine && <div style={{textAlign:"center",color:"var(--ink-3)",fontSize:13,padding:"6px 0 14px"}}>
          <Ico name="users" size={16}/> 這是 {PARTNER.name} 的清單，你可以看到進度但不能修改</div>}
      </div>
      {mine && <button className="fab" onClick={onAdd}><Ico name="plus" size={26}/></button>}
    </div>
  );
}

function AddPackSheet({ onClose }){
  return (
    <>
      <div className="scrim" onClick={onClose}/>
      <div className="sheet" style={{paddingBottom:34}}>
        <div className="grip"/>
        <div style={{padding:"6px 22px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h2 style={{fontSize:20}}>新增行李項目</h2>
          <button className="icon-btn bare" onClick={onClose}><Ico name="x" size={20}/></button>
        </div>
        <div style={{padding:"16px 22px 0"}}>
          <div className="field"><label>品名</label><input placeholder="例如：太陽眼鏡" autoFocus/></div>
          <div className="field"><label>分類</label>
            <select defaultValue="證件"><option>證件</option><option>電子產品</option><option>盥洗</option><option>衣物</option><option>其他</option></select></div>
          <button className="btn btn-primary btn-block" onClick={onClose}><Ico name="plus" size={18}/> 加入清單</button>
        </div>
      </div>
    </>
  );
}

Object.assign(window,{DocsScreen,PackingScreen,UploadSheet,AddPackSheet});
