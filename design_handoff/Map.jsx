/* ============ stylized illustrative map ============ */
function StylizedMap({ dim=false, showRoute=true, selected=null, onMarker, faded=false }){
  // background is a hand-styled "city" — water, parks, road grid
  return (
    <div style={{position:"absolute",inset:0,overflow:"hidden",background:"var(--map-bg)"}}>
      <svg viewBox="0 0 393 700" preserveAspectRatio="xMidYMid slice" width="100%" height="100%"
        style={{position:"absolute",inset:0,transition:"filter .3s",filter:dim?"saturate(.6) brightness(.97)":"none"}}>
        {/* water bodies */}
        <path d="M-20 470 C60 440 90 520 150 520 C230 520 250 470 330 480 C380 486 420 470 420 470 L420 760 L-20 760 Z" fill="var(--map-water)"/>
        <path d="M260 -20 C300 40 250 90 300 140 C340 180 420 150 420 150 L420 -20 Z" fill="var(--map-water)"/>
        <ellipse cx="78" cy="120" rx="70" ry="44" fill="var(--map-water)"/>
        {/* parks */}
        <rect x="210" y="120" width="120" height="95" rx="24" fill="var(--map-park)"/>
        <ellipse cx="120" cy="300" rx="46" ry="40" fill="var(--map-park)"/>
        <rect x="40" y="430" width="70" height="50" rx="18" fill="var(--map-park)"/>
        {/* city blocks (subtle) */}
        {Array.from({length:6}).map((_,r)=>Array.from({length:5}).map((_,c)=>{
          const x=18+c*74, y=200+r*70;
          if((r+c)%3===0) return null;
          return <rect key={r+"-"+c} x={x} y={y} width="52" height="48" rx="9" fill="var(--map-block)" opacity={.5}/>;
        }))}
        {/* major roads */}
        <g stroke="var(--map-road)" strokeLinecap="round" fill="none">
          <path d="M0 180 H393" strokeWidth="14"/>
          <path d="M0 360 H393" strokeWidth="16"/>
          <path d="M0 540 H393" strokeWidth="13"/>
          <path d="M95 0 V700" strokeWidth="15"/>
          <path d="M250 0 V700" strokeWidth="13"/>
          <path d="M-10 90 L200 300 L393 430" strokeWidth="12"/>
        </g>
        {/* minor roads */}
        <g stroke="var(--map-road-minor)" strokeLinecap="round" fill="none" strokeWidth="6">
          <path d="M0 270 H393"/><path d="M0 450 H393"/><path d="M170 0 V700"/><path d="M320 0 V700"/><path d="M50 0 V700"/>
        </g>
        {/* dashed transit route between pins */}
        {showRoute && (
          <polyline points={ROUTE.map(([x,y])=>`${x/100*393},${y/100*700}`).join(" ")}
            fill="none" stroke="var(--primary)" strokeWidth="3.2" strokeDasharray="2 9" strokeLinecap="round" opacity=".85"/>
        )}
      </svg>

      {/* markers */}
      {MARKERS.map((m,i)=>{
        const sel = selected===m.name;
        const dimMe = selected && !sel;
        const left = m.x+"%", top = m.y+"%";
        if(m.kind==="area"){
          return (
            <div key={i} onClick={()=>onMarker&&onMarker(m)} style={{position:"absolute",left,top,transform:"translate(-50%,-50%)",
              opacity:dimMe?.4:1,transition:"opacity .25s",cursor:"pointer",zIndex:sel?20:5}}>
              <div style={{width:m.r,height:m.r,borderRadius:"50%",background:"rgba(122,108,240,.16)",
                border:"2px dashed rgba(122,108,240,.6)",display:"flex",alignItems:"center",justifyContent:"center",
                boxShadow:sel?"0 0 0 4px rgba(122,108,240,.18)":"none"}}>
                <span style={{fontSize:11,fontWeight:800,color:"var(--primary-deep)",background:"#fff",padding:"3px 8px",
                  borderRadius:99,boxShadow:"var(--sh-1)",whiteSpace:"nowrap",fontFamily:"var(--ff)"}}>{m.name}</span>
              </div>
            </div>
          );
        }
        if(m.kind==="bookmark"){
          const want = m.state==="want";
          return (
            <div key={i} onClick={()=>onMarker&&onMarker(m)} title={m.name} style={{position:"absolute",left,top,transform:"translate(-50%,-100%)",
              opacity:dimMe?.4:1,transition:"opacity .25s",cursor:"pointer",zIndex:sel?20:6}}>
              <div style={{width:26,height:26,borderRadius:"50% 50% 50% 2px",transform:"rotate(45deg)",
                background:want?"#fff":"var(--pink)",border:want?"2.5px solid var(--pink)":"2.5px solid #fff",
                boxShadow:"var(--sh-2)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{transform:"rotate(-45deg)",color:want?"var(--pink-deep)":"#fff",display:"flex"}}>
                  <Ico name="heart" size={13} fill/>
                </span>
              </div>
            </div>
          );
        }
        // place pin (numbered)
        return (
          <div key={i} onClick={()=>onMarker&&onMarker(m)} style={{position:"absolute",left,top,transform:"translate(-50%,-100%)",
            opacity:dimMe?.4:1,transition:"all .25s",cursor:"pointer",zIndex:sel?22:8}}>
            <div style={{position:"relative",filter:"drop-shadow(0 4px 6px rgba(60,46,120,.3))"}}>
              <svg width={sel?44:38} height={sel?54:47} viewBox="0 0 38 47">
                <path d="M19 0a19 19 0 0 0-19 19c0 13 19 28 19 28s19-15 19-28A19 19 0 0 0 19 0Z"
                  fill={sel?"var(--primary-deep)":"var(--primary)"} stroke="#fff" strokeWidth="2.5"/>
              </svg>
              <span style={{position:"absolute",top:sel?"7px":"6px",left:0,right:0,textAlign:"center",color:"#fff",
                fontWeight:800,fontSize:sel?17:15,fontFamily:"var(--ff-round)"}}>{m.n}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
window.StylizedMap = StylizedMap;
