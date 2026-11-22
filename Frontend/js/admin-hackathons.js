(function () {
  const currentUser = requireRole(['admin']);
  if (!currentUser) return;

  let currentPage = 1;
  const searchInput = document.getElementById('hack-search');
  const statusFilter = document.getElementById('hack-status-filter');
  const rowsContainer = document.getElementById('hack-rows');
  const emptyEl = document.getElementById('hacks-empty');
  const pagerContainer = document.getElementById('hacks-pager');

  document.addEventListener('DOMContentLoaded', () => {
    loadHackathons();

    if (searchInput) {
      searchInput.addEventListener('input', debounce(() => {
        currentPage = 1;
        loadHackathons();
      }, 350));
    }

    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        currentPage = 1;
        loadHackathons();
      });
    }
  });

  async function loadHackathons() {
    const params = new URLSearchParams({ page: currentPage, limit: 10 });
    if (searchInput && searchInput.value.trim()) params.set('search', searchInput.value.trim());
    if (statusFilter && statusFilter.value) params.set('status', statusFilter.value);

    try {
      const data = await apiFetch('/api/admin/hackathons?' + params);
      renderHackathons(data.hackathons || []);
      if (emptyEl) emptyEl.hidden = (data.hackathons && data.hackathons.length > 0);
      renderPager(pagerContainer, data.page, data.totalPages, (p) => {
        currentPage = p;
        loadHackathons();
      });
    } catch (err) {
      showToast(err.message || 'Failed to load hackathons queue', 'error');
    }
  }

  function renderHackathons(hackathons) {
    if (!rowsContainer) return;
    rowsContainer.innerHTML = hackathons.map((h) => {
      let statusBadgeHtml = '';
      if (h.approval_status === 'approved') {
        statusBadgeHtml = '<span class="badge badge-approved">Approved</span>';
      } else if (h.approval_status === 'rejected') {
        statusBadgeHtml = '<span class="badge badge-rejected">Rejected</span>';
      } else {
        statusBadgeHtml = '<span class="badge badge-pending">Pending Review</span>';
      }

      let actionsHtml = '<div style="display:flex; gap:6px; flex-wrap:wrap;">';
      if (h.approval_status === 'pending') {
        actionsHtml += `<button type="button" class="btn btn-sm btn-primary btn-approve-hack" data-id="${h.id}">Approve</button>`;
        actionsHtml += `<button type="button" class="btn btn-sm btn-danger btn-reject-hack" data-id="${h.id}">Reject</button>`;
      } else if (h.approval_status === 'approved') {
        actionsHtml += `<a href="hackathon-detail.html?id=${h.id}" class="btn btn-sm btn-secondary" target="_blank">View Live</a>`;
        actionsHtml += `<button type="button" class="btn btn-sm btn-danger btn-reject-hack" data-id="${h.id}">Revoke</button>`;
      } else if (h.approval_status === 'rejected') {
        actionsHtml += `<button type="button" class="btn btn-sm btn-primary btn-approve-hack" data-id="${h.id}">Re-Approve</button>`;
      }
      actionsHtml += '</div>';

      return `
        <tr>
          <td>
            <strong>${escapeHtml(h.title)}</strong><br>
            <span class="muted" style="font-size:12px;">Theme: ${escapeHtml(h.theme || 'General')}</span>
          </td>
          <td>
            ${escapeHtml(h.organiser_name || 'Organiser')}<br>
            <span class="muted" style="font-size:12px;">${escapeHtml(h.organiser_email || '')}</span>
          </td>
          <td>
            <div style="font-size:12px;">
              <span>Starts: ${formatDate(h.start_date)}</span><br>
              <span class="muted">Ends: ${formatDate(h.end_date)}</span>
            </div>
          </td>
          <td><strong>${h.team_count || 0}</strong> teams</td>
          <td>${statusBadgeHtml}</td>
          <td>${actionsHtml}</td>
        </tr>
      `;
    }).join('');

    attachHackathonActions();
  }

  function attachHackathonActions() {
    // Approve hackathon
    document.querySelectorAll('.btn-approve-hack').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        try {
          await apiFetch(`/api/admin/hackathons/${id}/approval`, {
            method: 'PATCH',
            body: { status: 'approved' },
          });
          showToast('Hackathon approved and published to live directory!');
          loadHackathons();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    // Reject hackathon
    document.querySelectorAll('.btn-reject-hack').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const reason = prompt('Optional rejection reason (will be shared with organiser):');
        if (reason === null) return; // user cancelled prompt
        try {
          await apiFetch(`/api/admin/hackathons/${id}/approval`, {
            method: 'PATCH',
            body: { status: 'rejected', reason: reason.trim() },
          });
          showToast('Hackathon rejected.');
          loadHackathons();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  }
})();
