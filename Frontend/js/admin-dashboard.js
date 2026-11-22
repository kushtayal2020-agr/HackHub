(function () {
  const user = requireRole(['admin']);
  if (!user) return;

  let chartStatusInstance = null;
  let chartRegistrationsInstance = null;
  let chartSubmissionsInstance = null;

  document.addEventListener('DOMContentLoaded', () => {
    loadDashboardStats();

    // Listen for theme toggle to adapt chart grid & text colors
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        setTimeout(loadDashboardStats, 100);
      });
    }
  });

  async function loadDashboardStats() {
    try {
      const data = await apiFetch('/api/admin/stats');
      renderMetricCards(data);
      renderCharts(data);
    } catch (err) {
      showToast(err.message || 'Failed to load admin stats', 'error');
    }
  }

  function renderMetricCards(data) {
    const { users, hackathons, teams, submissions } = data;

    // Users metric
    document.getElementById('stat-total-users').textContent = users.total || 0;
    document.getElementById('stat-users-breakdown').textContent =
      `${users.byRole.participant || 0} participants, ${users.byRole.organiser || 0} organisers, ${users.byRole.judge || 0} judges`;

    // Organisers & blocked metric
    document.getElementById('stat-pending-orgs').textContent = users.pendingOrganisers || 0;
    document.getElementById('stat-blocked-users').textContent = `${users.blocked || 0} blocked user accounts`;

    // Hackathons metric
    document.getElementById('stat-total-hacks').textContent = hackathons.total || 0;
    document.getElementById('stat-hacks-breakdown').textContent =
      `${hackathons.approved || 0} approved (${hackathons.live || 0} live), ${hackathons.pending || 0} pending`;

    // Teams & Submissions metric
    document.getElementById('stat-teams-subs').textContent = `${teams || 0} / ${submissions || 0}`;
  }

  function renderCharts(data) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#cbd5e1' : '#475569';
    const gridColor = isDark ? '#1e2c44' : '#e2e8f0';

    const { hackathons, registrationsPerDay, submissionsPerHackathon } = data;

    // 1. Hackathons by status (Doughnut)
    const ctxStatus = document.getElementById('chart-status');
    if (ctxStatus) {
      if (chartStatusInstance) chartStatusInstance.destroy();

      const statusValues = [
        hackathons.approved || 0,
        hackathons.pending || 0,
        hackathons.rejected || 0
      ];
      const hasStatusData = statusValues.some(v => v > 0);

      chartStatusInstance = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
          labels: ['Approved', 'Pending', 'Rejected'],
          datasets: [{
            data: hasStatusData ? statusValues : [1],
            backgroundColor: hasStatusData
              ? ['#10b981', '#f59e0b', '#ef4444']
              : [isDark ? '#334155' : '#e2e8f0'],
            borderWidth: 2,
            borderColor: isDark ? '#111a2e' : '#ffffff',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: textColor, font: { size: 12 } },
            },
          },
        },
      });
    }

    // 2. Registrations per day (Line)
    const ctxReg = document.getElementById('chart-registrations');
    if (ctxReg) {
      if (chartRegistrationsInstance) chartRegistrationsInstance.destroy();

      const regLabels = (registrationsPerDay || []).map(r => r.date.slice(5));
      const regCounts = (registrationsPerDay || []).map(r => r.count);

      chartRegistrationsInstance = new Chart(ctxReg, {
        type: 'line',
        data: {
          labels: regLabels.length ? regLabels : ['No recent data'],
          datasets: [{
            label: 'Attendees Joined',
            data: regCounts.length ? regCounts : [0],
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: { color: gridColor },
              ticks: { color: textColor },
            },
            y: {
              beginAtZero: true,
              grid: { color: gridColor },
              ticks: { color: textColor, precision: 0 },
            },
          },
          plugins: {
            legend: { display: false },
          },
        },
      });
    }

    // 3. Submissions per hackathon (Bar)
    const ctxSub = document.getElementById('chart-submissions');
    if (ctxSub) {
      if (chartSubmissionsInstance) chartSubmissionsInstance.destroy();

      const subLabels = (submissionsPerHackathon || []).map(s => s.title.slice(0, 16) + '...');
      const subCounts = (submissionsPerHackathon || []).map(s => s.count);

      chartSubmissionsInstance = new Chart(ctxSub, {
        type: 'bar',
        data: {
          labels: subLabels.length ? subLabels : ['No submissions'],
          datasets: [{
            label: 'Projects Submitted',
            data: subCounts.length ? subCounts : [0],
            backgroundColor: '#3b82f6',
            borderRadius: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: { color: gridColor },
              ticks: { color: textColor, maxRotation: 45, minRotation: 45 },
            },
            y: {
              beginAtZero: true,
              grid: { color: gridColor },
              ticks: { color: textColor, precision: 0 },
            },
          },
          plugins: {
            legend: { display: false },
          },
        },
      });
    }
  }
})();
