import { DEPTS, DEPT_KEYS, STEPS, DEFAULT_AM, DEFAULT_PM } from './config.js';
import { state, vars, clone, newDP, getNow, formatDate, saveState, saveDept, saveCount, saveNotices, saveSession } from './state.js';
import { renderProgTab, renderProgDongsei, renderDepts, renderAdminDongseiPreview, renderTlRows } from './render.js';

window.showProgPart=p=>{
  vars.progPartManual=p;
  renderProgTab();
};

window.saveReservation=()=>{
  const rv=state.session.reservation;
  rv.amPart=Math.min(999,Math.max(0,parseInt(document.getElementById('rv-am-part').value)||0));
  rv.amGuardian=Math.min(999,Math.max(0,parseInt(document.getElementById('rv-am-guardian').value)||0));
  rv.pmPart=Math.min(999,Math.max(0,parseInt(document.getElementById('rv-pm-part').value)||0));
  rv.pmGuardian=Math.min(999,Math.max(0,parseInt(document.getElementById('rv-pm-guardian').value)||0));
  saveSession();
};

window.openDongsei=()=>{
  const url=state.session.dongseiUrl;if(!url)return;
  const w=window.open('','_blank');
  w.document.write(`<html><body style="margin:0;background:#111;"><img src="${url}" style="max-width:100%;height:auto;display:block;"></body></html>`);
  w.document.close();
};

window.uploadDongsei=input=>{
  const file=input.files[0];if(!file)return;
  if(file.size>4.5*1024*1024){alert('4.5MB以下の画像にしてください');input.value='';return;}
  const reader=new FileReader();
  reader.onload=e=>{state.session.dongseiUrl=e.target.result;saveSession();renderAdminDongseiPreview();renderProgDongsei();};
  reader.onerror=()=>alert('読み込み失敗');
  reader.readAsDataURL(file);input.value='';
};

window.advanceDept=(code,part)=>{
  const dp=state.depts[code][part];
  if(dp.step<4){dp.step++;if(dp.step===4)dp.doneTime=getNow();}
  saveDept(code);
};

window.backDept=(code,part)=>{
  const dp=state.depts[code][part];
  if(dp.step<=0)return;
  dp.step--;
  if(dp.doneTime)dp.doneTime='';
  saveDept(code);
};

window.setNum=(code,part,key,val)=>{state.depts[code][part][key]=Math.max(0,parseInt(val)||0);saveDept(code);};

window.chg=(part,type,delta)=>{
  state.count[part][type]=Math.max(0,(state.count[part][type]||0)+delta);
  saveCount();
};

window.chgDirect=(part,type,val)=>{
  const n=parseInt(val);
  if(isNaN(n)||n<0) return;
  state.count[part][type]=n;
  saveCount();
};

window.selTag=t=>{vars.noticeTag=t;['urgent','info','complete'].forEach(x=>document.getElementById('tg-'+x).classList.toggle('sel',x===t));};

window.postNotice=()=>{
  const name=(document.getElementById('notice-name').value||'').trim()||'名前未入力';
  const text=(document.getElementById('notice-text').value||'').trim();
  if(!text)return;
  state.notices.unshift({author:name,text,tag:vars.noticeTag,time:getNow()});
  document.getElementById('notice-text').value='';saveNotices();
};

window.addSched=()=>{
  const d=document.getElementById('new-date').value,m=document.getElementById('new-memo').value;
  if(!d)return;
  if(state.schedules.find(s=>s.date===d)){alert('同じ日付が既に登録されています');return;}
  state.schedules.push({date:d,memo:m,id:'s'+Date.now(),partMode:'both',amTl:clone(DEFAULT_AM),pmTl:clone(DEFAULT_PM)});
  state.schedules.sort((a,b)=>a.date.localeCompare(b.date));
  document.getElementById('new-date').value='';document.getElementById('new-memo').value='';saveState();
};

window.delSched=id=>{if(!confirm('この開催日を削除しますか？'))return;state.schedules=state.schedules.filter(s=>s.id!==id);saveState();};

window.selectSession=id=>{
  const s=state.schedules.find(x=>x.id===id);if(!s)return;
  state.session.date=s.date;state.session.id=id;
  state.session.partMode=s.partMode||'both';
  state.session.amTl=s.amTl?clone(s.amTl):clone(DEFAULT_AM);
  state.session.pmTl=s.pmTl?clone(s.pmTl):clone(DEFAULT_PM);
  saveState();
};

window.startSession=()=>{
  if(!state.session.id){alert('開催日を選択してください');return;}
  if(!confirm('開催を開始しますか？当日のデータがリセットされます。'))return;
  state.session.active=true;
  DEPT_KEYS.forEach(k=>{state.depts[k].am=newDP();state.depts[k].pm=newDP();});
  state.count={am:{hs:0,par:0},pm:{hs:0,par:0}};state.notices=[];saveState();
};

window.endSession=()=>{
  if(!confirm('開催を終了して履歴に保存しますか？'))return;
  state.history.unshift({date:state.session.date,id:'h'+Date.now(),count:clone(state.count),depts:clone(state.depts),notices:clone(state.notices),partMode:state.session.partMode});
  state.session.active=false;saveState();
};

window.setPartMode=m=>{
  state.session.partMode=m;
  ['both','am','pm'].forEach(x=>document.getElementById('pr-'+x).classList.toggle('sel',x===m));
  document.getElementById('tl-am-edit').style.display=(m==='pm')?'none':'block';
  document.getElementById('tl-pm-edit').style.display=(m==='am')?'none':'block';
  const midBtn=document.getElementById('tl-mid-save');
  if(midBtn)midBtn.style.display=(m==='both')?'block':'none';
  const sel=state.schedules.find(x=>x.id===state.session.id);if(sel)sel.partMode=m;saveSession();
};

window.liveEdit=(part,i,key,val)=>{const arr=part==='am'?vars.editAmTl:vars.editPmTl;if(arr[i])arr[i][key]=val;};
window.delTlItem=(part,i)=>{if(part==='am')vars.editAmTl.splice(i,1);else vars.editPmTl.splice(i,1);renderTlRows(part);};
window.addTlItem=part=>{if(part==='am')vars.editAmTl.push({time:'',title:'',place:''});else vars.editPmTl.push({time:'',title:'',place:''});renderTlRows(part);};

window.saveTl=()=>{
  state.session.amTl=clone(vars.editAmTl);state.session.pmTl=clone(vars.editPmTl);
  const sel=state.schedules.find(x=>x.id===state.session.id);
  if(sel){sel.amTl=clone(vars.editAmTl);sel.pmTl=clone(vars.editPmTl);}
  saveSession();
  renderProgTab();alert('スケジュールを保存しました');
};

window.toggleSkipAm=(code,val)=>{state.depts[code].skipAm=val;saveDept(code);};
window.toggleSkipPm=(code,val)=>{state.depts[code].skipPm=val;saveDept(code);};

window.showHistDetail=i=>{
  const h=(state.history||[])[i];if(!h)return;
  const tLabel={urgent:'緊急',info:'通知',complete:'完了'};
  const deptRows=DEPTS.filter(d=>h.depts&&h.depts[d.code]).map(d=>{
    const am=h.depts[d.code].am,pm=h.depts[d.code].pm,sAm=h.depts[d.code].skipAm,sPm=h.depts[d.code].skipPm;
    return`<div style="padding:8px 0;border-bottom:0.5px solid var(--color-border-tertiary);">
      <div style="font-size:13px;font-weight:500;color:var(--color-text-primary);">${d.code}：${d.name}</div>
      <div style="font-size:12px;color:var(--color-text-secondary);">午前: ${sAm?'対象外':STEPS[am.step]+(am.doneTime?' 完了'+am.doneTime:'')+' 高'+am.hs+'名 保'+am.par+'名 相談'+am.consult+' ツアー'+am.tour}</div>
      <div style="font-size:12px;color:var(--color-text-secondary);">午後: ${sPm?'対象外':STEPS[pm.step]+(pm.doneTime?' 完了'+pm.doneTime:'')+' 高'+pm.hs+'名 保'+pm.par+'名 相談'+pm.consult+' ツアー'+pm.tour}</div>
    </div>`;}).join('');
  const noticeRows=(h.notices||[]).map(n=>`<div style="padding:6px 0;border-bottom:0.5px solid var(--color-border-tertiary);"><span style="font-size:12px;font-weight:500;color:var(--color-text-primary);">${n.author}</span> <span style="font-size:11px;color:var(--color-text-secondary);">${n.time} [${tLabel[n.tag]||'通知'}]</span><div style="font-size:13px;color:var(--color-text-primary);">${n.text}</div></div>`).join('');
  document.getElementById('hist-detail').style.display='block';
  document.getElementById('hist-detail').innerHTML=`
    <div class="card">
      <div style="font-size:15px;font-weight:500;margin-bottom:10px;color:var(--color-text-primary);">${formatDate(h.date)} 詳細</div>
      <div class="stat-grid" style="margin-bottom:10px;"><div class="stat"><div class="label">午前 合計</div><div class="val">${(h.count.am.hs||0)+(h.count.am.par||0)}</div></div><div class="stat"><div class="label">午後 合計</div><div class="val">${(h.count.pm.hs||0)+(h.count.pm.par||0)}</div></div></div>
      <div class="sec-hd">学科別記録</div>${deptRows}
      ${(h.notices||[]).length?`<div class="sec-hd" style="margin-top:10px;">連絡板</div>${noticeRows}`:''}
      <button class="btn-outline" onclick="document.getElementById('hist-detail').style.display='none'" style="margin-top:10px;">閉じる</button>
    </div>`;
};

window.showTab=name=>{
  document.querySelectorAll('.sec').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('sec-'+name).classList.add('active');
  document.getElementById('t-'+name).classList.add('active');
  if(name!=='prog')vars.progPartManual=null;
  if(name!=='dept'&&name!=='count')vars.deptPartManual=null;
};

window.showDeptPart=p=>{vars.deptPartManual=p;vars.deptPart=p;document.getElementById('ds-am').classList.toggle('active',p==='am');document.getElementById('ds-pm').classList.toggle('active',p==='pm');renderDepts();};
window.showCountPart=p=>{vars.deptPartManual=p;document.getElementById('count-am-sec').style.display=p==='am'?'block':'none';document.getElementById('count-pm-sec').style.display=p==='pm'?'block':'none';document.getElementById('cs-am').classList.toggle('active',p==='am');document.getElementById('cs-pm').classList.toggle('active',p==='pm');};
window.showAdminPart=p=>{['sched','dept','tl','hist'].forEach(x=>{document.getElementById('admin-'+x).style.display=x===p?'block':'none';document.getElementById('as-'+x).classList.toggle('active',x===p);});if(p==='hist')document.getElementById('hist-detail').style.display='none';};
