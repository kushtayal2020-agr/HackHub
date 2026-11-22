(function () {
  document.addEventListener('DOMContentLoaded', () => {
    loadUpcomingHackathons();
  });

  async function loadUpcomingHackathons() {
    const list = document.getElementById('upcoming-list');
    const empty = document.getElementById('upcoming-empty');
    if (!list) return;

    try {
      const data = await apiFetch('/api/hackathons?status=upcoming&limit=3');
      const hackathons = (data && data.hackathons) ? data.hackathons : [];

      if (hackathons.length === 0) {
        if (empty) empty.hidden = false;
        return;
      }

      list.innerHTML = hackathons.map(h => {
        return `
          <div class="card hackathon-card">
            ${bannerHtml(h.banner_path, h.title)}
            <div class="card-body">
              <div class="card-top">
                <span class="muted">${escapeHtml(h.theme || 'General')}</span>
                ${statusBadge('upcoming')}
              </div>
              <h3><a href="hackathon-detail.html?id=${h.id}">${escapeHtml(h.title)}</a></h3>
              <p class="muted">${escapeHtml((h.description || '').slice(0, 100))}${h.description && h.description.length > 100 ? '...' : ''}</p>
              <div class="hackathon-meta">
                <p><strong>Starts:</strong> ${formatDate(h.start_date)}</p>
                <p><strong>Team size:</strong> Up to ${h.max_team_size} members</p>
              </div>
              <a href="hackathon-detail.html?id=${h.id}" class="btn btn-primary btn-block">View Details</a>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      if (empty) {
        empty.textContent = 'Unable to load upcoming hackathons at this moment.';
        empty.hidden = false;
      }
    }
  }
})();
