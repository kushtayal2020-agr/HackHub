document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;

  const hackathonId = qs('hackathonId') || qs('id');
  if (!hackathonId) {
    showToast('No hackathon specified. Redirecting...', 'error');
    setTimeout(() => { window.location.href = 'my-hackathons.html'; }, 1500);
    return;
  }

  const pageTitle = document.getElementById('page-title');
  const subCountBadge = document.getElementById('sub-count-badge');
  const searchInput = document.getElementById('search-input');
  const loading = document.getElementById('loading');
  const emptyState = document.getElementById('empty-state');
  const tableWrap = document.getElementById('table-wrap');
  const rows = document.getElementById('rows');

  let currentSubmissions = [];

  async function loadData() {
    try {
      loading.hidden = false;
      emptyState.hidden = true;
      tableWrap.hidden = true;

      // Hackathon title
      try {
        const h = await apiFetch(`/api/hackathons/${hackathonId}`);
        pageTitle.textContent = `${h.title} - Project Submissions`;
      } catch (e) {
        pageTitle.textContent = 'Project Submissions';
      }

      const items = await apiFetch(`/api/hackathons/${hackathonId}/submissions`);
      loading.hidden = true;

      currentSubmissions = items || [];
      subCountBadge.textContent = `${currentSubmissions.length} Submission${currentSubmissions.length !== 1 ? 's' : ''}`;

      if (currentSubmissions.length === 0) {
        emptyState.hidden = false;
        return;
      }

      tableWrap.hidden = false;
      renderTable(currentSubmissions);
    } catch (err) {
      loading.hidden = true;
      showToast(err.message || 'Failed to load submissions.', 'error');
    }
  }

  function renderTable(items) {
    if (!items || items.length === 0) {
      rows.innerHTML = '<tr><td colspan="6" class="text-center pad muted">No matching submissions found.</td></tr>';
      return;
    }

    rows.innerHTML = items.map(s => {
      let repoDemoHtml = '';
      if (s.github_url) {
        repoDemoHtml += `
          <a href="${escapeHtml(s.github_url)}" target="_blank" rel="noopener noreferrer" class="btn-link" style="display:inline-flex; align-items:center; gap:4px; margin-right:8px;">
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
            GitHub
          </a>
        `;
      }
      if (s.demo_url) {
        repoDemoHtml += `
          <a href="${escapeHtml(s.demo_url)}" target="_blank" rel="noopener noreferrer" class="btn-link" style="display:inline-flex; align-items:center; gap:4px;">
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
            Live Demo
          </a>
        `;
      }

      let fileHtml = '<span class="muted">-</span>';
      if (s.file_path) {
        fileHtml = `
          <a href="${API_URL}/${escapeHtml(s.file_path)}" target="_blank" class="btn btn-secondary btn-sm" style="display:inline-flex; align-items:center; gap:4px;">
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Download
          </a>
        `;
      }

      return `
        <tr>
          <td>
            <b>${escapeHtml(s.title)}</b>
            ${s.description ? `<p class="muted" style="font-size:12px; margin:4px 0 0 0; max-width:260px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(s.description)}</p>` : ''}
          </td>
          <td>
            <b>${escapeHtml(s.team_name)}</b>
            <div class="muted" style="font-size:12px;">${s.member_count} member${s.member_count !== 1 ? 's' : ''}</div>
          </td>
          <td>
            <div>${escapeHtml(s.leader_name)}</div>
            <div class="muted" style="font-size:12px;">${escapeHtml(s.leader_email)}</div>
          </td>
          <td>${repoDemoHtml || '<span class="muted">-</span>'}</td>
          <td>${fileHtml}</td>
          <td style="font-size:13px; color:var(--text-secondary);">${new Date(s.submitted_at).toLocaleDateString()}</td>
        </tr>
      `;
    }).join('');
  }

  // Search filter
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
      renderTable(currentSubmissions);
      return;
    }
    const filtered = currentSubmissions.filter(s =>
      (s.title && s.title.toLowerCase().includes(q)) ||
      (s.team_name && s.team_name.toLowerCase().includes(q)) ||
      (s.leader_name && s.leader_name.toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q))
    );
    renderTable(filtered);
  });

  loadData();
});
