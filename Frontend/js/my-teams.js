document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  const loading = document.getElementById('loading');
  const emptyState = document.getElementById('empty-state');
  const teamsGrid = document.getElementById('teams-grid');

  async function loadMyTeams() {
    try {
      loading.hidden = false;
      emptyState.hidden = true;
      teamsGrid.hidden = true;

      const teams = await apiFetch('/api/teams/mine');
      loading.hidden = true;

      if (!teams || teams.length === 0) {
        emptyState.hidden = false;
        return;
      }

      teamsGrid.hidden = false;
      teamsGrid.innerHTML = teams.map(t => {
        const roleBadge = t.is_leader
          ? '<span class="badge badge-success">Team Leader</span>'
          : '<span class="badge badge-info">Team Member</span>';

        const checkinBadge = t.checked_in
          ? '<span class="badge badge-success">Checked In</span>'
          : '<span class="badge badge-warning">Check-in Pending</span>';

        const statusBadge = `<span class="badge badge-${escapeHtml(t.hackathon_status)}">${escapeHtml(t.hackathon_status)}</span>`;

        return `
          <div class="team-card">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 12px;">
                ${statusBadge}
                ${roleBadge}
              </div>

              <h2 style="font-size: 18px; margin: 0 0 6px 0; color: var(--text-main);">${escapeHtml(t.name)}</h2>
              <p class="muted" style="font-size: 13px; margin: 0 0 16px 0;">
                Hackathon: <b>${escapeHtml(t.hackathon_title)}</b>
              </p>

              <div style="background: var(--bg-subtle); padding: 10px 14px; border-radius: var(--radius-sm); margin-bottom: 16px; font-size: 13px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span class="muted">Roster Size:</span>
                  <b>${t.member_count} member${t.member_count !== 1 ? 's' : ''}</b>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span class="muted">Invite Code:</span>
                  <code style="font-weight: 700; color: var(--brand-primary);">${escapeHtml(t.invite_code)}</code>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span class="muted">Attendance:</span>
                  ${checkinBadge}
                </div>
              </div>
            </div>

            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <a href="team.html?hackathonId=${t.hackathon_id}" class="btn btn-primary btn-sm" style="flex: 1; text-align: center;">
                Manage Team
              </a>
              <a href="checkin.html?hackathonId=${t.hackathon_id}" class="btn btn-secondary btn-sm" title="View Check-in QR pass">
                QR Pass
              </a>
              ${t.results_published ? `
                <a href="certificate.html?hackathonId=${t.hackathon_id}" class="btn btn-secondary btn-sm" style="background: #fef3c7; color: #b45309; border-color: #f59e0b;" title="View & Download Certificate">
                  Certificate
                </a>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      loading.hidden = true;
      showToast(err.message || 'Failed to load teams.', 'error');
    }
  }

  loadMyTeams();
});
