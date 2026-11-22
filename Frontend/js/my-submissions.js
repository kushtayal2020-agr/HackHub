document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;

  const loading = document.getElementById('loading');
  const emptyState = document.getElementById('empty-state');
  const submissionsGrid = document.getElementById('submissions-grid');

  async function loadSubmissions() {
    try {
      loading.hidden = false;
      emptyState.hidden = true;
      submissionsGrid.hidden = true;

      const items = await apiFetch('/api/submissions/mine');
      loading.hidden = true;

      if (!items || items.length === 0) {
        emptyState.hidden = false;
        return;
      }

      submissionsGrid.hidden = false;
      submissionsGrid.innerHTML = items.map(s => {
        const statusBadge = `<span class="badge badge-${escapeHtml(s.hackathon_status)}">${escapeHtml(s.hackathon_status)}</span>`;

        let linksHtml = '';
        if (s.github_url) {
          linksHtml += `
            <a href="${escapeHtml(s.github_url)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="display:inline-flex; align-items:center; gap:4px;">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
              GitHub Repo
            </a>
          `;
        }
        if (s.demo_url) {
          linksHtml += `
            <a href="${escapeHtml(s.demo_url)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="display:inline-flex; align-items:center; gap:4px;">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
              Live Demo
            </a>
          `;
        }
        if (s.file_path) {
          linksHtml += `
            <a href="${API_URL}/${escapeHtml(s.file_path)}" target="_blank" class="btn btn-secondary btn-sm" style="display:inline-flex; align-items:center; gap:4px;">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Attachment
            </a>
          `;
        }

        return `
          <div class="sub-card">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                ${statusBadge}
                <span class="muted" style="font-size:12px;">Submitted: ${new Date(s.submitted_at).toLocaleDateString()}</span>
              </div>

              <h2 style="font-size:18px; margin:0 0 6px 0; color:var(--text-main);">${escapeHtml(s.title)}</h2>
              <p class="muted" style="font-size:13px; margin:0 0 12px 0;">
                Event: <b>${escapeHtml(s.hackathon_title)}</b> &bull; Team: <b>${escapeHtml(s.team_name)}</b>
              </p>

              <p style="font-size:14px; color:var(--text-secondary); margin:0 0 16px 0; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">
                ${escapeHtml(s.description || 'No detailed description provided.')}
              </p>

              <div class="sub-links-bar">${linksHtml}</div>
            </div>

            <div style="border-top:1px solid var(--border-color); padding-top:16px; margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
              <a href="hackathon-detail.html?id=${s.hackathon_id}" class="btn-link" style="font-size:13px;">View Event Details &rarr;</a>
              <a href="submit.html?hackathonId=${s.hackathon_id}" class="btn btn-primary btn-sm">Edit Submission</a>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      loading.hidden = true;
      showToast(err.message || 'Failed to load submissions.', 'error');
    }
  }

  loadSubmissions();
});
