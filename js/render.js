import { DEPTS, STEPS, STEP_BG, STEP_COL, DEFAULT_AM, DEFAULT_PM } from './config.js';
import { state, vars, clone, formatDate, esc } from './state.js';

function updateSessionDate(){
  const date=state.session.date;
  let text;
  if(date){
    const dt=new Date(date+'T00:00:00');
    const days=['日','月','火','水','木','金','土'];
    text=`開催日：${dt.getFullYear()}年${dt.getMonth()+1}月${dt.getDate()}日（${days[dt.getDay()]}）`;
  } else {
    text='開催日：未指定';
  }
  ['prog','dept','count','board'].forEach(id=>{
    const el=document.getElementById(`session-date-${id}`);
    if(el) el.textContent=text;
  });
}

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
      const _n=new Date();showPmTab=_n.getHours()*60+_n.getMinutes()>=12*60+30;
    }
    document.getElementById('prog-am').style.display=showPmTab?'none':'block';
    document.getElementById('prog-pm').style.display=showPmTab?'block':'none';
    document.getElementById('ps-am').classList.toggle('active',!showPmTab);
    document.getElementById('ps-pm').classList.toggle('active',showPmTab);
  }
  // メッセージボックスの色を午前・午後に合わせて切り替え
  const msgEl=document.getElementById('prog-info-msg');
  if(msgEl){
    let isPm;
    if(pm==='pm') isPm=true;
    else if(pm==='am') isPm=false;
    else isPm=vars.progPartManual!==null ? vars.progPartManual==='pm' : new Date().getHours()>=12;
    msgEl.className='prog-msg '+(isPm?'prog-msg-pm':'prog-msg-am');
  }
  renderProgDongsei();
}

function isSkip(code,part){return part==='am'?state.depts[code].skipAm:state.depts[code].skipPm;}

export function renderDepts(){
  const msgEl=document.getElementById('dept-info-msg');
  if(msgEl) msgEl.className='prog-msg '+(vars.deptPart==='pm'?'prog-msg-pm':'prog-msg-am');
  const active=DEPTS.filter(d=>!isSkip(d.code,vars.deptPart));
  const done=active.filter(d=>state.depts[d.code][vars.deptPart].step===4).length;
  document.getElementById('dept-summary').textContent=`対象 ${active.length}学科 ／ 完了 ${done}科 ／ 進行中 ${active.length-done}科`;
  document.getElementById('dept-list').innerHTML=DEPTS.map(d=>{
    const dp=state.depts[d.code][vars.deptPart],skip=isSkip(d.code,vars.deptPart),step=dp.step;
    const badge=skip?'<span class="badge badge-skip">今回対象外</span>':
                 step===0?'<span class="badge badge-active">授業中</span>':
                 step===4?'<span class="badge badge-done">完了</span>':
                 `<span class="badge" style="background:${STEP_BG[step]};color:${STEP_COL[step]};">${STEPS[step]}</span>`;
    const inputHtml=(!skip&&step===1)?`
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px;">
        <div class="input-group"><label>高校生</label><input type="number" min="0" value="${dp.hs}" onchange="setNum('${d.code}','${vars.deptPart}','hs',this.value)"></div>
        <div class="input-group"><label>保護者</label><input type="number" min="0" value="${dp.par}" onchange="setNum('${d.code}','${vars.deptPart}','par',this.value)"></div>
        <div class="input-group"><label>留学生</label><input type="number" min="0" value="${dp.intl||0}" onchange="setNum('${d.code}','${vars.deptPart}','intl',this.value)"></div>
      </div>
      <div class="input-row" style="margin-top:6px;">
        <div class="input-group"><label>個別相談希望</label><input type="number" min="0" value="${dp.consult}" onchange="setNum('${d.code}','${vars.deptPart}','consult',this.value)"></div>
        <div class="input-group"><label>ツアー希望</label><input type="number" min="0" value="${dp.tour}" onchange="setNum('${d.code}','${vars.deptPart}','tour',this.value)"></div>
      </div>`:'';
    let stepBtns='';
    if(!skip){
      const nextBtn=step<4?`<button class="step-btn current" onclick="advanceDept('${d.code}','${vars.deptPart}')">${STEPS[step+1]}へ進む <i class="ti ti-arrow-right" style="font-size:12px"></i></button>`:'';
      const backBtn=step>=1?`<button class="btn-back" onclick="backDept('${d.code}','${vars.deptPart}')"><i class="ti ti-arrow-left" style="font-size:12px;vertical-align:-1px"></i> 前に戻る</button>`:'';
      if(nextBtn||backBtn) stepBtns=`<div class="step-btns">${nextBtn}${backBtn}</div>`;
    }
    const consultBadge=dp.consult>0?`<span class="badge badge-urgent" style="margin-left:2px;font-size:11px;">${dp.consult}名</span>`:`${dp.consult}名`;
    const tourBadge=dp.tour>0?`<span class="badge badge-info" style="margin-left:2px;font-size:11px;">${dp.tour}名</span>`:`${dp.tour}名`;
    const info=(!skip&&step>=1)?`<div style="font-size:12px;color:var(--color-text-secondary);margin-top:4px;">高校生 ${dp.hs}名 保護者 ${dp.par}名 留学生 ${dp.intl||0}名 ／ 相談 ${consultBadge} ツアー ${tourBadge}${dp.doneTime?' ／ 完了 '+dp.doneTime:''}</div>`:'';
    // 日報フォーム
    const rpt=(state.reports&&state.reports[d.code])||{};
    const rptBadge=rpt.status==='submitted'
      ?`<span class="badge rpt-badge-done" style="margin-left:2px;">日報完了</span>`
      :rpt.status==='draft'
      ?`<span class="badge rpt-badge-draft" style="margin-left:2px;">日報入力中</span>`:'';
    const isExpanded=!!(vars.reportExpanded&&vars.reportExpanded[d.code]);
    const rptToggleBtn=`<div class="rpt-toggle-wrap"><button class="step-btn" onclick="toggleReportForm('${d.code}')" style="width:100%;text-align:center;"><i class="ti ti-file-text" style="font-size:12px;vertical-align:-1px;margin-right:3px;"></i>日報入力 ${isExpanded?'▲':'▼'}</button></div>`;
    const cache=(vars.reportCache&&vars.reportCache[d.code])||{};
    const dp_r_am=state.depts[d.code].am,dp_r_pm=state.depts[d.code].pm;
    const reporterVal=cache.reporter!==undefined?cache.reporter:(rpt.reporter||'');
    const amSurveyVal=cache.amSurvey!==undefined?cache.amSurvey:(rpt.amSurvey||'');
    const pmSurveyVal=cache.pmSurvey!==undefined?cache.pmSurvey:(rpt.pmSurvey||'');
    const lessonVal=cache.lesson!==undefined?cache.lesson:(rpt.lesson||'');
    const situationVal=cache.situation!==undefined?cache.situation:(rpt.situation||'');
    const rptForm=isExpanded?`<div class="rpt-form">
  <div class="rpt-section">
    <div class="rpt-sec-label">報告者 <span style="color:#A32D2D;">※必須</span></div>
    <input type="text" class="rpt-input" id="rpt-reporter-${d.code}" placeholder="氏名を入力（必須）" value="${esc(reporterVal)}" oninput="cacheReportField('${d.code}','reporter',this.value)">
  </div>
  <div class="rpt-auto-row" style="margin-top:8px;"><i class="ti ti-calendar" style="font-size:12px;vertical-align:-1px;margin-right:3px;"></i>${formatDate(state.session.date)||'実施日未設定'}</div>
  <div class="rpt-sec-label" style="margin-top:8px;">参加者（進行入力より自動）</div>
  <div class="rpt-auto-row">午前　高校生 ${dp_r_am.hs||0}名　保護者 ${dp_r_am.par||0}名　留学生 ${dp_r_am.intl||0}名</div>
  <div class="rpt-auto-row">午後　高校生 ${dp_r_pm.hs||0}名　保護者 ${dp_r_pm.par||0}名　留学生 ${dp_r_pm.intl||0}名</div>
  <div class="rpt-section">
    <div class="rpt-sec-label">アンケート志望状況</div>
    <div class="rpt-label">午前</div>
    <textarea class="rpt-textarea" id="rpt-amsurvey-${d.code}" placeholder="例：本校希望8名/他校1/未定3" rows="2" oninput="cacheReportField('${d.code}','amSurvey',this.value)">${esc(amSurveyVal)}</textarea>
    <div class="rpt-label" style="margin-top:6px;">午後</div>
    <textarea class="rpt-textarea" id="rpt-pmsurvey-${d.code}" placeholder="例：AOエントリー予定1名" rows="2" oninput="cacheReportField('${d.code}','pmSurvey',this.value)">${esc(pmSurveyVal)}</textarea>
  </div>
  <div class="rpt-section">
    <div class="rpt-sec-label">授業内容（午前午後共通）</div>
    <textarea class="rpt-textarea" id="rpt-lesson-${d.code}" placeholder="体験授業の内容を入力" rows="3" oninput="cacheReportField('${d.code}','lesson',this.value)">${esc(lessonVal)}</textarea>
  </div>
  <div class="rpt-section">
    <div class="rpt-sec-label">参加者の状況</div>
    <textarea class="rpt-textarea" id="rpt-situation-${d.code}" placeholder="参加者の反応・質問・個別状況など" rows="4" oninput="cacheReportField('${d.code}','situation',this.value)">${esc(situationVal)}</textarea>
  </div>
  ${rpt.savedAt||rpt.submittedAt?`<div style="font-size:11px;color:var(--color-text-secondary);margin:4px 0;">${rpt.savedAt?'一時退避: '+rpt.savedAt:''}${rpt.submittedAt?' ／ 確定: '+rpt.submittedAt:''}</div>`:''}
  <div style="display:flex;gap:8px;margin-top:8px;">
    <button class="btn-outline" onclick="saveDraftReport('${d.code}')" style="flex:1;">一時退避</button>
    <button class="btn-primary" onclick="submitReport('${d.code}')" style="flex:1;margin-top:0;">確定して提出</button>
  </div>
</div>`:'';
    return`<div class="dept-card"><div class="dept-header"><div class="dept-name">${d.code}：${d.name}</div><div style="display:flex;gap:4px;align-items:flex-start;flex-wrap:wrap;justify-content:flex-end;">${badge}${rptBadge}</div></div>${info}${inputHtml}${stepBtns}${rptToggleBtn}${rptForm}</div>`;
  }).join('');
}

export function renderCount(){
  const amHs=state.count.am.hs||0, amPar=state.count.am.par||0, amIntl=state.count.am.intl||0;
  const pmHs=state.count.pm.hs||0, pmPar=state.count.pm.par||0, pmIntl=state.count.pm.intl||0;
  const tHs=amHs+pmHs, tPar=amPar+pmPar, tIntl=amIntl+pmIntl;

  ['am','pm'].forEach(p=>{
    const hs=state.count[p].hs||0, par=state.count[p].par||0, intl=state.count[p].intl||0;
    const fixed=state.count[p].fixed||false;
    const hsEl=document.getElementById(`${p}-hs`);
    const parEl=document.getElementById(`${p}-par`);
    const intlEl=document.getElementById(`${p}-intl`);
    const fixedEl=document.getElementById(`fixed-${p}`);
    if(hsEl && document.activeElement!==hsEl) hsEl.value=hs;
    if(parEl && document.activeElement!==parEl) parEl.value=par;
    if(intlEl && document.activeElement!==intlEl) intlEl.value=intl;
    if(fixedEl) fixedEl.checked=fixed;
    // 入力欄・ボタンの有効/無効を切り替え
    const sec=document.getElementById(`count-${p}-sec`);
    if(sec){
      sec.querySelectorAll('.counter-input').forEach(el=>{if(document.activeElement!==el)el.disabled=fixed;});
      sec.querySelectorAll('.cbtn').forEach(el=>{el.disabled=fixed;});
    }
  });

  const setEl=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  setEl('sum-am-hs',amHs); setEl('sum-am-par',amPar); setEl('sum-am-intl',amIntl); setEl('sum-am-total',amHs+amPar+amIntl);
  setEl('sum-pm-hs',pmHs); setEl('sum-pm-par',pmPar); setEl('sum-pm-intl',pmIntl); setEl('sum-pm-total',pmHs+pmPar+pmIntl);
  setEl('sum-day-hs',tHs); setEl('sum-day-par',tPar); setEl('sum-day-intl',tIntl); setEl('sum-day-total',tHs+tPar+tIntl);

  const rv=state.session.reservation||{amPart:0,amGuardian:0,amIntl:0,pmPart:0,pmGuardian:0,pmIntl:0};
  setEl('rv-am-part-disp',rv.amPart||0);
  setEl('rv-am-guardian-disp',rv.amGuardian||0);
  setEl('rv-am-intl-disp',rv.amIntl||0);
  setEl('rv-pm-part-disp',rv.pmPart||0);
  setEl('rv-pm-guardian-disp',rv.pmGuardian||0);
  setEl('rv-pm-intl-disp',rv.pmIntl||0);
}

export function renderNotices(){
  const tMap={urgent:'badge-urgent',info:'badge-info',complete:'badge-complete'};
  const tLabel={urgent:'緊急',info:'通知',complete:'完了'};
  const items=(state.notices||[]).map((n,i)=>n.deleted?'':(`
    <div style="background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);padding:12px;margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><span style="font-size:13px;font-weight:500;color:var(--color-text-primary);">${n.author}</span><span style="font-size:12px;color:var(--color-text-secondary);">${n.time}</span></div>
      <div style="font-size:14px;line-height:1.6;color:var(--color-text-primary);">${n.text}</div>
      ${n.photo?`<img src="${n.photo}" class="notice-photo-thumb" onclick="openNoticePhoto(${i})" alt="添付写真">`:''}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
        <span class="badge ${tMap[n.tag]||'badge-info'}">${tLabel[n.tag]||'通知'}</span>
        <div style="display:flex;gap:6px;align-items:center;">
          <button class="notice-del-btn" onclick="deleteNotice(${i})"><i class="ti ti-trash" style="font-size:13px;vertical-align:-2px;"></i></button>
          <button class="good-btn" onclick="goodNotice(${i})"><i class="ti ti-thumb-up" style="font-size:13px;vertical-align:-2px;margin-right:3px;"></i>${n.goods>0?n.goods+'件':'Good'}</button>
        </div>
      </div>
    </div>`)).join('');
  const hasVisible=items.replace(/\s/g,'').length>0;
  document.getElementById('notices-list').innerHTML=hasVisible?items:'<div style="font-size:13px;color:var(--color-text-secondary);padding:12px 0;">まだ投稿はありません</div>';
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
  const PAGE=3;
  const maxOffset=Math.max(0,schedules.length-PAGE);
  const offset=vars.schedOffset<0?maxOffset:Math.min(vars.schedOffset,maxOffset);
  const pageItems=schedules.slice(offset,offset+PAGE);
  const hasPrev=offset>0;
  const hasNext=offset+PAGE<schedules.length;
  const btnStyle=(enabled)=>`padding:6px 10px;border-radius:var(--border-radius-md);border:0.5px solid var(--color-border-secondary);font-size:12px;cursor:${enabled?'pointer':'default'};background:transparent;color:${enabled?'var(--color-text-primary)':'var(--color-text-secondary)'};opacity:${enabled?'1':'0.35'};`;
  document.getElementById('sched-list').innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <button onclick="moveSchedPage(-${PAGE})" ${!hasPrev?'disabled':''} style="${btnStyle(hasPrev)}">← 前の3件</button>
      <span style="font-size:12px;color:var(--color-text-secondary);">${schedules.length>0?`${offset+1}〜${Math.min(offset+PAGE,schedules.length)}件目 / 全${schedules.length}件`:'0件'}</span>
      <button onclick="moveSchedPage(${PAGE})" ${!hasNext?'disabled':''} style="${btnStyle(hasNext)}">次の3件 →</button>
    </div>
    ${pageItems.length?pageItems.map(s=>`
      <div class="sched-item${s.id===state.session.id?' hist-item-selected':''}">
        <div><div style="font-size:14px;font-weight:500;color:var(--color-text-primary);">${formatDate(s.date)}</div>${s.memo?`<div style="font-size:12px;color:var(--color-text-secondary);">${s.memo}</div>`:''}</div>
        <div style="display:flex;gap:6px;"><button class="step-btn${s.id===state.session.id?' current':''}" onclick="selectSession('${s.id}')">${s.id===state.session.id?'選択中':'選択'}</button><button class="step-btn" onclick="delSched('${s.id}')" style="color:#A32D2D;border-color:#EF9F27;">削除</button></div>
      </div>`).join(''):'<div style="font-size:13px;color:var(--color-text-secondary);">開催日が登録されていません</div>'}
  `;
  const selSched=state.session.id?schedules.find(x=>x.id===state.session.id):null;
  const selLabel=selSched?formatDate(selSched.date)+(selSched.memo?' — '+selSched.memo:''):'未選択';
  document.getElementById('current-session-label').textContent=selLabel;
  document.getElementById('btn-start').style.display=state.session.active?'none':'block';
  document.getElementById('btn-end').style.display=state.session.active?'block':'none';
  const rv=state.session.reservation||{amPart:0,amGuardian:0,pmPart:0,pmGuardian:0};
  const rvAp=document.getElementById('rv-am-part');
  const rvAg=document.getElementById('rv-am-guardian');
  const rvAi=document.getElementById('rv-am-intl');
  const rvPp=document.getElementById('rv-pm-part');
  const rvPg=document.getElementById('rv-pm-guardian');
  const rvPi=document.getElementById('rv-pm-intl');
  if(rvAp)rvAp.value=rv.amPart||0;
  if(rvAg)rvAg.value=rv.amGuardian||0;
  if(rvAi)rvAi.value=rv.amIntl||0;
  if(rvPp)rvPp.value=rv.pmPart||0;
  if(rvPg)rvPg.value=rv.pmGuardian||0;
  if(rvPi)rvPi.value=rv.pmIntl||0;
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
  renderHistList();
  renderReports();
}

export function renderReports(){
  const el=document.getElementById('admin-report');
  if(!el)return;
  const reports=state.reports||{};
  const submittedCount=DEPTS.filter(d=>reports[d.code]&&reports[d.code].status==='submitted').length;
  const draftCount=DEPTS.filter(d=>reports[d.code]&&reports[d.code].status==='draft').length;
  el.innerHTML=`
    <div class="sec-hd">日報一覧</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <div style="font-size:12px;color:var(--color-text-secondary);">確定 ${submittedCount}件 ／ 退避 ${draftCount}件 ／ 未提出 ${DEPTS.length-submittedCount-draftCount}件</div>
      <button class="step-btn" onclick="printReports()"><i class="ti ti-printer" style="font-size:12px;vertical-align:-1px;margin-right:3px;"></i>全学科印刷</button>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
      ${DEPTS.map(d=>{
        const rpt=reports[d.code]||{};
        const cls=rpt.status==='submitted'?'rpt-chip rpt-chip-done':rpt.status==='draft'?'rpt-chip rpt-chip-draft':'rpt-chip';
        return`<button class="${cls}" onclick="showReportDetail('${d.code}')">${d.code}</button>`;
      }).join('')}
    </div>
    <div id="rpt-admin-detail" style="display:none;"></div>
  `;
}

export function renderHistList(){
  const history=state.history||[];
  const active=history.map((h,i)=>({...h,_i:i})).filter(h=>!h.deleted);
  const shown=vars.histLimit>0?active.slice(0,vars.histLimit):active;
  const limBtns=[3,5,10,0].map(n=>{
    const isActive=vars.histLimit===n;
    const label=n===0?'すべて':`最新${n}件`;
    return `<button onclick="setHistLimit(${n})" style="padding:5px 10px;border-radius:var(--border-radius-md);border:0.5px solid var(--color-border-secondary);font-size:12px;cursor:pointer;background:${isActive?'var(--color-text-primary)':'transparent'};color:${isActive?'var(--color-background-primary)':'var(--color-text-secondary)'};">${label}</button>`;
  }).join('');
  document.getElementById('hist-list').innerHTML=`
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:10px;flex-wrap:wrap;">
      ${limBtns}
      <span style="font-size:12px;color:var(--color-text-secondary);">${active.length}件中 ${shown.length}件表示</span>
    </div>
    ${shown.length?shown.map(h=>{
      const isSel=h._i===vars.selectedHistIdx;
      return `<div class="hist-item${isSel?' hist-item-selected':''}">
        <div>
          <div style="font-size:14px;font-weight:500;color:var(--color-text-primary);">${formatDate(h.date)}</div>
          <div style="font-size:12px;color:var(--color-text-secondary);margin-top:2px;">高校生 ${(h.count.am.hs||0)+(h.count.pm.hs||0)}名 保護者 ${(h.count.am.par||0)+(h.count.pm.par||0)}名 留学生 ${(h.count.am.intl||0)+(h.count.pm.intl||0)}名 合計 ${(h.count.am.hs||0)+(h.count.am.par||0)+(h.count.am.intl||0)+(h.count.pm.hs||0)+(h.count.pm.par||0)+(h.count.pm.intl||0)}名</div>
        </div>
        <div style="display:flex;gap:6px;margin-top:8px;">
          <button class="step-btn${isSel?' current':''}" onclick="showHistDetail(${h._i})">詳細${isSel?' ▼':''}</button>
        </div>
      </div>`;
    }).join(''):'<div style="font-size:13px;color:var(--color-text-secondary);">まだ履歴はありません</div>'}
  `;
}

export function getDefaultPart(){
  const pm=state.session.partMode||'both';
  if(pm==='am') return 'am';
  if(pm==='pm') return 'pm';
  const n=new Date();
  const minutes=n.getHours()*60+n.getMinutes();
  return minutes >= 12*60+30 ? 'pm' : 'am';
}

export function renderAll(){
  updateSessionDate();
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
