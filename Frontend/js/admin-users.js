(function () {
  const currentUser = requireRole(['admin']);
  if (!currentUser) return;

  let currentPage = 1;
  const searchInput = document.getElementById('user-search');
  const roleFilter = document.getElementById('user-role-filter');
  const statusFilter = document.getElementById('user-status-filter');
  const rowsContainer = document.getElementById('user-rows');
  const emptyEl = document.getElementById('users-empty');
  const pagerContainer = document.getElementById('users-pager');

  document.addEventListener('DOMContentLoaded', () => {
    loadUsers();

    if (searchInput) {
      searchInput.addEventListener('input', debounce(() => {
        currentPage = 1;
        loadUsers();
      }, 350));
    }

    if (roleFilter) {
      roleFilter.addEventListener('change', () => {
        currentPage = 1;
        loadUsers();
      });
    }

    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        currentPage = 1;
        loadUsers();
      });
    }
  });

  async function loadUsers() {
    const params = new URLSearchParams({ page: currentPage, limit: 10 });
    if (searchInput && searchInput.value.trim()) params.set('search', searchInput.value.trim());
    if (roleFilter && roleFilter.value) params.set('role', roleFilter.value);
    if (statusFilter && statusFilter.value) params.set('status', statusFilter.value);

    try {
      const data = await apiFetch('/api/admin/users?' + params);
      renderUsers(data.users || []);
      if (emptyEl) emptyEl.hidden = (data.users && data.users.length > 0);
      renderPager(pagerContainer, data.page, data.totalPages, (p) => {
        currentPage = p;
        loadUsers();
      });
    } catch (err) {
      showToast(err.message || 'Failed to load users', 'error');
    }
  }

  function renderUsers(users) {
    if (!rowsContainer) return;
    rowsContainer.innerHTML = users.map((u) => {
      const isSelf = Number(u.id) === Number(currentUser.id);

      // Status badges
      let statusHtml = '';
      if (u.is_blocked) {
        statusHtml += '<span class="badge badge-rejected">Blocked</span> ';
      } else if (u.role === 'organiser' && !u.is_approved) {
        statusHtml += '<span class="badge badge-pending">Pending Approval</span> ';
      } else {
        statusHtml += '<span class="badge badge-live">Active</span> ';
      }

      // Role badge
      const roleBadge = `<span class="badge badge-${u.role === 'admin' ? 'upcoming' : 'completed'}">${escapeHtml(u.role)}</span>`;

      // Actions
      let actionsHtml = '<div style="display:flex; gap:6px; flex-wrap:wrap;">';

      if (!isSelf) {
        // Block/Unblock toggle
        if (u.is_blocked) {
          actionsHtml += `<button type="button" class="btn btn-sm btn-secondary btn-block-toggle" data-id="${u.id}" data-blocked="false">Unblock</button>`;
        } else {
          actionsHtml += `<button type="button" class="btn btn-sm btn-secondary danger btn-block-toggle" data-id="${u.id}" data-blocked="true">Block</button>`;
        }

        // Organiser approval button
        if (u.role === 'organiser' && !u.is_approved) {
          actionsHtml += `<button type="button" class="btn btn-sm btn-primary btn-approve-org" data-id="${u.id}">Approve</button>`;
        }

        // Change role dropdown
        actionsHtml += `
          <select class="user-role-select" data-id="${u.id}" style="padding:4px 8px; font-size:12px; height:30px; min-width:100px;">
            <option value="participant" ${u.role === 'participant' ? 'selected' : ''}>Participant</option>
            <option value="organiser" ${u.role === 'organiser' ? 'selected' : ''}>Organiser</option>
            <option value="judge" ${u.role === 'judge' ? 'selected' : ''}>Judge</option>
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
        `;

        // Delete button
        actionsHtml += `<button type="button" class="btn btn-sm btn-danger btn-delete-user" data-id="${u.id}" data-name="${escapeHtml(u.name)}">Delete</button>`;
      } else {
        actionsHtml += '<span class="muted" style="font-size:12px;">(Current Account)</span>';
      }

      actionsHtml += '</div>';

      return `
        <tr>
          <td>
            <strong>${escapeHtml(u.name)}</strong><br>
            <span class="muted" style="font-size:12px;">${escapeHtml(u.email)}</span>
          </td>
          <td>${roleBadge}</td>
          <td>${escapeHtml(u.college || '—')}</td>
          <td>${statusHtml}</td>
          <td><span style="font-size:12px;" class="muted">${formatDate(u.created_at)}</span></td>
          <td>${actionsHtml}</td>
        </tr>
      `;
    }).join('');

    attachUserActions();
  }

  function attachUserActions() {
    // Block / Unblock
    document.querySelectorAll('.btn-block-toggle').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const blocked = btn.dataset.blocked === 'true';
        try {
          await apiFetch(`/api/admin/users/${id}/block`, {
            method: 'PATCH',
            body: { blocked },
          });
          showToast(`User account ${blocked ? 'blocked' : 'unblocked'}.`);
          loadUsers();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    // Approve Organiser
    document.querySelectorAll('.btn-approve-org').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        try {
          await apiFetch(`/api/admin/users/${id}/approval`, {
            method: 'PATCH',
            body: { approved: true },
          });
          showToast('Organiser account approved successfully!');
          loadUsers();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    // Change Role
    document.querySelectorAll('.user-role-select').forEach((select) => {
      select.addEventListener('change', async (e) => {
        const id = select.dataset.id;
        const newRole = e.target.value;
        if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
          loadUsers();
          return;
        }
        try {
          await apiFetch(`/api/admin/users/${id}/role`, {
            method: 'PATCH',
            body: { role: newRole },
          });
          showToast(`Role updated to ${newRole}.`);
          loadUsers();
        } catch (err) {
          showToast(err.message, 'error');
          loadUsers();
        }
      });
    });

    // Delete User
    document.querySelectorAll('.btn-delete-user').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        if (!confirm(`Are you sure you want to permanently delete user "${name}"? This action cannot be undone.`)) {
          return;
        }
        try {
          await apiFetch(`/api/admin/users/${id}`, {
            method: 'DELETE',
          });
          showToast('User account deleted.');
          loadUsers();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  }
})();
