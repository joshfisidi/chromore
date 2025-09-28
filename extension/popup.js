// popup.js
const STORAGE_KEY = "chromore_stats_v1";

function msToHMS(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
}

async function loadAndRender() {
  const r = await chrome.storage.local.get(STORAGE_KEY);
  const stats = r[STORAGE_KEY] || { perDomain: {}, totals: { timeMs: 0 }, tabCounts: { last: 0 } };

  document.getElementById("tabCount").textContent = stats.tabCounts?.last ?? 0;
  document.getElementById("totalTime").textContent = msToHMS(stats.totals?.timeMs ?? 0);

  // convert to array and sort by time
  const rows = Object.entries(stats.perDomain || {}).map(([domain, d]) => ({ domain, timeMs: d.timeMs || 0, visits: d.visits || 0, opens: d.opens || 0 }));
  rows.sort((a,b) => b.timeMs - a.timeMs);

  // fill table
  const tbody = document.querySelector("#topTable tbody");
  tbody.innerHTML = "";
  rows.slice(0,10).forEach(rw => {
    const tr = document.createElement("tr");
    const td1 = document.createElement("td");
    td1.textContent = rw.domain;
    const td2 = document.createElement("td");
    td2.textContent = msToHMS(rw.timeMs);
    tr.appendChild(td1); tr.appendChild(td2);
    tbody.appendChild(tr);
  });

  // chart (top 5)
  const labels = rows.slice(0,5).map(r => r.domain);
  const data = rows.slice(0,5).map(r => Math.round((r.timeMs||0)/1000)); // seconds
  renderChart(labels, data);
}

let chartInst = null;
function renderChart(labels, data) {
  const ctx = document.getElementById("chart").getContext("2d");
  if (chartInst) chartInst.destroy();
  chartInst = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Seconds spent",
        data
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } }
    }
  });
}

// refresh on open
loadAndRender();

// also listen for storage changes (live update)
chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEY]) loadAndRender();
});
