// ─────────────────────────────────────────────
// STATE & PERSISTENCE
// ─────────────────────────────────────────────
const STORAGE_KEY = 'catering_tracker_v1';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return defaultState();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function defaultState() {
  return {
    roles: ['שף', 'טבח', 'קונדיטור', 'חדר אוכל', 'שוטף כלים', 'מנהל תחנה'],
    stations: [
      { id: 's1', name: 'מטבח תל אביב מרכז', minStaff: { 'שף': 1, 'טבח': 2, 'קונדיטור': 1, 'חדר אוכל': 3, 'שוטף כלים': 1, 'מנהל תחנה': 1 } },
      { id: 's2', name: 'מטבח רמת גן',       minStaff: { 'שף': 1, 'טבח': 2, 'קונדיטור': 1, 'חדר אוכל': 2, 'שוטף כלים': 1, 'מנהל תחנה': 1 } },
      { id: 's3', name: 'מטבח ירושלים',      minStaff: { 'שף': 1, 'טבח': 1, 'קונדיטור': 0, 'חדר אוכל': 2, 'שוטף כלים': 1, 'מנהל תחנה': 1 } },
    ],
    entries: []   // [{ id, date, stationId, counts: {role: n} }]
  };
}

let state = loadState();

// ─────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────
let currentPage = 'dashboard';
let editingStationId = null;

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  currentPage = page;
  renderPage(page);
}

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    navigate(link.dataset.page);
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
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function uid() { return 's' + Math.random().toString(36).slice(2, 9); }

function formatDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function getStation(id) { return state.stations.find(s => s.id === id); }

function entriesInPeriod(days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return state.entries.filter(e => new Date(e.date) >= cutoff);
}

function totalForEntry(entry) {
  return Object.values(entry.counts || {}).reduce((a, b) => a + b, 0);
}

const ROLE_COLORS = ['#e8c547','#52c07a','#5aa0e0','#9b7fe8','#e05252','#e07a3a','#3acbb0','#c07a52'];

// ─────────────────────────────────────────────
// SIDEBAR DATE
// ─────────────────────────────────────────────
function updateSidebarDate() {
  const d = new Date();
  const days = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
  const months = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  document.getElementById('sidebarDate').textContent =
    `יום ${days[d.getDay()]}\n${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
updateSidebarDate();

// ─────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────
let chartStation = null, chartRole = null, chartTrend = null;

function renderDashboard() {
  const period = parseInt(document.getElementById('dashboardPeriod').value) || 30;
  document.getElementById('chartPeriodLabel').textContent = period + ' ימים';
  const entries = entriesInPeriod(period);

  // Summary cards
  const totalPresence = entries.reduce((s, e) => s + totalForEntry(e), 0);
  const avgPerDay = entries.length ? (totalPresence / period).toFixed(1) : 0;
  const stationsActive = new Set(entries.map(e => e.stationId)).size;

  // Compliance: for each entry, check if each role met minimum
  let compliant = 0, total = 0;
  entries.forEach(entry => {
    const station = getStation(entry.stationId);
    if (!station) return;
    state.roles.forEach(role => {
      const min = (station.minStaff || {})[role] || 0;
      if (min > 0) {
        total++;
        if ((entry.counts[role] || 0) >= min) compliant++;
      }
    });
  });
  const compliancePct = total ? Math.round((compliant / total) * 100) : 100;
  const compColor = compliancePct >= 90 ? 'var(--green)' : compliancePct >= 70 ? 'var(--orange)' : 'var(--red)';

  const cards = [
    { label: 'סה"כ עובדים (תקופה)', value: totalPresence, sub: period + ' ימים', color: 'var(--accent)' },
    { label: 'ממוצע עובדים ליום', value: avgPerDay, sub: 'כלל התחנות', color: 'var(--blue)' },
    { label: 'תחנות פעילות', value: stationsActive + '/' + state.stations.length, sub: 'תחנות דיווחו', color: 'var(--purple)' },
    { label: 'עמידה בדרישות', value: compliancePct + '%', sub: 'כוח אדם מינימלי', color: compColor },
  ];

  const grid = document.getElementById('summaryCards');
  grid.innerHTML = cards.map(c => `
    <div class="summary-card" style="--card-color:${c.color}">
      <div class="summary-label">${c.label}</div>
      <div class="summary-value">${c.value}</div>
      <div class="summary-sub">${c.sub}</div>
    </div>`).join('');

  // Chart: by station (bar)
  const stationTotals = state.stations.map(s => ({
    name: s.name,
    total: entries.filter(e => e.stationId === s.id).reduce((sum, e) => sum + totalForEntry(e), 0)
  }));

  destroyChart(chartStation);
  chartStation = new Chart(document.getElementById('chartByStation'), {
    type: 'bar',
    data: {
      labels: stationTotals.map(s => s.name),
      datasets: [{
        label: 'סה"כ נוכחות',
        data: stationTotals.map(s => s.total),
        backgroundColor: stationTotals.map((_, i) => ROLE_COLORS[i % ROLE_COLORS.length] + 'cc'),
        borderColor: stationTotals.map((_, i) => ROLE_COLORS[i % ROLE_COLORS.length]),
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#9a9690', font: { family: 'Heebo' } }, grid: { color: '#2e2e2e' } },
        y: { ticks: { color: '#9a9690' }, grid: { color: '#2e2e2e' } }
      }
    }
  });

  // Chart: by role (doughnut)
  const roleTotals = state.roles.map(role => ({
    role,
    total: entries.reduce((s, e) => s + (e.counts[role] || 0), 0)
  })).filter(r => r.total > 0);

  destroyChart(chartRole);
  chartRole = new Chart(document.getElementById('chartByRole'), {
    type: 'doughnut',
    data: {
      labels: roleTotals.map(r => r.role),
      datasets: [{
        data: roleTotals.map(r => r.total),
        backgroundColor: roleTotals.map((_, i) => ROLE_COLORS[i % ROLE_COLORS.length] + 'cc'),
        borderColor: '#171717',
        borderWidth: 2,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true, position: 'bottom',
          labels: { color: '#9a9690', font: { family: 'Heebo', size: 11 }, padding: 10, boxWidth: 12 }
        }
      }
    }
  });

  // Chart: trend (line)
  const days = [];
  for (let i = period - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const trendData = days.map(date => ({
    date,
    total: state.entries.filter(e => e.date === date).reduce((s, e) => s + totalForEntry(e), 0)
  }));

  destroyChart(chartTrend);
  chartTrend = new Chart(document.getElementById('chartTrend'), {
    type: 'line',
    data: {
      labels: days.map(d => formatDate(d)),
      datasets: [{
        label: 'עובדים',
        data: trendData.map(d => d.total),
        borderColor: '#e8c547',
        backgroundColor: 'rgba(232,197,71,0.08)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: '#e8c547'
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#9a9690', maxTicksLimit: 10, font: { family: 'Heebo' } }, grid: { color: '#2e2e2e' } },
        y: { ticks: { color: '#9a9690' }, grid: { color: '#2e2e2e' } }
      }
    }
  });

  // Station summary table
  const tableHtml = `<table>
    <thead><tr>
      <th>תחנה</th>
      ${state.roles.map(r => `<th>${r}</th>`).join('')}
      <th>סה"כ</th>
      <th>ציות</th>
    </tr></thead>
    <tbody>
    ${state.stations.map(station => {
      const stEntries = entries.filter(e => e.stationId === station.id);
      const roleSums = {};
      let sTotal = 0, sCompliant = 0, sReqTotal = 0;
      state.roles.forEach(role => {
        const sum = stEntries.reduce((s, e) => s + (e.counts[role] || 0), 0);
        roleSums[role] = sum;
        sTotal += sum;
        const min = (station.minStaff || {})[role] || 0;
        if (min > 0) { sReqTotal++; if (sum / Math.max(stEntries.length, 1) >= min) sCompliant++; }
      });
      const pct = sReqTotal ? Math.round((sCompliant / sReqTotal) * 100) : 100;
      const cls = pct >= 90 ? 'badge-ok' : pct >= 70 ? 'badge-warn' : 'badge-danger';
      return `<tr>
        <td><strong>${station.name}</strong></td>
        ${state.roles.map(r => `<td>${roleSums[r] || 0}</td>`).join('')}
        <td><strong>${sTotal}</strong></td>
        <td><span class="badge ${cls}">${pct}%</span></td>
      </tr>`;
    }).join('')}
    </tbody>
  </table>`;
  document.getElementById('stationSummaryTable').innerHTML = tableHtml;
}

function destroyChart(chart) {
  if (chart) { try { chart.destroy(); } catch(e) {} }
}

document.getElementById('dashboardPeriod').addEventListener('change', renderDashboard);

// ─────────────────────────────────────────────
// ENTRY PAGE
// ─────────────────────────────────────────────
function renderEntry() {
  // Set today's date
  const dateInput = document.getElementById('entryDate');
  if (!dateInput.value) dateInput.value = today();

  // Populate stations
  const stationSel = document.getElementById('entryStation');
  const prevVal = stationSel.value;
  stationSel.innerHTML = '<option value="">— בחר תחנה —</option>' +
    state.stations.map(s => `<option value="${s.id}"${s.id === prevVal ? ' selected' : ''}>${s.name}</option>`).join('');

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

  // Check if entry already exists for this day+station
  const date = document.getElementById('entryDate').value;
  const existing = state.entries.find(e => e.stationId === stationId && e.date === date);

  container.innerHTML = state.roles.map(role => {
    const min = station ? ((station.minStaff || {})[role] || 0) : 0;
    const val = existing ? (existing.counts[role] || 0) : '';
    return `<div class="role-input-card">
      <div>
        <div class="role-name">${role}</div>
        ${min > 0 ? `<div class="role-required">נדרש מינימום: ${min}</div>` : ''}
      </div>
      <input class="role-count-input" type="number" min="0" max="99" value="${val}" placeholder="0"
        data-role="${role}" />
    </div>`;
  }).join('');
}

document.getElementById('entryStation').addEventListener('change', renderRoleInputs);
document.getElementById('entryDate').addEventListener('change', renderRoleInputs);

document.getElementById('btnSaveEntry').addEventListener('click', () => {
  const date = document.getElementById('entryDate').value;
  const stationId = document.getElementById('entryStation').value;
  if (!date || !stationId) {
    showMsg('saveMsg', 'יש לבחור תאריך ותחנה', 'var(--red)');
    return;
  }

  const counts = {};
  document.querySelectorAll('.role-count-input').forEach(input => {
    counts[input.dataset.role] = parseInt(input.value) || 0;
  });

  // Remove existing entry for same day+station
  state.entries = state.entries.filter(e => !(e.stationId === stationId && e.date === date));
  state.entries.push({ id: uid(), date, stationId, counts });
  saveState();
  showMsg('saveMsg', '✓ הנוכחות נשמרה בהצלחה');
  renderRecentEntries();
});

function showMsg(id, msg, color = 'var(--green)') {
  const el = document.getElementById(id);
  el.style.color = color;
  el.textContent = msg;
  setTimeout(() => { el.textContent = ''; }, 3000);
}

function renderRecentEntries() {
  const sorted = [...state.entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  const container = document.getElementById('recentEntries');
  if (!sorted.length) {
    container.innerHTML = '<div class="empty-state"><span class="emoji">📭</span>אין הזנות עדיין</div>';
    return;
  }
  container.innerHTML = sorted.map(e => {
    const s = getStation(e.stationId);
    const pills = state.roles
      .filter(r => e.counts[r] > 0)
      .map(r => `<span class="role-pill">${r}: ${e.counts[r]}</span>`).join('');
    return `<div class="recent-entry">
      <div>
        <div class="recent-entry-station">${s ? s.name : 'תחנה לא ידועה'}</div>
        <div class="recent-entry-info">${formatDate(e.date)} • סה"כ: ${totalForEntry(e)}</div>
      </div>
      <div class="recent-roles-pills">${pills}</div>
    </div>`;
  }).join('');
}

// ─────────────────────────────────────────────
// HISTORY PAGE
// ─────────────────────────────────────────────
function renderHistory() {
  const stationSel = document.getElementById('historyStation');
  const prevSt = stationSel.value;
  stationSel.innerHTML = '<option value="">כל התחנות</option>' +
    state.stations.map(s => `<option value="${s.id}"${s.id === prevSt ? ' selected' : ''}>${s.name}</option>`).join('');

  const monthInput = document.getElementById('historyMonth');
  if (!monthInput.value) {
    const now = new Date();
    monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  renderHistoryTable();
}

function renderHistoryTable() {
  const stationId = document.getElementById('historyStation').value;
  const month = document.getElementById('historyMonth').value;

  let filtered = [...state.entries];
  if (stationId) filtered = filtered.filter(e => e.stationId === stationId);
  if (month) filtered = filtered.filter(e => e.date.startsWith(month));
  filtered.sort((a, b) => b.date.localeCompare(a.date));

  const container = document.getElementById('historyTable');
  if (!filtered.length) {
    container.innerHTML = '<div class="empty-state"><span class="emoji">🔍</span>אין נתונים לתקופה זו</div>';
    return;
  }

  const html = `<div class="chart-card full" style="margin-top:0"><table>
    <thead><tr>
      <th>תאריך</th><th>תחנה</th>
      ${state.roles.map(r => `<th>${r}</th>`).join('')}
      <th>סה"כ</th>
    </tr></thead>
    <tbody>
    ${filtered.map(e => {
      const s = getStation(e.stationId);
      return `<tr>
        <td>${formatDate(e.date)}</td>
        <td><strong>${s ? s.name : '?'}</strong></td>
        ${state.roles.map(r => {
          const val = e.counts[r] || 0;
          const st = getStation(e.stationId);
          const min = st ? ((st.minStaff || {})[r] || 0) : 0;
          const ok = min === 0 || val >= min;
          return `<td style="color:${val === 0 ? 'var(--text3)' : ok ? 'var(--text)' : 'var(--red)'}">${val}</td>`;
        }).join('')}
        <td><strong>${totalForEntry(e)}</strong></td>
      </tr>`;
    }).join('')}
    </tbody>
  </table></div>`;
  container.innerHTML = html;
}

document.getElementById('historyStation').addEventListener('change', renderHistoryTable);
document.getElementById('historyMonth').addEventListener('change', renderHistoryTable);

// ─────────────────────────────────────────────
// STATIONS PAGE
// ─────────────────────────────────────────────
function renderStations() {
  const container = document.getElementById('stationsList');
  if (!state.stations.length) {
    container.innerHTML = '<div class="empty-state"><span class="emoji">🏪</span>אין תחנות. הוסף תחנה חדשה.</div>';
    return;
  }

  container.innerHTML = `<div class="stations-grid">${state.stations.map(s => {
    const pills = state.roles.filter(r => ((s.minStaff || {})[r] || 0) > 0)
      .map(r => `<span>${r}: ${s.minStaff[r]}</span>`).join('');
    return `<div class="station-card">
      <div class="station-card-name">${s.name}</div>
      <div class="station-roles-mini">${pills || '<span style="color:var(--text3)">לא הוגדרו מינימומים</span>'}</div>
      <div class="station-card-actions">
        <button class="btn-icon" onclick="openStationModal('${s.id}')">✏ עריכה</button>
        <button class="btn-icon danger" onclick="deleteStation('${s.id}')">✕ מחק</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}

document.getElementById('btnAddStation').addEventListener('click', () => openStationModal(null));

function openStationModal(stationId) {
  editingStationId = stationId;
  const station = stationId ? getStation(stationId) : null;
  document.getElementById('modalTitle').textContent = station ? 'עריכת תחנה' : 'תחנה חדשה';
  document.getElementById('modalStationName').value = station ? station.name : '';

  const rolesGrid = document.getElementById('modalRolesMin');
  rolesGrid.innerHTML = `<div class="roles-min-grid">
    ${state.roles.map(role => {
      const min = station ? ((station.minStaff || {})[role] || 0) : 0;
      return `<label class="roles-min-label">${role}</label>
        <input class="roles-min-input" type="number" min="0" max="99" value="${min}" data-role="${role}" />`;
    }).join('')}
  </div>`;

  document.getElementById('stationModal').style.display = 'flex';
}

document.getElementById('btnSaveStation').addEventListener('click', () => {
  const name = document.getElementById('modalStationName').value.trim();
  if (!name) return alert('יש להזין שם תחנה');

  const minStaff = {};
  document.querySelectorAll('.roles-min-input').forEach(input => {
    minStaff[input.dataset.role] = parseInt(input.value) || 0;
  });

  if (editingStationId) {
    const s = getStation(editingStationId);
    s.name = name;
    s.minStaff = minStaff;
  } else {
    state.stations.push({ id: uid(), name, minStaff });
  }
  saveState();
  closeStationModal();
  renderStations();
});

document.getElementById('btnCancelStation').addEventListener('click', closeStationModal);
document.getElementById('stationModal').addEventListener('click', e => {
  if (e.target === document.getElementById('stationModal')) closeStationModal();
});

function closeStationModal() {
  document.getElementById('stationModal').style.display = 'none';
  editingStationId = null;
}

function deleteStation(id) {
  if (!confirm('למחוק תחנה זו? כל ההזנות המשויכות אליה יישארו אך ללא שיוך.')) return;
  state.stations = state.stations.filter(s => s.id !== id);
  saveState();
  renderStations();
}

// ─────────────────────────────────────────────
// SETTINGS PAGE
// ─────────────────────────────────────────────
function renderSettings() {
  // Roles list
  const container = document.getElementById('rolesList');
  container.innerHTML = state.roles.map((role, i) => `
    <div class="roles-list-item">
      <span>${role}</span>
      <button class="btn-icon danger" style="padding:4px 10px;font-size:0.75rem" onclick="deleteRole(${i})">✕</button>
    </div>`).join('');
}

function deleteRole(index) {
  if (!confirm(`למחוק תפקיד "${state.roles[index]}"? הנתונים ההיסטוריים יישמרו.`)) return;
  state.roles.splice(index, 1);
  saveState();
  renderSettings();
}

document.getElementById('btnAddRole').addEventListener('click', () => {
  const input = document.getElementById('newRoleName');
  const name = input.value.trim();
  if (!name) return;
  if (state.roles.includes(name)) { alert('תפקיד זה כבר קיים'); return; }
  state.roles.push(name);
  saveState();
  input.value = '';
  renderSettings();
});

document.getElementById('newRoleName').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btnAddRole').click();
});

// Export
document.getElementById('btnExport').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `catering_backup_${today()}.json`;
  a.click();
});

// Import
document.getElementById('btnImport').addEventListener('click', () => {
  document.getElementById('importFile').click();
});
document.getElementById('importFile').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const imported = JSON.parse(ev.target.result);
      if (!imported.roles || !imported.stations) throw new Error('פורמט לא תקין');
      if (!confirm('ייבוא יחליף את כל הנתונים הנוכחיים. להמשיך?')) return;
      state = imported;
      saveState();
      alert('הנתונים יובאו בהצלחה!');
      renderPage(currentPage);
    } catch(err) {
      alert('שגיאה בקובץ: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// Reset
document.getElementById('btnReset').addEventListener('click', () => {
  if (!confirm('האם למחוק את כל הנתונים? פעולה זו אינה הפיכה.')) return;
  if (!confirm('בטוח? כל ההיסטוריה תמחק.')) return;
  state = defaultState();
  saveState();
  renderPage(currentPage);
  alert('הנתונים נמחקו.');
});

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
navigate('dashboard');
