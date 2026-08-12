/* =========================================================
   PHX EU168 — SHARED EVENT SCHEDULE
   Single source of truth for events-calendar.html and index-22.html.
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
   EVENT DATA
   Times are as displayed on the source tracker (Europe/London, BST/UTC+1).
   occ.kind: 'ranges' (begin+end markers), 'dates' (discrete days), 'weekly' (recurring)
   This data is baked into the page directly and updated each arc — no in-browser editing.
   ========================================================= */
const EVENTS = [

  // --- Long-running Arc mission milestones ---
  {name:'Mission Key Hunter', variant:'SMS', category:'MISSION', heroic:false, opsMin:10, opsMax:999, time:{h:16,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-07-23', end:'2026-08-20'}]}, note:'Score by gaining Mission Key tokens.'},
  {name:'Mission Key Hunter', variant:'AMS', category:'MISSION', heroic:false, opsMin:10, opsMax:999, time:{h:16,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-07-23', end:'2026-08-20'}]}, note:'Alliance milestone — gaining Mission Key tokens.'},
  {name:'Multiphasic Hunter', variant:'SMS', category:'MISSION', heroic:false, opsMin:20, opsMax:999, time:{h:16,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-07-23', end:'2026-08-20'}]}, note:'Score by gaining Multiphasic Credits (webstore).'},
  {name:'Complete New Missions', variant:'SMS', category:'MISSION', heroic:false, opsMin:61, opsMax:999, time:{h:16,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-07-23', end:'2026-08-20'}]}, note:'Score by completing new missions.'},

  // --- Week 1 heroic clusters ---
  {name:'Adversity and Progress Meta', variant:'SMS', category:'HOSTILES', heroic:true, opsMin:61, opsMax:80, time:{h:16,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-07-23', end:'2026-07-28'}]}, note:'Complete Galactic Anomaly Heroic events.'},
  {name:'FKR Cloak-and-Dagger', variant:'SMS', category:'HOSTILES', heroic:true, opsMin:61, opsMax:999, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-07-23',end:'2026-07-24'},{start:'2026-07-25',end:'2026-07-26'},{start:'2026-07-27',end:'2026-07-28'}]},
    note:'Defeat Fed/Klingon/Romulan hostiles in an anomaly-affected system.'},
  {name:'FKR Dimensional War', variant:'SLB', category:'HOSTILES', heroic:false, opsMin:61, opsMax:999, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-07-25', end:'2026-07-26'}]}, note:'Leaderboard — FKR hostiles in anomaly system.'},
  {name:'Hostile Offensive', variant:'SMS', category:'HOSTILES', heroic:true, opsMin:20, opsMax:34, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-07-23',end:'2026-07-24'},{start:'2026-07-27',end:'2026-07-28'}]}, note:'Destroy hostiles.'},
  {name:'Armada Offensive', variant:'SMS', category:'ARMADAS', heroic:true, opsMin:35, opsMax:60, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-07-23',end:'2026-07-24'},{start:'2026-07-27',end:'2026-07-28'}]}, note:'Defeat Solo Armadas.'},
  {name:'Armada Assault', variant:'SLB', category:'ARMADAS', heroic:false, opsMin:26, opsMax:60, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-07-25', end:'2026-07-26'}]}, note:'Score by starting Group Armadas.'},
  {name:'Armada Assault', variant:'SMS', category:'ARMADAS', heroic:true, opsMin:26, opsMax:60, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-07-25', end:'2026-07-26'}]}, note:'Score by starting Group Armadas.'},

  // --- Officer recruit heroics ---
  {name:'Janeway Recruit', variant:'SMS', category:'RECRUIT', heroic:true, opsMin:20, opsMax:39, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-07-25', end:'2026-07-26'}]}, note:'Spend G3 U+ materials to earn Janeway shards.'},
  {name:'Janeway Recruit', variant:'SLB', category:'RECRUIT', heroic:true, opsMin:20, opsMax:39, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-07-25', end:'2026-07-26'}]}, note:'Leaderboard — spend G3 U+ materials.'},
  {name:'Annorax Recruit', variant:'SMS', category:'RECRUIT', heroic:true, opsMin:40, opsMax:60, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-07-25', end:'2026-07-26'}]}, note:'Spend G3 U+ materials to earn Annorax shards.'},
  {name:'Annorax Recruit', variant:'SLB', category:'RECRUIT', heroic:true, opsMin:40, opsMax:60, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-07-25', end:'2026-07-26'}]}, note:'Leaderboard — spend G3 U+ materials.'},
  {name:'Cat Spock Recruit', variant:'SMS', category:'RECRUIT', heroic:true, opsMin:61, opsMax:80, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-07-25', end:'2026-07-26'}]}, note:'Spend G3 U+ materials to earn Cat Spock shards.'},
  {name:'Cat Spock Recruit', variant:'SLB', category:'RECRUIT', heroic:true, opsMin:61, opsMax:80, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-07-25', end:'2026-07-26'}]}, note:'Leaderboard — spend G3 U+ materials.'},

  // --- IDIQ meta chain ---
  {name:'IDIQ: Q-less Meta', variant:'SMS', category:'META', heroic:false, opsMin:20, opsMax:80, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-07-23',end:'2026-07-28'},{start:'2026-07-29',end:'2026-08-04'},{start:'2026-08-05',end:'2026-08-11'},{start:'2026-08-12',end:'2026-08-19'}]},
    note:'Complete IDIQ sub-events.'},
  {name:'IDIQ: Alien Infiltrators', variant:'SMS', category:'HOSTILES', heroic:false, opsMin:20, opsMax:60, time:{h:17,m:0},
    occ:{kind:'dates', dates:['2026-07-27','2026-08-03','2026-08-10','2026-08-17']}, note:'Defeat Xindi Aquatic and Reptilian hostiles.'},
  {name:'IDIQ: Alien Infiltrators', variant:'SMS', category:'HOSTILES', heroic:false, opsMin:61, opsMax:80, time:{h:17,m:0},
    occ:{kind:'dates', dates:['2026-07-27','2026-08-03','2026-08-10','2026-08-17']}, note:'Destroy Vger hostiles.'},
  {name:'IDIQ: FKR Cold War', variant:'SMS', category:'HOSTILES', heroic:false, opsMin:20, opsMax:80, time:{h:17,m:0},
    occ:{kind:'dates', dates:['2026-07-23','2026-07-28','2026-07-30','2026-08-04','2026-08-06','2026-08-11','2026-08-13','2026-08-18']},
    note:'Defeat Federation, Klingon, and Romulan hostiles.'},
  {name:'IDIQ: Exploitation', variant:'SMS', category:'HOSTILES', heroic:false, opsMin:20, opsMax:39, time:{h:17,m:0},
    occ:{kind:'dates', dates:['2026-07-29','2026-08-05','2026-08-12','2026-08-19']}, note:'Destroy Swarm hostiles.'},
  {name:'IDIQ: Exploitation', variant:'SMS', category:'HOSTILES', heroic:false, opsMin:40, opsMax:50, time:{h:17,m:0},
    occ:{kind:'dates', dates:['2026-07-29','2026-08-05','2026-08-12','2026-08-19']}, note:'Destroy Hirogen and Lost hostiles.'},
  {name:'IDIQ: Exploitation', variant:'SMS', category:'HOSTILES', heroic:false, opsMin:51, opsMax:80, time:{h:17,m:0},
    occ:{kind:'dates', dates:['2026-07-29','2026-08-05','2026-08-12','2026-08-19']}, note:'Destroy Suliban hostiles.'},
  {name:'IDIQ: Old Wounds', variant:'SMS', category:'HOSTILES', heroic:false, opsMin:20, opsMax:34, time:{h:17,m:0},
    occ:{kind:'dates', dates:['2026-07-24','2026-07-31','2026-08-07','2026-08-14']}, note:'Destroy Borg Probes.'},
  {name:'IDIQ: Old Wounds', variant:'SMS', category:'HOSTILES', heroic:false, opsMin:35, opsMax:60, time:{h:17,m:0},
    occ:{kind:'dates', dates:['2026-07-24','2026-07-31','2026-08-07','2026-08-14']}, note:'Destroy Dominion hostiles.'},
  {name:'IDIQ: Old Wounds', variant:'SMS', category:'HOSTILES', heroic:false, opsMin:61, opsMax:80, time:{h:17,m:0},
    occ:{kind:'dates', dates:['2026-07-24','2026-07-31','2026-08-07','2026-08-14']}, note:'Destroy Academy Drone hostiles.'},
  {name:'IDIQ Augment', variant:'SMS', category:'HOSTILES', heroic:false, opsMin:20, opsMax:80, time:{h:17,m:0},
    occ:{kind:'dates', dates:['2026-07-25','2026-08-01','2026-08-08','2026-08-15']}, note:'Destroy hostiles.'},
  {name:'IDIQ: Villainous Bounties', variant:'SMS', category:'HOSTILES', heroic:false, opsMin:20, opsMax:60, time:{h:17,m:0},
    occ:{kind:'dates', dates:['2026-07-26','2026-08-02','2026-08-09','2026-08-16']}, note:'Destroy hostiles or Mirror Universe hostiles.'},
  {name:'IDIQ: Villainous Bounties', variant:'SMS', category:'HOSTILES', heroic:false, opsMin:61, opsMax:80, time:{h:17,m:0},
    occ:{kind:'dates', dates:['2026-07-26','2026-08-02','2026-08-09','2026-08-16']}, note:'Defeat Aggregation hostiles.'},

  // --- Wave defense ---
  {name:'Duo Wave Defense', variant:'SMS/SLB', category:'WAVES', heroic:true, opsMin:61, opsMax:999, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-07-25',end:'2026-07-26'},{start:'2026-08-01',end:'2026-08-02'},{start:'2026-08-08',end:'2026-08-09'},{start:'2026-08-15',end:'2026-08-16'}]},
    note:'Defeat waves in Duo Wave Defense.'},

  // --- Passes ---
  {name:'IDIQ Battle Pass', variant:'', category:'PASS', heroic:false, opsMin:20, opsMax:999, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-07-23', end:'2026-08-12'}]}, note:'25 milestones, free + elite tracks. 16,000 pts/event.'},
  {name:'Ferengi Exchange Pass', variant:'', category:'PASS', heroic:false, opsMin:1, opsMax:999, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-07-27', end:'2026-08-08'}]}, note:'Milestones in daily/seasonal Ferengi Exchange events.'},
  {name:'Wave Defense Pass', variant:'', category:'PASS', heroic:false, opsMin:1, opsMax:999, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-07-28', end:'2026-08-18'}]}, note:'Milestones in Operation Bulwark events.'},
  {name:'Syndicate Pass', variant:'', category:'PASS', heroic:false, opsMin:1, opsMax:999, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-08-10', end:'2026-08-15'}]}, note:'Milestones in Syndicate Pass SMS events.'},
  {name:'Outpost Pass', variant:'', category:'PASS', heroic:false, opsMin:1, opsMax:999, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-08-11', end:'2026-08-16'}]}, note:'Milestones in Outpost Pass SMS events.'},

  // --- Galactic Anomaly calendar ---
  {name:'Adaptive Hulls (T1)', variant:'', category:'ANOMALY', heroic:false, opsMin:1, opsMax:999, time:{h:0,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-07-23', end:'2026-07-24'}]}, note:'G6/G7 FKR Space anomaly.'},
  {name:'Disrupted Energy Shields (T1)', variant:'', category:'ANOMALY', heroic:false, opsMin:1, opsMax:999, time:{h:0,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-07-25', end:'2026-07-28'}]}, note:'G6/G7 FKR Space anomaly.'},
  {name:'Ripple of Violence', variant:'', category:'ANOMALY', heroic:false, opsMin:1, opsMax:999, time:{h:0,m:0},
    occ:{kind:'dates', dates:['2026-07-29','2026-08-04']}, note:'G6/G7 FKR Space anomaly.'},
  {name:'Adaptive Hulls (T2)', variant:'', category:'ANOMALY', heroic:false, opsMin:1, opsMax:999, time:{h:0,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-07-30', end:'2026-08-01'}]}, note:'G6/G7 FKR Space anomaly.'},
  {name:'Disrupted Energy Shields (T2)', variant:'', category:'ANOMALY', heroic:false, opsMin:1, opsMax:999, time:{h:0,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-08-02', end:'2026-08-03'}]}, note:'G6/G7 FKR Space anomaly.'},
  {name:'Adaptive Hulls (T3)', variant:'', category:'ANOMALY', heroic:false, opsMin:1, opsMax:999, time:{h:0,m:0},
    occ:{kind:'dates', dates:['2026-08-05']}, note:'G6/G7 FKR Space anomaly.'},
  {name:'Technological Advancement (T1)', variant:'', category:'ANOMALY', heroic:false, opsMin:1, opsMax:999, time:{h:0,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-08-06', end:'2026-08-07'}]}, note:'Assimilated Systems anomaly.'},
  {name:'Disrupted Energy Shields (T3)', variant:'', category:'ANOMALY', heroic:false, opsMin:1, opsMax:999, time:{h:0,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-08-08', end:'2026-08-09'}]}, note:'G6/G7 FKR Space anomaly.'},
  {name:'Technological Advancement (T2)', variant:'', category:'ANOMALY', heroic:false, opsMin:1, opsMax:999, time:{h:0,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-08-10', end:'2026-08-11'}]}, note:'Assimilated Systems anomaly.'},
  {name:'Adaptive Hulls (T4)', variant:'', category:'ANOMALY', heroic:false, opsMin:1, opsMax:999, time:{h:0,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-08-12', end:'2026-08-13'}]}, note:'G6/G7 FKR Space anomaly.'},
  {name:'Disrupted Energy Shields (T4) / Technological Advancement (T3)', variant:'', category:'ANOMALY', heroic:false, opsMin:1, opsMax:999, time:{h:0,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-08-16', end:'2026-08-18'}]}, note:'Both anomaly types active simultaneously.'},

  // --- Territory capture (weekly recurring, PHX / Server 168 EU, London time) ---
  {name:'Nujord — Territory Capture', variant:'', category:'TERRITORY', heroic:false, opsMin:1, opsMax:999, time:{h:15,m:0},
    occ:{kind:'weekly', dayOfWeek:5, start:'2026-07-20', end:'2026-08-19'}, note:'PHX conquest window · 1*'},
  {name:'Duportas — Territory Capture', variant:'', category:'TERRITORY', heroic:false, opsMin:1, opsMax:999, time:{h:14,m:0},
    occ:{kind:'weekly', dayOfWeek:6, start:'2026-07-20', end:'2026-08-19'}, note:'PHX conquest window · 2*'},
  {name:'Brellan — Territory Capture', variant:'', category:'TERRITORY', heroic:false, opsMin:1, opsMax:999, time:{h:19,m:0},
    occ:{kind:'weekly', dayOfWeek:0, start:'2026-07-20', end:'2026-08-19'}, note:'PHX conquest window · 3*'},
  {name:'Bimasa — Territory Capture', variant:'', category:'TERRITORY', heroic:false, opsMin:1, opsMax:999, time:{h:17,m:0},
    occ:{kind:'weekly', dayOfWeek:2, start:'2026-07-20', end:'2026-08-19'}, note:'PHX conquest window · 2*'},
  {name:'Qoda — Territory Capture', variant:'', category:'TERRITORY', heroic:false, opsMin:1, opsMax:999, time:{h:20,m:0},
    occ:{kind:'weekly', dayOfWeek:1, start:'2026-07-20', end:'2026-08-19'}, note:'PHX conquest window · 4*'},

  // --- Federation Day 2026 (Level 20-80 Solo Milestones) ---
  {name:'Federation Day (Meta)', variant:'AMS', category:'FEDDAY', heroic:false, opsMin:20, opsMax:80, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-08-09', end:'2026-08-13'}]}, note:'Alliance milestone — complete each daily Federation Day event.'},
  {name:'Federation Day #1: Humans', variant:'SMS', category:'FEDDAY', heroic:false, opsMin:20, opsMax:80, time:{h:17,m:0},
    occ:{kind:'dates', dates:['2026-08-09']}, note:'Score by destroying hostiles.'},
  {name:'Federation Day #2: Vulcans', variant:'SMS', category:'FEDDAY', heroic:false, opsMin:20, opsMax:80, time:{h:17,m:0},
    occ:{kind:'dates', dates:['2026-08-10']}, note:'Score by destroying Romulan hostiles.'},
  {name:'Federation Day #3: Andorians', variant:'SMS', category:'FEDDAY', heroic:false, opsMin:20, opsMax:80, time:{h:17,m:0},
    occ:{kind:'dates', dates:['2026-08-11']}, note:'Score by destroying Klingon hostiles.'},
  {name:'Federation Day #4: Found Family', variant:'SMS', category:'FEDDAY', heroic:false, opsMin:20, opsMax:80, time:{h:17,m:0},
    occ:{kind:'dates', dates:['2026-08-12']}, note:'Score by destroying Romulan and Klingon hostiles.'},
  {name:'Federation Day #5: Legacy', variant:'SMS', category:'FEDDAY', heroic:false, opsMin:20, opsMax:80, time:{h:17,m:0},
    occ:{kind:'dates', dates:['2026-08-13']}, note:'Score by destroying FKR hostiles.'},

  // --- Outpost Hold (ALB/SLB/SMS — same scoring across all three formats, 1 entry covers all) ---
  // NOT set up as a recurring rule yet: we've only confirmed this one window so far.
  // When the next occurrence shows up in-game, add a new range below (or convert to
  // occ.kind:'weekly'/'dates' once the actual interval between occurrences is confirmed).
  {name:'Outpost Hold', variant:'ALB / SLB / SMS', category:'OUTPOST', heroic:false, opsMin:51, opsMax:999, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-08-06', end:'2026-08-08'}]},
    note:'Score by defeating Outpost Retaliation attackers of your Grade or Higher. Bonus points for FC Sisko assigned in Seat 1. Scoring is the same across ALB, SLB, and SMS. (Recurrence interval not yet confirmed.)'},

  // --- Alliance Tournament (Update 93 M92 tasks — tied to the F2P Task Guide on this site) ---
  {name:'Alliance Tournament', variant:'SMS / SLB / ALB', category:'TOURNAMENT', heroic:false, opsMin:1, opsMax:999, time:{h:17,m:0},
    occ:{kind:'ranges', ranges:[{start:'2026-08-10', end:'2026-08-15'}]},
    note:'Complete Alliance Tournament tasks to earn Alliance Tournament Credits and Legendary Credits. See the F2P Task Guide on this site for which tasks are realistically achievable.'},

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
   Shared by events-calendar.html (range display) and index-22.html (ticker)
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
