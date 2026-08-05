let chartInstance = null;
let rawHistoryData = null;
let currentMode = 'daily'; // 'daily' or 'cumulative'

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupEventListeners();
});

function setupEventListeners() {
  const btnDaily = document.getElementById('btnDaily');
  const btnCumulative = document.getElementById('btnCumulative');

  btnDaily.addEventListener('click', () => {
    currentMode = 'daily';
    btnDaily.classList.add('active');
    btnCumulative.classList.remove('active');
    renderChart();
  });

  btnCumulative.addEventListener('click', () => {
    currentMode = 'cumulative';
    btnCumulative.classList.add('active');
    btnDaily.classList.remove('active');
    renderChart();
  });
}

async function loadData() {
  try {
    const response = await fetch('./data/history.json');
    if (!response.ok) throw new Error('Data file not found');
    rawHistoryData = await response.json();
    updateDashboard();
  } catch (error) {
    console.warn('Could not load data/history.json, using fallback simulation:', error.message);
    rawHistoryData = getFallbackData();
    updateDashboard();
  }
}

function updateDashboard() {
  if (!rawHistoryData) return;

  const repo = rawHistoryData.repository || 'VuxDucGiang/view-history';
  document.getElementById('repoNameTitle').textContent = repo;

  const views = rawHistoryData.views || [];
  const totalViews = rawHistoryData.summary?.totalViews || views.reduce((acc, curr) => acc + curr.count, 0);
  const totalUniques = rawHistoryData.summary?.totalUniques || views.reduce((acc, curr) => acc + curr.uniques, 0);
  const totalDays = views.length;
  const dailyAvg = totalDays > 0 ? Math.round(totalViews / totalDays) : 0;

  document.getElementById('totalViewsVal').textContent = totalViews.toLocaleString();
  document.getElementById('uniqueViewsVal').textContent = totalUniques.toLocaleString();
  document.getElementById('dailyAvgVal').textContent = dailyAvg.toLocaleString();
  document.getElementById('totalDaysVal').textContent = totalDays;

  const lastUpdated = rawHistoryData.lastUpdated
    ? new Date(rawHistoryData.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Recently';
  document.getElementById('lastUpdatedBadge').textContent = `Updated: ${lastUpdated}`;

  renderChart();
}

function renderChart() {
  if (!rawHistoryData || !rawHistoryData.views) return;

  const ctx = document.getElementById('viewsChart').getContext('2d');
  const viewsData = rawHistoryData.views;

  const labels = viewsData.map(v => {
    const d = new Date(v.timestamp);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });

  let countDataset = [];
  let uniqueDataset = [];

  if (currentMode === 'daily') {
    countDataset = viewsData.map(v => v.count);
    uniqueDataset = viewsData.map(v => v.uniques);
  } else {
    // Cumulative Sum
    let runningCount = 0;
    let runningUniques = 0;
    countDataset = viewsData.map(v => {
      runningCount += v.count;
      return runningCount;
    });
    uniqueDataset = viewsData.map(v => {
      runningUniques += v.uniques;
      return runningUniques;
    });
  }

  // Gradients for Canvas
  const gradPurple = ctx.createLinearGradient(0, 0, 0, 300);
  gradPurple.addColorStop(0, 'rgba(139, 92, 246, 0.4)');
  gradPurple.addColorStop(1, 'rgba(139, 92, 246, 0.0)');

  const gradCyan = ctx.createLinearGradient(0, 0, 0, 300);
  gradCyan.addColorStop(0, 'rgba(6, 182, 212, 0.3)');
  gradCyan.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Total Views',
          data: countDataset,
          borderColor: '#8b5cf6',
          backgroundColor: gradPurple,
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointBackgroundColor: '#8b5cf6',
          pointRadius: 4,
          pointHoverRadius: 7
        },
        {
          label: 'Unique Visitors',
          data: uniqueDataset,
          borderColor: '#06b6d4',
          backgroundColor: gradCyan,
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          borderDash: [5, 5],
          pointBackgroundColor: '#06b6d4',
          pointRadius: 3,
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          labels: {
            color: '#9ca3af',
            font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' },
            usePointStyle: true,
            boxWidth: 8
          }
        },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.9)',
          titleColor: '#f9fafb',
          bodyColor: '#d1d5db',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          usePointStyle: true
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#6b7280', font: { family: 'Plus Jakarta Sans', size: 11 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#6b7280', font: { family: 'Plus Jakarta Sans', size: 11 } },
          beginAtZero: true
        }
      }
    }
  });
}

function copyEmbed(elementId) {
  const codeText = document.getElementById(elementId).textContent;
  navigator.clipboard.writeText(codeText).then(() => {
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    btn.style.background = '#10b981';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy text: ', err);
  });
}

function getFallbackData() {
  return {
    repository: "VuxDucGiang/view-history",
    lastUpdated: new Date().toISOString(),
    summary: { totalViews: 1375, totalUniques: 534 },
    views: [
      { timestamp: "2026-07-23T00:00:00Z", count: 45, uniques: 18 },
      { timestamp: "2026-07-24T00:00:00Z", count: 62, uniques: 24 },
      { timestamp: "2026-07-25T00:00:00Z", count: 78, uniques: 30 },
      { timestamp: "2026-07-26T00:00:00Z", count: 95, uniques: 38 },
      { timestamp: "2026-07-27T00:00:00Z", count: 110, uniques: 42 },
      { timestamp: "2026-07-28T00:00:00Z", count: 84, uniques: 31 },
      { timestamp: "2026-07-29T00:00:00Z", count: 92, uniques: 35 },
      { timestamp: "2026-07-30T00:00:00Z", count: 105, uniques: 40 },
      { timestamp: "2026-07-31T00:00:00Z", count: 120, uniques: 48 },
      { timestamp: "2026-08-01T00:00:00Z", count: 115, uniques: 43 },
      { timestamp: "2026-08-02T00:00:00Z", count: 130, uniques: 52 },
      { timestamp: "2026-08-03T00:00:00Z", count: 142, uniques: 58 },
      { timestamp: "2026-08-04T00:00:00Z", count: 102, uniques: 39 },
      { timestamp: "2026-08-05T00:00:00Z", count: 95, uniques: 36 }
    ]
  };
}
