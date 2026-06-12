import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const PARTS = ["ALL", "胸", "背中", "脚", "肩", "腕", "腹筋"];
const DEFAULT_EXERCISES = {
  胸:  ["ベンチプレス","インクラインDBプレス","ペックデック","ディップス"],
  背中: ["デッドリフト","ラットプルダウン","ベントオーバーロウ","シーテッドロウ"],
  脚:  ["スクワット","レッグプレス","レッグカール","カーフレイズ"],
  肩:  ["オーバーヘッドプレス","サイドレイズ","フロントレイズ","リアデルトフライ"],
  腕:  ["バーベルカール","ハンマーカール","トライセプスプレスダウン","スカルクラッシャー"],
  腹筋: ["クランチ","レッグレイズ","プランク(秒)","アブローラー"],
};

const SK_REC  = "liftlog_records_v4";
const SK_EX   = "liftlog_exercises_v4";
const SK_BODY = "liftlog_body_v4";
const SK_GOAL = "liftlog_goals_v4";

// goals[part][exercise] = number (目標1RM)

const loadJ = (key, def) => { try { return JSON.parse(localStorage.getItem(key)) || def; } catch { return def; } };
const saveJ = (key, d)   => { try { localStorage.setItem(key, JSON.stringify(d)); } catch {} };

const epley = (w, r) => {
  const wf = parseFloat(w), ri = parseInt(r);
  if (!wf || !ri || isNaN(wf) || isNaN(ri) || ri <= 0) return null;
  return Math.round(wf * (1 + ri / 30) * 10) / 10;
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`;

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=M+PLUS+1p:wght@400;700;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
html,body{height:100%;background:#0d0d10;color:#f0f0f5;font-family:'M PLUS 1p',sans-serif;}
:root{
  --bg:#0d0d10;--surface:#16161e;--sur2:#1e1e2a;--border:#2c2c3e;
  --red:#e8363d;--red2:#ff6b6b;--yellow:#f5d020;--text:#f0f0f5;
  --muted:#666680;--green:#4ade80;--blue:#60a5fa;--r:10px;
}
.app{max-width:430px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column;}

/* TOP BAR */
.topbar{background:var(--surface);border-bottom:1px solid var(--border);padding:13px 18px 10px;display:flex;align-items:flex-end;justify-content:space-between;position:sticky;top:0;z-index:200;}
.topbar-logo{font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:3px;color:var(--red);line-height:1;}
.topbar-sub{font-size:10px;color:var(--muted);margin-top:1px;}
.topbar-date{font-size:12px;color:var(--muted);}

/* PART TABS */
.ptabs-wrap{background:var(--surface);border-bottom:1px solid var(--border);overflow-x:auto;scrollbar-width:none;position:sticky;top:57px;z-index:199;}
.ptabs-wrap::-webkit-scrollbar{display:none;}
.ptabs{display:flex;padding:0 4px;}
.ptab{flex-shrink:0;padding:10px 14px;font-size:12px;font-weight:700;background:none;border:none;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;transition:all .15s;white-space:nowrap;}
.ptab.active{color:var(--red);border-bottom-color:var(--red);}

/* CONTENT */
.content{flex:1;padding:14px 14px 90px;}

/* STATS */
.stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;}
.stat-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:12px 10px;text-align:center;}
.stat-val{font-family:'Bebas Neue',sans-serif;font-size:28px;line-height:1;}
.stat-unit{font-size:10px;color:var(--muted);}
.stat-label{font-size:10px;color:var(--muted);margin-top:3px;}

/* CALENDAR */
.cal-wrap{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:14px;margin-bottom:14px;}
.cal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
.cal-title{font-size:14px;font-weight:900;}
.cal-nav{background:none;border:1px solid var(--border);color:var(--text);width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;}
.cal-dow{font-size:10px;color:var(--muted);text-align:center;padding-bottom:4px;font-weight:700;}
.cal-day{aspect-ratio:1;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--muted);}
.cal-day.has-rec{background:var(--red);color:#fff;font-weight:700;}
.cal-day.today{outline:2px solid var(--yellow);outline-offset:-1px;color:var(--text);}
.cal-day.other{opacity:0.2;}

/* SECTION LABEL */
.sec-label{font-size:11px;font-weight:900;color:var(--muted);letter-spacing:2px;margin-bottom:8px;}

/* EX BEST CARDS */
.ex-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px;}
.ex-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;min-height:86px;}
.ex-card-pr{border-color:var(--red);background:linear-gradient(135deg,#1e0808,var(--surface));}
.ex-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:4px;margin-bottom:5px;}
.ex-card-name{font-size:11px;font-weight:700;color:var(--muted);line-height:1.3;flex:1;}
.ex-card-badge{font-size:9px;font-weight:900;color:var(--red);border:1px solid var(--red);padding:1px 5px;border-radius:4px;white-space:nowrap;flex-shrink:0;}
.ex-card-rm-row{display:flex;align-items:baseline;gap:3px;}
.ex-card-rm{font-family:'Bebas Neue',sans-serif;font-size:34px;color:var(--yellow);line-height:1;}
.ex-card-kg{font-size:12px;color:var(--muted);}
.ex-card-diff{font-size:11px;color:var(--green);font-weight:700;margin-left:4px;}
.ex-card-detail{font-size:11px;color:var(--muted);margin-top:3px;}
.ex-card-date{font-size:10px;color:var(--muted);margin-top:2px;}
.ex-card-prev{font-size:10px;color:var(--muted);margin-top:4px;padding-top:4px;border-top:1px solid var(--border);}

/* RECORD PAGE */
.ex-block{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);margin-bottom:12px;overflow:hidden;}
.ex-block-header{background:var(--red);padding:11px 14px;display:flex;align-items:center;justify-content:space-between;}
.ex-block-title{font-size:14px;font-weight:900;color:#fff;}
.ex-block-toggle{color:#fff;font-size:18px;background:none;border:none;cursor:pointer;}

/* SET TABLE */
.set-table{width:100%;border-collapse:collapse;}
.set-table th{font-size:11px;color:var(--muted);font-weight:700;padding:8px 6px;text-align:center;border-bottom:1px solid var(--border);}
.set-table th:first-child{text-align:left;padding-left:10px;width:36px;}
.set-table td{padding:6px 4px;border-bottom:1px solid var(--border);vertical-align:middle;text-align:center;}
.set-table td:first-child{padding-left:10px;font-size:13px;font-weight:900;color:var(--muted);text-align:left;}
.set-table tr:last-child td{border-bottom:none;}
.set-input{background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:7px 4px;font-size:15px;font-family:inherit;width:66px;text-align:center;transition:border-color .15s;}
.set-input:focus{outline:none;border-color:var(--red);}
.set-rm{font-family:'Bebas Neue',sans-serif;font-size:18px;color:var(--yellow);}
.set-rm-dash{color:var(--muted);font-size:13px;}
.set-del{background:none;border:none;color:var(--muted);cursor:pointer;font-size:17px;padding:4px 8px;}
.set-del:active{color:var(--red);}
.btn-add-set{width:100%;padding:11px;background:none;border:none;border-top:1px solid var(--border);color:var(--muted);font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;}
.btn-add-set:active{background:var(--sur2);}

/* ADD EXERCISE */
.add-ex-row{display:flex;gap:8px;padding:10px;border-top:1px solid var(--border);}
.add-ex-input{flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:9px 12px;font-size:14px;font-family:inherit;}
.add-ex-input:focus{outline:none;border-color:var(--red);}
.btn-add-ex{background:var(--red);color:#fff;border:none;border-radius:8px;padding:9px 14px;font-size:13px;font-weight:900;cursor:pointer;white-space:nowrap;}
.ex-block-del{background:none;border:none;color:rgba(255,255,255,0.6);cursor:pointer;font-size:13px;padding:2px 6px;margin-left:6px;}

/* DATE / SAVE */
.date-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
.date-label{font-size:13px;font-weight:900;}
.date-input{background:var(--sur2);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:7px 10px;font-size:13px;font-family:inherit;}
.date-input:focus{outline:none;border-color:var(--red);}
.btn-save{width:100%;padding:15px;border-radius:var(--r);background:var(--red);color:#fff;font-weight:900;font-size:15px;border:none;cursor:pointer;transition:all .15s;font-family:inherit;letter-spacing:1px;margin-top:4px;}
.btn-save:active{transform:scale(0.98);}

/* HISTORY */
.hist-day{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);margin-bottom:10px;overflow:hidden;}
.hist-day-header{padding:10px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);}
.hist-day-date{font-size:13px;font-weight:900;}
.hist-day-meta{font-size:11px;color:var(--muted);}
.hist-ex{padding:10px 14px;border-bottom:1px solid var(--border);}
.hist-ex:last-child{border-bottom:none;}
.hist-ex-name{font-size:12px;font-weight:900;margin-bottom:6px;display:flex;justify-content:space-between;}
.hist-set-row{display:flex;gap:8px;align-items:center;padding:3px 0;font-size:12px;color:var(--muted);}
.hist-set-num{font-weight:700;color:var(--text);width:20px;}
.hist-set-rm{font-family:'Bebas Neue',sans-serif;font-size:16px;color:var(--yellow);margin-left:auto;}

/* BODY PAGE */
.body-form{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:16px;margin-bottom:14px;}
.body-form-title{font-size:13px;font-weight:900;color:var(--muted);letter-spacing:2px;margin-bottom:14px;}
.body-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;}
.body-field{display:flex;flex-direction:column;gap:5px;}
.body-field label{font-size:11px;color:var(--muted);font-weight:700;}
.body-input{background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:11px 12px;font-size:16px;font-family:inherit;width:100%;transition:border-color .15s;}
.body-input:focus{outline:none;border-color:var(--blue);}

.body-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:14px;}
.body-stat{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:10px 6px;text-align:center;}
.body-stat-val{font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--blue);line-height:1;}
.body-stat-unit{font-size:9px;color:var(--muted);}
.body-stat-label{font-size:9px;color:var(--muted);margin-top:2px;}

.body-hist-item{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:10px;}
.body-hist-date{font-size:12px;font-weight:900;min-width:80px;}
.body-hist-vals{flex:1;display:flex;flex-wrap:wrap;gap:8px;}
.body-hist-chip{font-size:11px;color:var(--muted);}
.body-hist-chip span{font-weight:700;color:var(--text);}
.body-hist-del{background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;padding:4px;}

.btn-body-save{width:100%;padding:13px;border-radius:var(--r);background:var(--blue);color:#fff;font-weight:900;font-size:15px;border:none;cursor:pointer;font-family:inherit;letter-spacing:1px;}
.btn-body-save:active{transform:scale(0.98);}

/* GRAPH */
.graph-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:16px;margin-bottom:14px;}
.graph-card-title{font-size:13px;font-weight:900;margin-bottom:14px;}
.graph-empty{color:var(--muted);font-size:12px;text-align:center;padding:24px;}
.fselect{background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:11px 12px;font-size:14px;font-family:inherit;width:100%;}
.fselect:focus{outline:none;border-color:var(--red);}

/* BOTTOM NAV */
.bottomnav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;background:var(--surface);border-top:1px solid var(--border);display:flex;z-index:300;}
.bn-btn{flex:1;padding:10px 2px 12px;background:none;border:none;color:var(--muted);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:9px;font-family:inherit;font-weight:700;transition:color .15s;}
.bn-btn.active{color:var(--red);}
.bn-icon{font-size:20px;line-height:1;}

/* TOAST */
.toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--green);color:#000;padding:10px 22px;border-radius:20px;font-weight:700;font-size:13px;opacity:0;transition:all .25s;z-index:999;pointer-events:none;}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
.empty-state{text-align:center;color:var(--muted);padding:40px 20px;font-size:13px;line-height:1.8;}

/* MODAL */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:500;display:flex;align-items:flex-end;}
.modal-sheet{background:var(--surface);border-radius:16px 16px 0 0;padding:20px;width:100%;max-width:430px;margin:0 auto;}
.modal-title{font-size:15px;font-weight:900;margin-bottom:14px;}
.modal-input{background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:12px;font-size:15px;font-family:inherit;width:100%;margin-bottom:12px;}
.modal-input:focus{outline:none;border-color:var(--red);}
.modal-btns{display:flex;gap:8px;}
.modal-btn-ok{flex:1;padding:13px;background:var(--red);color:#fff;font-weight:900;font-size:14px;border:none;border-radius:8px;cursor:pointer;font-family:inherit;}
.modal-btn-cancel{flex:1;padding:13px;background:var(--sur2);color:var(--muted);font-weight:700;font-size:14px;border:none;border-radius:8px;cursor:pointer;font-family:inherit;}

/* GOAL PROGRESS */
.goal-row{margin-top:6px;padding-top:6px;border-top:1px solid var(--border);}
.goal-label{display:flex;align-items:center;justify-content:space-between;font-size:10px;color:var(--muted);margin-bottom:3px;}
.goal-label-target{font-weight:700;color:var(--red2);}
.goal-bar-track{height:5px;background:var(--sur2);border-radius:3px;overflow:hidden;}
.goal-bar-fill{height:100%;background:linear-gradient(90deg,var(--yellow),var(--green));border-radius:3px;transition:width .4s ease;}
.goal-bar-fill.done{background:var(--green);}
.goal-remain{font-size:10px;color:var(--muted);margin-top:3px;}
.goal-remain.done{color:var(--green);font-weight:700;}
.goal-set-btn{background:none;border:1px dashed var(--border);color:var(--muted);font-size:10px;padding:3px 8px;border-radius:6px;cursor:pointer;margin-top:6px;width:100%;font-family:inherit;}

/* CELEBRATION */
.celebrate-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:600;display:flex;align-items:center;justify-content:center;flex-direction:column;animation:fadeIn .3s ease;}
@keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
.celebrate-card{text-align:center;padding:30px;position:relative;z-index:2;}
.celebrate-emoji{font-size:72px;animation:pop .5s cubic-bezier(.2,1.4,.5,1);}
@keyframes pop{0%{transform:scale(0);}70%{transform:scale(1.3);}100%{transform:scale(1);}}
.celebrate-title{font-family:'Bebas Neue',sans-serif;font-size:42px;letter-spacing:3px;color:var(--yellow);margin:14px 0 4px;animation:slideUp .4s ease .15s both;}
@keyframes slideUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
.celebrate-ex{font-size:16px;font-weight:900;color:#fff;animation:slideUp .4s ease .25s both;}
.celebrate-detail{font-size:14px;color:var(--muted);margin-top:8px;animation:slideUp .4s ease .35s both;}
.celebrate-rm{font-family:'Bebas Neue',sans-serif;font-size:56px;color:var(--green);margin:10px 0;animation:pop .5s cubic-bezier(.2,1.4,.5,1) .3s both;}
.celebrate-btn{margin-top:20px;padding:14px 40px;background:var(--red);color:#fff;font-weight:900;font-size:15px;border:none;border-radius:30px;cursor:pointer;font-family:inherit;letter-spacing:1px;animation:slideUp .4s ease .45s both;}
.confetti{position:absolute;width:10px;height:10px;top:-20px;z-index:1;animation:fall linear forwards;}
@keyframes fall{to{transform:translateY(110vh) rotate(720deg);opacity:0.3;}}
`;

// ─────────────────────────────────────────────
// CELEBRATION MODAL
// ─────────────────────────────────────────────
function Celebration({ data, onClose }) {
  if (!data) return null;
  const colors = ["#e8363d","#f5d020","#4ade80","#60a5fa","#ff6b6b","#ffffff"];
  const confetti = Array.from({ length: 40 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    dur: 1.5 + Math.random() * 1.5,
    color: colors[i % colors.length],
    size: 6 + Math.random() * 8,
  }));
  return (
    <div className="celebrate-overlay" onClick={onClose}>
      {confetti.map((c, i) => (
        <div key={i} className="confetti" style={{
          left: `${c.left}%`, background: c.color,
          width: c.size, height: c.size,
          animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s`,
          borderRadius: i % 2 ? "50%" : "0",
        }}/>
      ))}
      <div className="celebrate-card" onClick={(e)=>e.stopPropagation()}>
        <div className="celebrate-emoji">🎉</div>
        <div className="celebrate-title">GOAL CLEAR!</div>
        <div className="celebrate-ex">{data.exercise}</div>
        <div className="celebrate-rm">{data.rm}<span style={{fontSize:24,color:"var(--muted)"}}>kg</span></div>
        <div className="celebrate-detail">目標 {data.goal}kg を突破！（{data.weight}kg × {data.reps}rep）</div>
        <button className="celebrate-btn" onClick={onClose}>唆るぜ！</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CALENDAR
// ─────────────────────────────────────────────
function Calendar({ records, activePart }) {
  const [cur, setCur] = useState(new Date());
  const year = cur.getFullYear(), month = cur.getMonth();
  const today = todayStr();
  const parts = activePart === "ALL" ? Object.keys(DEFAULT_EXERCISES) : [activePart];
  const prefix = `${year}-${String(month+1).padStart(2,"0")}`;
  const recDays = new Set();
  parts.forEach((p) => (records[p]||[]).forEach((s) => {
    if (s.date?.startsWith(prefix)) recDays.add(parseInt(s.date.slice(8,10)));
  }));
  const firstDay = new Date(year,month,1).getDay();
  const dim = new Date(year,month+1,0).getDate();
  const cells = [];
  for(let i=0;i<firstDay;i++) cells.push({day:null,other:true});
  for(let d=1;d<=dim;d++) cells.push({day:d});
  while(cells.length%7!==0) cells.push({day:null,other:true});
  return (
    <div className="cal-wrap">
      <div className="cal-header">
        <button className="cal-nav" onClick={()=>setCur(new Date(year,month-1,1))}>‹</button>
        <div className="cal-title">{year}年{month+1}月</div>
        <button className="cal-nav" onClick={()=>setCur(new Date(year,month+1,1))}>›</button>
      </div>
      <div className="cal-grid">
        {["日","月","火","水","木","金","土"].map((d)=><div key={d} className="cal-dow">{d}</div>)}
        {cells.map((c,i)=>{
          const ds=c.day?`${year}-${String(month+1).padStart(2,"0")}-${String(c.day).padStart(2,"0")}`:"";
          return <div key={i} className={`cal-day ${recDays.has(c.day)?"has-rec":""} ${ds===today?"today":""} ${c.other?"other":""}`}>{c.day||""}</div>;
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// HOME
// ─────────────────────────────────────────────
function ExBestCard({ part, exercise, records, goal, onSetGoal }) {
  const sessions = (records[part]||[]).filter((s)=>s.exercise===exercise);
  const allSets = sessions.flatMap((s)=>(s.sets||[]).map((set)=>({...set,date:s.date})));
  const withRM = allSets.filter((s)=>s.rm);
  const best = withRM.length ? [...withRM].sort((a,b)=>b.rm-a.rm)[0] : null;

  // 目標の進捗計算
  const renderGoal = () => {
    if (!goal) {
      return (
        <button className="goal-set-btn" onClick={()=>onSetGoal(exercise)}>＋ 目標RMを設定</button>
      );
    }
    const cur = best?.rm || 0;
    const pct = Math.min(100, Math.round((cur / goal) * 100));
    const done = cur >= goal;
    const remain = Math.round((goal - cur) * 10) / 10;
    return (
      <div className="goal-row" onClick={()=>onSetGoal(exercise)} style={{cursor:"pointer"}}>
        <div className="goal-label">
          <span>目標まで</span>
          <span className="goal-label-target">🎯 {goal}kg</span>
        </div>
        <div className="goal-bar-track">
          <div className={`goal-bar-fill ${done?"done":""}`} style={{width:`${pct}%`}}/>
        </div>
        <div className={`goal-remain ${done?"done":""}`}>
          {done ? "✅ 達成済み！" : `あと ${remain}kg（${pct}%）`}
        </div>
      </div>
    );
  };

  if (!best) return (
    <div className="ex-card">
      <div className="ex-card-head"><div className="ex-card-name">{exercise}</div></div>
      {renderGoal()}
    </div>
  );

  const sorted = [...withRM].sort((a,b)=>b.rm-a.rm);
  const prev = sorted.find((s)=>s.date!==best.date)||null;
  const diff = prev ? Math.round((best.rm-prev.rm)*10)/10 : null;
  const isPR = prev && best.rm > prev.rm;
  return (
    <div className={`ex-card ${isPR?"ex-card-pr":""}`}>
      <div className="ex-card-head">
        <div className="ex-card-name">{exercise}</div>
        {isPR && <div className="ex-card-badge">PR 🔥</div>}
      </div>
      <div className="ex-card-rm-row">
        <span className="ex-card-rm">{best.rm}</span>
        <span className="ex-card-kg">kg</span>
        {diff>0 && <span className="ex-card-diff">▲{diff}</span>}
      </div>
      <div className="ex-card-detail">{best.weight}kg × {best.reps}rep</div>
      <div className="ex-card-date">{best.date}</div>
      {renderGoal()}
    </div>
  );
}

function HomePage({ records, exercises, goals, setGoals, activePart }) {
  const parts = activePart==="ALL" ? Object.keys(DEFAULT_EXERCISES) : [activePart];
  const allSessions = parts.flatMap((p)=>records[p]||[]);
  const allSets = allSessions.flatMap((s)=>s.sets||[]);
  const totalLoad = Math.round(allSets.reduce((s,set)=>s+(set.weight||0)*(set.reps||0),0));
  const trainDays = new Set(allSessions.map((s)=>s.date)).size;

  const [goalModal, setGoalModal] = useState(null); // {part, exercise}
  const [goalInput, setGoalInput] = useState("");

  const openGoalModal = (part, exercise) => {
    setGoalModal({ part, exercise });
    setGoalInput(goals[part]?.[exercise] ? String(goals[part][exercise]) : "");
  };

  const saveGoal = () => {
    if (!goalModal) return;
    const { part, exercise } = goalModal;
    const val = parseFloat(goalInput);
    const updated = { ...goals, [part]: { ...(goals[part]||{}) } };
    if (val && val > 0) updated[part][exercise] = val;
    else delete updated[part][exercise];
    setGoals(updated);
    saveJ(SK_GOAL, updated);
    setGoalModal(null);
    setGoalInput("");
  };

  return (
    <div className="content">
      <div className="stats-row">
        <div className="stat-card"><div className="stat-val">{trainDays}</div><div className="stat-unit">days</div><div className="stat-label">累計トレ日数</div></div>
        <div className="stat-card"><div className="stat-val">{allSets.length}</div><div className="stat-unit">sets</div><div className="stat-label">総セット数</div></div>
        <div className="stat-card">
          <div className="stat-val">{totalLoad>=1000?(totalLoad/1000).toFixed(1):totalLoad}</div>
          <div className="stat-unit">{totalLoad>=1000?"t":"kg"}</div>
          <div className="stat-label">総負荷量</div>
        </div>
      </div>
      <Calendar records={records} activePart={activePart} />
      {parts.map((part)=>{
        const exList = exercises[part] || DEFAULT_EXERCISES[part] || [];
        return (
          <div key={part}>
            <div className="sec-label">{part}</div>
            <div className="ex-grid">
              {exList.map((ex)=>(
                <ExBestCard key={ex} part={part} exercise={ex} records={records}
                  goal={goals[part]?.[ex]}
                  onSetGoal={(exercise)=>openGoalModal(part, exercise)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* 目標設定モーダル */}
      {goalModal && (
        <div className="modal-overlay" onClick={()=>setGoalModal(null)}>
          <div className="modal-sheet" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-title">🎯 目標RMを設定 — {goalModal.exercise}</div>
            <input className="modal-input" type="number" inputMode="decimal"
              placeholder="目標の推定1RM (kg)" value={goalInput}
              onChange={(e)=>setGoalInput(e.target.value)}
              onKeyDown={(e)=>{if(e.key==="Enter")saveGoal();}} autoFocus
            />
            <div className="modal-btns">
              <button className="modal-btn-cancel" onClick={()=>setGoalModal(null)}>キャンセル</button>
              <button className="modal-btn-ok" onClick={saveGoal}>設定する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// RECORD PAGE
// ─────────────────────────────────────────────
function SetRow({ setNum, set, onChange, onDelete }) {
  const rm = epley(set.weight, set.reps);
  return (
    <tr>
      <td>{setNum}</td>
      <td><input className="set-input" type="number" inputMode="decimal" placeholder="kg" value={set.weight} onChange={(e)=>onChange({...set,weight:e.target.value})}/></td>
      <td><input className="set-input" type="number" inputMode="numeric" placeholder="rep" value={set.reps} onChange={(e)=>onChange({...set,reps:e.target.value})}/></td>
      <td>{rm!==null?<span className="set-rm">{rm}</span>:<span className="set-rm-dash">—</span>}</td>
      <td><button className="set-del" onClick={onDelete}>🗑</button></td>
    </tr>
  );
}

function ExerciseBlock({ exercise, sets, onSetsChange, onDelete, isCustom }) {
  const [open, setOpen] = useState(true);
  const addSet = () => {
    const last = sets[sets.length-1];
    onSetsChange([...sets,{id:uid(),weight:last?.weight||"",reps:last?.reps||""}]);
  };
  return (
    <div className="ex-block">
      <div className="ex-block-header">
        <span className="ex-block-title">{exercise}</span>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          {isCustom && (
            <button className="ex-block-del" onClick={onDelete} title="この種目を削除">✕</button>
          )}
          <button className="ex-block-toggle" onClick={()=>setOpen(o=>!o)}>{open?"▲":"▼"}</button>
        </div>
      </div>
      {open && (
        <>
          <table className="set-table">
            <thead><tr><th>SET</th><th>重量</th><th>回数</th><th>1RM</th><th></th></tr></thead>
            <tbody>
              {sets.map((set,i)=>(
                <SetRow key={set.id} setNum={i+1} set={set}
                  onChange={(u)=>{const n=[...sets];n[i]=u;onSetsChange(n);}}
                  onDelete={()=>onSetsChange(sets.filter((_,j)=>j!==i))}
                />
              ))}
            </tbody>
          </table>
          <button className="btn-add-set" onClick={addSet}>＋</button>
        </>
      )}
    </div>
  );
}

function RecordPage({ records, setRecords, exercises, setExercises, goals, activePart, onCelebrate }) {
  const part = activePart==="ALL" ? "胸" : activePart;
  const [date, setDate] = useState(todayStr());
  const [toast, setToast] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [newExName, setNewExName] = useState("");

  const exList = exercises[part] || DEFAULT_EXERCISES[part] || [];

  const initSets = (list) => {
    const obj={};
    list.forEach((ex)=>{obj[ex]=[{id:uid(),weight:"",reps:""}];});
    return obj;
  };
  const [exSets, setExSets] = useState(()=>initSets(exList));
  useEffect(()=>{ setExSets(initSets(exercises[part]||DEFAULT_EXERCISES[part]||[])); },[part]);

  const updateSets=(ex,sets)=>setExSets(prev=>({...prev,[ex]:sets}));

  // 種目追加
  const handleAddExercise = () => {
    const name = newExName.trim();
    if (!name) return;
    const current = exercises[part] || [...(DEFAULT_EXERCISES[part]||[])];
    if (current.includes(name)) { setModalOpen(false); setNewExName(""); return; }
    const updated = {...exercises, [part]:[...current, name]};
    setExercises(updated);
    saveJ(SK_EX, updated);
    setExSets(prev=>({...prev,[name]:[{id:uid(),weight:"",reps:""}]}));
    setModalOpen(false);
    setNewExName("");
  };

  // 種目削除（カスタム種目のみ）
  const handleDelExercise = (ex) => {
    const defaults = DEFAULT_EXERCISES[part]||[];
    if (defaults.includes(ex)) return;
    const current = exercises[part] || [...defaults];
    const updated = {...exercises, [part]:current.filter(e=>e!==ex)};
    setExercises(updated);
    saveJ(SK_EX, updated);
    setExSets(prev=>{const n={...prev};delete n[ex];return n;});
  };

  const handleSave = () => {
    const newSessions=[];
    // 保存前の各種目の既存ベストRM
    const prevBest = {};
    exList.forEach((ex)=>{
      const sets = (records[part]||[]).filter((s)=>s.exercise===ex).flatMap((s)=>s.sets||[]).filter((set)=>set.rm);
      prevBest[ex] = sets.length ? Math.max(...sets.map((s)=>s.rm)) : 0;
    });

    let celebration = null;
    exList.forEach((ex)=>{
      const validSets=(exSets[ex]||[])
        .filter((s)=>s.weight&&s.reps)
        .map((s)=>({id:s.id,weight:parseFloat(s.weight),reps:parseInt(s.reps),rm:epley(s.weight,s.reps)}));
      if(validSets.length>0){
        newSessions.push({id:uid(),date,exercise:ex,sets:validSets});
        // 目標達成チェック：今回のベストが目標以上 かつ 以前は未達だった
        const goal = goals[part]?.[ex];
        if (goal) {
          const newBest = Math.max(...validSets.map((s)=>s.rm||0));
          if (newBest >= goal && prevBest[ex] < goal) {
            const bestSet = validSets.reduce((a,b)=>(b.rm||0)>(a.rm||0)?b:a);
            // 最も大きく達成した種目を採用
            if (!celebration || newBest > celebration.rm) {
              celebration = { exercise: ex, rm: newBest, goal, weight: bestSet.weight, reps: bestSet.reps };
            }
          }
        }
      }
    });
    if(!newSessions.length) return;
    const updated={...records,[part]:[...newSessions,...(records[part]||[])]};
    setRecords(updated);
    saveJ(SK_REC, updated);
    setExSets(initSets(exList));
    if (celebration) {
      onCelebrate(celebration);
    } else {
      setToast(true);
      setTimeout(()=>setToast(false),2000);
    }
  };

  const partRecs = records[part]||[];
  const byDate={};
  partRecs.forEach((s)=>{if(!byDate[s.date])byDate[s.date]=[];byDate[s.date].push(s);});
  const sortedDates=Object.keys(byDate).sort((a,b)=>b.localeCompare(a));

  const handleDelSession=(sessionId)=>{
    const updated={...records,[part]:(records[part]||[]).filter((s)=>s.id!==sessionId)};
    setRecords(updated);
    saveJ(SK_REC, updated);
  };

  const defaults = DEFAULT_EXERCISES[part]||[];

  return (
    <div className="content">
      <div className="date-row">
        <div className="date-label">📅 記録日</div>
        <input className="date-input" type="date" value={date} onChange={(e)=>setDate(e.target.value)}/>
      </div>

      {exList.map((ex)=>(
        <ExerciseBlock key={ex} exercise={ex}
          sets={exSets[ex]||[{id:uid(),weight:"",reps:""}]}
          onSetsChange={(s)=>updateSets(ex,s)}
          isCustom={!defaults.includes(ex)}
          onDelete={()=>handleDelExercise(ex)}
        />
      ))}

      {/* 種目追加ボタン */}
      <button
        style={{width:"100%",padding:"12px",background:"var(--sur2)",border:"1px dashed var(--border)",borderRadius:"var(--r)",color:"var(--muted)",fontSize:"13px",fontWeight:700,cursor:"pointer",marginBottom:12,fontFamily:"inherit"}}
        onClick={()=>setModalOpen(true)}
      >＋ 種目を追加</button>

      <button className="btn-save" onClick={handleSave}>保存する</button>

      {/* 履歴 */}
      <div style={{marginTop:20}}>
        <div className="sec-label">🕐 履歴 — {part}</div>
        {sortedDates.length===0
          ? <div className="empty-state">まだ記録がない。<br/>最初の一発を刻め。</div>
          : sortedDates.map((d)=>{
            const sessions=byDate[d];
            const totalSets=sessions.reduce((s,sess)=>s+(sess.sets||[]).length,0);
            return (
              <div key={d} className="hist-day">
                <div className="hist-day-header">
                  <div className="hist-day-date">{d}</div>
                  <div className="hist-day-meta">{sessions.length}種目 / {totalSets}set</div>
                </div>
                {sessions.map((sess)=>(
                  <div key={sess.id} className="hist-ex">
                    <div className="hist-ex-name">
                      <span>{sess.exercise}</span>
                      <button style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:12}} onClick={()=>handleDelSession(sess.id)}>削除</button>
                    </div>
                    {(sess.sets||[]).map((set,i)=>(
                      <div key={set.id} className="hist-set-row">
                        <span className="hist-set-num">{i+1}</span>
                        <span>{set.weight}kg × {set.reps}rep</span>
                        {set.rm&&<span className="hist-set-rm">{set.rm}kg</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })
        }
      </div>

      {/* 種目追加モーダル */}
      {modalOpen && (
        <div className="modal-overlay" onClick={()=>setModalOpen(false)}>
          <div className="modal-sheet" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-title">種目を追加 — {part}</div>
            <input
              className="modal-input" placeholder="例: チェストフライ"
              value={newExName} onChange={(e)=>setNewExName(e.target.value)}
              onKeyDown={(e)=>{if(e.key==="Enter")handleAddExercise();}}
              autoFocus
            />
            <div className="modal-btns">
              <button className="modal-btn-cancel" onClick={()=>setModalOpen(false)}>キャンセル</button>
              <button className="modal-btn-ok" onClick={handleAddExercise}>追加する</button>
            </div>
          </div>
        </div>
      )}

      <div className={`toast ${toast?"show":""}`}>✅ 記録した！</div>
    </div>
  );
}

// ─────────────────────────────────────────────
// BODY PAGE
// ─────────────────────────────────────────────
function BodyPage({ bodyData, setBodyData }) {
  const [date, setDate] = useState(todayStr());
  const [weight, setWeight] = useState("");
  const [fat, setFat] = useState("");
  const [muscle, setMuscle] = useState("");
  const [memo, setMemo] = useState("");
  const [toast, setToast] = useState(false);
  const [graphMetric, setGraphMetric] = useState("weight");

  const latest = bodyData[0] || null;

  // BMI・体脂肪量・除脂肪体重は最新データから計算
  const bmi = latest?.weight && latest.weight > 0 ? (latest.weight / (1.72 * 1.72)).toFixed(1) : null;
  const fatMass = latest?.weight && latest?.fat ? (latest.weight * latest.fat / 100).toFixed(1) : null;
  const leanMass = fatMass ? (latest.weight - parseFloat(fatMass)).toFixed(1) : null;

  const handleSave = () => {
    if (!weight) return;
    const rec = {
      id: uid(), date,
      weight: parseFloat(weight)||null,
      fat: parseFloat(fat)||null,
      muscle: parseFloat(muscle)||null,
      memo,
    };
    const updated = [rec, ...bodyData.filter((r)=>r.date!==date)].sort((a,b)=>b.date.localeCompare(a.date));
    setBodyData(updated);
    saveJ(SK_BODY, updated);
    setWeight(""); setFat(""); setMuscle(""); setMemo("");
    setToast(true);
    setTimeout(()=>setToast(false),2000);
  };

  const handleDel = (id) => {
    const updated = bodyData.filter((r)=>r.id!==id);
    setBodyData(updated);
    saveJ(SK_BODY, updated);
  };

  const graphData = [...bodyData]
    .sort((a,b)=>a.date.localeCompare(b.date))
    .map((r)=>({date:r.date.slice(5), weight:r.weight, fat:r.fat, muscle:r.muscle}))
    .filter((r)=>r[graphMetric]);

  const metricLabel = {weight:"体重(kg)",fat:"体脂肪率(%)",muscle:"筋肉量(kg)"};
  const metricColor = {weight:"#60a5fa",fat:"#f5d020",muscle:"#4ade80"};

  return (
    <div className="content">
      {/* 最新サマリー */}
      {latest && (
        <div className="body-stats" style={{marginBottom:14}}>
          <div className="body-stat">
            <div className="body-stat-val" style={{color:"var(--blue)"}}>{latest.weight??"—"}</div>
            <div className="body-stat-unit">kg</div>
            <div className="body-stat-label">体重</div>
          </div>
          <div className="body-stat">
            <div className="body-stat-val" style={{color:"var(--yellow)"}}>{latest.fat??"—"}</div>
            <div className="body-stat-unit">%</div>
            <div className="body-stat-label">体脂肪率</div>
          </div>
          <div className="body-stat">
            <div className="body-stat-val" style={{color:"var(--green)"}}>{latest.muscle??"—"}</div>
            <div className="body-stat-unit">kg</div>
            <div className="body-stat-label">筋肉量</div>
          </div>
          <div className="body-stat">
            <div className="body-stat-val" style={{color:"var(--muted)",fontSize:18}}>{bmi??"—"}</div>
            <div className="body-stat-unit"> </div>
            <div className="body-stat-label">BMI</div>
          </div>
        </div>
      )}

      {/* 入力フォーム */}
      <div className="body-form">
        <div className="body-form-title">📋 体組成を記録</div>
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11,color:"var(--muted)",fontWeight:700,marginBottom:5}}>記録日</div>
          <input className="date-input" type="date" value={date} onChange={(e)=>setDate(e.target.value)} style={{width:"100%"}}/>
        </div>
        <div className="body-fields">
          <div className="body-field">
            <label>体重 (kg)</label>
            <input className="body-input" type="number" inputMode="decimal" placeholder="70.0" value={weight} onChange={(e)=>setWeight(e.target.value)}/>
          </div>
          <div className="body-field">
            <label>体脂肪率 (%)</label>
            <input className="body-input" type="number" inputMode="decimal" placeholder="15.0" value={fat} onChange={(e)=>setFat(e.target.value)}/>
          </div>
          <div className="body-field">
            <label>筋肉量 (kg)</label>
            <input className="body-input" type="number" inputMode="decimal" placeholder="55.0" value={muscle} onChange={(e)=>setMuscle(e.target.value)}/>
          </div>
          <div className="body-field">
            <label>メモ</label>
            <input className="body-input" placeholder="体調など" value={memo} onChange={(e)=>setMemo(e.target.value)} style={{fontSize:13}}/>
          </div>
        </div>
        <button className="btn-body-save" onClick={handleSave} disabled={!weight}>保存する</button>
      </div>

      {/* グラフ */}
      {graphData.length > 1 && (
        <div className="graph-card">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div className="graph-card-title" style={{margin:0}}>📈 推移</div>
            <select className="fselect" style={{width:"auto",padding:"6px 10px",fontSize:12}}
              value={graphMetric} onChange={(e)=>setGraphMetric(e.target.value)}>
              <option value="weight">体重</option>
              <option value="fat">体脂肪率</option>
              <option value="muscle">筋肉量</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={graphData} margin={{top:4,right:8,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c2c3e"/>
              <XAxis dataKey="date" tick={{fontSize:10,fill:"#666680"}}/>
              <YAxis tick={{fontSize:10,fill:"#666680"}} domain={["auto","auto"]}/>
              <Tooltip contentStyle={{background:"#1e1e2a",border:"1px solid #2c2c3e",borderRadius:8,fontSize:12}}
                formatter={(v)=>[`${v}`, metricLabel[graphMetric]]}/>
              <Line type="monotone" dataKey={graphMetric} stroke={metricColor[graphMetric]} strokeWidth={2.5} dot={{fill:metricColor[graphMetric],r:4}} activeDot={{r:6}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 履歴 */}
      <div className="sec-label">🕐 記録履歴</div>
      {bodyData.length===0
        ? <div className="empty-state">まだ記録がない。<br/>体組成を刻み始めろ。</div>
        : bodyData.map((r)=>(
          <div key={r.id} className="body-hist-item">
            <div className="body-hist-date">{r.date}</div>
            <div className="body-hist-vals">
              {r.weight && <div className="body-hist-chip">体重 <span>{r.weight}kg</span></div>}
              {r.fat    && <div className="body-hist-chip">体脂肪 <span>{r.fat}%</span></div>}
              {r.muscle && <div className="body-hist-chip">筋肉量 <span>{r.muscle}kg</span></div>}
              {r.memo   && <div className="body-hist-chip" style={{color:"var(--muted)",fontStyle:"italic"}}>{r.memo}</div>}
            </div>
            <button className="body-hist-del" onClick={()=>handleDel(r.id)}>✕</button>
          </div>
        ))
      }
      <div className={`toast ${toast?"show":""}`}>✅ 記録した！</div>
    </div>
  );
}

// ─────────────────────────────────────────────
// GRAPH PAGE
// ─────────────────────────────────────────────
function GraphPage({ records, exercises, activePart }) {
  const part = activePart==="ALL" ? "胸" : activePart;
  const exList = exercises[part] || DEFAULT_EXERCISES[part] || [];
  const [exercise, setExercise] = useState(exList[0]||"");
  useEffect(()=>{
    const list = exercises[part]||DEFAULT_EXERCISES[part]||[];
    setExercise(list[0]||"");
  },[part,exercises]);

  const data=(records[part]||[])
    .filter((s)=>s.exercise===exercise)
    .sort((a,b)=>a.date.localeCompare(b.date))
    .map((s)=>{
      const bestSet=(s.sets||[]).filter((set)=>set.rm).sort((a,b)=>b.rm-a.rm)[0];
      return bestSet?{date:s.date.slice(5),rm:bestSet.rm,weight:bestSet.weight,reps:bestSet.reps}:null;
    }).filter(Boolean);

  const best=data.reduce((a,b)=>b.rm>a.rm?b:a,{rm:0});

  return (
    <div className="content">
      <div style={{marginBottom:14}}>
        <select className="fselect" value={exercise} onChange={(e)=>setExercise(e.target.value)}>
          {exList.map((ex)=><option key={ex} value={ex}>{ex}</option>)}
        </select>
      </div>
      {data.length===0
        ? <div className="graph-card"><div className="graph-empty">記録がないとグラフは描けない。<br/>まず記録タブで刻め。</div></div>
        : <>
          <div className="graph-card">
            <div className="graph-card-title">📈 推定1RM推移 — {exercise}</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data} margin={{top:4,right:8,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2c2c3e"/>
                <XAxis dataKey="date" tick={{fontSize:10,fill:"#666680"}}/>
                <YAxis tick={{fontSize:10,fill:"#666680"}} domain={["auto","auto"]}/>
                <Tooltip contentStyle={{background:"#1e1e2a",border:"1px solid #2c2c3e",borderRadius:8,fontSize:12}}
                  formatter={(v)=>[`${v} kg`,"推定1RM"]}/>
                <Line type="monotone" dataKey="rm" stroke="#f5d020" strokeWidth={2.5} dot={{fill:"#f5d020",r:4}} activeDot={{r:6}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="stats-row">
            <div className="stat-card"><div className="stat-val" style={{color:"var(--yellow)"}}>{best.rm}</div><div className="stat-unit">kg</div><div className="stat-label">最高1RM</div></div>
            <div className="stat-card"><div className="stat-val">{data[data.length-1]?.rm??"—"}</div><div className="stat-unit">kg</div><div className="stat-label">直近1RM</div></div>
            <div className="stat-card"><div className="stat-val">{data.length}</div><div className="stat-unit">回</div><div className="stat-label">記録回数</div></div>
          </div>
        </>
      }
    </div>
  );
}

// ─────────────────────────────────────────────
// データをAI採点用テキストに変換（期間指定対応）
// fromDate / toDate は "YYYY-MM-DD"（両端含む）。null なら制限なし
// ─────────────────────────────────────────────
function buildExportText(records, goals, bodyData, fromDate, toDate, rangeLabel) {
  const inRange = (d) => {
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  };

  const lines = [];
  lines.push("=== LIFT LOG トレーニングデータ ===");
  lines.push(`対象期間: ${rangeLabel}`);
  lines.push(`書き出し日: ${todayStr()}`);
  lines.push("");

  let totalSets = 0;
  let trainingDates = new Set();

  Object.keys(DEFAULT_EXERCISES).forEach((part) => {
    const sessions = (records[part] || []).filter((s) => inRange(s.date));
    if (!sessions.length) return;

    lines.push(`【${part}】`);
    const exMap = {};
    sessions.forEach((s) => {
      if (!exMap[s.exercise]) exMap[s.exercise] = [];
      exMap[s.exercise].push(s);
      trainingDates.add(s.date);
    });

    Object.keys(exMap).forEach((ex) => {
      // この期間の全セットを日付順で出す（今日の評価ならその日のセットが全部見える）
      const exSessions = [...exMap[ex]].sort((a, b) => b.date.localeCompare(a.date));
      // 種目の最高1RM（期間内）
      const allSets = exSessions.flatMap((s) => (s.sets || []).map((set) => ({ ...set, date: s.date })));
      const withRM = allSets.filter((s) => s.rm);
      const best = withRM.length ? [...withRM].sort((a, b) => b.rm - a.rm)[0] : null;
      const goal = goals[part]?.[ex];

      let header = `  ■ ${ex}`;
      if (best) header += ` — 期間内ベスト1RM ${best.rm}kg`;
      if (goal) header += `（目標 ${goal}kg）`;
      lines.push(header);

      // 各セッションのセット内訳
      exSessions.forEach((s) => {
        const sets = s.sets || [];
        totalSets += sets.length;
        const setStr = sets.map((set, i) => `${set.weight}kg×${set.reps}(1RM${set.rm ?? "-"})`).join(", ");
        lines.push(`     ${s.date}: ${setStr}`);
      });
    });
    lines.push("");
  });

  // 体組成（期間内）
  const bodyInRange = bodyData.filter((r) => inRange(r.date));
  if (bodyInRange.length) {
    lines.push("【体組成】");
    bodyInRange.forEach((r) => {
      const parts = [];
      if (r.weight) parts.push(`体重${r.weight}kg`);
      if (r.fat) parts.push(`体脂肪${r.fat}%`);
      if (r.muscle) parts.push(`筋肉量${r.muscle}kg`);
      lines.push(`  ${r.date}: ${parts.join(" / ")}${r.memo ? ` (${r.memo})` : ""}`);
    });
    lines.push("");
  }

  // サマリー
  lines.push("【サマリー】");
  lines.push(`  トレ日数: ${trainingDates.size}日 / 総セット数: ${totalSets}セット`);
  lines.push("");

  lines.push("=== ここまで ===");
  lines.push("このデータを見て、トレーニングの評価とアドバイスをください。");
  return lines.join("\n");
}

// 期間プリセットから from/to を計算
function calcRange(preset) {
  const today = new Date();
  const toStr = (d) => d.toISOString().slice(0, 10);
  if (preset === "today") {
    const t = toStr(today);
    return { from: t, to: t, label: `今日（${t}）` };
  }
  if (preset === "7d") {
    const d = new Date(today); d.setDate(d.getDate() - 6);
    return { from: toStr(d), to: toStr(today), label: `直近7日間（${toStr(d)}〜${toStr(today)}）` };
  }
  if (preset === "30d") {
    const d = new Date(today); d.setDate(d.getDate() - 29);
    return { from: toStr(d), to: toStr(today), label: `直近30日間（${toStr(d)}〜${toStr(today)}）` };
  }
  return { from: null, to: null, label: "全期間" };
}

function SettingsPage({ records, goals, bodyData }) {
  const [copied, setCopied] = useState(false);
  const [showText, setShowText] = useState(false);
  const [preset, setPreset] = useState("today");   // today / 7d / 30d / all / custom
  const [customFrom, setCustomFrom] = useState(todayStr());
  const [customTo, setCustomTo] = useState(todayStr());

  // 現在の期間を決定
  let range;
  if (preset === "custom") {
    range = { from: customFrom, to: customTo, label: `${customFrom}〜${customTo}` };
  } else {
    range = calcRange(preset);
  }

  const text = buildExportText(records, goals, bodyData, range.from, range.to, range.label);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShowText(true);
    }
  };

  const hasData = Object.values(records).some((arr) => (arr || []).length > 0) || bodyData.length > 0;

  const presetBtns = [
    { key: "today", label: "今日" },
    { key: "7d", label: "直近7日" },
    { key: "30d", label: "直近30日" },
    { key: "all", label: "全期間" },
    { key: "custom", label: "日付指定" },
  ];

  return (
    <div className="content">
      <div className="sec-label">🤖 AI採点・アドバイス</div>
      <div className="form-card">
        <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text)", marginBottom: 14 }}>
          期間を選んでデータを書き出し、AIに貼り付けると<br />
          その期間の評価やアドバイスがもらえる。
        </div>

        {!hasData ? (
          <div className="empty-state" style={{ padding: "20px 0" }}>
            まだ記録がない。<br />記録を刻んでから書き出せ。
          </div>
        ) : (
          <>
            {/* 期間プリセット */}
            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, marginBottom: 6 }}>期間を選ぶ</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {presetBtns.map((b) => (
                <button
                  key={b.key}
                  onClick={() => setPreset(b.key)}
                  style={{
                    padding: "7px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                    fontFamily: "inherit", cursor: "pointer",
                    border: preset === b.key ? "1px solid var(--red)" : "1px solid var(--border)",
                    background: preset === b.key ? "var(--red)" : "var(--sur2)",
                    color: preset === b.key ? "#fff" : "var(--muted)",
                  }}
                >{b.label}</button>
              ))}
            </div>

            {/* カスタム日付 */}
            {preset === "custom" && (
              <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
                <input className="date-input" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={{ flex: 1 }} />
                <span style={{ color: "var(--muted)", fontSize: 12 }}>〜</span>
                <input className="date-input" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={{ flex: 1 }} />
              </div>
            )}

            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12 }}>
              対象: {range.label}
            </div>

            <button className="btn-save" onClick={handleCopy} style={{ marginTop: 0 }}>
              {copied ? "✅ コピーした！" : "📋 この期間のデータをコピー"}
            </button>
            <button
              className="goal-set-btn"
              style={{ marginTop: 10, padding: "10px" }}
              onClick={() => setShowText((s) => !s)}
            >
              {showText ? "テキストを隠す" : "書き出し内容を確認する"}
            </button>

            {showText && (
              <textarea
                readOnly
                value={text}
                onClick={(e) => e.target.select()}
                style={{
                  width: "100%", height: 240, marginTop: 12,
                  background: "var(--bg)", border: "1px solid var(--border)",
                  borderRadius: 8, color: "var(--text)", fontSize: 11,
                  padding: 12, fontFamily: "monospace", lineHeight: 1.5, resize: "vertical",
                }}
              />
            )}
          </>
        )}
      </div>

      <div className="form-card">
        <div className="sec-label" style={{marginBottom:10}}>使い方</div>
        <div style={{ fontSize: 12, lineHeight: 1.8, color: "var(--muted)" }}>
          ① 期間を選ぶ（今日のトレ評価なら「今日」）<br />
          ② 「この期間のデータをコピー」を押す<br />
          ③ Claudeアプリを開いて貼り付け<br />
          ④ 「採点して」と送る
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────
export default function App() {
  const [tab, setTab]           = useState("home");
  const [activePart, setActivePart] = useState("ALL");
  const [records, setRecords]   = useState(()=>loadJ(SK_REC,{}));
  const [exercises, setExercises] = useState(()=>{
    const stored = loadJ(SK_EX,{});
    // デフォルト種目をマージ
    const merged={};
    Object.keys(DEFAULT_EXERCISES).forEach((p)=>{
      const def=DEFAULT_EXERCISES[p];
      const custom=(stored[p]||[]).filter((e)=>!def.includes(e));
      merged[p]=[...def,...custom];
    });
    return merged;
  });
  const [bodyData, setBodyData] = useState(()=>loadJ(SK_BODY,[]));
  const [goals, setGoals] = useState(()=>loadJ(SK_GOAL,{}));
  const [celebration, setCelebration] = useState(null);

  const today=new Date();
  const dateLabel=`${today.getFullYear()}/${today.getMonth()+1}/${today.getDate()}`;

  const showPartTabs = tab==="home"||tab==="record"||tab==="graph";

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <div className="topbar">
          <div>
            <div className="topbar-logo">LIFT LOG</div>
            <div className="topbar-sub">種目別最高RMトラッカー</div>
          </div>
          <div className="topbar-date">{dateLabel}</div>
        </div>

        {showPartTabs && (
          <div className="ptabs-wrap">
            <div className="ptabs">
              {PARTS.map((p)=>(
                <button key={p} className={`ptab ${activePart===p?"active":""}`} onClick={()=>setActivePart(p)}>{p}</button>
              ))}
            </div>
          </div>
        )}

        {tab==="home"   && <HomePage   records={records} exercises={exercises} goals={goals} setGoals={setGoals} activePart={activePart}/>}
        {tab==="record" && <RecordPage records={records} setRecords={setRecords} exercises={exercises} setExercises={setExercises} goals={goals} activePart={activePart} onCelebrate={setCelebration}/>}
        {tab==="graph"  && <GraphPage  records={records} exercises={exercises} activePart={activePart}/>}
        {tab==="body"   && <BodyPage   bodyData={bodyData} setBodyData={setBodyData}/>}
        {tab==="ai"     && <SettingsPage records={records} goals={goals} bodyData={bodyData}/>}

        <Celebration data={celebration} onClose={()=>setCelebration(null)} />

        <div className="bottomnav">
          <button className={`bn-btn ${tab==="home"?"active":""}`}   onClick={()=>setTab("home")}>  <span className="bn-icon">🏠</span>ホーム</button>
          <button className={`bn-btn ${tab==="record"?"active":""}`} onClick={()=>setTab("record")}><span className="bn-icon">📝</span>記録</button>
          <button className={`bn-btn ${tab==="graph"?"active":""}`}  onClick={()=>setTab("graph")}> <span className="bn-icon">📈</span>グラフ</button>
          <button className={`bn-btn ${tab==="body"?"active":""}`}   onClick={()=>setTab("body")}>  <span className="bn-icon">⚖️</span>体組成</button>
          <button className={`bn-btn ${tab==="ai"?"active":""}`}     onClick={()=>setTab("ai")}>    <span className="bn-icon">🤖</span>AI採点</button>
        </div>
      </div>
    </>
  );
}

