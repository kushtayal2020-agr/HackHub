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

  const user = getUser();
  const isOrganiserOrAdmin = user && (user.role === 'organiser' || user.role === 'admin');

  const loading = document.getElementById('loading');
  const participantView = document.getElementById('participant-view');
  const organiserView = document.getElementById('organiser-view');

  // Participant elements
  const ticketTitle = document.getElementById('ticket-hackathon-title');
  const ticketBadge = document.getElementById('ticket-status-badge');
  const qrCodeImg = document.getElementById('qr-code-img');
  const ticketCodeStr = document.getElementById('ticket-code-str');
  const ticketUserName = document.getElementById('ticket-user-name');
  const ticketUserCollege = document.getElementById('ticket-user-college');
  const ticketTeamName = document.getElementById('ticket-team-name');
  const ticketTimeRow = document.getElementById('ticket-time-row');
  const ticketTimeVal = document.getElementById('ticket-time-val');

  // Organiser elements
  const orgTitle = document.getElementById('org-hackathon-title');
  const statTotal = document.getElementById('stat-total');
  const statChecked = document.getElementById('stat-checked');
  const statPending = document.getElementById('stat-pending');
  const statRate = document.getElementById('stat-rate');
  const terminalForm = document.getElementById('checkin-terminal-form');
  const checkinInput = document.getElementById('checkin-input');
  const btnDoCheckin = document.getElementById('btn-do-checkin');
  const checkinFeedback = document.getElementById('checkin-feedback');
  const rosterSearch = document.getElementById('roster-search');
  const rosterTableBody = document.getElementById('roster-table-body');

  let currentRecords = [];

  if (isOrganiserOrAdmin) {
    initOrganiserTerminal();
  } else {
    initParticipantTicket();
  }

  // --- PARTICIPANT LOGIC ---
  async function initParticipantTicket() {
    try {
      loading.hidden = false;
      participantView.hidden = true;

      const data = await apiFetch(`/api/hackathons/${hackathonId}/my-checkin-qr`);
      loading.hidden = true;
      participantView.hidden = false;

      ticketTitle.textContent = data.hackathonTitle || 'Hackathon Event Pass';
      ticketUserName.textContent = data.userName;
      ticketUserCollege.textContent = data.college || 'Not specified';
      ticketTeamName.textContent = data.teamName || 'Independent';
      ticketCodeStr.textContent = data.checkinCode;
      qrCodeImg.src = data.qrCodeDataUrl;

      if (data.checkedIn) {
        ticketBadge.innerHTML = '<span class="badge badge-success" style="background:#10b981; color:#fff; font-size:13px; padding:4px 12px;">Verified &amp; Checked In</span>';
        if (data.checkedInAt) {
          ticketTimeRow.style.display = 'flex';
          ticketTimeVal.textContent = new Date(data.checkedInAt).toLocaleString();
        }
      } else {
        ticketBadge.innerHTML = '<span class="badge badge-warning" style="background:#f59e0b; color:#fff; font-size:13px; padding:4px 12px;">Check-in Pending</span>';
        ticketTimeRow.style.display = 'none';
      }
    } catch (err) {
      loading.hidden = true;
      showToast(err.message || 'Unable to load QR check-in pass. Ensure you are registered in a team.', 'error');
      // If error, redirect to team page after a few seconds
      setTimeout(() => {
        window.location.href = `team.html?hackathonId=${hackathonId}`;
      }, 2500);
    }
  }

  // --- ORGANISER LOGIC ---
  async function initOrganiserTerminal() {
    try {
      loading.hidden = false;
      organiserView.hidden = true;

      // Fetch hackathon title
      try {
        const h = await apiFetch(`/api/hackathons/${hackathonId}`);
        orgTitle.textContent = `${h.title} - Check-in Terminal`;
      } catch (e) {
        orgTitle.textContent = 'Hackathon Check-in Terminal';
      }

      await loadOrganiserStats();
      loading.hidden = true;
      organiserView.hidden = false;
    } catch (err) {
      loading.hidden = true;
      showToast(err.message || 'Failed to load organiser check-in terminal.', 'error');
    }
  }

  async function loadOrganiserStats() {
    try {
      const data = await apiFetch(`/api/hackathons/${hackathonId}/checkins`);
      statTotal.textContent = data.totalRegistered;
      statChecked.textContent = data.checkedInCount;
      statPending.textContent = data.pendingCount;
      statRate.textContent = `${data.percentage}%`;

      currentRecords = data.records || [];
      renderRoster(currentRecords);
    } catch (err) {
      showToast(err.message || 'Error loading attendance statistics.', 'error');
    }
  }

  function renderRoster(records) {
    if (!records || records.length === 0) {
      rosterTableBody.innerHTML = '<tr><td colspan="7" class="text-center muted pad">No participants registered yet for this event.</td></tr>';
      return;
    }

    rosterTableBody.innerHTML = records.map(r => {
      const statusBadge = r.checked_in
        ? '<span class="badge badge-success">Checked In</span>'
        : '<span class="badge badge-warning">Pending</span>';

      const timeStr = r.checked_in && r.checked_in_at
        ? new Date(r.checked_in_at).toLocaleTimeString()
        : '-';

      const actionBtn = !r.checked_in
        ? `<button class="btn btn-primary btn-sm" data-code="${escapeHtml(r.checkin_code)}">Check In</button>`
        : '<span class="muted" style="font-size:12px;">Verified</span>';

      return `
        <tr>
          <td>
            <b>${escapeHtml(r.user_name)}</b>
            <div class="muted" style="font-size:12px;">${escapeHtml(r.user_email)}</div>
          </td>
          <td><b>${escapeHtml(r.team_name)}</b></td>
          <td>${escapeHtml(r.college || '-')}</td>
          <td><code style="font-size:11px;">${escapeHtml(r.checkin_code)}</code></td>
          <td>${statusBadge}</td>
          <td>${timeStr}</td>
          <td style="text-align:right;">${actionBtn}</td>
        </tr>
      `;
    }).join('');
  }

  // Search filter
  rosterSearch.addEventListener('input', () => {
    const q = rosterSearch.value.trim().toLowerCase();
    if (!q) {
      renderRoster(currentRecords);
      return;
    }
    const filtered = currentRecords.filter(r =>
      (r.user_name && r.user_name.toLowerCase().includes(q)) ||
      (r.user_email && r.user_email.toLowerCase().includes(q)) ||
      (r.college && r.college.toLowerCase().includes(q)) ||
      (r.team_name && r.team_name.toLowerCase().includes(q)) ||
      (r.checkin_code && r.checkin_code.toLowerCase().includes(q))
    );
    renderRoster(filtered);
  });

  // Check-in submit
  async function performCheckin(rawCode) {
    let checkinCode = rawCode.trim();
    // Support parsing raw JSON if copied from QR data
    if (checkinCode.startsWith('{') && checkinCode.endsWith('}')) {
      try {
        const parsed = JSON.parse(checkinCode);
        if (parsed.code) checkinCode = parsed.code;
      } catch (e) {
        // ignore parse error, use raw string
      }
    }

    try {
      setLoading(btnDoCheckin, true, 'Verifying...');
      checkinFeedback.style.display = 'none';

      const res = await apiFetch(`/api/hackathons/${hackathonId}/checkin`, {
        method: 'POST',
        body: { checkinCode },
      });

      showToast(res.message || 'Check-in confirmed!', 'success');
      checkinFeedback.className = 'alert alert-success';
      checkinFeedback.innerHTML = `<b>Success!</b> Verified <b>${escapeHtml(res.participant.name)}</b> (${escapeHtml(res.participant.email)}) &bull; Team: <b>${escapeHtml(res.participant.teamName)}</b>`;
      checkinFeedback.style.display = 'block';

      checkinInput.value = '';
      loadOrganiserStats();
    } catch (err) {
      showToast(err.message, 'error');
      checkinFeedback.className = 'alert alert-error';
      checkinFeedback.textContent = err.message || 'Check-in failed.';
      checkinFeedback.style.display = 'block';
    } finally {
      setLoading(btnDoCheckin, false);
    }
  }

  terminalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = checkinInput.value;
    if (!val) return;
    performCheckin(val);
  });

  rosterTableBody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-code]');
    if (!btn) return;
    performCheckin(btn.dataset.code);
  });
});
