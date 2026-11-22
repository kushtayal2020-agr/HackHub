(function () {
  const currentUser = requireRole(['admin']);
  if (!currentUser) return;

  let currentPage = 1;
  const searchInput = document.getElementById('audit-search');
  const actionFilter = document.getElementById('audit-action-filter');
  const rowsContainer = document.getElementById('audit-rows');
  const emptyEl = document.getElementById('audit-empty');
  const pagerContainer = document.getElementById('audit-pager');

  document.addEventListener('DOMContentLoaded', () => {
    loadAuditLogs();

    if (searchInput) {
      searchInput.addEventListener('input', debounce(() => {
        currentPage = 1;
        loadAuditLogs();
      }, 350));
    }

    if (actionFilter) {
      actionFilter.addEventListener('change', () => {
        currentPage = 1;
        loadAuditLogs();
      });
    }
  });

  async function loadAuditLogs() {
    const params = new URLSearchParams({ page: currentPage, limit: 15 });
    if (searchInput && searchInput.value.trim()) params.set('search', searchInput.value.trim());
    if (actionFilter && actionFilter.value) params.set('action', actionFilter.value);

    try {
      const data = await apiFetch('/api/admin/audit-logs?' + params);
      renderLogs(data.logs || []);
      if (emptyEl) emptyEl.hidden = (data.logs && data.logs.length > 0);
      renderPager(pagerContainer, data.page, data.totalPages, (p) => {
        currentPage = p;
        loadAuditLogs();
      });
    } catch (err) {
      showToast(err.message || 'Failed to load audit logs', 'error');
    }
  }

  function renderLogs(logs) {
    if (!rowsContainer) return;
    rowsContainer.innerHTML = logs.map((log) => {
      let actionBadge = 'badge-completed';
      if (log.action.includes('REJECT') || log.action.includes('DELETED') || log.action.includes('BLOCKED') || log.action.includes('FAILED')) {
        actionBadge = 'badge-rejected';
      } else if (log.action.includes('APPROVED') || log.action.includes('PUBLISHED')) {
        actionBadge = 'badge-live';
      } else if (log.action.includes('CREATED') || log.action.includes('REGISTER') || log.action.includes('LOGIN')) {
        actionBadge = 'badge-upcoming';
      }

      const actorHtml = log.actor_name
        ? `<strong>${escapeHtml(log.actor_name)}</strong><br><span class="muted" style="font-size:12px;">${escapeHtml(log.actor_email)}</span>`
        : `<span class="muted">System / Guest</span>`;

      return `
        <tr>
          <td><span style="font-size:12px;" class="muted">${formatDate(log.created_at)}</span></td>
          <td><span class="badge ${actionBadge}">${escapeHtml(log.action)}</span></td>
          <td>${escapeHtml(log.details || '—')}</td>
          <td>${actorHtml}</td>
          <td><code style="font-size:12px;">${escapeHtml(log.ip_address || '—')}</code></td>
        </tr>
      `;
    }).join('');
  }
})();
