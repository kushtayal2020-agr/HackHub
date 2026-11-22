document.addEventListener('DOMContentLoaded', async () => {
  const verifyCode = qs('verify');
  const hackathonId = qs('hackathonId') || qs('id');

  const btnBack = document.getElementById('btn-back');
  const loading = document.getElementById('loading');
  const errorView = document.getElementById('error-view');
  const errorMessage = document.getElementById('error-message');
  const certView = document.getElementById('cert-view');
  const verifyPill = document.getElementById('verify-pill');

  const certBadgeContainer = document.getElementById('cert-badge-container');
  const certTypeLabel = document.getElementById('cert-type-label');
  const certRecipient = document.getElementById('cert-recipient');
  const certCollege = document.getElementById('cert-college');
  const certBodyText = document.getElementById('cert-body-text');
  const certMetaTeam = document.getElementById('cert-meta-team');
  const certMetaRank = document.getElementById('cert-meta-rank');
  const certMetaDate = document.getElementById('cert-meta-date');
  const certMetaId = document.getElementById('cert-meta-id');
  const certSignName = document.getElementById('cert-sign-name');
  const certActions = document.getElementById('cert-actions');
  const btnDownloadPdf = document.getElementById('btn-download-pdf');
  const btnCopyLink = document.getElementById('btn-copy-link');

  let currentCertData = null;
  let activeHackathonId = hackathonId;

  if (verifyCode) {
    // Mode 1: Public Verification
    verifyPill.hidden = false;
    if (btnBack) btnBack.href = 'hackathons.html';

    try {
      loading.hidden = false;
      errorView.hidden = true;
      certView.hidden = true;

      const data = await apiFetch(`/api/certificates/verify/${encodeURIComponent(verifyCode)}`);
      loading.hidden = true;

      if (!data.valid) {
        errorView.hidden = false;
        errorMessage.textContent = data.message || 'Invalid or revoked certificate identifier.';
        return;
      }

      currentCertData = data.certificate || data;
      activeHackathonId = currentCertData.hackathon_id || currentCertData.hackathonId;
      renderCertificate(currentCertData, true);
    } catch (err) {
      loading.hidden = true;
      errorView.hidden = false;
      errorMessage.textContent = err.message || 'Verification failed.';
    }
  } else if (hackathonId) {
    // Mode 2: Student / Participant viewing their own certificate
    requireAuth();
    if (btnBack) btnBack.href = `leaderboard.html?hackathonId=${hackathonId}`;

    try {
      loading.hidden = false;
      errorView.hidden = true;
      certView.hidden = true;

      const data = await apiFetch(`/api/hackathons/${hackathonId}/certificates/info`);
      loading.hidden = true;

      if (!data.eligible) {
        errorView.hidden = false;
        errorMessage.textContent = data.message || 'You are not eligible for a certificate in this hackathon yet.';
        return;
      }

      currentCertData = data;
      renderCertificate(currentCertData, false);
    } catch (err) {
      loading.hidden = true;
      errorView.hidden = false;
      errorMessage.textContent = err.message || 'Failed to retrieve certificate details.';
    }
  } else {
    loading.hidden = true;
    errorView.hidden = false;
    errorMessage.textContent = 'No certificate verification code or hackathon specified.';
  }

  function renderCertificate(cert, isVerificationView) {
    certView.hidden = false;

    const certId = cert.certificateId || cert.cert_id || cert.id;
    const recipient = cert.recipientName || cert.recipient_name || cert.student_name || 'Participant';
    const college = cert.college || cert.student_college || 'Apex Institute of Technology';
    const isWinner = cert.is_winner || (cert.rank && cert.rank <= 3);
    const recognition = cert.recognition || cert.achievement || (isWinner ? `#${cert.rank} Rank Winner` : 'Participation Certificate');

    certRecipient.textContent = recipient;
    certCollege.textContent = college;

    if (isWinner) {
      certBadgeContainer.innerHTML = `<span class="cert-badge badge-winner">${escapeHtml(recognition)}</span>`;
      certTypeLabel.textContent = 'Certificate of Excellence';
    } else {
      certBadgeContainer.innerHTML = `<span class="cert-badge badge-participant">Verified Participant</span>`;
      certTypeLabel.textContent = 'Certificate of Participation';
    }

    const team = cert.teamName || cert.team_name || 'Individual';
    const hackTitle = cert.hackathonTitle || cert.hackathon_title || 'HackHub Innovation Challenge';
    const proj = cert.project_title ? `with the innovation project "${cert.project_title}"` : 'in the competition track';

    certBodyText.innerHTML = `for ${isWinner ? 'outstanding achievement and winning an official podium rank' : 'active dedication, innovation, and successful submission'} in <b>${escapeHtml(hackTitle)}</b> ${escapeHtml(proj)}.`;

    certMetaTeam.textContent = team;
    certMetaRank.textContent = recognition;
    certMetaDate.textContent = cert.issueDate || cert.issue_date || formatDate(new Date());
    certMetaId.innerHTML = `<code style="color:var(--brand-primary); font-weight:700;">${escapeHtml(certId)}</code>`;

    if (cert.organiser_name) {
      certSignName.textContent = cert.organiser_name;
    }

    // PDF Download button
    if (btnDownloadPdf) {
      if (isVerificationView && !getToken()) {
        btnDownloadPdf.style.display = 'none';
      } else {
        btnDownloadPdf.style.display = 'inline-flex';
        btnDownloadPdf.onclick = () => downloadPdf(activeHackathonId, hackTitle);
      }
    }

    // Copy link button
    if (btnCopyLink) {
      btnCopyLink.onclick = () => {
        const url = `${window.location.origin}${window.location.pathname}?verify=${encodeURIComponent(certId)}`;
        navigator.clipboard.writeText(url).then(() => {
          showToast('Verification link copied to clipboard!');
        }).catch(() => {
          prompt('Copy this verification URL:', url);
        });
      };
    }
  }

  async function downloadPdf(hId, title) {
    if (!hId) return;
    const btn = btnDownloadPdf;
    const oldHtml = btn.innerHTML;
    try {
      btn.disabled = true;
      btn.innerHTML = 'Generating PDF...';

      const response = await fetch(`${API_URL}/api/hackathons/${hId}/certificates/my-certificate`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });

      if (!response.ok) {
        let msg = 'Failed to generate certificate PDF';
        try {
          const errData = await response.json();
          msg = errData.message || msg;
        } catch (_) {}
        throw new Error(msg);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const safeTitle = (title || 'HackHub').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `Certificate_${safeTitle}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      showToast('Certificate downloaded successfully!');
    } catch (err) {
      showToast(err.message || 'Error downloading certificate.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = oldHtml;
    }
  }
});
