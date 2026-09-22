(()=>{
  "use strict";
  const KEY="sjz-community-mobile-data-v1";
  const OFFSETS=[1,3,7,14,30];
  const pad=n=>String(n).padStart(2,"0");
  const day=s=>{const d=new Date(s+"T00:00:00");d.setDate(d.getDate()+1);return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())};
  const today=()=>{const d=new Date();return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())};
  const fmt=s=>{if(!s)return"日期未记录";const a=s.slice(0,10).split("-");return a.length===3?`${Number(a[1])}月${Number(a[2])}日`:s};
  const wrongDate=x=>String(x?.wrong_date||x?.wrong_at||x?.created_at||x?.first_wrong_at||x?.recorded_at||x?.date||"").slice(0,10);
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"null")}catch{return null}};
  const write=x=>localStorage.setItem(KEY,JSON.stringify(x));
  const esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  function normalize(){
    const db=read();if(!db||!Array.isArray(db.wrong_questions))return;
    let changed=false;
    db.wrong_questions.forEach(x=>{
      if(x.status!=="active")return;
      if(!x.review_stage)x.review_stage=0;
      if(!x.next_review_at){
        const d=wrongDate(x);
        if(d){x.next_review_at=day(d);changed=true;}
      }
    });
    if(changed){write(db);setTimeout(()=>location.reload(),80);}
  }
  function enhance(){
    const db=read();if(!db)return;
    const view=document.querySelector("#view");if(!view)return;
    const nav=document.querySelector("nav button.active")?.dataset.view||"";
    if(nav==="home")enhanceHome(view,db);
    if(nav==="quick")enhanceQuick(view,db);
  }
  function enhanceHome(view,db){
    if(view.querySelector(".review-helper"))return;
    const t=today();
    const due=(db.wrong_questions||[]).filter(x=>x.status==="active"&&x.next_review_at&&String(x.next_review_at)<=t);
    const groups={};
    due.forEach(x=>{const d=wrongDate(x)||"日期未记录";const s=Number(x.review_stage||0);const k=d+"|"+s;groups[k]??={d,s,n:0};groups[k].n++;});
    const rows=Object.values(groups).sort((a,b)=>a.d.localeCompare(b.d)||a.s-b.s);
    const box=document.createElement("div");box.className="card review-helper";
    box.innerHTML=`<h3>🔔 今日复习提醒</h3><p><strong>${esc(fmt(t))}</strong>：${due.length?`共 <strong>${due.length} 道</strong> 到期/逾期错题。`:"今天没有到期错题。"}</p>${rows.map(g=>`<div class="row"><strong>${esc(fmt(g.d))} 记错</strong> → 今天复习 · ${g.n}道<br><span class="muted">第${g.s+1}次复习（${OFFSETS[g.s]||30}天间隔）</span></div>`).join("")}<p class="muted">顺序：1天 → 3天 → 7天 → 14天 → 30天；重错后从1天重新开始。</p>`;
    view.prepend(box);
  }
  function enhanceQuick(view,db){
    if(view.querySelector(".quick-helper"))return;
    const pending=(db.wrong_inbox||[]).filter(x=>x.status==="pending").slice().reverse();
    const card=view.querySelectorAll(".card")[1];if(!card)return;
    card.classList.add("quick-helper");
    const rows=[...card.querySelectorAll(".row")];
    rows.forEach((row,i)=>{
      const item=pending[i];if(!item)return;
      const b=document.createElement("button");b.textContent="整理进复习";b.className="small-action";
      b.onclick=()=>promote(item.inbox_id);
      row.appendChild(b);
    });
    const tip=document.createElement("div");tip.className="notice";tip.innerHTML="<strong>最省事用法：</strong>做题错了先点“快速记错”保存，不用当场整理；有空再点“整理进复习”，系统从记错日后第1天开始安排复习。";view.insertBefore(tip,card);
  }
  function promote(id){
    const db=read();if(!db)return;
    const item=(db.wrong_inbox||[]).find(x=>x.inbox_id===id);if(!item)return;
    db.wrong_questions=db.wrong_questions||[];
    const wid="w_"+Date.now();const d=(item.created_at||today()).slice(0,10);
    db.wrong_questions.push({wrong_id:wid,question_text:item.text,exam_line:item.exam_line||"社区",module:item.module||"未分类",knowledge_name:item.knowledge_name||"",wrong_reason:item.wrong_reason||"",status:"active",mastery:"未掌握",review_stage:0,next_review_at:day(d),wrong_date:d,wrong_count:1,repeated_wrong:false});
    item.status="processed";item.processed_at=new Date().toISOString();item.wrong_id=wid;
    write(db);location.reload();
  }
  normalize();
  new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});
  setTimeout(enhance,120);
})();
