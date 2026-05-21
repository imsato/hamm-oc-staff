import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getDatabase, ref, set } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { firebaseConfig, DEPT_KEYS, DEFAULT_AM, DEFAULT_PM } from './config.js';

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const STATE_REF = ref(db, 'oc/state');

export const state = {
  depts: {},
  count: {am:{hs:0,par:0}, pm:{hs:0,par:0}},
  notices: [],
  schedules: [],
  session: {active:false,date:'',id:'',partMode:'both',amTl:null,pmTl:null,dongseiUrl:'',
    reservation:{amPart:0,amGuardian:0,pmPart:0,pmGuardian:0}},
  history: []
};

// ミュータブルなUI状態をオブジェクトにまとめて共有する
export const vars = {
  deptPart: 'am',
  progPartManual: null,
  deptPartManual: null,
  noticeTag: 'info',
  editAmTl: [],
  editPmTl: [],
  saving: false
};

export function clone(x){return JSON.parse(JSON.stringify(x));}
export function newDP(){return{step:0,hs:0,par:0,consult:0,tour:0,doneTime:''};}
export function getNow(){const n=new Date();return n.getHours().toString().padStart(2,'0')+':'+n.getMinutes().toString().padStart(2,'0');}
export function formatDate(d){if(!d)return'';const dt=new Date(d+'T00:00:00');return`${dt.getFullYear()}年${dt.getMonth()+1}月${dt.getDate()}日`;}
export function esc(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

export function mergeFromFirebase(data) {
  if (data.depts && typeof data.depts === 'object') {
    state.depts = data.depts;
  }
  if (data.count && typeof data.count === 'object') {
    state.count = data.count;
  }
  if (Array.isArray(data.notices)) state.notices = data.notices;
  if (Array.isArray(data.schedules)) state.schedules = data.schedules;
  if (Array.isArray(data.history)) state.history = data.history;
  if (data.session && typeof data.session === 'object') {
    state.session = data.session;
  }
}

export function ensureDefaults() {
  if (!state.depts || typeof state.depts !== 'object') {
    state.depts = {};
  }
  DEPT_KEYS.forEach(k => {
    if (!state.depts[k] || typeof state.depts[k] !== 'object') {
      state.depts[k] = {skipAm:false, skipPm:false, am:newDP(), pm:newDP()};
    } else {
      if (!state.depts[k].am) state.depts[k].am = newDP();
      if (!state.depts[k].pm) state.depts[k].pm = newDP();
    }
  });

  if (!state.count || typeof state.count !== 'object') {
    state.count = {am:{hs:0,par:0}, pm:{hs:0,par:0}};
  }
  if (!state.count.am) state.count.am = {hs:0,par:0};
  if (!state.count.pm) state.count.pm = {hs:0,par:0};

  if (!state.session || typeof state.session !== 'object') {
    state.session = {active:false,date:'',id:'',partMode:'both',amTl:null,pmTl:null,dongseiUrl:''};
  }
  if (!state.session.amTl) state.session.amTl = clone(DEFAULT_AM);
  if (!state.session.pmTl) state.session.pmTl = clone(DEFAULT_PM);
  if (!state.session.partMode) state.session.partMode = 'both';
  if (!state.session.dongseiUrl) state.session.dongseiUrl = '';
  if (!state.session.reservation || typeof state.session.reservation !== 'object')
    state.session.reservation = {amPart:0, amGuardian:0, pmPart:0, pmGuardian:0};
  const rv = state.session.reservation;
  if (rv.amPart === undefined) rv.amPart = 0;
  if (rv.amGuardian === undefined) rv.amGuardian = 0;
  if (rv.pmPart === undefined) rv.pmPart = 0;
  if (rv.pmGuardian === undefined) rv.pmGuardian = 0;

  if (!Array.isArray(state.notices)) state.notices = [];
  if (!Array.isArray(state.schedules)) state.schedules = [];
  if (!Array.isArray(state.history)) state.history = [];
}

export function setSyncOk(ok){
  document.getElementById('sdot').className='sync-dot '+(ok?'ok':'err');
  document.getElementById('sstatus').textContent=ok?'リアルタイム同期中':'接続エラー';
}

export async function saveState(){
  if(vars.saving)return;
  vars.saving=true;
  try{
    await set(STATE_REF, clone(state));
    setSyncOk(true);
  } catch(e){
    console.error('Firebase保存エラー:', e);
    setSyncOk(false);
  } finally{vars.saving=false;}
}

export async function savePath(path, data){
  try{
    await set(ref(db, 'oc/state/' + path), clone(data));
    setSyncOk(true);
  } catch(e){
    console.error('Firebase部分保存エラー:', e);
    setSyncOk(false);
  }
}

export function saveDept(code){
  state.depts[code] = state.depts[code] || {};
  savePath('depts/' + code, state.depts[code]);
}

export function saveCount(){
  savePath('count', state.count);
}

export function saveNotices(){
  savePath('notices', state.notices);
}

export function saveSession(){
  savePath('session', state.session);
}
