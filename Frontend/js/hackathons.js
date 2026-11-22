const listEl = document.getElementById('list');
const emptyEl = document.getElementById('empty');
const pagerEl = document.getElementById('pagination');
const searchEl = document.getElementById('search');
const themeEl = document.getElementById('theme');
const statusEl = document.getElementById('status');

let page = 1;
let timer;

// If URL has search or theme params, initialize inputs
const urlSearch = qs('search');
if (urlSearch && searchEl) searchEl.value = urlSearch;
const urlTheme = qs('theme');
if (urlTheme && themeEl) themeEl.value = urlTheme;
const urlStatus = qs('status');
if (urlStatus && statusEl) statusEl.value = urlStatus;

async function loadThemes() {
  try {
    const themes = await apiFetch('/api/hackathons/themes');
    if (Array.isArray(themes)) {
      themes.forEach((theme) => {
        const option = document.createElement('option');
        option.value = theme;
        option.textContent = theme;
        if (theme === urlTheme) option.selected = true;
        themeEl.appendChild(option);
      });
    }
  } catch (err) {
    // Non-fatal if themes fail to load
  }
}

function cardHtml(h) {
  const prizesHtml = h.prizes
    ? `<div class="hackathon-meta-row">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
        <span><strong>Prizes:</strong> ${escapeHtml(h.prizes)}</span>
       </div>`
    : '';

  return `
    <article class="card hackathon-card">
      ${bannerHtml(h.banner_path, h.title)}
      <div class="card-body">
        <div class="card-top">
          <span class="theme-pill">${escapeHtml(h.theme || 'Open Innovation')}</span>
          ${statusBadge(h.status)}
        </div>
        <h3><a href="hackathon-detail.html?id=${h.id}">${escapeHtml(h.title)}</a></h3>
        <p class="muted">Organized by ${escapeHtml(h.organiser_name || 'Verified Organiser')}</p>
        <div class="hackathon-meta">
          <div class="hackathon-meta-row">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span>Starts: ${formatDate(h.start_date)}</span>
          </div>
          ${prizesHtml}
        </div>
        <a class="btn btn-secondary btn-block" href="hackathon-detail.html?id=${h.id}">
          View Hackathon Details
        </a>
      </div>
    </article>
  `;
}

async function loadHackathons() {
  const params = new URLSearchParams({ page, limit: 9 });
  if (searchEl.value.trim()) params.set('search', searchEl.value.trim());
  if (themeEl.value) params.set('theme', themeEl.value);
  if (statusEl.value) params.set('status', statusEl.value);

  try {
    const data = await apiFetch('/api/hackathons?' + params);
    if (data && data.hackathons) {
      listEl.innerHTML = data.hackathons.map(cardHtml).join('');
      emptyEl.hidden = data.hackathons.length > 0;
      renderPager(pagerEl, data.page, data.totalPages, (newPage) => {
        page = newPage;
        loadHackathons();
      });
    }
  } catch (err) {
    emptyEl.textContent = 'Unable to connect to the backend server. Please verify that the backend is running at ' + API_URL;
    emptyEl.hidden = false;
  }
}

searchEl.addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    page = 1;
    loadHackathons();
  }, 350);
});

[themeEl, statusEl].forEach((el) => {
  el.addEventListener('change', () => {
    page = 1;
    loadHackathons();
  });
});

loadThemes();
loadHackathons();
