export const firebaseConfig = {
  apiKey: "AIzaSyAIhhbOAlLW63SvUtf5fCQl1hajbdJf3lU",
  authDomain: "hamm-oc-staff.firebaseapp.com",
  projectId: "hamm-oc-staff",
  storageBucket: "hamm-oc-staff.firebasestorage.app",
  messagingSenderId: "821373238545",
  appId: "1:821373238545:web:9d9183de7657845a2820b0",
  measurementId: "G-CSR0ESYMER",
  databaseURL: "https://hamm-oc-staff-default-rtdb.asia-southeast1.firebasedatabase.app"
};

export const DEPTS = [
  {code:'CP',name:'プログラム AI×コンピュータ科'},{code:'S',name:'セキュリティネットワーク科'},
  {code:'G',name:'ゲームクリエイト科'},{code:'D',name:'CADデザイン科'},
  {code:'W',name:'デジタルコンテンツ科'},{code:'A',name:'グラフィックデザイン科'},
  {code:'M',name:'メイクブライダル科'},{code:'K',name:'未来こども科'},
  {code:'CB',name:'ビジネス AI×コンピュータ科'},{code:'I',name:'医療事務科'},
  {code:'R',name:'国際IT・CAD科'},{code:'T',name:'国際観光ビジネス科'},
  {code:'F',name:'国際介護福祉科'},
];
export const DEPT_KEYS = DEPTS.map(d => d.code);

export const STEPS = ['授業中','授業終了','アンケート終了','個別対応中','完了'];
export const STEP_BG = ['','#E6F1FB','#EAF3DE','#FAEEDA','#EAF3DE'];
export const STEP_COL = ['','#0C447C','#27500A','#633806','#27500A'];

export const DEFAULT_AM = [
  {time:'8:40',title:'教職員全体打ち合わせ',place:'職員室'},
  {time:'9:00',title:'お迎え・受付',place:'1F・8F'},
  {time:'10:00',title:'オープニング・スケジュール紹介',place:'8F大教室'},
  {time:'10:05',title:'学校概要説明・みらい考房',place:'8F'},
  {time:'10:15',title:'各教室へ移動',place:''},
  {time:'10:25',title:'体験授業 / 保護者説明会',place:'各教室・8F'},
  {time:'11:15',title:'休憩',place:''},
  {time:'11:25',title:'学科・AO入試説明',place:'各教室'},
  {time:'11:45',title:'アンケート記入・質疑応答',place:'各教室'},
  {time:'11:45',title:'個別相談（8Fラウンジ4ブース）',place:'8Fラウンジ'},
  {time:'11:45',title:'キャンパスツアー',place:'12F〜'},
];

export const DEFAULT_PM = [
  {time:'12:45',title:'受付・誘導・実習準備',place:'1F・8F'},
  {time:'13:00',title:'お迎え',place:'8F'},
  {time:'13:30',title:'オープニング・スケジュール紹介',place:'8F大教室'},
  {time:'13:35',title:'学校概要説明・みらい考房',place:'8F'},
  {time:'13:45',title:'各教室へ移動',place:''},
  {time:'13:55',title:'体験授業 / 保護者説明会',place:'各教室・8F'},
  {time:'14:45',title:'休憩',place:''},
  {time:'14:55',title:'学科・AO入試説明',place:'各教室'},
  {time:'15:15',title:'アンケート記入・質疑応答',place:'各教室'},
  {time:'15:15',title:'個別相談（8Fラウンジ4ブース）',place:'8Fラウンジ'},
  {time:'15:15',title:'キャンパスツアー',place:'12F〜'},
];
