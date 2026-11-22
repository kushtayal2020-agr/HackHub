document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;

  const hackathonId = qs('hackathonId') || qs('id');
  if (!hackathonId) {
    showToast('No hackathon specified. Redirecting...', 'error');
    setTimeout(() => { window.location.href = 'hackathons.html'; }, 1500);
    return;
  }

  const backLink = document.getElementById('back-link');
  if (backLink) {
    backLink.href = `team.html?hackathonId=${hackathonId}`;
  }

  const loading = document.getElementById('loading');
  const noTeamAlert = document.getElementById('no-team-alert');
  const btnGotoTeam = document.getElementById('btn-goto-team');
  const submissionView = document.getElementById('submission-view');

  const eventTitle = document.getElementById('event-title');
  const teamName = document.getElementById('team-name');
  const eventStatusBadge = document.getElementById('event-status-badge');
  const deadlineInfo = document.getElementById('deadline-info');
  const formHeading = document.getElementById('form-heading');

  const submissionForm = document.getElementById('submission-form');
  const subTitle = document.getElementById('sub-title');
  const subDesc = document.getElementById('sub-desc');
  const subGithub = document.getElementById('sub-github');
  const subDemo = document.getElementById('sub-demo');
  const dropzoneBox = document.getElementById('dropzone-box');
  const subFile = document.getElementById('sub-file');
  const fileChosenInfo = document.getElementById('file-chosen-info');
  const chosenFileName = document.getElementById('chosen-file-name');
  const btnClearFile = document.getElementById('btn-clear-file');
  const existingFileInfo = document.getElementById('existing-file-info');
  const existingFileLink = document.getElementById('existing-file-link');
  const btnWithdraw = document.getElementById('btn-withdraw');
  const btnCancel = document.getElementById('btn-cancel');
  const btnSubmit = document.getElementById('btn-submit');

  let currentSubmission = null;
  let currentTeam = null;

  async function loadData() {
    try {
      loading.hidden = false;
      noTeamAlert.hidden = true;
      submissionView.hidden = true;

      const data = await apiFetch(`/api/hackathons/${hackathonId}/submissions/mine`);
      loading.hidden = true;

      if (!data.team) {
        noTeamAlert.hidden = false;
        btnGotoTeam.href = `team.html?hackathonId=${hackathonId}`;
        return;
      }

      currentTeam = data.team;
      currentSubmission = data.submission;
      renderView();
    } catch (err) {
      loading.hidden = true;
      showToast(err.message || 'Failed to load submission info.', 'error');
    }
  }

  function renderView() {
    submissionView.hidden = false;

    eventTitle.textContent = currentTeam.hackathon_title || 'Hackathon Event';
    teamName.textContent = currentTeam.name;
    eventStatusBadge.innerHTML = `<span class="badge badge-${escapeHtml(currentTeam.hackathon_status)}">${escapeHtml(currentTeam.hackathon_status)}</span>`;

    if (currentTeam.end_date) {
      deadlineInfo.textContent = `Deadline: ${new Date(currentTeam.end_date).toLocaleString()}`;
    }

    btnCancel.href = `team.html?hackathonId=${hackathonId}`;

    if (currentSubmission) {
      // Editing Mode
      formHeading.textContent = 'Edit Project Submission';
      subTitle.value = currentSubmission.title || '';
      subDesc.value = currentSubmission.description || '';
      subGithub.value = currentSubmission.github_url || '';
      subDemo.value = currentSubmission.demo_url || '';

      if (currentSubmission.file_path) {
        existingFileInfo.style.display = 'block';
        existingFileLink.href = `${API_URL}/${currentSubmission.file_path}`;
      }

      btnSubmit.textContent = 'Save & Update Submission';

      // Team leader can withdraw
      if (currentTeam.is_leader) {
        btnWithdraw.style.display = 'inline-block';
      }
    } else {
      // New Submission Mode
      formHeading.textContent = 'Submit New Project';
      btnSubmit.textContent = 'Submit Project for Evaluation';
      btnWithdraw.style.display = 'none';
      existingFileInfo.style.display = 'none';
    }
  }

  // File Picker & Drag-and-drop
  dropzoneBox.addEventListener('click', () => subFile.click());

  dropzoneBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzoneBox.style.borderColor = 'var(--brand-primary)';
  });
  dropzoneBox.addEventListener('dragleave', () => {
    dropzoneBox.style.borderColor = '';
  });
  dropzoneBox.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzoneBox.style.borderColor = '';
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  subFile.addEventListener('change', () => {
    if (subFile.files && subFile.files[0]) {
      handleFileSelected(subFile.files[0]);
    }
  });

  function handleFileSelected(file) {
    if (file.size > 25 * 1024 * 1024) {
      showToast('File exceeds 25 MB limit.', 'error');
      subFile.value = '';
      fileChosenInfo.style.display = 'none';
      return;
    }
    chosenFileName.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
    fileChosenInfo.style.display = 'block';
  }

  btnClearFile.addEventListener('click', (e) => {
    e.stopPropagation();
    subFile.value = '';
    fileChosenInfo.style.display = 'none';
  });

  // Withdraw Submission
  btnWithdraw.addEventListener('click', async () => {
    if (!currentSubmission) return;
    if (!confirm('Are you sure you want to withdraw this project submission? Judges will no longer be able to evaluate it.')) return;

    try {
      setLoading(btnWithdraw, true, 'Withdrawing...');
      const res = await apiFetch(`/api/submissions/${currentSubmission.id}`, { method: 'DELETE' });
      showToast(res.message || 'Submission withdrawn.', 'success');
      setTimeout(() => {
        window.location.href = `team.html?hackathonId=${hackathonId}`;
      }, 1200);
    } catch (err) {
      showToast(err.message, 'error');
      setLoading(btnWithdraw, false);
    }
  });

  // Form Submit
  submissionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = subTitle.value.trim();
    const description = subDesc.value.trim();
    const github_url = subGithub.value.trim();
    const demo_url = subDemo.value.trim();

    if (title.length < 3) {
      showToast('Project title must be at least 3 characters.', 'error');
      return;
    }
    if (!github_url) {
      showToast('Repository URL is required.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    if (description) formData.append('description', description);
    formData.append('github_url', github_url);
    if (demo_url) formData.append('demo_url', demo_url);

    if (subFile.files && subFile.files[0]) {
      formData.append('file', subFile.files[0]);
    }

    try {
      setLoading(btnSubmit, true, 'Submitting project...');

      let url = `${API_URL}/api/hackathons/${hackathonId}/submissions`;
      let method = 'POST';

      if (currentSubmission) {
        url = `${API_URL}/api/submissions/${currentSubmission.id}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Submission failed.');
      }

      showToast(data.message || 'Project submitted successfully!', 'success');
      setTimeout(() => {
        window.location.href = `team.html?hackathonId=${hackathonId}`;
      }, 1500);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(btnSubmit, false);
    }
  });

  loadData();
});
