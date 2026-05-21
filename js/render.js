import { DEPTS, STEPS, STEP_BG, STEP_COL, DEFAULT_AM, DEFAULT_PM } from './config.js';
import { state, vars, clone, formatDate, esc } from './state.js';

export function updateClock(){
  const n=new Date();
  const t=n.getHours().toString().padStart(2,'0')+':'+n.getMinutes().toString().padStart(2,'0');
  ['time-prog','time-dept','time-count','time-board','time-admin'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.textContent=t;
  });
}

function getCurrentPhase(tl){
  const n=new Date(),hm=n.getHours()*60+n.getMinutes();let cur=-1;
  tl.forEach((item,i)=>{const p=item.time.split(':');if(p.length===2&&hm>=parseInt(p[0])*60+parseInt(p[1]))cur=i;});
  return cur;
}

export function renderTimeline(tl,id){
  const cur=getCurrentPhase(tl);
  document.getElementById(id).innerHTML=tl.map((item,i)=>{
    const isNow=i===cur;
    return`<div class="timeline-item${isNow?' tl-now':''}">
      <div class="tl-time">${item.time}</div>
      <div class="tl-body">
        <div class="tl-title">${item.title}${isNow?' <span class="badge badge-active">進行中</span>':''}</div>
        ${item.place?`<div class="tl-sub">${item.place}</div>`:''}
      </div>
    </div>`;
  }).join('');
}

export function renderProgDongsei(){
  const du=state.session.dongseiUrl;
  document.getElementById('prog-dongsei').innerHTML=`
    <div style="border-top:0.5px solid var(--color-border-tertiary);padding-top:14px;">
      <div class="sec-hd">動静表</div>
      <button class="dongsei-btn" onclick="openDongsei()" ${!du?'style="opacity:0.45;cursor:default;"':''}>
        <i class="ti ti-file-description" style="font-size:20px;"></i>
        <span>動静表を開く（別タブ）</span>
        <i class="ti ti-external-link" style="font-size:16px;margin-left:auto;"></i>
      </button>
      ${du?`<img src="${du}" class="dongsei-thumb" onclick="openDongsei()" alt="動静表">`
          :`<div class="no-upload-msg"><i class="ti ti-photo-off" style="font-size:15px;vertical-align:-2px;margin-right:4px;"></i>未アップロード</div>`}
    </div>`;
}

export function renderProgTab(){
  const pm=state.session.partMode||'both';
  const showAm=pm==='both'||pm==='am',showPm=pm==='both'||pm==='pm';
  document.getElementById('ps-am').style.display=showAm?'':'none';
  document.getElementById('ps-pm').style.display=showPm?'':'none';
  if(showAm)renderTimeline(state.session.amTl||DEFAULT_AM,'prog-am');
  if(showPm)renderTimeline(state.session.pmTl||DEFAULT_PM,'prog-pm');
  if(pm==='pm'){
    document.getElementById('prog-am').style.display='none';
    document.getElementById('prog-pm').style.display='block';
    document.getElementById('ps-pm').classList.add('active');
    document.getElementById('ps-am').classList.remove('active');
  } else if(pm==='am'){
    document.getElementById('prog-am').style.display='block';
    document.getElementById('prog-pm').style.display='none';
    document.getElementById('ps-am').classList.add('active');
    document.getElementById('ps-pm').classList.remove('active');
  } else {
    let showPmTab;
    if(vars.progPartManual!==null){
      showPmTab = vars.progPartManual==='pm';
    } else {
      showPmTab = new Date().getHours() >= 12;
    }
    document.getElementById('prog-am').style.display=showPmTab?'none':'block';
    document.getElementById('prog-pm').style.display=showPmTab?'block':'none';
    document.getElementById('ps-am').classList.toggle('active',!showPmTab);
    document.getElementById('ps-pm').classList.toggle('active',showPmTab);
  }
  renderProgDongsei();
}

function isSkip(code,part){return part==='am'?state.depts[code].skipAm:state.depts[code].skipPm;}

export function renderDepts(){
  const active=DEPTS.filter(d=>!isSkip(d.code,vars.deptPart));
  const done=active.filter(d=>state.depts[d.code][vars.deptPart].step===4).length;
  document.getElementById('dept-summary').textContent=`対象 ${active.length}学科 ／ 完了 ${done}科 ／ 進行中 ${active.length-done}科`;
  document.getElementById('dept-list').innerHTML=DEPTS.map(d=>{
    const dp=state.depts[d.code][vars.deptPart],skip=isSkip(d.code,vars.deptPart),step=dp.step;
    const badge=skip?'<span class="badge badge-skip">今回対象外</span>':
                 step===0?'<span class="badge badge-active">授業中</span>':
                 step===4?'<span class="badge badge-done">完了</span>':
                 `<span class="badge" style="background:${STEP_BG[step]};color:${STEP_COL[step]};">${STEPS[step]}</span>`;
    const inputHtml=(!skip&&step===1)?`<div class="input-row">
      <div class="input-group"><label>高校生</label><input type="number" min="0" value="${dp.hs}" onchange="setNum('${d.code}','${vars.deptPart}','hs',this.value)"></div>
      <div class="input-group"><label>保護者</label><input type="number" min="0" value="${dp.par}" onchange="setNum('${d.code}','${vars.deptPart}','par',this.value)"></div>
      <div class="input-group"><label>個別相談希望</label><input type="number" min="0" value="${dp.consult}" onchange="setNum('${d.code}','${vars.deptPart}','consult',this.value)"></div>
      <div class="input-group"><label>ツアー希望</label><input type="number" min="0" value="${dp.tour}" onchange="setNum('${d.code}','${vars.deptPart}','tour',this.value)"></div>
    </div>`:'';
    let stepBtns='';
    if(!skip){
      const nextBtn=step<4?`<button class="step-btn current" onclick="advanceDept('${d.code}','${vars.deptPart}')">${STEPS[step+1]}へ進む <i class="ti ti-arrow-right" style="font-size:12px"></i></button>`:'';
      const backBtn=step>=1?`<button class="btn-back" onclick="backDept('${d.code}','${vars.deptPart}')"><i class="ti ti-arrow-left" style="font-size:12px;vertical-align:-1px"></i> 前に戻る</button>`:'';
      if(nextBtn||backBtn) stepBtns=`<div class="step-btns">${nextBtn}${backBtn}</div>`;
    }
    const info=(!skip&&step>=1)?`<div style="font-size:12px;color:var(--color-text-secondary);margin-top:4px;">高校生 ${dp.hs}名 保護者 ${dp.par}名 ／ 相談 ${dp.consult}名 ツアー ${dp.tour}名${dp.doneTime?' ／ 完了 '+dp.doneTime:''}</div>`:'';
    return`<div class="dept-card"><div class="dept-header"><div class="dept-name">${d.code}：${d.name}</div>${badge}</div>${info}${inputHtml}${stepBtns}</div>`;
  }).join('');
}

export function renderCount(){
  const amHs=state.count.am.hs||0, amPar=state.count.am.par||0;
  const pmHs=state.count.pm.hs||0, pmPar=state.count.pm.par||0;
  const tHs=amHs+pmHs, tPar=amPar+pmPar;

  ['am','pm'].forEach(p=>{
    const hs=state.count[p].hs||0, par=state.count[p].par||0;
    const hsEl=document.getElementById(`${p}-hs`);
    const parEl=document.getElementById(`${p}-par`);
    if(hsEl && document.activeElement!==hsEl) hsEl.value=hs;
    if(parEl && document.activeElement!==parEl) parEl.value=par;
  });

  const setEl=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  setEl('sum-am-hs',amHs); setEl('sum-am-par',amPar); setEl('sum-am-total',amHs+amPar);
  setEl('sum-pm-hs',pmHs); setEl('sum-pm-par',pmPar); setEl('sum-pm-total',pmHs+pmPar);
  setEl('sum-day-hs',tHs); setEl('sum-day-par',tPar); setEl('sum-day-total',tHs+tPar);

  const rv=state.session.reservation||{amPart:0,amGuardian:0,pmPart:0,pmGuardian:0};
  setEl('rv-am-part-disp',rv.amPart||0);
  setEl('rv-am-guardian-disp',rv.amGuardian||0);
  setEl('rv-pm-part-disp',rv.pmPart||0);
  setEl('rv-pm-guardian-disp',rv.pmGuardian||0);
}

export function renderNotices(){
  const tMap={urgent:'badge-urgent',info:'badge-info',complete:'badge-complete'};
  const tLabel={urgent:'緊急',info:'通知',complete:'完了'};
  document.getElementById('notices-list').innerHTML=(state.notices||[]).map(n=>`
    <div style="background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);padding:12px;margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><span style="font-size:13px;font-weight:500;color:var(--color-text-primary);">${n.author}</span><span style="font-size:12px;color:var(--color-text-secondary);">${n.time}</span></div>
      <div style="font-size:14px;line-height:1.6;color:var(--color-text-primary);">${n.text}</div>
      <span class="badge ${tMap[n.tag]||'badge-info'}" style="margin-top:6px;">${tLabel[n.tag]||'通知'}</span>
    </div>`).join('')||'<div style="font-size:13px;color:var(--color-text-secondary);padding:12px 0;">まだ投稿はありません</div>';
}

export function renderAdminDongseiPreview(){
  const du=state.session.dongseiUrl;
  document.getElementById('admin-dongsei-preview').innerHTML=du?`
    <div style="margin-top:10px;">
      <img src="${du}" class="dongsei-thumb" onclick="openDongsei()" alt="動静表プレビュー">
      <div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
        <i class="ti ti-check" style="font-size:14px;color:#27500A;"></i>
        <span style="font-size:12px;color:var(--color-text-secondary);flex:1;">アップロード済み（タップで拡大）</span>
        <label for="dongsei-file-input" style="font-size:12px;color:#0C447C;cursor:pointer;padding:4px 8px;border:0.5px solid #B5D4F4;border-radius:var(--border-radius-md);">再アップロード</label>
      </div>
    </div>`:'';
}

export function renderTlRows(part){
  const arr=part==='am'?vars.editAmTl:vars.editPmTl;
  document.getElementById(`tl-${part}-rows`).innerHTML=arr.map((item,i)=>`
    <div class="tl-edit-block">
      <div class="tl-row1">
        <input class="inp-time" type="text" value="${esc(item.time||'')}" placeholder="10:00" oninput="liveEdit('${part}',${i},'time',this.value)">
        <input class="inp-place" type="text" value="${esc(item.place||'')}" placeholder="場所" oninput="liveEdit('${part}',${i},'place',this.value)">
        <button class="del-btn" onclick="delTlItem('${part}',${i})"><i class="ti ti-x" style="font-size:13px;"></i></button>
      </div>
      <div class="tl-row2">
        <input class="inp-title" type="text" value="${esc(item.title||'')}" placeholder="内容を入力" oninput="liveEdit('${part}',${i},'title',this.value)">
      </div>
    </div>`).join('');
}

export function renderAdmin(){
  const schedules=state.schedules||[];
  document.getElementById('sched-list').innerHTML=schedules.length?schedules.map(s=>`
    <div class="sched-item">
      <div><div style="font-size:14px;font-weight:500;color:var(--color-text-primary);">${formatDate(s.date)}</div>${s.memo?`<div style="font-size:12px;color:var(--color-text-secondary);">${s.memo}</div>`:''}</div>
      <div style="display:flex;gap:6px;"><button class="step-btn" onclick="selectSession('${s.id}')">選択</button><button class="step-btn" onclick="delSched('${s.id}')" style="color:#A32D2D;border-color:#EF9F27;">削除</button></div>
    </div>`).join(''):'<div style="font-size:13px;color:var(--color-text-secondary);">開催日が登録されていません</div>';
  const selSched=state.session.id?schedules.find(x=>x.id===state.session.id):null;
  const selLabel=selSched?formatDate(selSched.date)+(selSched.memo?' — '+selSched.memo:''):'未選択';
  document.getElementById('current-session-label').textContent=selLabel;
  document.getElementById('btn-start').style.display=state.session.active?'none':'block';
  document.getElementById('btn-end').style.display=state.session.active?'block':'none';
  const rv=state.session.reservation||{amPart:0,amGuardian:0,pmPart:0,pmGuardian:0};
  const rvAp=document.getElementById('rv-am-part');
  const rvAg=document.getElementById('rv-am-guardian');
  const rvPp=document.getElementById('rv-pm-part');
  const rvPg=document.getElementById('rv-pm-guardian');
  if(rvAp)rvAp.value=rv.amPart||0;
  if(rvAg)rvAg.value=rv.amGuardian||0;
  if(rvPp)rvPp.value=rv.pmPart||0;
  if(rvPg)rvPg.value=rv.pmGuardian||0;
  renderAdminDongseiPreview();
  document.getElementById('dept-session-date').textContent=selLabel;
  document.getElementById('tl-session-date').textContent=selLabel;
  const pm=state.session.partMode||'both';
  ['both','am','pm'].forEach(x=>document.getElementById('pr-'+x).classList.toggle('sel',x===pm));
  document.getElementById('tl-am-edit').style.display=(pm==='pm')?'none':'block';
  document.getElementById('tl-pm-edit').style.display=(pm==='am')?'none':'block';
  const midBtn=document.getElementById('tl-mid-save');
  if(midBtn)midBtn.style.display=(pm==='both')?'block':'none';
  vars.editAmTl=clone(state.session.amTl||DEFAULT_AM);
  vars.editPmTl=clone(state.session.pmTl||DEFAULT_PM);
  renderTlRows('am');renderTlRows('pm');
  document.getElementById('admin-dept-list').innerHTML=DEPTS.map(d=>`
    <div class="dept-skip-row">
      <div style="font-size:13px;font-weight:500;line-height:1.4;color:var(--color-text-primary);">${d.code}：${d.name}</div>
      <div class="chk-group">
        <div class="chk-col"><div class="chk-col-label">午前</div><input type="checkbox" ${state.depts[d.code]&&state.depts[d.code].skipAm?'checked':''} onchange="toggleSkipAm('${d.code}',this.checked)"></div>
        <div class="chk-col"><div class="chk-col-label">午後</div><input type="checkbox" ${state.depts[d.code]&&state.depts[d.code].skipPm?'checked':''} onchange="toggleSkipPm('${d.code}',this.checked)"></div>
      </div>
    </div>`).join('');
  const history=state.history||[];
  document.getElementById('hist-list').innerHTML=history.length?history.map((h,i)=>`
    <div class="hist-item" onclick="showHistDetail(${i})">
      <div style="font-size:14px;font-weight:500;color:var(--color-text-primary);">${formatDate(h.date)}</div>
      <div style="font-size:12px;color:var(--color-text-secondary);margin-top:2px;">高校生 ${(h.count.am.hs||0)+(h.count.pm.hs||0)}名 保護者 ${(h.count.am.par||0)+(h.count.pm.par||0)}名 合計 ${(h.count.am.hs||0)+(h.count.am.par||0)+(h.count.pm.hs||0)+(h.count.pm.par||0)}名</div>
    </div>`).join(''):'<div style="font-size:13px;color:var(--color-text-secondary);">まだ履歴はありません</div>';
}

export function getDefaultPart(){
  const pm=state.session.partMode||'both';
  if(pm==='am') return 'am';
  if(pm==='pm') return 'pm';
  const n=new Date();
  const minutes=n.getHours()*60+n.getMinutes();
  return minutes >= 12*60+31 ? 'pm' : 'am';
}

export function renderAll(){
  renderProgTab();
  if(vars.deptPartManual===null){
    const defaultPart=getDefaultPart();
    vars.deptPart=defaultPart;
    document.getElementById('ds-am').classList.toggle('active',defaultPart==='am');
    document.getElementById('ds-pm').classList.toggle('active',defaultPart==='pm');
    document.getElementById('count-am-sec').style.display=defaultPart==='am'?'block':'none';
    document.getElementById('count-pm-sec').style.display=defaultPart==='pm'?'block':'none';
    document.getElementById('cs-am').classList.toggle('active',defaultPart==='am');
    document.getElementById('cs-pm').classList.toggle('active',defaultPart==='pm');
  }
  renderDepts();renderCount();renderNotices();renderAdmin();
}
