document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;

  const loading = document.getElementById('loading');
  const emptyState = document.getElementById('empty-state');
  const judgeGrid = document.getElementById('judge-grid');

  async function loadAssigned() {
    try {
      loading.hidden = false;
      emptyState.hidden = true;
      judgeGrid.hidden = true;

      const items = await apiFetch('/api/judges/dashboard');
      loading.hidden = true;

      if (!items || items.length === 0) {
        emptyState.hidden = false;
        return;
      }

      judgeGrid.hidden = false;
      judgeGrid.innerHTML = items.map(h => {
        const total = Number(h.total_submissions || 0);
        const done = Number(h.evaluated_submissions || 0);
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;

        const statusBadge = `<span class="badge badge-${escapeHtml(h.status)}">${escapeHtml(h.status)}</span>`;

        return `
          <div class="judge-card">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                ${statusBadge}
                ${h.results_published ? '<span class="badge badge-success">Results Published</span>' : '<span class="badge badge-warning">Evaluation Ongoing</span>'}
              </div>

              <h2 style="font-size:18px; margin:0 0 6px 0; color:var(--text-main);">${escapeHtml(h.title)}</h2>
              <p class="muted" style="font-size:13px; margin:0 0 16px 0;">
                Theme: <b>${escapeHtml(h.theme || 'General')}</b> &bull; ${h.criteria_count || 0} Rubric Criteria
              </p>

              <!-- Progress bar -->
              <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:2px;">
                <span class="muted">Evaluation Progress</span>
                <b>${done} / ${total} Evaluated (${pct}%)</b>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width: ${pct}%;"></div>
              </div>
            </div>

            <div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">
              <a href="judging.html?hackathonId=${h.id}" class="btn btn-primary btn-sm" style="flex:1; text-align:center;">
                Score Submissions
              </a>
              <a href="leaderboard.html?hackathonId=${h.id}" class="btn btn-secondary btn-sm">
                Leaderboard
              </a>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      loading.hidden = true;
      showToast(err.message || 'Failed to load assigned hackathons.', 'error');
    }
  }

  loadAssigned();
});
