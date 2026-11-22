document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;

  const hackathonId = qs('hackathonId') || qs('id');
  if (!hackathonId) {
    showToast('No hackathon specified. Redirecting...', 'error');
    setTimeout(() => { window.location.href = 'judge-dashboard.html'; }, 1500);
    return;
  }

  const btnLeaderboard = document.getElementById('btn-leaderboard');
  if (btnLeaderboard) {
    btnLeaderboard.href = `leaderboard.html?hackathonId=${hackathonId}`;
  }

  const loading = document.getElementById('loading');
  const emptyState = document.getElementById('empty-state');
  const studioView = document.getElementById('studio-view');
  const eventTitle = document.getElementById('event-title');
  const queueContainer = document.getElementById('queue-container');

  const subTitle = document.getElementById('sub-title');
  const subTeamName = document.getElementById('sub-team-name');
  const subDate = document.getElementById('sub-date');
  const myEvalBadge = document.getElementById('my-eval-badge');
  const linkGithub = document.getElementById('link-github');
  const linkDemo = document.getElementById('link-demo');
  const linkFile = document.getElementById('link-file');
  const subDescription = document.getElementById('sub-description');
  const teamRosterList = document.getElementById('team-roster-list');

  const computedScoreEl = document.getElementById('computed-score');
  const evaluationForm = document.getElementById('evaluation-form');
  const criteriaContainer = document.getElementById('criteria-container');
  const judgeComment = document.getElementById('judge-comment');
  const btnSaveScore = document.getElementById('btn-save-score');

  let queueData = null;
  let activeSubmissionId = null;
  let currentCriteria = [];

  async function loadQueue() {
    try {
      loading.hidden = false;
      emptyState.hidden = true;
      studioView.hidden = true;

      try {
        const h = await apiFetch(`/api/hackathons/${hackathonId}`);
        eventTitle.textContent = `${h.title} - Evaluation`;
      } catch (e) {
        eventTitle.textContent = 'Hackathon Evaluation Studio';
      }

      queueData = await apiFetch(`/api/hackathons/${hackathonId}/judging/queue`);
      loading.hidden = true;

      if (!queueData.submissions || queueData.submissions.length === 0) {
        emptyState.hidden = false;
        return;
      }

      studioView.hidden = false;
      currentCriteria = queueData.criteria || [];
      renderQueue();

      // Auto-select first submission or param
      const targetId = Number(qs('submissionId')) || queueData.submissions[0].id;
      selectSubmission(targetId);
    } catch (err) {
      loading.hidden = true;
      showToast(err.message || 'Failed to load evaluation queue.', 'error');
    }
  }

  function renderQueue() {
    queueContainer.innerHTML = queueData.submissions.map(s => {
      const activeClass = s.id === activeSubmissionId ? 'active' : '';
      const statusIcon = s.evaluated_by_me
        ? '<span style="color:#10b981; font-weight:700;">&#10003; Evaluated</span>'
        : '<span class="muted">&#9675; Pending</span>';

      return `
        <button class="queue-item-btn ${activeClass}" data-sub-id="${s.id}">
          <b>${escapeHtml(s.title)}</b>
          <span style="font-size:11px;">(${statusIcon})</span>
        </button>
      `;
    }).join('');
  }

  queueContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-sub-id]');
    if (!btn) return;
    const sId = Number(btn.dataset.sub-id);
    if (sId && sId !== activeSubmissionId) {
      selectSubmission(sId);
    }
  });

  async function selectSubmission(submissionId) {
    activeSubmissionId = submissionId;
    renderQueue();

    try {
      const data = await apiFetch(`/api/submissions/${submissionId}/judging`);
      const { submission, members, criteria, myScores } = data;

      currentCriteria = criteria;
      subTitle.textContent = submission.title;
      subTeamName.textContent = submission.team_name;
      subDate.textContent = new Date(submission.submitted_at).toLocaleDateString();

      // Evaluated Badge
      const hasScores = myScores && myScores.length > 0;
      if (hasScores) {
        myEvalBadge.innerHTML = '<span class="badge badge-success">Evaluated by You</span>';
        btnSaveScore.textContent = 'Update Evaluation Scores';
      } else {
        myEvalBadge.innerHTML = '<span class="badge badge-warning">Score Pending</span>';
        btnSaveScore.textContent = 'Submit Evaluation';
      }

      // External links
      linkGithub.href = submission.github_url;
      linkGithub.style.display = 'inline-flex';

      if (submission.demo_url) {
        linkDemo.href = submission.demo_url;
        linkDemo.style.display = 'inline-flex';
      } else {
        linkDemo.style.display = 'none';
      }

      if (submission.file_path) {
        linkFile.href = `${API_URL}/${submission.file_path}`;
        linkFile.style.display = 'inline-flex';
      } else {
        linkFile.style.display = 'none';
      }

      subDescription.textContent = submission.description || 'No detailed description provided.';

      // Roster
      if (members && members.length > 0) {
        teamRosterList.innerHTML = members.map(m => `
          <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid var(--border-color);">
            <b>${escapeHtml(m.name)}</b>
            <span class="muted">${escapeHtml(m.college || 'College not listed')} &bull; ${escapeHtml(m.skills || '')}</span>
          </div>
        `).join('');
      } else {
        teamRosterList.innerHTML = '<p class="muted">No roster details found.</p>';
      }

      // Criteria inputs & existing scores
      const scoreMap = {};
      let existingComment = '';
      if (myScores) {
        myScores.forEach(ms => {
          scoreMap[ms.criterion_id] = Number(ms.score);
          if (ms.comment) existingComment = ms.comment;
        });
      }
      judgeComment.value = existingComment;

      criteriaContainer.innerHTML = criteria.map(c => {
        const val = scoreMap[c.id] !== undefined ? scoreMap[c.id] : (c.max_score / 2);
        return `
          <div class="criterion-row" data-criterion-id="${c.id}" data-weight="${c.weight}" data-max="${c.max_score}">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <b>${escapeHtml(c.name)}</b>
              <span class="badge badge-subtle" style="font-size:12px;">Weight: ${c.weight}%</span>
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
              <input type="range" class="criterion-range" min="0" max="${c.max_score}" step="0.5" value="${val}" style="flex:1;">
              <input type="number" class="criterion-num" min="0" max="${c.max_score}" step="0.5" value="${val}" style="width:70px; text-align:center; padding:6px; font-weight:700;">
              <span class="muted" style="font-size:12px;">/ ${c.max_score}</span>
            </div>
          </div>
        `;
      }).join('');

      attachCriteriaSync();
      recalculateWeightedScore();
    } catch (err) {
      showToast(err.message || 'Failed to load submission data.', 'error');
    }
  }

  function attachCriteriaSync() {
    const rows = criteriaContainer.querySelectorAll('.criterion-row');
    rows.forEach(r => {
      const range = r.querySelector('.criterion-range');
      const num = r.querySelector('.criterion-num');

      range.addEventListener('input', () => {
        num.value = range.value;
        recalculateWeightedScore();
      });

      num.addEventListener('input', () => {
        range.value = num.value;
        recalculateWeightedScore();
      });
    });
  }

  function recalculateWeightedScore() {
    const rows = criteriaContainer.querySelectorAll('.criterion-row');
    let totalWeighted = 0;

    rows.forEach(r => {
      const weight = Number(r.dataset.weight);
      const max = Number(r.dataset.max) || 10;
      const val = Number(r.querySelector('.criterion-num').value) || 0;

      totalWeighted += (val / max) * weight;
    });

    computedScoreEl.textContent = `${totalWeighted.toFixed(1)} / 100`;
  }

  // Submit Evaluation Scores
  evaluationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeSubmissionId) return;

    const rows = criteriaContainer.querySelectorAll('.criterion-row');
    const scores = [];

    rows.forEach(r => {
      const cId = Number(r.dataset.criterionId);
      const val = Number(r.querySelector('.criterion-num').value);
      scores.push({
        criterion_id: cId,
        score: val,
      });
    });

    const comment = judgeComment.value.trim();

    try {
      setLoading(btnSaveScore, true, 'Saving scores...');
      const res = await apiFetch(`/api/submissions/${activeSubmissionId}/score`, {
        method: 'POST',
        body: { scores, comment },
      });

      showToast(res.message || 'Evaluation submitted successfully!', 'success');

      // Update queue item in memory
      const queueItem = queueData.submissions.find(s => s.id === activeSubmissionId);
      if (queueItem) queueItem.evaluated_by_me = true;
      renderQueue();

      myEvalBadge.innerHTML = '<span class="badge badge-success">Evaluated by You</span>';
      btnSaveScore.textContent = 'Update Evaluation Scores';
    } catch (err) {
      showToast(err.message || 'Failed to submit evaluation.', 'error');
    } finally {
      setLoading(btnSaveScore, false);
    }
  });

  loadQueue();
});
