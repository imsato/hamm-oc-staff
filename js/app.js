import { onValue } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { STATE_REF, mergeFromFirebase, ensureDefaults, setSyncOk } from './state.js';
import { renderAll, updateClock } from './render.js';
import './handlers.js';

onValue(STATE_REF, snap => {
  try {
    const data = snap.val();
    if (data && typeof data === 'object') {
      mergeFromFirebase(data);
    }
    ensureDefaults();
    renderAll();
    setSyncOk(true);
  } catch(e) {
    console.error('データ処理エラー:', e);
    ensureDefaults();
    renderAll();
    setSyncOk(false);
  }
}, err => {
  console.error('Firebase接続エラー:', err);
  setSyncOk(false);
});

setInterval(updateClock, 10000);
updateClock();
