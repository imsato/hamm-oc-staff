import { DEPTS, DEPT_KEYS, STEPS, DEFAULT_AM, DEFAULT_PM } from './config.js';
import { state, vars, clone, newDP, getNow, formatDate, saveState, saveDept, saveCount, saveNotices, saveSession, saveSchedules, saveHistory, saveReports } from './state.js';
import { renderProgTab, renderProgDongsei, renderDepts, renderAdminDongseiPreview, renderTlRows, renderAdmin, renderHistList } from './render.js';

window.showProgPart=p=>{
  vars.progPartManual=p;
  renderProgTab();
};

window.saveReservation=()=>{
  const rv=state.session.reservation;
  rv.amPart=Math.min(999,Math.max(0,parseInt(document.getElementById('rv-am-part').value)||0));
  rv.amGuardian=Math.min(999,Math.max(0,parseInt(document.getElementById('rv-am-guardian').value)||0));
  rv.amIntl=Math.min(999,Math.max(0,parseInt(document.getElementById('rv-am-intl').value)||0));
  rv.pmPart=Math.min(999,Math.max(0,parseInt(document.getElementById('rv-pm-part').value)||0));
  rv.pmGuardian=Math.min(999,Math.max(0,parseInt(document.getElementById('rv-pm-guardian').value)||0));
  rv.pmIntl=Math.min(999,Math.max(0,parseInt(document.getElementById('rv-pm-intl').value)||0));
  // 開催日エントリにも書き戻す
  const sel=state.schedules.find(x=>x.id===state.session.id);
  if(sel){sel.reservation=clone(rv);saveSchedules();}
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
  if(state.count[part].fixed) return;
  state.count[part][type]=Math.max(0,(state.count[part][type]||0)+delta);
  saveCount();
};

window.chgDirect=(part,type,val)=>{
  if(state.count[part].fixed) return;
  const n=parseInt(val);
  if(isNaN(n)||n<0) return;
  state.count[part][type]=n;
  saveCount();
};

window.toggleFixed=(part,checkbox)=>{
  const newVal=checkbox.checked;
  const label=part==='am'?'午前':'午後';
  const msg=newVal
    ?`${label}の来場者人数を確定しますか？`
    :`${label}の来場者人数確定を解除しますか？`;
  if(!confirm(msg)){checkbox.checked=!newVal;return;}
  state.count[part].fixed=newVal;
  saveCount();
};

window.selTag=t=>{vars.noticeTag=t;['urgent','info','complete'].forEach(x=>document.getElementById('tg-'+x).classList.toggle('sel',x===t));};

// 写真リサイズ（Canvas API）
function resizeImageToDataUrl(file,maxDim,quality,cb){
  const reader=new FileReader();
  reader.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      let w=img.width,h=img.height;
      if(w>maxDim||h>maxDim){
        if(w>=h){h=Math.round(h*maxDim/w);w=maxDim;}
        else{w=Math.round(w*maxDim/h);h=maxDim;}
      }
      const canvas=document.createElement('canvas');
      canvas.width=w;canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      cb(canvas.toDataURL('image/jpeg',quality));
    };
    img.onerror=()=>cb(null);
    img.src=e.target.result;
  };
  reader.onerror=()=>cb(null);
  reader.readAsDataURL(file);
}

function clearNoticePhoto(){
  vars.noticePhotoData=null;
  const preview=document.getElementById('notice-photo-preview');
  const img=document.getElementById('notice-photo-img');
  if(preview)preview.style.display='none';
  if(img)img.src='';
}

window.uploadNoticePhoto=input=>{
  const file=input.files[0];if(!file)return;
  resizeImageToDataUrl(file,1200,0.80,dataUrl=>{
    if(!dataUrl){alert('画像の読み込みに失敗しました');input.value='';return;}
    vars.noticePhotoData=dataUrl;
    const preview=document.getElementById('notice-photo-preview');
    const img=document.getElementById('notice-photo-img');
    img.src=dataUrl;
    preview.style.display='block';
    input.value='';
  });
};

window.removeNoticePhoto=clearNoticePhoto;

window.openNoticePhoto=i=>{
  const n=(state.notices||[])[i];if(!n||!n.photo)return;
  const w=window.open('','_blank');
  w.document.write(`<html><body style="margin:0;background:#111;"><img src="${n.photo}" style="max-width:100%;height:auto;display:block;"></body></html>`);
  w.document.close();
};

window.postNotice=()=>{
  const name=(document.getElementById('notice-name').value||'').trim()||'名前未入力';
  const text=(document.getElementById('notice-text').value||'').trim();
  if(!text)return;
  const notice={id:'n'+Date.now(),author:name,text,tag:vars.noticeTag,time:getNow(),goods:0};
  if(vars.noticePhotoData)notice.photo=vars.noticePhotoData;
  state.notices.unshift(notice);
  document.getElementById('notice-text').value='';
  clearNoticePhoto();
  saveNotices();
};

window.goodNotice=i=>{
  if(!state.notices[i])return;
  state.notices[i].goods=(state.notices[i].goods||0)+1;
  saveNotices();
};

window.deleteNotice=i=>{
  if(!confirm('この投稿を削除しますか？'))return;
  if(!state.notices[i])return;
  state.notices[i].deleted=true;
  saveNotices();
};

window.addSched=()=>{
  const d=document.getElementById('new-date').value,m=document.getElementById('new-memo').value;
  if(!d)return;
  if(state.schedules.find(s=>s.date===d)){alert('同じ日付が既に登録されています');return;}
  state.schedules.push({date:d,memo:m,id:'s'+Date.now(),partMode:'both',amTl:clone(DEFAULT_AM),pmTl:clone(DEFAULT_PM),reservation:{amPart:0,amGuardian:0,amIntl:0,pmPart:0,pmGuardian:0,pmIntl:0}});
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
  // 開催日ごとの予約人数を読み込む
  const rv=s.reservation||{amPart:0,amGuardian:0,amIntl:0,pmPart:0,pmGuardian:0,pmIntl:0};
  state.session.reservation=clone(rv);
  saveState();
};

window.startSession=()=>{
  if(!state.session.id){alert('開催日を選択してください');return;}
  if(!confirm('開催を開始しますか？当日のデータがリセットされます。'))return;
  state.session.active=true;
  DEPT_KEYS.forEach(k=>{state.depts[k].am=newDP();state.depts[k].pm=newDP();});
  state.count={am:{hs:0,par:0,intl:0,fixed:false},pm:{hs:0,par:0,intl:0,fixed:false}};
  state.notices=[];
  state.reports={};
  vars.reportExpanded={};
  vars.reportCache={};
  saveState();
};

window.endSession=()=>{
  if(!confirm('開催を終了して履歴に保存しますか？'))return;
  state.history.unshift({date:state.session.date,id:'h'+Date.now(),count:clone(state.count),depts:clone(state.depts),notices:clone(state.notices),partMode:state.session.partMode,reports:clone(state.reports)});
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
  vars.selectedHistIdx=i;
  renderHistList();
  const h=(state.history||[])[i];if(!h)return;
  const tLabel={urgent:'緊急',info:'通知',complete:'完了'};
  const deptRows=DEPTS.filter(d=>h.depts&&h.depts[d.code]).map(d=>{
    const am=h.depts[d.code].am,pm=h.depts[d.code].pm,sAm=h.depts[d.code].skipAm,sPm=h.depts[d.code].skipPm;
    return`<div style="padding:8px 0;border-bottom:0.5px solid var(--color-border-tertiary);">
      <div style="font-size:13px;font-weight:500;color:var(--color-text-primary);">${d.code}：${d.name}</div>
      <div style="display:flex;gap:10px;font-size:12px;color:var(--color-text-secondary);flex-wrap:wrap;">${sAm?'午前: 対象外':`<span>午前: ${STEPS[am.step]}${am.doneTime?' '+am.doneTime:''}</span><span style="font-weight:500;color:var(--color-text-primary);">高${am.hs}名</span><span style="font-weight:500;color:var(--color-text-primary);">保${am.par}名</span><span style="font-weight:500;color:var(--color-text-primary);">留${am.intl||0}名</span>`}</div>
      <div style="display:flex;gap:10px;font-size:12px;color:var(--color-text-secondary);flex-wrap:wrap;">${sPm?'午後: 対象外':`<span>午後: ${STEPS[pm.step]}${pm.doneTime?' '+pm.doneTime:''}</span><span style="font-weight:500;color:var(--color-text-primary);">高${pm.hs}名</span><span style="font-weight:500;color:var(--color-text-primary);">保${pm.par}名</span><span style="font-weight:500;color:var(--color-text-primary);">留${pm.intl||0}名</span>`}</div>
    </div>`;}).join('');
  const noticeRows=(h.notices||[]).map(n=>{
    const isDel=!!n.deleted;
    const delBadge=isDel?`<span class="badge" style="background:var(--color-background-secondary);color:var(--color-text-secondary);">削除済み</span>`:'';
    return`<div style="padding:6px 0;border-bottom:0.5px solid var(--color-border-tertiary);${isDel?'opacity:0.55;':''}">
      <div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-bottom:2px;">
        <span style="font-size:12px;font-weight:500;color:var(--color-text-secondary);">${n.author}</span>
        <span style="font-size:11px;color:var(--color-text-secondary);">${n.time} [${tLabel[n.tag]||'通知'}]</span>
        ${delBadge}
      </div>
      <div style="font-size:13px;${isDel?'color:var(--color-text-secondary);text-decoration:line-through;':'color:var(--color-text-primary);'}">${n.text}</div>
    </div>`;
  }).join('');
  document.getElementById('hist-detail').style.display='block';
  document.getElementById('hist-detail').innerHTML=`
    <div class="card">
      <div style="font-size:15px;font-weight:500;margin-bottom:10px;color:var(--color-text-primary);">${formatDate(h.date)} 詳細</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:10px;">
        <div style="background:#E6F1FB;border-radius:var(--border-radius-md);padding:12px;">
          <div style="font-size:11px;font-weight:500;color:#0C447C;margin-bottom:8px;">午前</div>
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;"><span style="color:#0C447C;">高校生</span><span style="font-weight:500;color:#0C447C;">${h.count.am.hs||0}名</span></div>
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;"><span style="color:#0C447C;">付き添い</span><span style="font-weight:500;color:#0C447C;">${h.count.am.par||0}名</span></div>
          <div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:#0C447C;">留学生</span><span style="font-weight:500;color:#0C447C;">${h.count.am.intl||0}名</span></div>
        </div>
        <div style="background:#FAEEDA;border-radius:var(--border-radius-md);padding:12px;">
          <div style="font-size:11px;font-weight:500;color:#633806;margin-bottom:8px;">午後</div>
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;"><span style="color:#633806;">高校生</span><span style="font-weight:500;color:#633806;">${h.count.pm.hs||0}名</span></div>
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;"><span style="color:#633806;">付き添い</span><span style="font-weight:500;color:#633806;">${h.count.pm.par||0}名</span></div>
          <div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:#633806;">留学生</span><span style="font-weight:500;color:#633806;">${h.count.pm.intl||0}名</span></div>
        </div>
      </div>
      <div class="sec-hd">学科別記録</div>${deptRows}
      ${(h.notices||[]).length?`<div class="sec-hd" style="margin-top:10px;">連絡板</div>${noticeRows}`:''}
      ${(()=>{
        const rpts=h.reports;
        if(!rpts)return'';
        const submitted=DEPTS.filter(d=>rpts[d.code]&&rpts[d.code].status==='submitted');
        if(!submitted.length)return'';
        const esc2=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        return`<div class="sec-hd" style="margin-top:10px;">日報（${submitted.length}学科提出）</div>
          ${submitted.map(d=>{
            const r=rpts[d.code];
            const am=h.depts&&h.depts[d.code]&&h.depts[d.code].am||{};
            const pm=h.depts&&h.depts[d.code]&&h.depts[d.code].pm||{};
            return`<div style="padding:6px 0;border-bottom:0.5px solid var(--color-border-tertiary);">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="font-size:12px;font-weight:500;color:var(--color-text-primary);">${d.code}：${d.name}${r.reporter?' （'+esc2(r.reporter)+'）':''}</div>
                <span style="font-size:11px;color:var(--color-text-secondary);">確定 ${r.submittedAt}</span>
              </div>
              <div style="font-size:11px;color:var(--color-text-secondary);">午前 高${am.hs||0}名 保${am.par||0}名 留${am.intl||0}名 ／ 午後 高${pm.hs||0}名 保${pm.par||0}名 留${pm.intl||0}名</div>
              ${r.amSurvey?`<div style="font-size:12px;color:var(--color-text-primary);margin-top:2px;">AM：${esc2(r.amSurvey)}</div>`:''}
              ${r.pmSurvey?`<div style="font-size:12px;color:var(--color-text-primary);">PM：${esc2(r.pmSurvey)}</div>`:''}
              ${r.lesson?`<div style="font-size:12px;color:var(--color-text-secondary);margin-top:2px;">授業：${esc2(r.lesson)}</div>`:''}
              ${r.situation?`<div style="font-size:12px;color:var(--color-text-secondary);">状況：${esc2(r.situation)}</div>`:''}
            </div>`;
          }).join('')}`;
      })()}
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button class="btn-outline" onclick="closeHistDetail()" style="flex:1;">閉じる</button>
        <button class="btn-outline" onclick="deleteHist(${i})" style="flex:1;color:#A32D2D;border-color:#EF9F27;">この履歴を削除</button>
      </div>
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
window.showAdminPart=p=>{['report','sched','dept','tl','hist'].forEach(x=>{document.getElementById('admin-'+x).style.display=x===p?'block':'none';document.getElementById('as-'+x).classList.toggle('active',x===p);});if(p==='hist')document.getElementById('hist-detail').style.display='none';};

window.setHistLimit=n=>{
  vars.histLimit=n;
  document.getElementById('hist-detail').style.display='none';
  renderAdmin();
};

window.deleteHist=i=>{
  if(!confirm('履歴が削除されます。よろしいですか？'))return;
  if(state.history[i]) state.history[i].deleted=true;
  saveHistory();
  if(vars.selectedHistIdx===i) closeHistDetail();
  else renderHistList();
};

window.closeHistDetail=()=>{
  vars.selectedHistIdx=null;
  document.getElementById('hist-detail').style.display='none';
  renderHistList();
};

// ===== 日報機能 =====
window.cacheReportField=(code,field,value)=>{
  if(!vars.reportCache)vars.reportCache={};
  if(!vars.reportCache[code])vars.reportCache[code]={};
  vars.reportCache[code][field]=value;
};

window.toggleReportForm=code=>{
  if(!vars.reportExpanded)vars.reportExpanded={};
  vars.reportExpanded[code]=!vars.reportExpanded[code];
  renderDepts();
};

window.saveDraftReport=code=>{
  const reporter=(document.getElementById('rpt-reporter-'+code)||{}).value||'';
  const amSurvey=(document.getElementById('rpt-amsurvey-'+code)||{}).value||'';
  const pmSurvey=(document.getElementById('rpt-pmsurvey-'+code)||{}).value||'';
  const lesson=(document.getElementById('rpt-lesson-'+code)||{}).value||'';
  const situation=(document.getElementById('rpt-situation-'+code)||{}).value||'';
  if(!state.reports)state.reports={};
  state.reports[code]={...(state.reports[code]||{}),reporter,amSurvey,pmSurvey,lesson,situation,savedAt:getNow(),status:'draft'};
  if(vars.reportCache)delete vars.reportCache[code];
  saveReports();
};

window.submitReport=code=>{
  const reporter=(document.getElementById('rpt-reporter-'+code)||{}).value||'';
  if(!reporter.trim()){alert('報告者名を入力してください（必須）');return;}
  if(!confirm('日報を確定して提出しますか？'))return;
  const amSurvey=(document.getElementById('rpt-amsurvey-'+code)||{}).value||'';
  const pmSurvey=(document.getElementById('rpt-pmsurvey-'+code)||{}).value||'';
  const lesson=(document.getElementById('rpt-lesson-'+code)||{}).value||'';
  const situation=(document.getElementById('rpt-situation-'+code)||{}).value||'';
  if(!state.reports)state.reports={};
  const prev=state.reports[code]||{};
  state.reports[code]={...prev,reporter,amSurvey,pmSurvey,lesson,situation,savedAt:prev.savedAt||getNow(),submittedAt:getNow(),status:'submitted'};
  if(vars.reportCache)delete vars.reportCache[code];
  saveReports();
};

window.showReportDetail=code=>{
  const rpt=(state.reports&&state.reports[code])||{};
  const dept=DEPTS.find(d=>d.code===code)||{name:code};
  const dp_am=state.depts[code]&&state.depts[code].am||{};
  const dp_pm=state.depts[code]&&state.depts[code].pm||{};
  const el=document.getElementById('rpt-admin-detail');
  if(!el)return;
  el.style.display='block';
  const row=(label,val)=>val?`<div style="margin-bottom:8px;"><div class="rpt-sec-label">${label}</div><div class="rpt-detail-text">${String(val).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div></div>`:'';
  el.innerHTML=`<div class="card">
    <div style="font-size:14px;font-weight:500;margin-bottom:4px;color:var(--color-text-primary);">${code}：${dept.name}</div>
    <div style="font-size:11px;color:var(--color-text-secondary);margin-bottom:8px;">${rpt.savedAt?'一時退避: '+rpt.savedAt:''}${rpt.submittedAt?' ／ 確定: '+rpt.submittedAt:''}</div>
    ${rpt.reporter?`<div style="font-size:13px;font-weight:500;color:var(--color-text-primary);margin-bottom:10px;padding:6px 10px;background:var(--color-background-secondary);border-radius:var(--border-radius-md);">報告者：${String(rpt.reporter).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`:''}
    <div class="rpt-sec-label">参加者</div>
    <div class="rpt-auto-row">午前　高校生 ${dp_am.hs||0}名　保護者 ${dp_am.par||0}名　留学生 ${dp_am.intl||0}名</div>
    <div class="rpt-auto-row" style="margin-bottom:8px;">午後　高校生 ${dp_pm.hs||0}名　保護者 ${dp_pm.par||0}名　留学生 ${dp_pm.intl||0}名</div>
    ${row('アンケート志望状況（午前）',rpt.amSurvey)}
    ${row('アンケート志望状況（午後）',rpt.pmSurvey)}
    ${row('授業内容',rpt.lesson)}
    ${row('参加者の状況',rpt.situation)}
    <button class="btn-outline" onclick="document.getElementById('rpt-admin-detail').style.display='none'" style="margin-top:8px;">閉じる</button>
  </div>`;
  setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'nearest'}),50);
};

window.printReports=()=>{
  const reports=state.reports||{};
  const sessionDate=formatDate(state.session.date)||'日付未設定';
  const esc2=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  // 来場者・予約人数サマリー
  const rv=state.session.reservation||{};
  const cnt=state.count||{am:{},pm:{}};
  const amHs=cnt.am.hs||0,amPar=cnt.am.par||0,amIntl=cnt.am.intl||0;
  const pmHs=cnt.pm.hs||0,pmPar=cnt.pm.par||0,pmIntl=cnt.pm.intl||0;
  const amRvP=rv.amPart||0,amRvG=rv.amGuardian||0,amRvI=rv.amIntl||0;
  const pmRvP=rv.pmPart||0,pmRvG=rv.pmGuardian||0,pmRvI=rv.pmIntl||0;
  const countSummary=`<table class="ct">
    <tr><th></th><th>高校生</th><th>保護者</th><th>留学生</th><th>合計</th></tr>
    <tr><td>午前　予約</td><td>${amRvP}</td><td>${amRvG}</td><td>${amRvI}</td><td>${amRvP+amRvG+amRvI}</td></tr>
    <tr><td>午前　来場</td><td>${amHs}</td><td>${amPar}</td><td>${amIntl}</td><td>${amHs+amPar+amIntl}</td></tr>
    <tr><td>午後　予約</td><td>${pmRvP}</td><td>${pmRvG}</td><td>${pmRvI}</td><td>${pmRvP+pmRvG+pmRvI}</td></tr>
    <tr><td>午後　来場</td><td>${pmHs}</td><td>${pmPar}</td><td>${pmIntl}</td><td>${pmHs+pmPar+pmIntl}</td></tr>
    <tr class="tot"><td>本日合計（来場）</td><td>${amHs+pmHs}</td><td>${amPar+pmPar}</td><td>${amIntl+pmIntl}</td><td>${amHs+amPar+amIntl+pmHs+pmPar+pmIntl}</td></tr>
  </table>`;
  const rows=DEPTS.map(d=>{
    const rpt=reports[d.code];
    const dp_am=state.depts[d.code]&&state.depts[d.code].am||{};
    const dp_pm=state.depts[d.code]&&state.depts[d.code].pm||{};
    if(!rpt||!rpt.status)return`<div class="pd"><h3>${d.code}：${d.name}</h3><p class="ns">未提出</p></div>`;
    return`<div class="pd">
      <h3>${d.code}：${d.name} <span class="ts">${rpt.status==='submitted'?'確定 '+rpt.submittedAt:'退避 '+rpt.savedAt}</span></h3>
      ${rpt.reporter?`<p><b>報告者：</b>${esc2(rpt.reporter)}</p>`:''}
      <p><b>【参加者】</b><br>午前　高校生 ${dp_am.hs||0}名　保護者 ${dp_am.par||0}名　留学生 ${dp_am.intl||0}名<br>午後　高校生 ${dp_pm.hs||0}名　保護者 ${dp_pm.par||0}名　留学生 ${dp_pm.intl||0}名</p>
      ${rpt.amSurvey||rpt.pmSurvey?`<p><b>【アンケート志望状況】</b><br>AM：${esc2(rpt.amSurvey)}<br>PM：${esc2(rpt.pmSurvey)}</p>`:''}
      ${rpt.lesson?`<p><b>【授業内容】</b><br>${esc2(rpt.lesson)}</p>`:''}
      ${rpt.situation?`<p><b>【参加者の状況】</b><br>${esc2(rpt.situation)}</p>`:''}
    </div>`;
  }).join('');
  const html=`<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>OC実施報告 ${sessionDate}</title>
  <style>
    body{font-family:-apple-system,sans-serif;font-size:13px;line-height:1.7;margin:0;padding:20px;}
    h1{font-size:16px;margin-bottom:4px;}
    h2{font-size:13px;margin:0 0 6px;font-weight:600;}
    h3{font-size:14px;margin:0 0 6px;padding:6px 0;border-bottom:1px solid #999;}
    p{margin:4px 0;white-space:pre-wrap;}
    .pd{margin-bottom:24px;padding-bottom:8px;border-bottom:2px solid #333;page-break-inside:avoid;}
    .ts{font-size:11px;color:#666;font-weight:normal;}
    .ns{color:#999;}
    .sub{font-size:12px;color:#555;margin-bottom:8px;}
    .ct{width:100%;border-collapse:collapse;margin-bottom:20px;}
    .ct th,.ct td{padding:5px 8px;border:0.5px solid #ccc;text-align:center;font-size:12px;}
    .ct th{background:#f0f0f0;font-weight:600;}
    .ct td:first-child{text-align:left;}
    .tot{font-weight:bold;background:#e8e8e8;}
    .summary-block{margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #333;}
  </style>
  </head><body>
  <h1>浜松未来総合専門学校　オープンキャンパス実施報告</h1>
  <p class="sub">実施日：${sessionDate}</p>
  <div class="summary-block">
    <h2>来場者数サマリー</h2>
    ${countSummary}
  </div>
  ${rows}</body></html>`;
  const w=window.open('','_blank');
  w.document.write(html);
  w.document.close();
  setTimeout(()=>w.print(),400);
};

window.moveSchedPage=delta=>{
  const PAGE=3;
  const schedules=state.schedules||[];
  const maxOffset=Math.max(0,schedules.length-PAGE);
  const current=vars.schedOffset<0?maxOffset:vars.schedOffset;
  vars.schedOffset=Math.max(0,Math.min(current+delta,maxOffset));
  renderAdmin();
};
