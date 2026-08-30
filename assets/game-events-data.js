/* =========================================================
   PHX EU168 — SHARED GAME EVENTS DATA & LOGIC
   Used by: game-events.html, gantt-events.html, and the header
   ticker on index.html / f2p-task-guide.html.

   Keeping this in one file means Territory Capture times, Voyage
   Across the Void scoring notes, category colors, etc. only ever
   need updating in one place. Page-specific UI (rendering, chips,
   modals) stays in each page's own <script> block.
   ========================================================= */

/* ===== CATEGORY DEFINITIONS ===== */
const GAME_CATS = {
  hostiles:     {label:'Hostiles',        color:'#FF6B6B'},
  waves:        {label:'Wave Defense',    color:'#6EE7B7'},
  armadas:      {label:'Armadas',         color:'#B98CE0'},
  recruit:      {label:'Officer Recruit', color:'#5FB4E5'},
  meta:         {label:'Meta',            color:'#FFB454'},
  alliance:     {label:'Alliance',        color:'#FF8FE3'},
  ship_upgrade: {label:'Ship Upgrade',    color:'#7FDBFF'},
  battlepass:   {label:'Battle Pass',     color:'#9AA5B1'},
  building:     {label:'Building',        color:'#F5D97A'},
  research:     {label:'Research',        color:'#5FE0C0'},
  domination:   {label:'Domination',      color:'#8C6FE0'},
  pvp:          {label:'PvP',             color:'#FF9B54'},
  arc_banner:   {label:'Arc Banner',      color:'#E0C56F'},
  mining:       {label:'Mining',          color:'#C08552'},
  vengeance:    {label:'Vengeance',       color:'#C0392B'},
  aphelion:     {label:'Aphelion',        color:'#A5D8FF'},
  territory:    {label:'Territory Capture', color:'#8CE071'},
  sector_strike: {label:'Sector Strike',    color:'#D65DB1'},
  voyage:       {label:'Voyage Across the Void', color:'#4FD1C5'},
  maverick_tasks: {label:'Maverick Tasks',  color:'#FF922B'},
  '':           {label:'Other',           color:'#7C8798'}
};
const FALLBACK_PALETTE = ['#E57373','#64B5F6','#81C784','#FFD54F','#BA68C8','#4DB6AC','#F06292','#A1887F'];
const GRADE_BANDS = {G1:[1,20],G2:[21,30],G3:[31,40],G4:[41,50],G5:[51,60],G6:[61,70],G7:[71,80],G8:[81,90]};

/* ===== VOYAGE ACROSS THE VOID — hand-written notes, matching the retired arc calendar's wording ===== */
const VOYAGE_NOTES = {
  'Into the Unknown': 'SMS: Complete Away Team Assignments, or defeat Federation, Klingon, and Romulan hostiles. ALB/SLB: Complete Priority One Away Team Assignments.',
  'Perimeter Breach': 'SMS: Clear Solo, Elite Solo, and Duo Wave Defense waves, or defeat Federation, Klingon, and Romulan hostiles. ALB/SLB: Clear Solo, Elite Solo, and Duo Wave Defense waves.',
  'Singular Strike': 'SMS: Defeat Invading Entities and Solo Armadas, or defeat Federation, Klingon, and Romulan hostiles. ALB/SLB: Defeat Invading Entities and Solo Armadas.',
  'United Offensive': 'SMS: Defeat group Armadas, or defeat Federation, Klingon, and Romulan hostiles. ALB/SLB: Defeat group Armadas.',
  'Command Mobilization': 'Gain Power via Research, Defense Platforms, Buildings and Drydocks, or spend Ship XP / Officer Intel — scoring is the same across SMS, SLB, and ALB.',
  'Subspace Surge': 'SMS: Defeat Solo Armadas or clear Wave Defense waves, or defeat Federation, Klingon, and Romulan hostiles. ALB/SLB: Defeat Solo Armadas or clear Wave Defense waves.',
  'Echoes of War': 'Defeat Armadas, complete research, or upgrade buildings, or defeat Federation, Klingon, and Romulan hostiles — scoring is the same across SMS, SLB, and ALB.'
};

/* ===== RECURRING TERRITORY CAPTURE WINDOWS (indefinite, not arc-bound) ===== */
const TERRITORY_EVENTS = [
  {name:'Nujord — Territory Capture', displayType:'territory', eventSubType:null, dayOfWeek:5, h:15, m:0, durationDays:0, note:'PHX conquest window · cost 1 currency.', validFrom:'2025-01-01', validTo:'2027-12-31'},
  {name:'Duportas — Territory Capture', displayType:'territory', eventSubType:null, dayOfWeek:6, h:14, m:0, durationDays:0, note:'PHX conquest window · cost 2 currency.', validFrom:'2025-01-01', validTo:'2027-12-31'},
  {name:"Ber'Tho — Territory Capture", displayType:'territory', eventSubType:null, dayOfWeek:6, h:19, m:0, durationDays:0, note:'PHX conquest window · cost 2 currency.', validFrom:'2025-01-01', validTo:'2027-12-31'},
  {name:'Brellan — Territory Capture', displayType:'territory', eventSubType:null, dayOfWeek:0, h:19, m:0, durationDays:0, note:'PHX conquest window · cost 3 currency.', validFrom:'2025-01-01', validTo:'2027-12-31'},
  {name:'Bimasa — Territory Capture', displayType:'territory', eventSubType:null, dayOfWeek:2, h:17, m:0, durationDays:0, note:'PHX conquest window · cost 2 currency.', validFrom:'2025-01-01', validTo:'2027-12-31'}
];

/* ===== RECURRING VOYAGE ACROSS THE VOID (indefinite, not arc-bound) ===== */
const VOYAGE_EVENTS = [
  {name:'Voyage Across the Void — Into the Unknown', displayType:'voyage', eventSubType:'voyage_across_the_void', dayOfWeek:1, h:17, m:0, durationDays:1, note:VOYAGE_NOTES['Into the Unknown'], validFrom:'2025-01-01', validTo:'2027-12-31'},
  {name:'Voyage Across the Void — Perimeter Breach', displayType:'voyage', eventSubType:'voyage_across_the_void', dayOfWeek:2, h:17, m:0, durationDays:1, note:VOYAGE_NOTES['Perimeter Breach'], validFrom:'2025-01-01', validTo:'2027-12-31'},
  {name:'Voyage Across the Void — Singular Strike', displayType:'voyage', eventSubType:'voyage_across_the_void', dayOfWeek:3, h:17, m:0, durationDays:1, note:VOYAGE_NOTES['Singular Strike'], validFrom:'2025-01-01', validTo:'2027-12-31'},
  {name:'Voyage Across the Void — United Offensive', displayType:'voyage', eventSubType:'voyage_across_the_void', dayOfWeek:4, h:17, m:0, durationDays:1, note:VOYAGE_NOTES['United Offensive'], validFrom:'2025-01-01', validTo:'2027-12-31'},
  {name:'Voyage Across the Void — Command Mobilization', displayType:'voyage', eventSubType:'voyage_across_the_void', dayOfWeek:5, h:17, m:0, durationDays:1, note:VOYAGE_NOTES['Command Mobilization'], validFrom:'2025-01-01', validTo:'2027-12-31'},
  {name:'Voyage Across the Void — Subspace Surge', displayType:'voyage', eventSubType:'voyage_across_the_void', dayOfWeek:6, h:17, m:0, durationDays:1, note:VOYAGE_NOTES['Subspace Surge'], validFrom:'2025-01-01', validTo:'2027-12-31'},
  {name:'Voyage Across the Void — Echoes of War', displayType:'voyage', eventSubType:'voyage_across_the_void', dayOfWeek:0, h:17, m:0, durationDays:1, note:VOYAGE_NOTES['Echoes of War'], validFrom:'2025-01-01', validTo:'2027-12-31'},
  {name:'Voyage Across the Void (Meta)', displayType:'voyage', eventSubType:'voyage_across_the_void', dayOfWeek:1, h:17, m:0, durationDays:7, note:'Complete Voyage Across the Void feeder events. No scoring changes vs. the daily variants.', validFrom:'2025-01-01', validTo:'2027-12-31'}
];

/* =========================================================
   SECTOR STRIKE — recurring weekly event, not in the stfc.cfd feed.
   Every Tuesday 5pm UK, 24-hour window, G6+ only (ops 61+),
   independent of arcs (indefinite validity window).
   ========================================================= */
const TUESDAY_EVENTS = [
  {name:'Sector Strike', displayType:'sector_strike', eventSubType:'sector_strike', dayOfWeek:2, h:17, m:0, durationDays:1, note:'Score by defeating Quantum Adjudicators & Quantum Guardians/Tesseract.', minOpsLevel:61, maxOpsLevel:999, validFrom:'2025-01-01', validTo:'2027-12-31'}
];

/* =========================================================
   MAVERICK TASKS — recurring weekly event, not in the stfc.cfd feed.
   Every Tuesday 5am UK, runs a full week until the next Tuesday 5am.
   Independent of arcs (indefinite validity window, like Sector Strike).
   Ops 55+ — doesn't cleanly align to a grade band boundary (G5 is 51-60),
   so minOpsLevel:55/maxOpsLevel:999 is used as-is; the existing ops-badge
   logic already renders this as "55+", and it naturally shows for G5 and
   above via the normal min/max overlap check, same as Sector Strike does
   for G6+.
   The 4 tasks repeat in a fixed order on a 4-week cycle. MAVERICK_ANCHOR
   is a Tuesday where the cycle sits at index 0 (FKR Hunt) — update this
   only if the in-game rotation ever shifts out of sync with this date.
   ========================================================= */
const MAVERICK_TASKS = [
  {name:'FKR Hunt', note:'Destroy FKR hostiles of Level 55 or higher.'},
  {name:'Aggregation Hunt', note:'Destroy Aggregation hostiles of Level 55 or higher.'},
  {name:'Transogen Hunt', note:'Destroy Transogen hostiles of Level 55 or higher.'},
  {name:'Augment Exiles Hunt', note:'Destroy Augment Exiles hostiles of Level 55 or higher.'}
];
const MAVERICK_ANCHOR = '2026-08-25'; // Tuesday — FKR Hunt is active this week
const MAVERICK_VALID_FROM = '2025-01-01';
const MAVERICK_VALID_TO = '2027-12-31';

function generateMaverickEvents(winStartISO, winEndISO){
  const out = [];
  dateRangeList(winStartISO, winEndISO).forEach(dISO => {
    if(dISO < MAVERICK_VALID_FROM || dISO > MAVERICK_VALID_TO) return;
    if(dowOf(dISO) !== 2) return; // Tuesday
    const weeksSinceAnchor = Math.round(dayIndexBetween(MAVERICK_ANCHOR, dISO) / 7);
    const taskIndex = ((weeksSinceAnchor % 4) + 4) % 4;
    const task = MAVERICK_TASKS[taskIndex];
    const startUTC = ukLocalToUTC(dISO, 5, 0);
    const endUTC = ukLocalToUTC(addDays(dISO, 7), 5, 0);
    out.push({
      title: 'Maverick Tasks — ' + task.name,
      description: task.note + ' Tasks rotate weekly in a fixed order (FKR Hunt \u2192 Aggregation Hunt \u2192 Transogen Hunt \u2192 Augment Exiles Hunt), then repeat.',
      displayType: 'maverick_tasks', eventSubType: 'maverick_tasks', priority: 'normal',
      minOpsLevel: 55, maxOpsLevel: 999,
      formats: [], startUTC, endUTC
    });
  });
  return out;
}

const TZ_OPTIONS = [
  {label:'UK (auto — BST/GMT)', offset:'uk-auto'},
  {label:'UTC−11 (Midway)', offset:-11}, {label:'UTC−10 (Hawaii)', offset:-10},
  {label:'UTC−9 (Alaska)', offset:-9}, {label:'UTC−8 (Los Angeles / PDT)', offset:-8},
  {label:'UTC−7 (Denver / MDT)', offset:-7}, {label:'UTC−6 (Chicago / CDT)', offset:-6},
  {label:'UTC−5 (New York / EDT)', offset:-5}, {label:'UTC−4 (Halifax / AST)', offset:-4},
  {label:'UTC−3 (São Paulo)', offset:-3}, {label:'UTC 0 (GMT, fixed)', offset:0},
  {label:'UTC+1 (fixed)', offset:1}, {label:'UTC+2 (Berlin / Cairo)', offset:2},
  {label:'UTC+3 (Moscow)', offset:3}, {label:'UTC+4 (Dubai)', offset:4},
  {label:'UTC+5:30 (Mumbai)', offset:5.5}, {label:'UTC+8 (Beijing / Singapore)', offset:8},
  {label:'UTC+9 (Tokyo)', offset:9}, {label:'UTC+10 (Sydney / AEST)', offset:10},
  {label:'UTC+12 (Auckland)', offset:12}
];

/* ===== TIME HELPERS ===== */
function getOffsetForZone(date, timeZone){
  try{
    const dtf = new Intl.DateTimeFormat('en-US', {timeZone, timeZoneName:'shortOffset'});
    const part = dtf.formatToParts(date).find(p => p.type === 'timeZoneName').value;
    const match = part.match(/GMT([+-]\d+(?:\.\d+)?)?/);
    return match ? (match[1] ? parseFloat(match[1]) : 0) : 0;
  } catch(e){ return 0; }
}
function resolveOffset(isoUTC, tzValue){
  if(tzValue === 'uk-auto') return getOffsetForZone(new Date(isoUTC), 'Europe/London');
  return parseFloat(tzValue);
}
function toZoned(isoUTC, tzValue){
  const offsetHours = resolveOffset(isoUTC, tzValue);
  const d = new Date(isoUTC);
  const shifted = new Date(d.getTime() + offsetHours*3600*1000);
  return {
    dateISO: shifted.getUTCFullYear()+'-'+String(shifted.getUTCMonth()+1).padStart(2,'0')+'-'+String(shifted.getUTCDate()).padStart(2,'0'),
    h: shifted.getUTCHours(), m: shifted.getUTCMinutes()
  };
}
function ukLocalToUTC(dateISO, h, m){
  const [y,mo,d] = dateISO.split('-').map(Number);
  const naiveUTC = Date.UTC(y, mo-1, d, h, m);
  const offset = getOffsetForZone(new Date(naiveUTC), 'Europe/London');
  return new Date(naiveUTC - offset*3600*1000).toISOString();
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
function mondayOnOrBefore(dateISO){
  const dow = dowOf(dateISO);
  const diff = (dow === 0) ? 6 : dow - 1;
  return addDays(dateISO, -diff);
}
function dayIndexBetween(fromISO, toISO){
  const [y1,m1,d1] = fromISO.split('-').map(Number);
  const [y2,m2,d2] = toISO.split('-').map(Number);
  return Math.round((Date.UTC(y2,m2-1,d2) - Date.UTC(y1,m1-1,d1)) / 86400000);
}

/* ===== FORMAT MERGING (collapses SMS/ALB/SLB/AMS duplicates into one event) ===== */
function stripFormatSuffix(title){
  return title.replace(/\s*-\s*(SMS|ALB|SLB|AMS|RLB|XALB)\s*$/i, '').trim();
}
function getDisplayType(ev){
  return ev.eventSubType === 'voyage_across_the_void' ? 'voyage' : (ev.eventType || '');
}
function buildMergedEvents(raw){
  const map = new Map();
  (raw||[]).forEach(ev => {
    if(!ev.startUTC) return;
    const baseTitle = stripFormatSuffix(ev.title || '');
    const key = baseTitle + '|' + ev.startUTC + '|' + ev.endUTC;
    if(!map.has(key)){
      map.set(key, {
        title: baseTitle, description: ev.description || '', imageUrl: ev.imageUrl,
        startUTC: ev.startUTC, endUTC: ev.endUTC, displayType: getDisplayType(ev),
        eventSubType: ev.eventSubType, priority: ev.priority,
        minOpsLevel: ev.minOpsLevel, maxOpsLevel: ev.maxOpsLevel, formats: []
      });
    }
    const entry = map.get(key);
    if(ev.eventFormat && !entry.formats.includes(ev.eventFormat)) entry.formats.push(ev.eventFormat);
    if(!entry.description && ev.description) entry.description = ev.description;
  });
  map.forEach(entry => {
    if(entry.eventSubType === 'voyage_across_the_void'){
      const noteKey = entry.title.replace(/^Voyage Across the Void — /,'').replace(/\s*\(Meta\)\s*$/i, '').trim();
      if(VOYAGE_NOTES[noteKey]) entry.description = VOYAGE_NOTES[noteKey];
    }
  });
  return Array.from(map.values());
}
function generateRecurringEvents(defs, winStartISO, winEndISO){
  const out = [];
  dateRangeList(winStartISO, winEndISO).forEach(dISO => {
    defs.forEach(d => {
      if(dISO < d.validFrom || dISO > d.validTo) return;
      if(dowOf(dISO) !== d.dayOfWeek) return;
      const startUTC = ukLocalToUTC(dISO, d.h, d.m);
      const endUTC = d.durationDays > 0 ? ukLocalToUTC(addDays(dISO, d.durationDays), d.h, d.m) : null;
      out.push({
        title: d.name, description: d.note, displayType: d.displayType,
        eventSubType: d.eventSubType, priority: 'normal',
        minOpsLevel: d.minOpsLevel != null ? d.minOpsLevel : 1,
        maxOpsLevel: d.maxOpsLevel != null ? d.maxOpsLevel : 999,
        formats: [], startUTC, endUTC
      });
    });
  });
  return out;
}

/* ===== CATEGORY DISCOVERY — auto-adds a fallback color/label for any
   eventType present in the feed but not already in GAME_CATS, so
   nothing from the feed is ever silently excluded from filters. ===== */
function augmentCategoriesFromEvents(mergedEvents){
  const seenTypes = new Set(mergedEvents.map(e => e.displayType || ''));
  let paletteIdx = 0;
  seenTypes.forEach(t => {
    if(!(t in GAME_CATS)){
      GAME_CATS[t] = {label: t ? (t.charAt(0).toUpperCase()+t.slice(1).replace(/_/g,' ')) : 'Other', color: FALLBACK_PALETTE[paletteIdx++ % FALLBACK_PALETTE.length]};
    }
  });
}

/* ===== DATA LOADER — fetches the daily-scraped feed with cache-busting
   so a fresh scrape is visible immediately, no stale-cache waiting. ===== */
async function loadGameEventsFeed(){
  try{
    const res = await fetch('events-data-game.json?t=' + Date.now(), {cache:'no-store'});
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const payload = await res.json();
    return {events: payload.events || [], generatedAt: payload.generatedAt || null};
  } catch(e){
    console.warn('events-data-game.json missing or empty — recurring events (Territory Capture, Voyage, etc.) still work.', e);
    return {events: [], generatedAt: null};
  }
}

/* ===== NOTABLE-EVENT FILTER — used by the header ticker's "Also
   Upcoming" slot. Deliberately excludes routine daily grind
   (Hostiles/Waves/Armadas/Domination/Mining/PvP/etc.) so the ticker
   stays useful; Territory Capture is handled in its own ticker slot
   and is excluded here to avoid duplication. ===== */
function isNotableForTicker(ev){
  if(ev.displayType === 'territory') return false;
  if(ev.displayType === 'voyage') return true;
  if(ev.priority === 'incursion') return true;
  if(ev.eventSubType === 'heroic') return true;
  if(ev.eventSubType === 'ticketed') return true;
  if(ev.displayType === 'meta') return true;
  if(ev.displayType === 'sector_strike') return true;
  if(ev.displayType === 'maverick_tasks') return true;
  return false;
}
