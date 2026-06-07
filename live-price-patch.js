<script>
async function fetchLivePrice(ticker){
  try{
    const url=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
    const proxy=`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const resp=await fetch(proxy,{signal:AbortSignal.timeout(7000)});
    if(!resp.ok)return null;
    const json=await resp.json();
    const data=JSON.parse(json.contents);
    const meta=data?.chart?.result?.[0]?.meta;
    if(!meta)return null;
    const livePrice=meta.regularMarketPrice;
    const closePrice=meta.previousClose||meta.chartPreviousClose;
    const now=Date.now()/1000;
    const secSinceUpdate=meta.regularMarketTime?(now-meta.regularMarketTime):99999;
    const isLive=secSinceUpdate<3600*5;
    const price=livePrice||closePrice;
    if(!price)return null;
    const mcap=meta.marketCap?(meta.marketCap/1e9):null;
    let closeLabel="";
    if(meta.regularMarketTime){
      const d=new Date(meta.regularMarketTime*1000);
      closeLabel=d.toLocaleDateString("fr-FR",{weekday:"short",day:"2-digit",month:"short"})+" "+d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
    }
    return{price:parseFloat(parseFloat(price).toFixed(2)),mcap:mcap?parseFloat(mcap.toFixed(1)):null,currency:meta.currency||null,isLive,closeLabel};
  }catch(e){return null;}
}

const _origBuildResult=buildResultHTML;
buildResultHTML=function(ticker,d,showExport){
  let html=_origBuildResult(ticker,d,showExport);
  let badge="";
  if(d._priceUpdated===true&&d._live===true){
    badge=`<span style="font-size:9px;background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.4);color:#10b981;border-radius:5px;padding:2px 7px;margin-left:6px;font-family:'Syne',sans-serif;font-weight:700">🟢 LIVE ${d._closeLabel}</span>`;
  } else if(d._priceUpdated===true&&d._live===false){
    badge=`<span style="font-size:9px;background:rgba(59,130,246,.15);border:1px solid rgba(59,130,246,.4);color:#3b82f6;border-radius:5px;padding:2px 7px;margin-left:6px;font-family:'Syne',sans-serif;font-weight:700">🔵 Clôture ${d._closeLabel}</span>`;
  } else if(d._priceUpdated===false){
    badge=`<span style="font-size:9px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);color:#f59e0b;border-radius:5px;padding:2px 7px;margin-left:6px;font-family:'Syne',sans-serif;font-weight:700">⚠️ Prix indicatif</span>`;
  }
  if(badge){
    html=html.replace(`Cap. ${d.cur} ${d.mcap} Mds</div>`,`Cap. ${d.cur} ${d.mcap} Mds</div>${badge}`);
  }
  return html;
};

analyze=async function(ticker){
  const t=(ticker||document.getElementById("ticker-input").value).trim().toUpperCase();
  if(!t)return;
  document.getElementById("ticker-input").value=t;
  ["analyzer-welcome","analyzer-error","analyzer-result"].forEach(id=>document.getElementById(id).style.display="none");
  const loadEl=document.getElementById("analyzer-loading");
  loadEl.innerHTML='<div style="font-size:30px;display:inline-block;animation:pulse 1s ease-in-out infinite">📊</div><div class="syne" style="color:#06b6d4;font-weight:700;font-size:13px;margin-top:8px">Récupération du prix temps réel...</div>';
  loadEl.style.display="block";
  const d=STOCKS[t];
  if(!d){
    loadEl.style.display="none";
    const e=document.getElementById("analyzer-error");
    e.innerHTML=`<div style="color:#fca5a5;font-weight:700;font-size:12px;margin-bottom:3px">❌ "${t}" non disponible</div><div style="color:#475569;font-size:11px">💡 Utilisez le Glossaire pour trouver le bon ticker.</div>`;
    e.style.display="block";
    return;
  }
  const live=await fetchLivePrice(t);
  if(live&&live.price){
    d.price=live.price;
    if(live.mcap)d.mcap=live.mcap;
    if(live.currency)d.cur=live.currency;
    d._live=live.isLive;
    d._closeLabel=live.closeLabel;
    d._priceUpdated=true;
  } else {
    d._priceUpdated=false;
  }
  loadEl.style.display="none";
  const el=document.getElementById("analyzer-result");
  el.innerHTML=buildResultHTML(t,d,true);
  el.style.display="block";
};
</script>
</body>
</html>
