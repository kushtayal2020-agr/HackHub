document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  const hackathonId = qs('hackathonId') || qs('id');
  if (!hackathonId) {
    showToast('No hackathon specified. Redirecting...', 'error');
    setTimeout(() => { window.location.href = 'hackathons.html'; }, 1500);
    return;
  }

  const backLink = document.getElementById('back-link');
  if (backLink) {
    backLink.href = `hackathon-detail.html?id=${hackathonId}`;
  }

  const loadingState = document.getElementById('loading-state');
  const noTeamView = document.getElementById('no-team-view');
  const hasTeamView = document.getElementById('has-team-view');

  const noTeamTitle = document.getElementById('no-team-hackathon-title');
  const createTeamForm = document.getElementById('create-team-form');
  const createTeamName = document.getElementById('create-team-name');
  const createTeamBtn = document.getElementById('create-team-btn');

  const joinTeamForm = document.getElementById('join-team-form');
  const joinTeamCode = document.getElementById('join-team-code');
  const joinTeamBtn = document.getElementById('join-team-btn');

  const teamNameTitle = document.getElementById('team-name-title');
  const teamRoleBadge = document.getElementById('team-role-badge');
  const teamHackathonName = document.getElementById('team-hackathon-name');
  const teamCapacity = document.getElementById('team-capacity');
  const inviteCodeVal = document.getElementById('invite-code-val');
  const btnCopyCode = document.getElementById('btn-copy-code');
  const btnRegenCode = document.getElementById('btn-regen-code');
  const btnQrPass = document.getElementById('btn-qr-pass');
  const btnLeaveTeam = document.getElementById('btn-leave-team');
  const membersTableBody = document.getElementById('members-table-body');
  const memberCountNum = document.getElementById('member-count-num');
  const subStatusDesc = document.getElementById('sub-status-desc');
  const btnSubmitProject = document.getElementById('btn-submit-project');

  let currentTeamData = null;

  async function loadTeamData() {
    try {
      loadingState.hidden = false;
      noTeamView.hidden = true;
      hasTeamView.hidden = true;

      const data = await apiFetch(`/api/hackathons/${hackathonId}/my-team`);
      loadingState.hidden = true;

      if (!data.team) {
        // User has no team in this hackathon
        noTeamView.hidden = false;
        try {
          const h = await apiFetch(`/api/hackathons/${hackathonId}`);
          noTeamTitle.textContent = `Register for ${h.title}`;
        } catch (e) {
          noTeamTitle.textContent = 'Register for Hackathon';
        }
        return;
      }

      currentTeamData = data;
      renderTeamView(data);
    } catch (err) {
      loadingState.hidden = true;
      showToast(err.message || 'Failed to load team data.', 'error');
    }
  }

  function renderTeamView(data) {
    hasTeamView.hidden = false;
    const { team, isLeader, members, submission } = data;

    teamNameTitle.textContent = team.name;
    teamHackathonName.textContent = team.hackathon_title;
    teamCapacity.textContent = `${members.length}/${team.max_team_size || 4} members`;
    inviteCodeVal.textContent = team.invite_code;

    teamRoleBadge.innerHTML = isLeader
      ? '<span class="badge badge-success">Team Leader</span>'
      : '<span class="badge badge-info">Team Member</span>';

    btnQrPass.href = `checkin.html?hackathonId=${team.hackathon_id}`;
    btnSubmitProject.href = `submit.html?hackathonId=${team.hackathon_id}`;

    if (isLeader) {
      btnRegenCode.style.display = 'inline-block';
    } else {
      btnRegenCode.style.display = 'none';
    }

    // Members Roster
    memberCountNum.textContent = members.length;
    membersTableBody.innerHTML = members.map(m => {
      const checkinBadge = m.checked_in
        ? '<span class="badge badge-success">Checked In</span>'
        : '<span class="badge badge-warning">Pending Check-in</span>';

      const roleBadge = m.is_leader
        ? '<span class="badge badge-primary">Leader</span>'
        : '<span class="badge badge-subtle">Member</span>';

      let actionHtml = '-';
      if (isLeader && !m.is_leader) {
        actionHtml = `<button class="btn btn-outline btn-sm danger" data-kick="${m.id}" data-name="${escapeHtml(m.name)}">Remove</button>`;
      }

      return `
        <tr>
          <td>
            <b>${escapeHtml(m.name)}</b>
            <div class="muted" style="font-size:12px;">${escapeHtml(m.email)}</div>
          </td>
          <td>${roleBadge}</td>
          <td>${escapeHtml(m.college || 'Not specified')}</td>
          <td>${escapeHtml(m.skills || 'None listed')}</td>
          <td>${checkinBadge}</td>
          <td style="text-align:right;">${actionHtml}</td>
        </tr>
      `;
    }).join('');

    // Submission Status
    if (submission) {
      subStatusDesc.innerHTML = `Project submitted: <b>${escapeHtml(submission.title)}</b> (${new Date(submission.submitted_at).toLocaleDateString()})`;
      btnSubmitProject.textContent = 'Edit Submission';
      btnSubmitProject.className = 'btn btn-primary btn-sm';
    } else {
      subStatusDesc.textContent = 'No project submitted yet for this hackathon.';
      btnSubmitProject.textContent = 'Submit Project';
      btnSubmitProject.className = 'btn btn-secondary btn-sm';
    }
  }

  // Copy Invite Code
  btnCopyCode.addEventListener('click', () => {
    if (!currentTeamData) return;
    navigator.clipboard.writeText(currentTeamData.team.invite_code)
      .then(() => {
        showToast('Invite code copied to clipboard!', 'success');
        btnCopyCode.textContent = 'Copied!';
        setTimeout(() => {
          btnCopyCode.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy Code`;
        }, 2000);
      })
      .catch(() => showToast('Failed to copy code.', 'error'));
  });

  // Regenerate Invite Code
  btnRegenCode.addEventListener('click', async () => {
    if (!confirm('Regenerate invite code? The previous code will stop working.')) return;
    try {
      setLoading(btnRegenCode, true, 'Generating...');
      const res = await apiFetch(`/api/teams/${currentTeamData.team.id}/invite`, { method: 'POST' });
      showToast(res.message || 'Invite code updated!', 'success');
      currentTeamData.team.invite_code = res.invite_code;
      inviteCodeVal.textContent = res.invite_code;
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(btnRegenCode, false);
    }
  });

  // Leave Team
  btnLeaveTeam.addEventListener('click', async () => {
    const isLeader = currentTeamData && currentTeamData.isLeader;
    const msg = isLeader
      ? 'Are you sure you want to leave this team? If you are the only member, the team will be deleted. Otherwise leadership will transfer to the next member.'
      : 'Are you sure you want to leave this team?';

    if (!confirm(msg)) return;

    try {
      setLoading(btnLeaveTeam, true, 'Leaving...');
      const res = await apiFetch(`/api/teams/${currentTeamData.team.id}/leave`, { method: 'DELETE' });
      showToast(res.message || 'You left the team.', 'success');
      loadTeamData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(btnLeaveTeam, false);
    }
  });

  // Kick Member
  membersTableBody.addEventListener('click', async (e) => {
    const kickBtn = e.target.closest('[data-kick]');
    if (!kickBtn) return;
    const targetUserId = kickBtn.dataset.kick;
    const targetName = kickBtn.dataset.name;

    if (!confirm(`Are you sure you want to remove ${targetName} from the team?`)) return;

    try {
      const res = await apiFetch(`/api/teams/${currentTeamData.team.id}/members/${targetUserId}`, { method: 'DELETE' });
      showToast(res.message || 'Member removed.', 'success');
      loadTeamData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Create Team Submit
  createTeamForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = createTeamName.value.trim();
    if (name.length < 2) {
      showToast('Team name must be at least 2 characters long.', 'error');
      return;
    }

    try {
      setLoading(createTeamBtn, true, 'Creating...');
      const res = await apiFetch(`/api/hackathons/${hackathonId}/teams`, {
        method: 'POST',
        body: { name },
      });
      showToast(res.message || 'Team created successfully!', 'success');
      loadTeamData();
    } catch (err) {
      showToast(err.message || 'Failed to create team.', 'error');
    } finally {
      setLoading(createTeamBtn, false);
    }
  });

  // Join Team Submit
  joinTeamForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = joinTeamCode.value.trim().toUpperCase();
    if (code.length < 4) {
      showToast('Enter a valid invite code.', 'error');
      return;
    }

    try {
      setLoading(joinTeamBtn, true, 'Joining...');
      const res = await apiFetch('/api/teams/join', {
        method: 'POST',
        body: { invite_code: code },
      });
      showToast(res.message || 'Joined team successfully!', 'success');
      loadTeamData();
    } catch (err) {
      showToast(err.message || 'Failed to join team.', 'error');
    } finally {
      setLoading(joinTeamBtn, false);
    }
  });

  loadTeamData();
});
