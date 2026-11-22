document.addEventListener('DOMContentLoaded', () => {
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
  const canPublish = user && (user.role === 'organiser' || user.role === 'admin');

  const leaderboardTitle = document.getElementById('leaderboard-title');
  const resultsPublishedBadge = document.getElementById('results-published-badge');
  const organiserActions = document.getElementById('organiser-actions');
  const btnPublishResults = document.getElementById('btn-publish-results');

  const loading = document.getElementById('loading');
  const emptyState = document.getElementById('empty-state');
  const contentView = document.getElementById('content-view');
  const podiumContainer = document.getElementById('podium-container');
  const rows = document.getElementById('rows');

  async function loadLeaderboard() {
    try {
      loading.hidden = false;
      emptyState.hidden = true;
      contentView.hidden = true;

      const data = await apiFetch(`/api/hackathons/${hackathonId}/leaderboard`);
      loading.hidden = true;

      const { hackathon, leaderboard } = data;
      leaderboardTitle.textContent = `${hackathon.title} - Leaderboard`;

      if (hackathon.results_published) {
        resultsPublishedBadge.innerHTML = '<span class="badge badge-success" style="font-size:12px; padding:4px 10px;">Official Results Published</span>';
        if (organiserActions) organiserActions.style.display = 'none';
        checkCertificateEligibility();
      } else {
        resultsPublishedBadge.innerHTML = '<span class="badge badge-warning" style="font-size:12px; padding:4px 10px;">Evaluation Ongoing (Unofficial)</span>';
        if (canPublish && organiserActions) {
          organiserActions.style.display = 'block';
        }
      }

      if (!leaderboard || leaderboard.length === 0) {
        emptyState.hidden = false;
        return;
      }

      contentView.hidden = false;
      renderPodium(leaderboard);
      renderTable(leaderboard);
    } catch (err) {
      loading.hidden = true;
      showToast(err.message || 'Failed to load leaderboard.', 'error');
    }
  }

  function renderPodium(items) {
    if (!items || items.length === 0) {
      podiumContainer.innerHTML = '';
      return;
    }

    // Top 3 items
    const first = items[0];
    const second = items[1];
    const third = items[2];

    let html = '';

    // 2nd Place (Left)
    if (second) {
      html += `
        <div class="podium-card rank-2">
          <div class="podium-badge badge-silver">#2</div>
          <h3 style="margin:0 0 4px 0; font-size:16px;">${escapeHtml(second.team_name)}</h3>
          <p class="muted" style="font-size:13px; margin:0 0 8px 0;">${escapeHtml(second.title)}</p>
          <div class="podium-score">${second.score.toFixed(1)}</div>
          <div class="muted" style="font-size:12px;">Final Score / 100</div>
          <div class="muted" style="font-size:12px; margin-top:8px;">Leader: ${escapeHtml(second.leader_name)}</div>
        </div>
      `;
    } else {
      html += '<div></div>';
    }

    // 1st Place (Center - Prominent)
    if (first) {
      html += `
        <div class="podium-card rank-1">
          <div class="podium-badge badge-gold">
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </div>
          <span style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:#b45309; font-weight:700; display:block; margin-bottom:2px;">1st Place Winner</span>
          <h2 style="margin:0 0 4px 0; font-size:20px; color:var(--text-main);">${escapeHtml(first.team_name)}</h2>
          <p class="muted" style="font-size:14px; margin:0 0 8px 0;"><b>${escapeHtml(first.title)}</b></p>
          <div class="podium-score" style="font-size:32px; color:#b45309;">${first.score.toFixed(1)}</div>
          <div class="muted" style="font-size:12px;">Final Score / 100</div>
          <div style="font-size:13px; margin-top:10px;"><b>${escapeHtml(first.leader_name)}</b> (${escapeHtml(first.leader_college || 'College')})</div>
        </div>
      `;
    }

    // 3rd Place (Right)
    if (third) {
      html += `
        <div class="podium-card rank-3">
          <div class="podium-badge badge-bronze">#3</div>
          <h3 style="margin:0 0 4px 0; font-size:16px;">${escapeHtml(third.team_name)}</h3>
          <p class="muted" style="font-size:13px; margin:0 0 8px 0;">${escapeHtml(third.title)}</p>
          <div class="podium-score">${third.score.toFixed(1)}</div>
          <div class="muted" style="font-size:12px;">Final Score / 100</div>
          <div class="muted" style="font-size:12px; margin-top:8px;">Leader: ${escapeHtml(third.leader_name)}</div>
        </div>
      `;
    } else {
      html += '<div></div>';
    }

    podiumContainer.innerHTML = html;
  }

  function renderTable(items) {
    rows.innerHTML = items.map(item => {
      let rankBadge = `<span class="muted" style="font-weight:700; font-size:15px;">#${item.rank}</span>`;
      if (item.rank === 1) rankBadge = '<span class="badge badge-warning" style="background:#fef3c7; color:#b45309; font-weight:800;">1st Gold</span>';
      else if (item.rank === 2) rankBadge = '<span class="badge badge-subtle" style="background:#f1f5f9; color:#475569; font-weight:800;">2nd Silver</span>';
      else if (item.rank === 3) rankBadge = '<span class="badge badge-warning" style="background:#ffedd5; color:#9a3412; font-weight:800;">3rd Bronze</span>';

      let linksHtml = '';
      if (item.github_url) {
        linksHtml += `
          <a href="${escapeHtml(item.github_url)}" target="_blank" rel="noopener noreferrer" class="btn-link" style="display:inline-flex; align-items:center; gap:4px; margin-right:8px;">
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
            Code
          </a>
        `;
      }
      if (item.demo_url) {
        linksHtml += `
          <a href="${escapeHtml(item.demo_url)}" target="_blank" rel="noopener noreferrer" class="btn-link" style="display:inline-flex; align-items:center; gap:4px;">
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
            Demo
          </a>
        `;
      }

      return `
        <tr>
          <td>${rankBadge}</td>
          <td>
            <b>${escapeHtml(item.team_name)}</b>
            <div class="muted" style="font-size:13px;">${escapeHtml(item.title)}</div>
          </td>
          <td>${escapeHtml(item.leader_name)}</td>
          <td>${escapeHtml(item.leader_college || '-')}</td>
          <td>
            <span class="badge badge-subtle">${item.judges_evaluated_count} Judge${item.judges_evaluated_count !== 1 ? 's' : ''}</span>
          </td>
          <td>
            <b style="font-size:16px; color:var(--brand-primary);">${item.score.toFixed(1)}</b>
            <span class="muted" style="font-size:12px;"> / 100</span>
          </td>
          <td style="text-align:right;">${linksHtml || '-'}</td>
        </tr>
      `;
    }).join('');
  }

  // Check Certificate Eligibility
  async function checkCertificateEligibility() {
    if (!getToken()) return;
    try {
      const data = await apiFetch(`/api/hackathons/${hackathonId}/certificates/info`);
      if (data && data.eligible) {
        const certBanner = document.getElementById('cert-banner');
        const btnViewCert = document.getElementById('btn-view-certificate');
        if (certBanner && btnViewCert) {
          btnViewCert.href = `certificate.html?hackathonId=${hackathonId}`;
          certBanner.style.display = 'flex';
        }
      }
    } catch (_) {
      // User may not be participant or eligible yet
    }
  }

  // Socket.io Real-Time Updates
  if (typeof io !== 'undefined') {
    try {
      const socket = io(typeof API_URL !== 'undefined' ? API_URL : undefined);
      socket.emit('join_hackathon', { hackathonId });

      socket.on('leaderboard_updated', () => {
        showToast('Live Update: Judge scores updated rankings.', 'info');
        loadLeaderboard();
      });

      socket.on('results_published', () => {
        showToast('Official Results Published! Certificates are now unlocked.', 'success');
        loadLeaderboard();
      });
    } catch (e) {
      console.warn('Real-time connection skipped:', e);
    }
  }

  // Publish Results
  if (btnPublishResults) {
    btnPublishResults.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to publish the official results for this hackathon? The leaderboard and rankings will become permanently visible to all participants.')) return;

      try {
        setLoading(btnPublishResults, true, 'Publishing results...');
        const res = await apiFetch(`/api/hackathons/${hackathonId}/publish-results`, { method: 'POST' });
        showToast(res.message || 'Results published successfully!', 'success');
        loadLeaderboard();
      } catch (err) {
        showToast(err.message, 'error');
        setLoading(btnPublishResults, false);
      }
    });
  }

  loadLeaderboard();
});
