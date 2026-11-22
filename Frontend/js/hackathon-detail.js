const params = new URLSearchParams(window.location.search);
const hackathonId = params.get('id');
const box = document.getElementById('hackathon');
const actionBar = document.getElementById('hackathon-action-bar');
const announceList = document.getElementById('announce-list');
const announceForm = document.getElementById('announce-form');
let countdownTimer;
let currentHackathon;

function countdownText(h) {
  const now = new Date();
  const start = parseDbDate(h.registration_start);
  const end = parseDbDate(h.registration_end);
  if (now < start) return 'Registration opens ' + formatDate(h.registration_start);
  if (now > end) return 'Registration closed';
  const ms = end - now;
  const d = Math.floor(ms / 86400000);
  const hrs = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `Registration closes in ${d}d ${hrs}h ${m}m ${s}s`;
}

function renderHackathon(h) {
  box.innerHTML = `
    ${bannerHtml(h.banner_path, h.title)}
    <div class="detail-head">
      <h1>${escapeHtml(h.title)}</h1>
      ${statusBadge(h.status)}
    </div>
    <p class="countdown" id="countdown"></p>
    <ul class="info-list">
      <li><b>Organiser:</b> ${escapeHtml(h.organiser_name || 'HackHub Admin')}</li>
      <li><b>Theme:</b> ${escapeHtml(h.theme || 'General Innovation')}</li>
      <li><b>Prizes:</b> ${escapeHtml(h.prizes || 'To be announced')}</li>
      <li><b>Hackathon Dates:</b> ${formatDate(h.start_date)} to ${formatDate(h.end_date)}</li>
      <li><b>Max Team Size:</b> ${h.max_team_size || 4} members</li>
    </ul>
    <h3>About This Challenge</h3>
    <p class="pre-wrap">${escapeHtml(h.description || 'No description provided.')}</p>
    <h3>Official Rules &amp; Guidelines</h3>
    <p class="pre-wrap">${escapeHtml(h.rules || 'Standard college hackathon rules apply.')}</p>
  `;

  const el = document.getElementById('countdown');
  const tick = () => {
    el.textContent = countdownText(h);
  };
  tick();
  clearInterval(countdownTimer);
  countdownTimer = setInterval(tick, 1000);
}

function isOwner(h) {
  const user = getUser();
  return !!user && user.role === 'organiser' && Number(user.id) === Number(h.organiser_id);
}

function canManage(h) {
  const user = getUser();
  return isOwner(h) || (!!user && user.role === 'admin');
}

async function renderActionBar(h) {
  if (!actionBar) return;
  const user = getUser();
  const token = getToken();

  const isCompleted = h.status === 'completed' || h.results_published === 1;
  const now = new Date();
  const regStart = new Date(h.registration_start);
  const regEnd = new Date(h.registration_end);
  const regOpen = !isCompleted && now >= regStart && now <= regEnd;

  // Case 1: Unauthenticated Guest
  if (!token || !user) {
    if (isCompleted) {
      actionBar.innerHTML = `
        <div style="background:var(--bg-subtle); border:1px solid var(--border-color); padding:18px 22px; border-radius:var(--radius-md); margin: 20px 0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
              <span class="badge badge-completed">Event Concluded</span>
              <b style="font-size:16px;">This Hackathon Has Ended</b>
            </div>
            <p class="muted" style="margin:0; font-size:13px;">Registrations are closed and official results have been published.</p>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <a href="leaderboard.html?hackathonId=${h.id}" class="btn btn-primary btn-sm">View Leaderboard</a>
            <a href="hackathons.html" class="btn btn-secondary btn-sm">Browse Other Hackathons</a>
          </div>
        </div>
      `;
      return;
    }

    if (!regOpen) {
      actionBar.innerHTML = `
        <div style="background:var(--bg-subtle); border:1px solid var(--border-color); padding:18px 22px; border-radius:var(--radius-md); margin: 20px 0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <b style="font-size:15px; display:block; margin-bottom:2px;">Registration is Currently Closed</b>
            <p class="muted" style="margin:0; font-size:13px;">Registration for this event is not open. You can explore active events below.</p>
          </div>
          <div style="display:flex; gap:8px;">
            <a href="hackathons.html" class="btn btn-primary btn-sm">Browse Hackathons</a>
          </div>
        </div>
      `;
      return;
    }

    actionBar.innerHTML = `
      <div style="background:var(--bg-subtle); border:1px solid var(--border-color); padding:18px 22px; border-radius:var(--radius-md); margin: 20px 0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <b style="font-size:15px; display:block; margin-bottom:2px;">Registration is Open</b>
          <p class="muted" style="margin:0; font-size:13px;">Sign in or create an account to form teams and submit projects.</p>
        </div>
        <div style="display:flex; gap:8px;">
          <a href="login.html" class="btn btn-secondary btn-sm">Sign In</a>
          <a href="register.html" class="btn btn-primary btn-sm">Register Now</a>
        </div>
      </div>
    `;
    return;
  }

  // Case 2: Participant
  if (user.role === 'participant') {
    try {
      const data = await apiFetch(`/api/hackathons/${h.id}/my-team`).catch(() => ({ team: null }));
      
      if (data && data.team) {
        if (isCompleted) {
          actionBar.innerHTML = `
            <div style="background:var(--bg-subtle); border:1px solid var(--border-color); padding:18px 22px; border-radius:var(--radius-md); margin: 20px 0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
              <div>
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                  <span class="badge badge-completed">Event Concluded</span>
                  <b style="font-size:16px;">${escapeHtml(data.team.name)}</b>
                </div>
                <p class="muted" style="margin:0; font-size:13px;">
                  Official evaluations are finalized and results are published.
                </p>
              </div>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <a href="leaderboard.html?hackathonId=${h.id}" class="btn btn-primary btn-sm">Leaderboard &amp; Results</a>
                <a href="certificate.html?hackathonId=${h.id}" class="btn btn-secondary btn-sm" style="background:#fef3c7; color:#b45309; border-color:#f59e0b;">View Certificate</a>
                <a href="team.html?hackathonId=${h.id}" class="btn btn-secondary btn-sm">Team Roster</a>
              </div>
            </div>
          `;
        } else {
          actionBar.innerHTML = `
            <div style="background:var(--bg-subtle); border:1px solid var(--border-color); padding:18px 22px; border-radius:var(--radius-md); margin: 20px 0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
              <div>
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                  <span class="badge badge-success">Registered in Team</span>
                  <b style="font-size:16px;">${escapeHtml(data.team.name)}</b>
                </div>
                <p class="muted" style="margin:0; font-size:13px;">
                  Invite Code: <code style="font-weight:700; color:var(--brand-primary);">${escapeHtml(data.team.invite_code)}</code> &bull; Roster: ${data.members.length}/${data.team.max_team_size || 4} members
                </p>
              </div>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <a href="team.html?hackathonId=${h.id}" class="btn btn-primary btn-sm">Manage Team</a>
                <a href="checkin.html?hackathonId=${h.id}" class="btn btn-secondary btn-sm">Check-in Pass (QR)</a>
                <a href="leaderboard.html?hackathonId=${h.id}" class="btn btn-outline btn-sm">Leaderboard</a>
              </div>
            </div>
          `;
        }
      } else {
        if (isCompleted) {
          actionBar.innerHTML = `
            <div style="background:var(--bg-subtle); border:1px solid var(--border-color); padding:18px 22px; border-radius:var(--radius-md); margin: 20px 0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
              <div>
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                  <span class="badge badge-completed">Event Concluded</span>
                  <b style="font-size:16px;">Hackathon Ended</b>
                </div>
                <p class="muted" style="margin:0; font-size:13px;">Registrations and submissions are closed. Official rankings are available on the leaderboard.</p>
              </div>
              <div style="display:flex; gap:8px;">
                <a href="leaderboard.html?hackathonId=${h.id}" class="btn btn-primary btn-sm">View Final Leaderboard</a>
                <a href="hackathons.html" class="btn btn-secondary btn-sm">Browse Other Events</a>
              </div>
            </div>
          `;
        } else if (!regOpen) {
          actionBar.innerHTML = `
            <div style="background:var(--bg-subtle); border:1px solid var(--border-color); padding:18px 22px; border-radius:var(--radius-md); margin: 20px 0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
              <div>
                <b style="font-size:15px; display:block; margin-bottom:2px;">Registration is Closed</b>
                <p class="muted" style="margin:0; font-size:13px;">The registration deadline for this hackathon has passed.</p>
              </div>
              <div style="display:flex; gap:8px;">
                <a href="hackathons.html" class="btn btn-primary btn-sm">Explore Active Events</a>
                <a href="leaderboard.html?hackathonId=${h.id}" class="btn btn-secondary btn-sm">Leaderboard</a>
              </div>
            </div>
          `;
        } else {
          actionBar.innerHTML = `
            <div style="background:var(--brand-primary-subtle); border:1px solid #bfdbfe; padding:18px 22px; border-radius:var(--radius-md); margin: 20px 0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
              <div>
                <b style="font-size:16px; color:var(--brand-primary); display:block; margin-bottom:2px;">Registration is Open!</b>
                <p class="muted" style="margin:0; font-size:13px;">Create a new team as Team Leader, or enter a teammate's invite code to join.</p>
              </div>
              <div style="display:flex; gap:8px;">
                <a href="team.html?hackathonId=${h.id}" class="btn btn-primary btn-sm">
                  Register / Form Team
                </a>
                <a href="leaderboard.html?hackathonId=${h.id}" class="btn btn-outline btn-sm">Leaderboard</a>
              </div>
            </div>
          `;
        }
      }
    } catch (e) {
      // fallback
    }
    return;
  }

  // Case 3: Judge
  if (user.role === 'judge') {
    actionBar.innerHTML = `
      <div style="background:var(--bg-subtle); border:1px solid var(--border-color); padding:16px 20px; border-radius:var(--radius-md); margin: 20px 0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <b style="font-size:15px; display:block; margin-bottom:2px;">Judge Evaluation Studio</b>
          <p class="muted" style="margin:0; font-size:13px;">${isCompleted ? 'Evaluations are completed and official rankings are published.' : 'Review and evaluate submitted projects using official weighted rubrics.'}</p>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <a href="leaderboard.html?hackathonId=${h.id}" class="btn btn-primary btn-sm">Leaderboard</a>
          ${!isCompleted ? `<a href="judging.html?hackathonId=${h.id}" class="btn btn-secondary btn-sm">Score Submissions</a>` : ''}
        </div>
      </div>
    `;
    return;
  }

  // Case 4: Organiser or Admin
  if (user.role === 'organiser' || user.role === 'admin') {
    actionBar.innerHTML = `
      <div style="background:var(--bg-subtle); border:1px solid var(--border-color); padding:16px 20px; border-radius:var(--radius-md); margin: 20px 0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <b style="font-size:15px; display:block; margin-bottom:2px;">Organiser Management Tools</b>
          <p class="muted" style="margin:0; font-size:13px;">${isCompleted ? 'Hackathon concluded. Official results are published.' : 'Manage participant check-in attendance, review submissions, and publish results.'}</p>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <a href="leaderboard.html?hackathonId=${h.id}" class="btn btn-primary btn-sm">Leaderboard</a>
          <a href="hackathon-submissions.html?id=${h.id}" class="btn btn-secondary btn-sm">Submissions</a>
          <a href="checkin.html?hackathonId=${h.id}" class="btn btn-secondary btn-sm">Check-in Terminal</a>
          ${isOwner(h) ? `<a href="create-hackathon.html?id=${h.id}" class="btn btn-secondary btn-sm">Edit Details</a>` : ''}
        </div>
      </div>
    `;
  }
}

async function loadAnnouncements() {
  try {
    const items = await apiFetch('/api/hackathons/' + encodeURIComponent(hackathonId) + '/announcements');
    announceList.innerHTML = items.length
      ? items.map(
          (a) => `
        <div class="announce">
          <div class="announce-head">
            <b>${escapeHtml(a.title)}</b>
            ${canManage(currentHackathon) ? `<button class="btn-link danger" data-id="${a.id}">Delete</button>` : ''}
          </div>
          <p class="pre-wrap">${escapeHtml(a.message)}</p>
          <small class="muted">${escapeHtml(a.author)} - ${formatDate(a.created_at)}</small>
        </div>
      `
        ).join('')
      : '<p class="muted">No announcements yet.</p>';
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function setupAnnouncements(h) {
  currentHackathon = h;
  const wrap = document.getElementById('announce-form-wrap');
  if (wrap) wrap.hidden = !isOwner(h);
  loadAnnouncements();
}

if (announceList) {
  announceList.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-id]');
    if (!btn || !confirm('Delete this announcement?')) return;
    try {
      await apiFetch('/api/announcements/' + btn.dataset.id, { method: 'DELETE' });
      showToast('Announcement deleted.');
      loadAnnouncements();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

if (announceForm) {
  announceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('a-title').value.trim();
    const message = document.getElementById('a-message').value.trim();
    if (title.length < 3) return showToast('Title must be at least 3 characters.', 'error');
    if (message.length < 5) return showToast('Message must be at least 5 characters.', 'error');
    try {
      await apiFetch('/api/hackathons/' + hackathonId + '/announcements', {
        method: 'POST',
        body: { title, message },
      });
      announceForm.reset();
      showToast('Announcement posted.');
      loadAnnouncements();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

async function loadHackathon() {
  if (!hackathonId) {
    box.textContent = 'Hackathon not specified.';
    return;
  }
  try {
    const h = await apiFetch('/api/hackathons/' + encodeURIComponent(hackathonId));
    document.title = h.title + ' - HackHub';
    renderHackathon(h);
    await renderActionBar(h);
    setupAnnouncements(h);
  } catch (err) {
    box.textContent = err.message;
  }
}

loadHackathon();
