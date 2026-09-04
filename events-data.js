/* =========================================================
   PHX EU168 — SHARED EVENT SCHEDULE
   Single source of truth for index.html, events-calendar.html, events-calendar-gantt.html,
   alb-participation.html and f2p-task-guide.html.
   Times are as displayed on the source tracker (Europe/London, BST/UTC+1).
   occ.kind: 'ranges' (begin+end markers), 'dates' (discrete days), 'weekly' (recurring)
   Update this file each arc — both pages pick up the change automatically.
   ========================================================= */

const CATS = {

  HOSTILES:  {label:'Hostiles / Kill Events', color:'#FF6B6B'},
  ARMADAS:   {label:'Armadas',                color:'#B98CE0'},
  RECRUIT:   {label:'Officer Recruit',        color:'#5FB4E5'},
  WAVES:     {label:'Wave Defense',           color:'#6EE7B7'},
  META:      {label:'Meta / IDIQ',            color:'#FFB454'},
  MISSION:   {label:'Mission Progress',       color:'#F5D97A'},
  PASS:      {label:'Passes / Flashpass',     color:'#9AA5B1'},
  ANOMALY:   {label:'Galactic Anomaly',       color:'#7FDBFF'},
  TERRITORY: {label:'Territory Capture',     color:'#8CE071'},
  FEDDAY:    {label:'Federation Day',         color:'#FF8FE3'},
  VATV:      {label:'Voyage Across the Void', color:'#4FD1C5'},
  OUTPOST:   {label:'Outpost Hold',           color:'#F2A93B'},
  TOURNAMENT:{label:'Alliance Tournament',     color:'#FFD166'}
};

/* =========================================================
   EVENT DATA — Arc: M93 Cause & Effect (2026-08-20 to 2026-09-16)
   Times are as displayed on the source tracker (Europe/London, BST/UTC+1).
   occ.kind: 'ranges' (begin+end markers), 'dates' (discrete days), 'weekly' (recurring)
   This data is baked into the page directly and updated each arc — no in-browser editing.
   ========================================================= */
const EVENTS = [

  // --- Meta chain ---
  {name:'Cause and Effect Part 1 Meta', variant:'SMS', category:'META', heroic:false, opsMin:20, opsMax:80, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-08-20',end:'2026-08-25'},{start:'2026-08-26',end:'2026-09-01'},{start:'2026-09-02',end:'2026-09-08'},{start:'2026-09-09',end:'2026-09-15'}]},
    note:'Complete Cause and Effect sub-events.'},
  {name:"Trelane's Tribulations Meta", variant:'SMS', category:'META', heroic:false, opsMin:61, opsMax:80, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-08-20',end:'2026-08-26'},{start:'2026-08-27',end:'2026-09-02'},{start:'2026-09-03',end:'2026-09-09'},{start:'2026-09-10',end:'2026-09-16'}]},
    note:"Complete daily Trelane's Tribulations events."},

  // --- One-off Heroic progress unlocks (Aug 20-26) ---
  {name:"Trelane's Treasures (Heroic)", variant:'SMS', category:'MISSION', heroic:true, opsMin:51, opsMax:80, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-08-20', end:'2026-08-26'}]}, note:'Score by unlocking Epic Cause and Effect Artifacts.'},
  {name:'The Bridge is Yours (Heroic)', variant:'SMS', category:'MISSION', heroic:true, opsMin:51, opsMax:80, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-08-20', end:'2026-08-26'}]}, note:'Score by unlocking Rare Cause and Effect Artifacts.'},
  {name:'Time Fractured Studies (Heroic)', variant:'SMS', category:'MISSION', heroic:true, opsMin:61, opsMax:80, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-08-20', end:'2026-08-26'}]}, note:'Score by unlocking and leveling up new Cause and Effect Prime Research.'},

  // --- Cause and Effect: dated hostile sub-events ---
  {name:'Cause and Effect: Corruption', variant:'SMS', category:'HOSTILES', heroic:false, opsMin:20, opsMax:60, time:{h:17,m:0},
    occ:{kind:'dates', dates:['2026-08-23','2026-08-30','2026-09-06','2026-09-13']}, note:'Destroy hostiles or Mirror Universe hostiles.'},
  {name:'Cause and Effect: Ruin', variant:'SMS', category:'HOSTILES', heroic:false, opsMin:20, opsMax:60, time:{h:17,m:0},
    occ:{kind:'dates', dates:['2026-08-24','2026-08-31','2026-09-07','2026-09-14']}, note:'Defeat hostiles, Xindi Aquatic and Reptilian hostiles.'},
  {name:'Cause and Effect: Impersonation', variant:'SMS', category:'HOSTILES', heroic:false, opsMin:61, opsMax:80, time:{h:17,m:0},
    occ:{kind:'dates', dates:['2026-08-24','2026-08-31','2026-09-07','2026-09-14']}, note:"Destroy V'ger hostiles."},
  {name:'Cause and Effect: Separation', variant:'SMS', category:'HOSTILES', heroic:false, opsMin:20, opsMax:39, time:{h:17,m:0},
    occ:{kind:'dates', dates:['2026-08-26','2026-09-02','2026-09-09','2026-09-16']}, note:'Destroy Swarm hostiles.'},
  {name:'Cause and Effect: Predators', variant:'SMS', category:'HOSTILES', heroic:false, opsMin:40, opsMax:50, time:{h:17,m:0},
    occ:{kind:'dates', dates:['2026-08-26','2026-09-02','2026-09-09','2026-09-16']}, note:'Destroy Hirogen and Lost hostiles.'},
  {name:'Cause and Effect: Fracture', variant:'SMS', category:'HOSTILES', heroic:false, opsMin:51, opsMax:80, time:{h:17,m:0},
    occ:{kind:'dates', dates:['2026-08-26','2026-09-02','2026-09-09','2026-09-16']}, note:'Destroy Suliban hostiles.'},

  // --- Trelane's Tribulations: dated sub-events ---
  {name:"Trelane's Tribulations: Inquiry", variant:'SMS', category:'HOSTILES', heroic:false, opsMin:61, opsMax:80, time:{h:17,m:0},
    occ:{kind:'dates', dates:['2026-08-20','2026-08-24','2026-08-26','2026-08-27','2026-08-31','2026-09-02','2026-09-03','2026-09-07','2026-09-09','2026-09-10','2026-09-14','2026-09-16']},
    note:'Destroy hostiles in systems with a Galactic Anomaly.'},
  {name:"Trelane's Tribulations: Enlightenment", variant:'SMS', category:'HOSTILES', heroic:false, opsMin:61, opsMax:80, time:{h:17,m:0},
    occ:{kind:'dates', dates:['2026-08-21','2026-08-25','2026-08-28','2026-09-01','2026-09-04','2026-09-08','2026-09-11','2026-09-15']},
    note:'Destroy Academy Drone hostiles in systems with a Galactic Anomaly.'},
  {name:"Trelane's Tribulations: Scrutiny (Heroic)", variant:'SMS', category:'HOSTILES', heroic:true, opsMin:61, opsMax:80, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-08-21',end:'2026-08-22'},{start:'2026-08-28',end:'2026-08-29'},{start:'2026-09-05',end:'2026-09-06'},{start:'2026-09-11',end:'2026-09-12'}]},
    note:'Destroy hostiles in systems with a Galactic Anomaly.'},
  {name:"Trelane's Tribulations: Doubt", variant:'SMS', category:'HOSTILES', heroic:false, opsMin:61, opsMax:80, time:{h:17,m:0},
    occ:{kind:'dates', dates:['2026-08-22','2026-08-29','2026-09-05','2026-09-12']},
    note:'Defeat Federation, Klingon, and Romulan hostiles in a system affected by a Galactic Anomaly.'},
  {name:"Trelane's Tribulations: Synergy", variant:'SMS', category:'WAVES', heroic:false, opsMin:61, opsMax:80, time:{h:17,m:0},
    occ:{kind:'dates', dates:['2026-08-23','2026-08-30','2026-09-06','2026-09-13']},
    note:'Complete Duo Wave Defense waves.'},
  {name:"Trelane's Tribulations: Assault", variant:'SLB', category:'HOSTILES', heroic:false, opsMin:61, opsMax:80, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-08-24',end:'2026-08-25'},{start:'2026-08-31',end:'2026-09-01'},{start:'2026-09-07',end:'2026-09-08'},{start:'2026-09-13',end:'2026-09-14'}]},
    note:'Defeat hostiles in a system affected by a Galactic Anomaly.'},

  // --- Officer recruit heroics ---
  {name:'Five of Eleven Recruit (Heroic)', variant:'SMS', category:'RECRUIT', heroic:true, opsMin:20, opsMax:39, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-08-22',end:'2026-08-23'},{start:'2026-08-29',end:'2026-08-30'},{start:'2026-09-05',end:'2026-09-06'},{start:'2026-09-12',end:'2026-09-13'}]},
    note:'Spend G3 U+ materials to earn epic officer Five of Eleven shards.'},
  {name:'Five of Eleven Recruit (Heroic)', variant:'SLB', category:'RECRUIT', heroic:true, opsMin:20, opsMax:39, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-08-22',end:'2026-08-23'},{start:'2026-08-29',end:'2026-08-30'},{start:'2026-09-05',end:'2026-09-06'},{start:'2026-09-12',end:'2026-09-13'}]},
    note:'Leaderboard — spend G3 U+ materials to earn Five of Eleven shards.'},
  {name:'Sam Kirk Recruit (Heroic)', variant:'SMS', category:'RECRUIT', heroic:true, opsMin:40, opsMax:60, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-08-22',end:'2026-08-23'},{start:'2026-08-29',end:'2026-08-30'},{start:'2026-09-05',end:'2026-09-06'},{start:'2026-09-12',end:'2026-09-13'}]},
    note:'Spend G3 U+ materials to earn epic officer SNW Sam Kirk shards.'},
  {name:'Sam Kirk Recruit (Heroic)', variant:'SLB', category:'RECRUIT', heroic:true, opsMin:40, opsMax:60, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-08-22',end:'2026-08-23'},{start:'2026-08-29',end:'2026-08-30'},{start:'2026-09-05',end:'2026-09-06'},{start:'2026-09-12',end:'2026-09-13'}]},
    note:'Leaderboard — spend G3 U+ materials to earn SNW Sam Kirk shards.'},
  {name:'Trelane Recruit (Heroic)', variant:'SMS', category:'RECRUIT', heroic:true, opsMin:61, opsMax:80, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-08-22',end:'2026-08-23'},{start:'2026-08-29',end:'2026-08-30'},{start:'2026-09-05',end:'2026-09-06'},{start:'2026-09-12',end:'2026-09-13'}]},
    note:'Spend G3 U+ materials to earn epic officer Trelane shards.'},
  {name:'Trelane Recruit (Heroic)', variant:'SLB', category:'RECRUIT', heroic:true, opsMin:61, opsMax:80, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-08-22',end:'2026-08-23'},{start:'2026-08-29',end:'2026-08-30'},{start:'2026-09-05',end:'2026-09-06'},{start:'2026-09-12',end:'2026-09-13'}]},
    note:'Leaderboard — spend G3 U+ materials to earn Trelane shards.'},

  // --- Wave defense ---
  {name:'Duo Wave Defense', variant:'SMS/SLB', category:'WAVES', heroic:true, opsMin:61, opsMax:999, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-08-22',end:'2026-08-24'},{start:'2026-08-28',end:'2026-08-29'},{start:'2026-09-05',end:'2026-09-07'},{start:'2026-09-08',end:'2026-09-09'},{start:'2026-09-12',end:'2026-09-13'}]},
    note:'Defeat waves in Duo Wave Defense.'},

  // --- Passes ---
  {name:'Ferengi Exchange Pass', variant:'', category:'PASS', heroic:false, opsMin:1, opsMax:999, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-08-24', end:'2026-09-05'}]}, note:'Milestones in daily/seasonal Ferengi Exchange events (Ferengi Exchange Pass Points badge).'},
  {name:'Wave Defense Pass', variant:'', category:'PASS', heroic:false, opsMin:1, opsMax:999, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-08-27', end:'2026-09-16'}]}, note:'Milestones in the Operation Bulwark events.'},
  {name:'Syndicate Pass', variant:'', category:'PASS', heroic:false, opsMin:1, opsMax:999, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-08-31', end:'2026-09-06'}]}, note:'Milestones in the Syndicate Pass SMS Events.'},
  {name:'Outpost Pass', variant:'', category:'PASS', heroic:false, opsMin:1, opsMax:999, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-09-10', end:'2026-09-16'}]}, note:'Milestones in the Outpost Pass SMS Events.'},

  // --- Territory capture (weekly recurring, PHX / Server 168 EU, London time — ongoing, not tied to any arc) ---
  {name:'Nujord — Territory Capture', variant:'', category:'TERRITORY', heroic:false, opsMin:1, opsMax:999, time:{h:15,m:0},
    occ:{kind:'weekly', dayOfWeek:5, start:'2026-07-20', end:'2027-12-31'}, note:'PHX conquest window · 1*'},
  {name:'Duportas — Territory Capture', variant:'', category:'TERRITORY', heroic:false, opsMin:1, opsMax:999, time:{h:14,m:0},
    occ:{kind:'weekly', dayOfWeek:6, start:'2026-07-20', end:'2027-12-31'}, note:'PHX conquest window · 2*'},
  {name:'Brellan — Territory Capture', variant:'', category:'TERRITORY', heroic:false, opsMin:1, opsMax:999, time:{h:19,m:0},
    occ:{kind:'weekly', dayOfWeek:0, start:'2026-07-20', end:'2027-12-31'}, note:'PHX conquest window · 3*'},
  {name:'Bimasa — Territory Capture', variant:'', category:'TERRITORY', heroic:false, opsMin:1, opsMax:999, time:{h:17,m:0},
    occ:{kind:'weekly', dayOfWeek:2, start:'2026-07-20', end:'2027-12-31'}, note:'PHX conquest window · 2*'},
  {name:'Qoda — Territory Capture', variant:'', category:'TERRITORY', heroic:false, opsMin:1, opsMax:999, time:{h:20,m:0},
    occ:{kind:'weekly', dayOfWeek:1, start:'2026-07-20', end:'2027-12-31'}, note:'PHX conquest window · 4*'},

  // --- Voyage Across the Void (weekly recurring meta, no end date — runs every arc) ---
  {name:'Voyage Across the Void', variant:'Into the Unknown', category:'VATV', heroic:false, opsMin:1, opsMax:999, time:{h:17,m:0},
    occ:{kind:'weekly', dayOfWeek:1, start:'2026-07-20', end:'2027-12-31'},
    note:'SMS: Complete Away Team Assignments, or defeat Federation, Klingon, and Romulan hostiles. ALB/SLB: Complete Priority One Away Team Assignments.'},
  {name:'Voyage Across the Void', variant:'Perimeter Breach', category:'VATV', heroic:false, opsMin:1, opsMax:999, time:{h:17,m:0},
    occ:{kind:'weekly', dayOfWeek:2, start:'2026-07-20', end:'2027-12-31'},
    note:'SMS: Clear Solo, Elite Solo, and Duo Wave Defense waves, or defeat Federation, Klingon, and Romulan hostiles. ALB/SLB: Clear Solo, Elite Solo, and Duo Wave Defense waves.'},
  {name:'Voyage Across the Void', variant:'Singular Strike', category:'VATV', heroic:false, opsMin:1, opsMax:999, time:{h:17,m:0},
    occ:{kind:'weekly', dayOfWeek:3, start:'2026-07-20', end:'2027-12-31'},
    note:'SMS: Defeat Invading Entities and Solo Armadas, or defeat Federation, Klingon, and Romulan hostiles. ALB/SLB: Defeat Invading Entities and Solo Armadas.'},
  {name:'Voyage Across the Void', variant:'United Offensive', category:'VATV', heroic:false, opsMin:1, opsMax:999, time:{h:17,m:0},
    occ:{kind:'weekly', dayOfWeek:4, start:'2026-07-20', end:'2027-12-31'},
    note:'SMS: Defeat group Armadas, or defeat Federation, Klingon, and Romulan hostiles. ALB/SLB: Defeat group Armadas.'},
  {name:'Voyage Across the Void', variant:'Command Mobilization', category:'VATV', heroic:false, opsMin:1, opsMax:999, time:{h:17,m:0},
    occ:{kind:'weekly', dayOfWeek:5, start:'2026-07-20', end:'2027-12-31'},
    note:'Gain Power via Research, Defense Platforms, Buildings and Drydocks, or spend Ship XP / Officer Intel — scoring is the same across SMS, SLB, and ALB.'},
  {name:'Voyage Across the Void', variant:'Subspace Surge', category:'VATV', heroic:false, opsMin:1, opsMax:999, time:{h:17,m:0},
    occ:{kind:'weekly', dayOfWeek:6, start:'2026-07-20', end:'2027-12-31'},
    note:'SMS: Defeat Solo Armadas or clear Wave Defense waves, or defeat Federation, Klingon, and Romulan hostiles. ALB/SLB: Defeat Solo Armadas or clear Wave Defense waves.'},
  {name:'Voyage Across the Void', variant:'Echoes of War', category:'VATV', heroic:false, opsMin:1, opsMax:999, time:{h:17,m:0},
    occ:{kind:'weekly', dayOfWeek:0, start:'2026-07-20', end:'2027-12-31'},
    note:'Defeat Armadas, complete research, or upgrade buildings, or defeat Federation, Klingon, and Romulan hostiles — scoring is the same across SMS, SLB, and ALB.'}
];

/* =========================================================
   TIME MATH — baseline assumed UTC+1, shift by (offset-1) hours
   Shared by events-calendar.html / events-calendar-gantt.html (range display) and index.html (ticker)
   ========================================================= */
function shiftOccurrence(dateISO, h, m, offsetHours){
  const [y,mo,d] = dateISO.split('-').map(Number);
  const baseUTC = Date.UTC(y, mo-1, d, h-1, m); // convert BST -> UTC
  const shifted = new Date(baseUTC + offsetHours*3600*1000);
  return {
    dateISO: shifted.getUTCFullYear()+'-'+String(shifted.getUTCMonth()+1).padStart(2,'0')+'-'+String(shifted.getUTCDate()).padStart(2,'0'),
    h: shifted.getUTCHours(), m: shifted.getUTCMinutes()
  };
}
function fmtTime(h,m){
  const ap = h>=12?'PM':'AM';
  let hh = h%12; if(hh===0) hh=12;
  return hh+':'+String(m).padStart(2,'0')+' '+ap;
}
function addDays(dateISO, n){
  const [y,mo,d] = dateISO.split('-').map(Number);
  const dt = new Date(Date.UTC(y,mo-1,d));
  dt.setUTCDate(dt.getUTCDate()+n);
  return dt.getUTCFullYear()+'-'+String(dt.getUTCMonth()+1).padStart(2,'0')+'-'+String(dt.getUTCDate()).padStart(2,'0');
}
function dateRangeList(startISO, endISO){
  const out=[]; let cur=startISO; let guard=0;
  while(cur<=endISO && guard<400){ out.push(cur); cur=addDays(cur,1); guard++; }
  return out;
}
function dowOf(dateISO){
  const [y,mo,d]=dateISO.split('-').map(Number);
  return new Date(Date.UTC(y,mo-1,d)).getUTCDay();
}

/* =========================================================
   NEXT OCCURRENCE — returns the soonest future UTC Date + label
   for a single event, or null if it has none left. Always
   resolved in the source zone (UTC+1 / London), i.e. offsetHours=1,
   so callers get a real, timezone-correct instant to diff against
   the visitor's own clock (new Date()).
   ========================================================= */
function nextOccurrenceUTC(ev, fromDate){
  fromDate = fromDate || new Date();
  let best = null; // {utcDate, label}
  const consider = (dateISO, label) => {
    // offsetHours=0: converts the source BST(UTC+1) wall-clock time straight to
    // a true UTC instant, so the result can be diffed against a real `new Date()`.
    const shifted = shiftOccurrence(dateISO, ev.time.h, ev.time.m, 0);
    const utcDate = new Date(Date.UTC(
      ...shifted.dateISO.split('-').map(Number).map((v,i)=> i===1? v-1 : v),
      shifted.h, shifted.m
    ));
    if(utcDate < fromDate) return;
    if(!best || utcDate < best.utcDate) best = {utcDate, label};
  };
  if(ev.occ.kind === 'dates'){
    ev.occ.dates.forEach(dt => consider(dt, 'Active'));
  } else if(ev.occ.kind === 'ranges'){
    ev.occ.ranges.forEach(r => {
      if(r.start === r.end){ consider(r.start, 'Active'); }
      else { consider(r.start, 'Begins'); consider(r.end, 'Ends'); }
    });
  } else if(ev.occ.kind === 'weekly'){
    // Jump to the next matching weekday on/after "today" instead of scanning every day.
    const todayISO = fromDate.getUTCFullYear()+'-'+String(fromDate.getUTCMonth()+1).padStart(2,'0')+'-'+String(fromDate.getUTCDate()).padStart(2,'0');
    let cur = todayISO > ev.occ.start ? todayISO : ev.occ.start;
    let guard = 0;
    while(cur <= ev.occ.end && guard < 8){ // at most one week of scanning needed
      if(dowOf(cur) === ev.occ.dayOfWeek){ consider(cur, 'Territory window'); break; }
      cur = addDays(cur, 1);
      guard++;
    }
  }
  return best; // null if nothing upcoming
}
