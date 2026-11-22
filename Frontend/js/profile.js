document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;

  const profileLoading = document.getElementById('profile-loading');
  const viewOverview = document.getElementById('view-overview');
  const viewEdit = document.getElementById('view-edit');
  const viewPassword = document.getElementById('view-password');

  const tabBtnOverview = document.getElementById('tab-btn-overview');
  const tabBtnEdit = document.getElementById('tab-btn-edit');
  const tabBtnPassword = document.getElementById('tab-btn-password');

  // Overview elements
  const viewAvatarInitials = document.getElementById('view-avatar-initials');
  const viewAvatarImg = document.getElementById('view-avatar-img');
  const viewName = document.getElementById('view-name');
  const viewRoleBadge = document.getElementById('view-role-badge');
  const viewEmail = document.getElementById('view-email');
  const viewCollege = document.getElementById('view-college');
  const viewRoleText = document.getElementById('view-role-text');
  const viewJoined = document.getElementById('view-joined');
  const viewGithubBox = document.getElementById('view-github-box');
  const viewSkillsContainer = document.getElementById('view-skills-container');
  const shortcutsContainer = document.getElementById('shortcuts-container');

  // Edit elements
  const editAvatarInitials = document.getElementById('edit-avatar-initials');
  const editAvatarImg = document.getElementById('edit-avatar-img');
  const editAvatarFile = document.getElementById('edit-avatar-file');
  const btnUploadAvatar = document.getElementById('btn-upload-avatar');
  const editAvatarForm = document.getElementById('edit-avatar-form');
  const editProfileForm = document.getElementById('edit-profile-form');
  const editName = document.getElementById('edit-name');
  const editCollege = document.getElementById('edit-college');
  const editSkills = document.getElementById('edit-skills');
  const editSkillsPreview = document.getElementById('edit-skills-preview');
  const editGithub = document.getElementById('edit-github');
  const btnSaveProfile = document.getElementById('btn-save-profile');

  // Password elements
  const changePasswordForm = document.getElementById('change-password-form');
  const pwdCurrent = document.getElementById('pwd-current');
  const pwdNew = document.getElementById('pwd-new');
  const pwdConfirm = document.getElementById('pwd-confirm');
  const btnSavePassword = document.getElementById('btn-save-password');

  let currentUserData = null;

  // View / Tab Switching
  function switchView(viewName) {
    viewOverview.hidden = true;
    viewEdit.hidden = true;
    viewPassword.hidden = true;

    tabBtnOverview.classList.remove('active');
    tabBtnEdit.classList.remove('active');
    tabBtnPassword.classList.remove('active');

    if (viewName === 'edit') {
      viewEdit.hidden = false;
      tabBtnEdit.classList.add('active');
    } else if (viewName === 'password') {
      viewPassword.hidden = false;
      tabBtnPassword.classList.add('active');
    } else {
      viewOverview.hidden = false;
      tabBtnOverview.classList.add('active');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Bind tab buttons
  tabBtnOverview.addEventListener('click', () => switchView('overview'));
  tabBtnEdit.addEventListener('click', () => switchView('edit'));
  tabBtnPassword.addEventListener('click', () => switchView('password'));

  // Quick navigation buttons
  document.getElementById('btn-goto-edit').addEventListener('click', () => switchView('edit'));
  document.getElementById('btn-goto-password').addEventListener('click', () => switchView('password'));
  document.getElementById('btn-quick-pwd').addEventListener('click', () => switchView('password'));

  document.querySelectorAll('.btn-back-to-overview').forEach(btn => {
    btn.addEventListener('click', () => switchView('overview'));
  });

  // Render skills tags preview
  function updateSkillsPreview(str) {
    if (!str || !str.trim()) {
      editSkillsPreview.innerHTML = '';
      return;
    }
    const tags = str.split(',').map(s => s.trim()).filter(Boolean);
    editSkillsPreview.innerHTML = tags.map(t => `<span class="skill-pill">${escapeHtml(t)}</span>`).join('');
  }

  editSkills.addEventListener('input', () => {
    updateSkillsPreview(editSkills.value);
  });

  // Render Role Shortcuts
  function renderRoleShortcuts(role) {
    let shortcuts = [];
    if (role === 'admin') {
      shortcuts = [
        { label: 'Admin Metrics & Dashboard', href: 'admin-dashboard.html', desc: 'Monitor registrations, events & charts' },
        { label: 'User Directory & Management', href: 'admin-users.html', desc: 'Approve organisers, block/unblock accounts' },
        { label: 'Hackathon Approvals Queue', href: 'admin-hackathons.html', desc: 'Review submitted college hackathons' },
        { label: 'System Audit Logs', href: 'admin-audit.html', desc: 'Inspect platform security logs' }
      ];
    } else if (role === 'organiser') {
      shortcuts = [
        { label: 'My Organized Hackathons', href: 'my-hackathons.html', desc: 'View your events, attendee rosters & check-in' },
        { label: 'Create New Hackathon', href: 'create-hackathon.html', desc: 'Host a new innovation challenge' },
        { label: 'Explore All Hackathons', href: 'hackathons.html', desc: 'Browse public listing of challenges' }
      ];
    } else if (role === 'judge') {
      shortcuts = [
        { label: 'Judge Evaluation Dashboard', href: 'judge-dashboard.html', desc: 'Review assigned hackathons & score rubrics' },
        { label: 'Explore Hackathons', href: 'hackathons.html', desc: 'Browse public events & details' }
      ];
    } else {
      // Participant
      shortcuts = [
        { label: 'My Enrolled Teams', href: 'my-teams.html', desc: 'Manage your teams, invite teammates & view QR' },
        { label: 'Browse College Hackathons', href: 'hackathons.html', desc: 'Discover challenges & register with peers' }
      ];
    }

    shortcutsContainer.innerHTML = shortcuts.map(s => `
      <a class="shortcut-card" href="${s.href}">
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 2px;">${s.label} &rarr;</div>
        <div class="muted" style="font-size: 12px;">${s.desc}</div>
      </a>
    `).join('');
  }

  // Populate Profile View
  function renderProfile(u) {
    currentUserData = u;

    // Overview details
    viewName.textContent = u.name;
    viewEmail.textContent = u.email;
    viewCollege.textContent = u.college || 'Not specified';
    viewRoleText.textContent = u.role;
    viewJoined.textContent = u.created_at ? new Date(u.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '-';

    // Role badge
    let badgeClass = 'badge-primary';
    if (u.role === 'admin') badgeClass = 'badge-danger';
    else if (u.role === 'organiser') badgeClass = 'badge-warning';
    else if (u.role === 'judge') badgeClass = 'badge-info';
    viewRoleBadge.innerHTML = `<span class="badge ${badgeClass}" style="text-transform: capitalize; font-size: 12px; padding: 3px 10px;">${escapeHtml(u.role)}</span>`;

    // GitHub Link
    if (u.github_url) {
      viewGithubBox.innerHTML = `
        <a href="${escapeHtml(u.github_url)}" target="_blank" rel="noopener noreferrer" style="color:var(--brand-primary); font-weight:600; display:inline-flex; align-items:center; gap:4px; text-decoration:none;">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
          ${escapeHtml(u.github_url.replace(/^https?:\/\/(www\.)?github\.com\/?/i, '@'))}
        </a>
      `;
    } else {
      viewGithubBox.innerHTML = '<span class="muted">Not linked</span>';
    }

    // Skills
    if (u.skills && u.skills.trim()) {
      const tags = u.skills.split(',').map(s => s.trim()).filter(Boolean);
      viewSkillsContainer.innerHTML = tags.map(t => `<span class="skill-pill">${escapeHtml(t)}</span>`).join('');
    } else {
      viewSkillsContainer.innerHTML = '<p class="muted" style="font-size: 14px; margin: 0;">No skills listed yet. Click "Edit Profile" to add your programming languages and technologies.</p>';
    }

    // Avatar
    const initials = (u.name || 'User').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
    if (u.avatar_path) {
      const src = `${API_URL}/${u.avatar_path}`;
      viewAvatarImg.src = src;
      viewAvatarImg.style.display = 'block';
      viewAvatarInitials.style.display = 'none';

      editAvatarImg.src = src;
      editAvatarImg.style.display = 'block';
      editAvatarInitials.style.display = 'none';
    } else {
      viewAvatarInitials.textContent = initials;
      viewAvatarInitials.style.display = 'block';
      viewAvatarImg.style.display = 'none';

      editAvatarInitials.textContent = initials;
      editAvatarInitials.style.display = 'block';
      editAvatarImg.style.display = 'none';
    }

    // Edit form fields
    editName.value = u.name || '';
    editCollege.value = u.college || '';
    editSkills.value = u.skills || '';
    editGithub.value = u.github_url || '';
    updateSkillsPreview(u.skills);

    // Shortcuts
    renderRoleShortcuts(u.role);

    // Keep localStorage in sync
    const stored = getUser() || {};
    stored.name = u.name;
    stored.role = u.role;
    localStorage.setItem('user', JSON.stringify(stored));
  }

  // Load Profile from API
  async function loadProfile() {
    try {
      profileLoading.hidden = false;
      const u = await apiFetch('/api/profile');
      profileLoading.hidden = true;
      renderProfile(u);
      switchView('overview');
    } catch (err) {
      profileLoading.hidden = true;
      showToast(err.message || 'Failed to load profile.', 'error');
    }
  }

  // Edit Profile Form Submit
  editProfileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = editName.value.trim();
    const college = editCollege.value.trim();
    const skills = editSkills.value.trim();
    const github_url = editGithub.value.trim();

    if (name.length < 2) {
      showToast('Name must be at least 2 characters long.', 'error');
      return;
    }

    try {
      setLoading(btnSaveProfile, true, 'Saving changes...');
      const res = await apiFetch('/api/profile', {
        method: 'PUT',
        body: { name, college, skills, github_url },
      });
      showToast(res.message || 'Profile updated successfully!', 'success');
      renderProfile(res.user);
      switchView('overview');
    } catch (err) {
      showToast(err.message || 'Failed to save changes.', 'error');
    } finally {
      setLoading(btnSaveProfile, false);
    }
  });

  // Avatar Photo Select & Preview
  editAvatarFile.addEventListener('change', () => {
    if (editAvatarFile.files && editAvatarFile.files[0]) {
      const file = editAvatarFile.files[0];
      if (file.size > 2 * 1024 * 1024) {
        showToast('Image size exceeds 2 MB limit.', 'error');
        editAvatarFile.value = '';
        btnUploadAvatar.style.display = 'none';
        return;
      }
      btnUploadAvatar.style.display = 'inline-block';
      btnUploadAvatar.textContent = `Upload ${file.name.slice(0, 16)}...`;

      const reader = new FileReader();
      reader.onload = (e) => {
        editAvatarImg.src = e.target.result;
        editAvatarImg.style.display = 'block';
        editAvatarInitials.style.display = 'none';
      };
      reader.readAsDataURL(file);
    }
  });

  // Upload Avatar Submit
  editAvatarForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!editAvatarFile.files || !editAvatarFile.files[0]) return;

    const formData = new FormData();
    formData.append('avatar', editAvatarFile.files[0]);

    try {
      setLoading(btnUploadAvatar, true, 'Uploading...');
      const response = await fetch(`${API_URL}/api/profile/avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Avatar upload failed.');
      }

      showToast('Profile photo updated successfully!', 'success');
      btnUploadAvatar.style.display = 'none';
      editAvatarFile.value = '';

      if (data.avatar_path) {
        const fullSrc = `${API_URL}/${data.avatar_path}`;
        viewAvatarImg.src = fullSrc;
        viewAvatarImg.style.display = 'block';
        viewAvatarInitials.style.display = 'none';
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(btnUploadAvatar, false);
    }
  });

  // Change Password Submit
  changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = pwdCurrent.value;
    const newPassword = pwdNew.value;
    const confirmPassword = pwdConfirm.value;

    if (!currentPassword) {
      showToast('Enter your current password.', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters long.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }

    try {
      setLoading(btnSavePassword, true, 'Updating password...');
      const res = await apiFetch('/api/profile/password', {
        method: 'PATCH',
        body: { currentPassword, newPassword },
      });
      showToast(res.message || 'Password updated successfully!', 'success');
      changePasswordForm.reset();
      switchView('overview');
    } catch (err) {
      showToast(err.message || 'Failed to update password.', 'error');
    } finally {
      setLoading(btnSavePassword, false);
    }
  });

  loadProfile();
});
