document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  const displayName = document.getElementById('display-name');
  const displayEmail = document.getElementById('display-email');
  const roleBadge = document.getElementById('role-badge');
  const avatarWrapper = document.getElementById('avatar-wrapper');
  const avatarInitials = document.getElementById('avatar-initials');
  const avatarImg = document.getElementById('avatar-img');
  const sideCollege = document.getElementById('side-college');
  const sideJoined = document.getElementById('side-joined');

  const profileForm = document.getElementById('profile-form');
  const pName = document.getElementById('p-name');
  const pCollege = document.getElementById('p-college');
  const pSkills = document.getElementById('p-skills');
  const pGithub = document.getElementById('p-github');
  const skillsPreview = document.getElementById('skills-preview');
  const saveProfileBtn = document.getElementById('save-profile-btn');

  const avatarForm = document.getElementById('avatar-form');
  const avatarFile = document.getElementById('avatar-file');
  const avatarUploadBtn = document.getElementById('avatar-upload-btn');

  const passwordForm = document.getElementById('password-form');
  const currentPwd = document.getElementById('current-pwd');
  const newPwd = document.getElementById('new-pwd');
  const confirmPwd = document.getElementById('confirm-pwd');
  const changePwdBtn = document.getElementById('change-pwd-btn');

  function renderSkills(str) {
    if (!str || !str.trim()) {
      skillsPreview.innerHTML = '';
      return;
    }
    const tags = str.split(',').map(s => s.trim()).filter(Boolean);
    skillsPreview.innerHTML = tags.map(t => `<span class="skill-tag">${escapeHtml(t)}</span>`).join('');
  }

  pSkills.addEventListener('input', () => {
    renderSkills(pSkills.value);
  });

  async function loadProfile() {
    try {
      const u = await apiFetch('/api/profile');

      displayName.textContent = u.name;
      displayEmail.textContent = u.email;
      sideCollege.textContent = u.college || 'Not specified';
      sideJoined.textContent = u.created_at ? new Date(u.created_at).toLocaleDateString() : '-';

      // Role badge
      roleBadge.innerHTML = `<span class="badge badge-info" style="text-transform:capitalize;">${escapeHtml(u.role)}</span>`;

      // Avatar
      if (u.avatar_path) {
        avatarImg.src = `${API_URL}/${u.avatar_path}`;
        avatarImg.style.display = 'block';
        avatarInitials.style.display = 'none';
      } else {
        const initials = u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
        avatarInitials.textContent = initials;
        avatarInitials.style.display = 'block';
        avatarImg.style.display = 'none';
      }

      // Fill form
      pName.value = u.name || '';
      pCollege.value = u.college || '';
      pSkills.value = u.skills || '';
      pGithub.value = u.github_url || '';
      renderSkills(u.skills);

      // Keep localStorage user in sync
      const stored = getUser() || {};
      stored.name = u.name;
      stored.role = u.role;
      localStorage.setItem('user', JSON.stringify(stored));
    } catch (err) {
      showToast(err.message || 'Failed to load profile.', 'error');
    }
  }

  // Update profile details
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = pName.value.trim();
    const college = pCollege.value.trim();
    const skills = pSkills.value.trim();
    const github_url = pGithub.value.trim();

    if (name.length < 2) {
      showToast('Name must be at least 2 characters long.', 'error');
      return;
    }

    try {
      setLoading(saveProfileBtn, true, 'Saving...');
      const res = await apiFetch('/api/profile', {
        method: 'PUT',
        body: { name, college, skills, github_url },
      });
      showToast(res.message || 'Profile updated successfully!', 'success');
      loadProfile();
    } catch (err) {
      showToast(err.message || 'Failed to save changes.', 'error');
    } finally {
      setLoading(saveProfileBtn, false);
    }
  });

  // Avatar file select
  avatarFile.addEventListener('change', () => {
    if (avatarFile.files && avatarFile.files[0]) {
      const file = avatarFile.files[0];
      if (file.size > 2 * 1024 * 1024) {
        showToast('Image size exceeds 2MB limit.', 'error');
        avatarFile.value = '';
        avatarUploadBtn.style.display = 'none';
        return;
      }
      avatarUploadBtn.style.display = 'block';
      avatarUploadBtn.textContent = `Upload ${file.name.slice(0, 16)}...`;

      // Instant preview
      const reader = new FileReader();
      reader.onload = (e) => {
        avatarImg.src = e.target.result;
        avatarImg.style.display = 'block';
        avatarInitials.style.display = 'none';
      };
      reader.readAsDataURL(file);
    }
  });

  // Avatar upload submit
  avatarForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!avatarFile.files || !avatarFile.files[0]) return;

    const formData = new FormData();
    formData.append('avatar', avatarFile.files[0]);

    try {
      setLoading(avatarUploadBtn, true, 'Uploading...');
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

      showToast('Avatar photo updated successfully!', 'success');
      avatarUploadBtn.style.display = 'none';
      loadProfile();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(avatarUploadBtn, false);
    }
  });

  // Change password
  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const curr = currentPwd.value;
    const next = newPwd.value;
    const confirm = confirmPwd.value;

    if (!curr) {
      showToast('Enter your current password.', 'error');
      return;
    }
    if (next.length < 8) {
      showToast('New password must be at least 8 characters long.', 'error');
      return;
    }
    if (next !== confirm) {
      showToast('New passwords do not match.', 'error');
      return;
    }

    try {
      setLoading(changePwdBtn, true, 'Updating...');
      const res = await apiFetch('/api/profile/password', {
        method: 'PATCH',
        body: { currentPassword: curr, newPassword: next },
      });
      showToast(res.message || 'Password changed successfully!', 'success');
      passwordForm.reset();
    } catch (err) {
      showToast(err.message || 'Failed to update password.', 'error');
    } finally {
      setLoading(changePwdBtn, false);
    }
  });

  loadProfile();
});
