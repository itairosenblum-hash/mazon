// ─────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────
const THEME_KEY = 'catering_theme';

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeLabel(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
  updateThemeLabel(next);
  if (currentPage === 'dashboard') renderDashboard();
}

function updateThemeLabel(theme) {
  const el = document.getElementById('themeLabel');
  if (el) el.textContent = theme === 'dark' ? 'מצב כהה' : 'מצב בהיר';
  updateTopbarTheme(theme);
}

initTheme();

// ─────────────────────────────────────────────
// MOBILE DRAWER
// ─────────────────────────────────────────────
function toggleDrawer() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('drawerOverlay');
  const isOpen = sidebar.classList.contains('open');
  if (isOpen) closeDrawer();
  else { sidebar.classList.add('open'); overlay.classList.add('open'); }
}
function closeDrawer() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
}
function updateTopbarTheme(theme) {
  const btn = document.querySelector('.topbar-theme');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ─────────────────────────────────────────────
// ROLE EMOJIS
// ─────────────────────────────────────────────
const ROLE_EMOJIS = {
  'שף': '👨‍🍳', 'טבח': '🧑‍🍳', 'קונדיטור': '🎂',
  'חדר אוכל': '🍽', 'שוטף כלים': '🫧', 'מנהל תחנה': '📋',
};
function roleEmoji(role) { return ROLE_EMOJIS[role] || '👤'; }

// ─────────────────────────────────────────────
// STATE & PERSISTENCE
// ─────────────────────────────────────────────
const STORAGE_KEY = 'catering_tracker_v1';
const SESSION_KEY = 'catering_session';

// ─────────────────────────────────────────────
// GOOGLE SHEETS SYNC (JSONP — no CORS issues)
// ─────────────────────────────────────────────
const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbyHAMw56oIoMzJQdGlRDSComslz3IB7uHARUXCwcg1KmesC98l2qRYMUC_8DdtyZN2DLQ/exec';
let syncTimeout = null;

function scheduleSave() {
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(syncToSheets, 1500);
}

function setSyncStatus(status) {
  const icons = { idle:'', saving:'⟳ מסנכרן...', saved:'✓ מסונכרן', error:'⚠ שגיאה' };
  const colors = { idle:'transparent', saving:'var(--text3)', saved:'var(--green)', error:'var(--orange)' };
  ['syncIndicator','syncIndicatorDesktop'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = icons[status] || '';
    el.style.color = colors[status] || 'transparent';
  });
}

// JSONP helper — bypasses CORS
function jsonpGet(url) {
  return new Promise((resolve, reject) => {
    const cbName = '_jsonp_' + Date.now();
    const script = document.createElement('script');
    const timer = setTimeout(() => {
      delete window[cbName];
      document.body.removeChild(script);
      reject(new Error('timeout'));
    }, 8000);
    window[cbName] = (data) => {
      clearTimeout(timer);
      delete window[cbName];
      document.body.removeChild(script);
      resolve(data);
    };
    script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cbName + '&t=' + Date.now();
    script.onerror = () => { clearTimeout(timer); reject(new Error('script error')); };
    document.body.appendChild(script);
  });
}

async function syncToSheets() {
  setSyncStatus('saving');
  try {
    // Use no-cors POST via form submission trick via fetch with mode no-cors
    await fetch(SHEETS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(state)
    });
    setSyncStatus('saved');
  } catch(e) {
    console.warn('Sync save error:', e);
    setSyncStatus('error');
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  scheduleSave();
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.users || parsed.users.length === 0) {
        parsed.users = defaultState().users;
      }
      return parsed;
    }
  } catch(e) {}
  return defaultState();
}

async function loadFromSheets() {
  setSyncStatus('saving');
  try {
    const data = await jsonpGet(SHEETS_URL);
    if (data && data.roles && data.stations) {
      if (!data.users || data.users.length === 0) {
        data.users = state.users && state.users.length ? state.users : defaultState().users;
      }
      state = data;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setSyncStatus('saved');
      return true;
    }
  } catch(e) {
    console.warn('Load from sheets error:', e);
  }
  setSyncStatus('idle');
  return false;
}

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
let currentUser = null;

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const uid = JSON.parse(raw);
      currentUser = state.users.find(u => u.id === uid) || null;
    }
  } catch(e) {}
}

function saveSession() {
  if (currentUser) sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser.id));
  else sessionStorage.removeItem(SESSION_KEY);
}

function isAdmin() { return currentUser && currentUser.role === 'admin'; }

function login(username, password) {
  const user = state.users.find(u => u.username === username && u.password === password);
  if (!user) return false;
  currentUser = user;
  saveSession();
  return true;
}

function logout() {
  currentUser = null;
  saveSession();
  showLoginScreen();
}

// ─────────────────────────────────────────────
// LOGIN SCREEN
// ─────────────────────────────────────────────
function showLoginScreen() {
  document.getElementById('appShell').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginError').textContent = '';
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
  setTimeout(() => {
    const el = document.getElementById('loginUsername');
    if (el) el.focus();
  }, 150);
}

function showAppShell() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appShell').style.display = 'flex';
  updateUserBadge();
  updateNavForRole();
}

function updateUserBadge() {
  const el = document.getElementById('userBadge');
  if (!el || !currentUser) return;
  el.textContent = currentUser.name + (isAdmin() ? ' 👑' : ' 👤');
}

function updateNavForRole() {
  // Admin sees everything; station user sees limited nav
  const adminOnly = document.querySelectorAll('[data-admin-only]');
  adminOnly.forEach(el => {
    el.style.display = isAdmin() ? '' : 'none';
  });

  // If station user, pre-lock the station selector in entry
  if (!isAdmin() && currentUser.stationIds && currentUser.stationIds.length === 1) {
    // will be handled in renderEntry
  }
}

document.getElementById('loginBtn').addEventListener('click', doLogin);
document.getElementById('loginPassword').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});
document.getElementById('loginUsername').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('loginPassword').focus();
});

function doLogin() {
  const u = document.getElementById('loginUsername').value.trim();
  const p = document.getElementById('loginPassword').value.trim();
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  if (!u || !p) { errEl.textContent = 'יש להזין שם משתמש וסיסמה'; return; }
  // Ensure users exist in state (migration safety)
  if (!state.users || state.users.length === 0) {
    state.users = defaultState().users;
    saveState();
  }
  if (login(u, p)) {
    showAppShell();
    navigate('dashboard');
  } else {
    errEl.textContent = 'שם משתמש או סיסמה שגויים';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginPassword').focus();
  }
}

document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('logoutBtnMobile').addEventListener('click', logout);

// ─────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────
let currentPage = 'dashboard';
let editingStationId = null;

function navigate(page) {
  // Non-admin: block admin-only pages
  if (!isAdmin() && ['stations','settings','users'].includes(page)) {
    page = 'dashboard';
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  const link = document.querySelector(`[data-page="${page}"]`);
  if (link) link.classList.add('active');
  currentPage = page;
  renderPage(page);
}

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    navigate(link.dataset.page);
    closeDrawer();
    document.querySelectorAll('.bottom-nav-item').forEach(b =>
      b.classList.toggle('active', b.dataset.page === link.dataset.page));
  });
});

// ─────────────────────────────────────────────
// RENDER DISPATCHER
// ─────────────────────────────────────────────
function renderPage(page) {
  if (page === 'dashboard') renderDashboard();
  if (page === 'entry')     renderEntry();
  if (page === 'history')   renderHistory();
  if (page === 'stations')  renderStations();
  if (page === 'settings')  renderSettings();
  if (page === 'users')     renderUsers();
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function uid() { return 'u' + Math.random().toString(36).slice(2, 9); }
function formatDate(d) {
  if (!d) return '';
  const [y,m,day] = d.split('-');
  return `${day}/${m}/${y}`;
}
function today() { return new Date().toISOString().slice(0,10); }
function getStation(id) { return state.stations.find(s => s.id === id); }

function allowedStations() {
  if (isAdmin()) return state.stations;
  if (!currentUser) return [];
  if (!currentUser.stationIds || currentUser.stationIds.length === 0) return [];
  return state.stations.filter(s => currentUser.stationIds.includes(s.id));
}

function getPeriodRange(days) {
  // Returns {from, to} Date objects based on period and offset
  const to = new Date();
  to.setHours(23,59,59,999);
  if (days === 1) {
    to.setDate(to.getDate() + periodOffset);
    const from = new Date(to);
    from.setHours(0,0,0,0);
    return { from, to };
  } else {
    to.setDate(to.getDate() + (periodOffset * days));
    const from = new Date(to);
    from.setDate(from.getDate() - (days - 1));
    from.setHours(0,0,0,0);
    return { from, to };
  }
}

function entriesInPeriod(days) {
  const { from, to } = getPeriodRange(days);
  let entries = state.entries.filter(e => {
    const d = new Date(e.date);
    return d >= from && d <= to;
  });
  if (!isAdmin()) entries = entries.filter(e => currentUser.stationIds.includes(e.stationId));
  return entries;
}
function totalForEntry(entry) {
  return Object.values(entry.counts || {}).reduce((a,b) => a+b, 0);
}

function getChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  return {
    grid: isDark ? '#2a2a2a' : '#e8e0d0',
    tick: isDark ? '#9a9690' : '#6b5f4e',
    palette: ['#e8c547','#52c07a','#5aa0e0','#9b7fe8','#e05252','#e07a3a','#3acbb0','#c07a52'],
  };
}

// ─────────────────────────────────────────────
// SIDEBAR DATE
// ─────────────────────────────────────────────
function updateSidebarDate() {
  const d = new Date();
  const days = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
  const months = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  const el = document.getElementById('sidebarDate');
  if (el) el.textContent = `יום ${days[d.getDay()]}\n${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
updateSidebarDate();

// ─────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────
let chartStation=null, chartRole=null, chartTrend=null;

function renderDashboard() {
  const period = parseInt(document.getElementById('dashboardPeriod').value) || 30;

  // Populate station filter dropdown
  const stationSel = document.getElementById('dashboardStation');
  if (stationSel) {
    const currentVal = stationSel.value;
    stationSel.innerHTML = '<option value="">כל התחנות</option>' +
      allowedStations().map(s => `<option value="${s.id}"${s.id===currentVal?' selected':''}>${s.name}</option>`).join('');
  }
  const selectedStationId = stationSel ? stationSel.value : '';
  // Filter by selected station
  let entries = entriesInPeriod(period);
  if (selectedStationId) entries = entries.filter(e => e.stationId === selectedStationId);

  const periodLabels = {1:'היום',7:'שבוע אחרון',30:'חודש אחרון',90:'רבעון אחרון',365:'שנה אחרונה'};
  document.getElementById('chartPeriodLabel').textContent = periodLabels[period] || period + ' ימים';

  // Show date range using getPeriodRange
  const { from: fromDate, to: toDate } = getPeriodRange(period);
  const fmtShort = d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  const rangeEl = document.getElementById('dashboardDateRange');
  if (rangeEl) {
    rangeEl.textContent = period === 1
      ? fmtShort(toDate)
      : `${fmtShort(fromDate)} — ${fmtShort(toDate)}`;
  }
  // Disable next button if already at current period
  const nextBtn = document.getElementById('periodNext');
  if (nextBtn) nextBtn.disabled = periodOffset >= 0;
  const C = getChartColors();
  const visibleStations = selectedStationId
    ? allowedStations().filter(s => s.id === selectedStationId)
    : allowedStations();

  const totalPresence = entries.reduce((s,e) => s + totalForEntry(e), 0);
  const avgPerDay = (totalPresence / period).toFixed(1);
  const stationsActive = new Set(entries.map(e => e.stationId)).size;

  let compliant=0, total=0;
  entries.forEach(entry => {
    const station = getStation(entry.stationId);
    if (!station) return;
    state.roles.forEach(role => {
      const min = (station.minStaff||{})[role]||0;
      if (min > 0) { total++; if ((entry.counts[role]||0) >= min) compliant++; }
    });
  });
  const compliancePct = total ? Math.round((compliant/total)*100) : 100;
  const compColor = compliancePct>=90 ? '#52c07a' : compliancePct>=70 ? '#e07a3a' : '#e05252';

  const periodSubLabel = {1:'היום',7:'שבוע',30:'חודש',90:'רבעון',365:'שנה'}[period] || period+' ימים';
  const cards = [
    { label: 'סה"כ עובדים', value: totalPresence, sub: periodSubLabel, color:'#e8c547', icon:'🍽' },
    { label: 'ממוצע ליום',  value: avgPerDay,     sub: 'כלל התחנות',  color:'#5aa0e0', icon:'📅' },
    { label: 'תחנות פעילות',value: stationsActive+'/'+visibleStations.length, sub:'דיווחו', color:'#9b7fe8', icon:'🏪' },
    { label: 'עמידה בדרישות',value: compliancePct+'%', sub:'מינימום כ"א', color:compColor, icon:'✅' },
  ];

  document.getElementById('summaryCards').innerHTML = cards.map(c=>`
    <div class="summary-card" style="--card-color:${c.color}">
      <div class="summary-label">${c.label}</div>
      <div class="summary-value">${c.value}</div>
      <div class="summary-sub">${c.sub}</div>
      <div class="food-deco">${c.icon}</div>
    </div>`).join('');

  // Build station data: actual vs required
  const stationTotals = visibleStations.map(s=>{
    const stEntries = entries.filter(e=>e.stationId===s.id);
    const actual = stEntries.length
      ? Math.round(stEntries.reduce((sum,e)=>sum+totalForEntry(e),0) / stEntries.length)
      : 0;
    const required = state.roles.reduce((sum,r)=>sum+((s.minStaff||{})[r]||0),0);
    return { id:s.id, name:s.name, actual, required, stEntries };
  });

  destroyChart(chartStation);
  chartStation = new Chart(document.getElementById('chartByStation'),{
    type:'bar',
    data:{
      labels: stationTotals.map(s=>s.name),
      datasets:[
        {
          label:'בפועל (ממוצע יומי)',
          data: stationTotals.map(s=>s.actual),
          backgroundColor: C.palette.map(c=>c+'cc'),
          borderColor: C.palette,
          borderWidth:2, borderRadius:5
        },
        {
          label:'נדרש לפי חוזה',
          data: stationTotals.map(s=>s.required),
          backgroundColor: 'rgba(180,180,180,0.15)',
          borderColor: 'rgba(180,180,180,0.6)',
          borderWidth:2, borderRadius:5,
          borderDash:[4,4]
        }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{
          display:true, position:'top',
          labels:{color:C.tick, font:{family:'Heebo',size:11}, padding:12, boxWidth:14}
        },
        tooltip:{
          callbacks:{
            afterBody: (items) => {
              const idx = items[0].dataIndex;
              const s = stationTotals[idx];
              const pct = s.required>0 ? Math.round((s.actual/s.required)*100) : 100;
              return ['', `עמידה: ${pct}%`, 'לחץ לפירוט לפי תפקיד'];
            }
          }
        }
      },
      onClick:(evt, elements)=>{
        if(elements.length>0){
          const idx = elements[0].index;
          openStationDrilldown(stationTotals[idx], entries, C);
        }
      },
      scales:{
        x:{ticks:{color:C.tick,font:{family:'Heebo'}},grid:{color:C.grid}},
        y:{ticks:{color:C.tick},grid:{color:C.grid},
          title:{display:true,text:'עובדים',color:C.tick,font:{family:'Heebo',size:11}}}
      }
    }
  });

  const roleTotals = state.roles.map(role=>({
    role, emoji:roleEmoji(role),
    total:entries.reduce((s,e)=>s+(e.counts[role]||0),0)
  })).filter(r=>r.total>0);
  destroyChart(chartRole);
  chartRole = new Chart(document.getElementById('chartByRole'),{
    type:'doughnut',
    data:{ labels:roleTotals.map(r=>r.emoji+' '+r.role), datasets:[{
      data:roleTotals.map(r=>r.total),
      backgroundColor:roleTotals.map((_,i)=>C.palette[i%C.palette.length]+'bb'),
      borderColor: document.documentElement.getAttribute('data-theme')==='light'?'#ffffff':'#161616',
      borderWidth:2, hoverOffset:6
    }]},
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:true,position:'bottom',labels:{color:C.tick,font:{family:'Heebo',size:11},padding:8,boxWidth:12}}}
    }
  });

  // Build trend using period range
  const trendDays = period === 1 ? 30 : period;
  const trendTo = new Date(toDate);
  const trendFrom = new Date(trendTo);
  if (period === 1) { trendFrom.setDate(trendFrom.getDate() - 29); }
  else { trendFrom.setTime(fromDate.getTime()); }
  const daysArr = [];
  for (let d = new Date(trendFrom); d <= trendTo; d.setDate(d.getDate()+1)) {
    daysArr.push(d.toISOString().slice(0,10));
  }
  // Use all entries in the trend window (not just the selected period)
  // but filtered by station and user permissions
  const allFilteredEntries = state.entries
    .filter(e=>{ if(!isAdmin()) return currentUser.stationIds.includes(e.stationId); return true; })
    .filter(e=> selectedStationId ? e.stationId===selectedStationId : true);

  const trendData = daysArr.map(date=>({
    date,
    total: allFilteredEntries.filter(e=>e.date===date).reduce((s,e)=>s+totalForEntry(e),0)
  }));
  const maxTicks = trendDays <= 7 ? trendDays : trendDays <= 30 ? 10 : 12;
  destroyChart(chartTrend);
  chartTrend = new Chart(document.getElementById('chartTrend'),{
    type:'line',
    data:{ labels:daysArr.map(d=>formatDate(d)), datasets:[{
      label:'עובדים', data:trendData.map(d=>d.total),
      borderColor:'#e8c547', backgroundColor:'rgba(232,197,71,0.07)',
      fill:true, tension:0.35, pointRadius: trendDays<=7?5:3, pointBackgroundColor:'#e8c547'
    }]},
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{
        x:{ticks:{color:C.tick,maxTicksLimit:maxTicks,font:{family:'Heebo'}},grid:{color:C.grid}},
        y:{ticks:{color:C.tick},grid:{color:C.grid}}
      }
    }
  });

  document.getElementById('stationSummaryTable').innerHTML = `<table>
    <thead><tr><th>תחנה</th>${state.roles.map(r=>`<th>${roleEmoji(r)} ${r}</th>`).join('')}<th>סה"כ</th><th>ציות</th></tr></thead>
    <tbody>${visibleStations.map(station=>{
      const stEntries=entries.filter(e=>e.stationId===station.id);
      const roleSums={}; let sTotal=0, sC=0, sR=0;
      state.roles.forEach(role=>{
        const sum=stEntries.reduce((s,e)=>s+(e.counts[role]||0),0);
        roleSums[role]=sum; sTotal+=sum;
        const min=(station.minStaff||{})[role]||0;
        if(min>0){sR++;if(sum/Math.max(stEntries.length,1)>=min)sC++;}
      });
      const pct=sR?Math.round((sC/sR)*100):100;
      const cls=pct>=90?'badge-ok':pct>=70?'badge-warn':'badge-danger';
      return `<tr><td><strong>${station.name}</strong></td>${state.roles.map(r=>`<td>${roleSums[r]||0}</td>`).join('')}<td><strong>${sTotal}</strong></td><td><span class="badge ${cls}">${pct}%</span></td></tr>`;
    }).join('')}</tbody></table>`;
}


// ─────────────────────────────────────────────
// STATION DRILLDOWN MODAL
// ─────────────────────────────────────────────
let drillChart = null;

function openStationDrilldown(stationData, entries, C) {
  const modal = document.getElementById('drilldownModal');
  const title = document.getElementById('drilldownTitle');
  const station = getStation(stationData.id);
  title.textContent = '📊 ' + stationData.name;

  const stEntries = entries.filter(e=>e.stationId===stationData.id);
  const days = stEntries.length || 1;

  const roleData = state.roles.map(role => {
    const avgActual = Math.round(stEntries.reduce((s,e)=>s+(e.counts[role]||0),0) / days);
    const required = station ? ((station.minStaff||{})[role]||0) : 0;
    return { role, avgActual, required };
  }).filter(r => r.avgActual > 0 || r.required > 0);

  // Summary line
  const pct = stationData.required > 0
    ? Math.round((stationData.actual / stationData.required) * 100) : 100;
  const pctColor = pct>=90?'var(--green)':pct>=70?'var(--orange)':'var(--red)';
  document.getElementById('drilldownSummary').innerHTML =
    `ממוצע יומי: <strong>${stationData.actual}</strong> עובדים &nbsp;|&nbsp; נדרש: <strong>${stationData.required}</strong> &nbsp;|&nbsp; עמידה: <strong style="color:${pctColor}">${pct}%</strong>`;

  destroyChart(drillChart);
  const canvas = document.getElementById('drilldownChart');
  drillChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: roleData.map(r => roleEmoji(r.role) + ' ' + r.role),
      datasets: [
        {
          label: 'בפועל (ממוצע יומי)',
          data: roleData.map(r => r.avgActual),
          backgroundColor: roleData.map((r,i) => C.palette[i%C.palette.length]+'cc'),
          borderColor:     roleData.map((r,i) => C.palette[i%C.palette.length]),
          borderWidth:2, borderRadius:4
        },
        {
          label: 'נדרש לפי חוזה',
          data: roleData.map(r => r.required),
          backgroundColor: 'rgba(180,180,180,0.12)',
          borderColor: 'rgba(180,180,180,0.5)',
          borderWidth:2, borderRadius:4
        }
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      indexAxis: 'y',
      plugins:{
        legend:{display:true,position:'top',labels:{color:C.tick,font:{family:'Heebo',size:11},padding:10,boxWidth:12}},
        tooltip:{
          callbacks:{
            afterLabel:(item)=>{
              if(item.datasetIndex===0){
                const r = roleData[item.dataIndex];
                if(r.required>0){
                  const p=Math.round((r.avgActual/r.required)*100);
                  return `עמידה: ${p}%`;
                }
              }
              return '';
            }
          }
        }
      },
      scales:{
        x:{ticks:{color:C.tick},grid:{color:C.grid}},
        y:{ticks:{color:C.tick,font:{family:'Heebo',size:12}},grid:{color:C.grid}}
      }
    }
  });

  modal.style.display='flex';
}

document.getElementById('drilldownClose').addEventListener('click',()=>{
  document.getElementById('drilldownModal').style.display='none';
  destroyChart(drillChart); drillChart=null;
});
document.getElementById('drilldownModal').addEventListener('click', e=>{
  if(e.target===document.getElementById('drilldownModal')){
    document.getElementById('drilldownModal').style.display='none';
    destroyChart(drillChart); drillChart=null;
  }
});

function destroyChart(chart) { if(chart){try{chart.destroy();}catch(e){}} }
document.getElementById('dashboardPeriod').addEventListener('change', () => {
  periodOffset = 0;
  renderDashboard();
});
document.getElementById('dashboardStation').addEventListener('change', renderDashboard);

// Period navigation
let periodOffset = 0; // 0 = current, -1 = previous period, +1 = next period (future, capped at 0)

document.getElementById('periodPrev').addEventListener('click', () => {
  periodOffset--;
  renderDashboard();
});
document.getElementById('periodNext').addEventListener('click', () => {
  if (periodOffset < 0) { periodOffset++; renderDashboard(); }
});

// ─────────────────────────────────────────────
// ENTRY PAGE
// ─────────────────────────────────────────────
function renderEntry() {
  const dateInput = document.getElementById('entryDate');
  if (!dateInput.value) dateInput.value = today();

  const allowed = allowedStations();
  const stationSel = document.getElementById('entryStation');
  const prevVal = stationSel.value;

  if (!isAdmin() && allowed.length === 1) {
    // Single-station user: lock the dropdown
    stationSel.innerHTML = `<option value="${allowed[0].id}">${allowed[0].name}</option>`;
    stationSel.disabled = true;
  } else {
    stationSel.disabled = false;
    stationSel.innerHTML = '<option value="">— בחר תחנה —</option>' +
      allowed.map(s=>`<option value="${s.id}"${s.id===prevVal?' selected':''}>${s.name}</option>`).join('');
  }

  renderRoleInputs();
  renderRecentEntries();
}

function renderRoleInputs() {
  const stationId = document.getElementById('entryStation').value;
  const station = getStation(stationId);
  const container = document.getElementById('entryRoles');
  if (!stationId) {
    container.innerHTML = '<div class="empty-state"><span class="emoji">👆</span>בחר תחנה להזנת נוכחות</div>';
    return;
  }
  const date = document.getElementById('entryDate').value;
  const existing = state.entries.find(e=>e.stationId===stationId && e.date===date); // undefined if not found
  const existingNote = existing ? (existing.note || '') : '';
  container.innerHTML = state.roles.map(role=>{
    const min = station?((station.minStaff||{})[role]||0):0;
    const val = existing !== undefined ? (existing.counts[role]||0) : min;
    return `<div class="role-input-card">
      <div class="role-input-info">
        <span class="role-emoji">${roleEmoji(role)}</span>
        <div><div class="role-name">${role}</div>${min>0?`<div class="role-required">נדרש: ${min}</div>`:''}</div>
      </div>
      <input class="role-count-input" type="number" min="0" max="99" value="${val}" placeholder="0" data-role="${role}" />
    </div>`;
  }).join('') + `
  <div class="entry-note-wrap">
    <label class="entry-note-label">💬 הערה לתחנה (אופציונלי)</label>
    <textarea id="entryNote" class="entry-note-input" placeholder="הוסף הערה חופשית לגבי המשמרת...">${existingNote}</textarea>
  </div>`;
}

document.getElementById('entryStation').addEventListener('change', renderRoleInputs);
document.getElementById('entryDate').addEventListener('change', renderRoleInputs);

document.getElementById('btnSaveEntry').addEventListener('click', ()=>{
  const date = document.getElementById('entryDate').value;
  const stationId = document.getElementById('entryStation').value;
  if (!date||!stationId) { showMsg('saveMsg','יש לבחור תאריך ותחנה','#e05252'); return; }
  if (!isAdmin() && !currentUser.stationIds.includes(stationId)) {
    showMsg('saveMsg','אין הרשאה לתחנה זו','#e05252'); return;
  }
  const counts={};
  document.querySelectorAll('.role-count-input').forEach(input=>{
    counts[input.dataset.role]=parseInt(input.value)||0;
  });
  const note = document.getElementById('entryNote') ? document.getElementById('entryNote').value.trim() : '';
  state.entries = state.entries.filter(e=>!(e.stationId===stationId && e.date===date));
  state.entries.push({ id:'e'+Date.now(), date, stationId, counts, note, byUser: currentUser.id });
  saveState();
  showMsg('saveMsg','✓ הנוכחות נשמרה בהצלחה');
  renderRecentEntries();
});

function showMsg(id,msg,color='#52c07a') {
  const el=document.getElementById(id);
  el.style.color=color; el.textContent=msg;
  setTimeout(()=>{ el.textContent=''; },3000);
}

function renderRecentEntries() {
  const sorted=[...state.entries].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10);
  const container=document.getElementById('recentEntries');
  if(!sorted.length){container.innerHTML='<div class="empty-state"><span class="emoji">📭</span>אין הזנות עדיין</div>';return;}
  container.innerHTML=sorted.map(e=>{
    const s=getStation(e.stationId);
    const entryUser=state.users.find(u=>u.id===e.byUser);
    const pills=state.roles.filter(r=>e.counts[r]>0)
      .map(r=>`<span class="role-pill">${roleEmoji(r)} ${r}: ${e.counts[r]}</span>`).join('');
    return `<div class="recent-entry">
      <div style="flex:1">
        <div class="recent-entry-station">${s?s.name:'?'}</div>
        <div class="recent-entry-info">${formatDate(e.date)} • סה"כ: ${totalForEntry(e)}${entryUser?' • '+entryUser.name:''}</div>
        ${e.note?`<div class="recent-entry-note">💬 ${e.note}</div>`:''}
      </div>
      <div class="recent-roles-pills">${pills}</div>
    </div>`;
  }).join('');
}

// ─────────────────────────────────────────────
// HISTORY PAGE
// ─────────────────────────────────────────────
function renderHistory() {
  const stationSel=document.getElementById('historyStation');
  const prevSt=stationSel.value;
  const allowed=allowedStations();
  stationSel.innerHTML='<option value="">כל התחנות</option>'+
    allowed.map(s=>`<option value="${s.id}"${s.id===prevSt?' selected':''}>${s.name}</option>`).join('');
  const monthInput=document.getElementById('historyMonth');
  if(!monthInput.value){const now=new Date();monthInput.value=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;}
  renderHistoryTable();
}

function renderHistoryTable() {
  const stationId=document.getElementById('historyStation').value;
  const month=document.getElementById('historyMonth').value;
  let filtered=[...state.entries];
  if(!isAdmin()) filtered=filtered.filter(e=>currentUser.stationIds.includes(e.stationId));
  if(stationId) filtered=filtered.filter(e=>e.stationId===stationId);
  if(month) filtered=filtered.filter(e=>e.date.startsWith(month));
  filtered.sort((a,b)=>b.date.localeCompare(a.date));
  const container=document.getElementById('historyTable');
  if(!filtered.length){container.innerHTML='<div class="empty-state"><span class="emoji">🔍</span>אין נתונים לתקופה זו</div>';return;}
  container.innerHTML=`<div class="chart-card full" style="margin-top:0"><table>
    <thead><tr><th>תאריך</th><th>תחנה</th>${state.roles.map(r=>`<th>${roleEmoji(r)} ${r}</th>`).join('')}<th>סה"כ</th><th>הערה</th></tr></thead>
    <tbody>${filtered.map(e=>{
      const s=getStation(e.stationId);
      return `<tr><td>${formatDate(e.date)}</td><td><strong>${s?s.name:'?'}</strong></td>${state.roles.map(r=>{
        const val=e.counts[r]||0;
        const min=s?((s.minStaff||{})[r]||0):0;
        const ok=min===0||val>=min;
        return `<td style="color:${val===0?'var(--text3)':ok?'var(--text)':'var(--red)'}">${val}</td>`;
      }).join('')}<td><strong>${totalForEntry(e)}</strong></td><td class="history-note-cell">${e.note?`<span class="history-note">💬 ${e.note}</span>`:''}</td></tr>`;
    }).join('')}</tbody></table></div>`;
}

document.getElementById('historyStation').addEventListener('change', renderHistoryTable);
document.getElementById('historyMonth').addEventListener('change', renderHistoryTable);

// ─────────────────────────────────────────────
// STATIONS PAGE (admin only)
// ─────────────────────────────────────────────
function renderStations() {
  const container=document.getElementById('stationsList');
  if(!state.stations.length){container.innerHTML='<div class="empty-state"><span class="emoji">🏪</span>אין תחנות.</div>';return;}

  // Grand total across all stations
  const grandTotal = state.stations.reduce((sum, s) =>
    sum + state.roles.reduce((rs, r) => rs + ((s.minStaff||{})[r]||0), 0), 0);

  container.innerHTML=`
    <div class="stations-total-banner">
      <span class="stations-total-label">סה״כ כוח אדם נדרש בכל התחנות</span>
      <span class="stations-total-value">${grandTotal} עובדים</span>
    </div>
    <div class="stations-grid">${state.stations.map(s=>{
    const pills=state.roles.filter(r=>((s.minStaff||{})[r]||0)>0)
      .map(r=>`<span>${roleEmoji(r)} ${r}: ${s.minStaff[r]}</span>`).join('');
    const stationTotal = state.roles.reduce((sum,r)=>sum+((s.minStaff||{})[r]||0),0);
    return `<div class="station-card">
      <div class="station-card-name">🏪 ${s.name}</div>
      <div class="station-roles-mini">${pills||'<span style="color:var(--text3)">לא הוגדרו מינימומים</span>'}</div>
      <div class="station-total">סה״כ נדרש: <strong>${stationTotal}</strong></div>
      <div class="station-card-actions">
        <button class="btn-icon" onclick="openStationModal('${s.id}')">✏ עריכה</button>
        <button class="btn-icon danger" onclick="deleteStation('${s.id}')">✕ מחק</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}

document.getElementById('btnAddStation').addEventListener('click',()=>openStationModal(null));

function openStationModal(stationId) {
  editingStationId=stationId;
  const station=stationId?getStation(stationId):null;
  document.getElementById('modalTitle').textContent=station?'עריכת תחנה':'תחנה חדשה';
  document.getElementById('modalStationName').value=station?station.name:'';
  document.getElementById('modalRolesMin').innerHTML=`<div class="roles-min-grid">${state.roles.map(role=>{
    const min=station?((station.minStaff||{})[role]||0):0;
    return `<label class="roles-min-label">${roleEmoji(role)} ${role}</label>
      <input class="roles-min-input" type="number" min="0" max="99" value="${min}" data-role="${role}" />`;
  }).join('')}</div>`;
  document.getElementById('stationModal').style.display='flex';
}

document.getElementById('btnSaveStation').addEventListener('click',()=>{
  const name=document.getElementById('modalStationName').value.trim();
  if(!name) return alert('יש להזין שם תחנה');
  const minStaff={};
  document.querySelectorAll('.roles-min-input').forEach(input=>{ minStaff[input.dataset.role]=parseInt(input.value)||0; });
  if(editingStationId){ const s=getStation(editingStationId); s.name=name; s.minStaff=minStaff; }
  else state.stations.push({id:'s'+Date.now(),name,minStaff});
  saveState(); closeStationModal(); renderStations();
});

document.getElementById('btnCancelStation').addEventListener('click',closeStationModal);
document.getElementById('stationModal').addEventListener('click',e=>{ if(e.target===document.getElementById('stationModal')) closeStationModal(); });
function closeStationModal(){ document.getElementById('stationModal').style.display='none'; editingStationId=null; }

function deleteStation(id){
  if(!confirm('למחוק תחנה זו?')) return;
  state.stations=state.stations.filter(s=>s.id!==id);
  saveState(); renderStations();
}

// ─────────────────────────────────────────────
// USERS PAGE (admin only)
// ─────────────────────────────────────────────
let editingUserId = null;

function renderUsers() {
  const container = document.getElementById('usersList');
  container.innerHTML = state.users.map(u => {
    const stationNames = u.role === 'admin'
      ? '<span class="badge badge-ok">כל התחנות</span>'
      : (u.stationIds||[]).map(sid => {
          const s = getStation(sid);
          return s ? `<span class="station-tag">${s.name}</span>` : '';
        }).join('') || '<span style="color:var(--text3)">ללא תחנה</span>';
    return `<div class="user-card">
      <div class="user-card-left">
        <div class="user-avatar">${u.name[0]}</div>
        <div>
          <div class="user-name">${u.name} ${u.role==='admin'?'👑':''}</div>
          <div class="user-username">@${u.username}</div>
          <div class="user-stations">${stationNames}</div>
        </div>
      </div>
      <div class="user-card-actions">
        <button class="btn-icon" onclick="openUserModal('${u.id}')">✏ עריכה</button>
        ${u.id!=='u0'?`<button class="btn-icon danger" onclick="deleteUser('${u.id}')">✕ מחק</button>`:''}
      </div>
    </div>`;
  }).join('');
}

document.getElementById('btnAddUser').addEventListener('click', ()=>openUserModal(null));

function openUserModal(userId) {
  editingUserId = userId;
  const user = userId ? state.users.find(u=>u.id===userId) : null;
  document.getElementById('userModalTitle').textContent = user ? 'עריכת משתמש' : 'משתמש חדש';
  document.getElementById('modalUserName').value = user ? user.name : '';
  document.getElementById('modalUserUsername').value = user ? user.username : '';
  document.getElementById('modalUserPassword').value = '';
  document.getElementById('modalUserPassword').placeholder = user ? 'השאר ריק לאי-שינוי' : 'סיסמה';
  document.getElementById('modalUserRole').value = user ? user.role : 'station';

  renderUserStationCheckboxes(user);
  document.getElementById('userModal').style.display = 'flex';
  toggleUserStationSection();
}

function renderUserStationCheckboxes(user) {
  const container = document.getElementById('modalUserStations');
  const selectedIds = user ? (user.stationIds||[]) : [];
  container.innerHTML = state.stations.map(s => `
    <label class="station-checkbox">
      <input type="checkbox" value="${s.id}" ${selectedIds.includes(s.id)?'checked':''} />
      ${s.name}
    </label>`).join('');
}

function toggleUserStationSection() {
  const role = document.getElementById('modalUserRole').value;
  document.getElementById('stationAssignSection').style.display = role === 'admin' ? 'none' : 'block';
}

document.getElementById('modalUserRole').addEventListener('change', toggleUserStationSection);

document.getElementById('btnSaveUser').addEventListener('click', ()=>{
  const name = document.getElementById('modalUserName').value.trim();
  const username = document.getElementById('modalUserUsername').value.trim();
  const password = document.getElementById('modalUserPassword').value;
  const role = document.getElementById('modalUserRole').value;
  const stationIds = role === 'admin' ? [] :
    [...document.querySelectorAll('#modalUserStations input:checked')].map(cb=>cb.value);

  if (!name || !username) { alert('יש למלא שם ושם משתמש'); return; }

  // Check duplicate username
  const dupCheck = state.users.find(u=>u.username===username && u.id!==editingUserId);
  if (dupCheck) { alert('שם משתמש כבר קיים'); return; }

  if (editingUserId) {
    const u = state.users.find(u=>u.id===editingUserId);
    u.name=name; u.username=username; u.role=role; u.stationIds=stationIds;
    if (password) u.password=password;
  } else {
    if (!password) { alert('יש להזין סיסמה'); return; }
    state.users.push({ id:'u'+Date.now(), username, password, role, name, stationIds });
  }
  saveState();
  closeUserModal();
  renderUsers();
});

document.getElementById('btnCancelUser').addEventListener('click', closeUserModal);
document.getElementById('userModal').addEventListener('click', e=>{
  if (e.target===document.getElementById('userModal')) closeUserModal();
});

function closeUserModal() {
  document.getElementById('userModal').style.display='none';
  editingUserId=null;
}

function deleteUser(id) {
  if (id==='u0') { alert('לא ניתן למחוק את מנהל הראשי'); return; }
  if (!confirm('למחוק משתמש זה?')) return;
  state.users=state.users.filter(u=>u.id!==id);
  saveState(); renderUsers();
}

// ─────────────────────────────────────────────
// SETTINGS PAGE (admin only)
// ─────────────────────────────────────────────
function renderSettings() {
  document.getElementById('rolesList').innerHTML = state.roles.map((role,i)=>`
    <div class="roles-list-item">
      <span><span class="r-emoji">${roleEmoji(role)}</span>${role}</span>
      <button class="btn-icon danger" style="padding:4px 10px;font-size:0.75rem" onclick="deleteRole(${i})">✕</button>
    </div>`).join('');
}

function deleteRole(index) {
  if(!confirm(`למחוק תפקיד "${state.roles[index]}"?`)) return;
  state.roles.splice(index,1); saveState(); renderSettings();
}

document.getElementById('btnAddRole').addEventListener('click',()=>{
  const input=document.getElementById('newRoleName');
  const name=input.value.trim();
  if(!name) return;
  if(state.roles.includes(name)){alert('תפקיד זה כבר קיים');return;}
  state.roles.push(name); saveState(); input.value=''; renderSettings();
});
document.getElementById('newRoleName').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('btnAddRole').click();});

document.getElementById('btnExport').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`catering_backup_${today()}.json`; a.click();
});
document.getElementById('btnImport').addEventListener('click',()=>{ document.getElementById('importFile').click(); });
document.getElementById('importFile').addEventListener('change',e=>{
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=ev=>{
    try {
      const imported=JSON.parse(ev.target.result);
      if(!imported.roles||!imported.stations) throw new Error('פורמט לא תקין');
      if(!confirm('ייבוא יחליף את כל הנתונים. להמשיך?')) return;
      state=imported; saveState(); alert('יובא בהצלחה!'); renderPage(currentPage);
    } catch(err){ alert('שגיאה: '+err.message); }
  };
  reader.readAsText(file); e.target.value='';
});
document.getElementById('btnReset').addEventListener('click',()=>{
  if(!confirm('למחוק את כל הנתונים?')) return;
  if(!confirm('בטוח?')) return;
  state=defaultState(); saveState(); renderPage(currentPage); alert('נמחק.');
});

// ─────────────────────────────────────────────
// BOTTOM NAV
// ─────────────────────────────────────────────
document.querySelectorAll('.bottom-nav-item').forEach(btn=>{
  btn.addEventListener('click',()=>{
    navigate(btn.dataset.page);
    document.querySelectorAll('.bottom-nav-item').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    closeDrawer();
  });
});

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
// Load from Google Sheets first, then init
(async () => {
  await loadFromSheets();
  loadSession();
  if (currentUser) { showAppShell(); navigate('dashboard'); }
  else showLoginScreen();
})();
