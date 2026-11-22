(function () {
  // Apply saved theme immediately to prevent flashing
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initFooter();
  });

  const ICONS = {
    sun: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`,
    moon: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`,
    menu: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`,
    logout: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:-1px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`,
    brand: `<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="brand-icon"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline><circle cx="12" cy="12" r="2" fill="currentColor"></circle></svg>`
  };

  function initNavbar() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    const user = getUser();
    const token = getToken();
    const role = (token && user && user.role) ? user.role : 'guest';

    // Role-based links according to spec
    const roleLinks = {
      guest: [
        { label: 'Home', href: 'index.html' },
        { label: 'Hackathons', href: 'hackathons.html' },
        { label: 'Login', href: 'login.html' },
        { label: 'Register', href: 'register.html' }
      ],
      participant: [
        { label: 'Hackathons', href: 'hackathons.html' },
        { label: 'My Teams', href: 'my-teams.html' },
        { label: 'My Submissions', href: 'my-submissions.html' },
        { label: 'Profile', href: 'profile.html' }
      ],
      organiser: [
        { label: 'Hackathons', href: 'hackathons.html' },
        { label: 'My Hackathons', href: 'my-hackathons.html' },
        { label: 'Create Hackathon', href: 'create-hackathon.html' },
        { label: 'Profile', href: 'profile.html' }
      ],
      judge: [
        { label: 'Judge Dashboard', href: 'judge-dashboard.html' },
        { label: 'Hackathons', href: 'hackathons.html' },
        { label: 'Profile', href: 'profile.html' }
      ],
      admin: [
        { label: 'Dashboard', href: 'admin-dashboard.html' },
        { label: 'Users', href: 'admin-users.html' },
        { label: 'Hackathon Approvals', href: 'admin-hackathons.html' },
        { label: 'Audit Log', href: 'admin-audit.html' },
        { label: 'Hackathons', href: 'hackathons.html' }
      ]
    };

    const links = roleLinks[role] || roleLinks.guest;
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';

    const linksHtml = links.map(link => {
      const isActive = (link.href === currentPath || (currentPath === '' && link.href === 'index.html')) ? ' active' : '';
      return `<a href="${link.href}" class="nav-link${isActive}">${escapeHtml(link.label)}</a>`;
    }).join('');

    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    const themeIcon = theme === 'dark' ? ICONS.sun : ICONS.moon;

    let rightHtml = `
      <div id="nav-bell-slot"></div>
      <button type="button" class="btn-theme-toggle" id="theme-toggle" title="Toggle color scheme" aria-label="Toggle dark/light theme">${themeIcon}</button>
    `;

    if (token && user) {
      let avatarHtml = '';
      if (user.avatar_path) {
        avatarHtml = `<img class="nav-avatar" src="${API_URL}/${escapeHtml(user.avatar_path)}" alt="${escapeHtml(user.name)}">`;
      } else {
        const initial = (user.name || 'U').charAt(0).toUpperCase();
        avatarHtml = `<span class="nav-avatar nav-avatar-initial">${escapeHtml(initial)}</span>`;
      }

      rightHtml += `
        <a href="profile.html" class="nav-user-info" title="${escapeHtml(user.email)}">
          ${avatarHtml}
          <span class="nav-username">${escapeHtml(user.name)}</span>
        </a>
        <button type="button" class="btn-logout" id="logout-btn">${ICONS.logout} Logout</button>
      `;
    }

    navbar.innerHTML = `
      <div class="nav-container">
        <div class="nav-brand-wrap">
          <a href="index.html" class="nav-brand">
            ${ICONS.brand}
            <span>HackHub</span>
          </a>
          <button type="button" class="nav-toggle" id="nav-toggle" aria-label="Toggle navigation">${ICONS.menu}</button>
        </div>
        <div class="nav-menu" id="nav-menu">
          <div class="nav-links">
            ${linksHtml}
          </div>
          <div class="nav-actions">
            ${rightHtml}
          </div>
        </div>
      </div>
    `;

    // Move notification bell into bell slot if bell script ran or runs later
    const bellSlot = navbar.querySelector('#nav-bell-slot');
    const existingBell = navbar.querySelector('.bell-wrap');
    if (existingBell && bellSlot && existingBell.parentNode !== bellSlot) {
      bellSlot.appendChild(existingBell);
    }

    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1 && node.classList && node.classList.contains('bell-wrap')) {
            if (bellSlot && node.parentNode !== bellSlot) {
              bellSlot.appendChild(node);
            }
          }
        }
      }
    });
    observer.observe(navbar, { childList: true });

    // Hamburger menu toggle
    const toggleBtn = navbar.querySelector('#nav-toggle');
    const menu = navbar.querySelector('#nav-menu');
    if (toggleBtn && menu) {
      toggleBtn.addEventListener('click', () => {
        menu.classList.toggle('open');
      });
    }

    // Theme toggle
    const themeBtn = navbar.querySelector('#theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const curTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const nextTheme = curTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('theme', nextTheme);
        themeBtn.innerHTML = nextTheme === 'dark' ? ICONS.sun : ICONS.moon;
      });
    }

    // Logout
    const logoutBtn = navbar.querySelector('#logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        logout();
      });
    }
  }

  function initFooter() {
    const footer = document.querySelector('footer.site-footer, footer');
    if (!footer) return;
    if (footer.querySelector('.footer-top')) return; // already has full footer
    footer.innerHTML = `
      <div class="container">
        <div class="footer-top">
          <div class="footer-about">
            <div class="footer-brand-title">
              ${ICONS.brand}
              <span>HackHub</span>
            </div>
            <p>HackHub is a hackathon and event management platform. Discover competitions, collaborate with teams, evaluate submissions with transparent rubrics, and issue verifiable certificates.</p>
            <div class="footer-status-pill">
              <span class="badge-dot" style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10b981; margin-right:6px;"></span>
              All Systems Operational
            </div>
          </div>

          <div class="footer-col">
            <h4>Platform</h4>
            <a href="hackathons.html">Explore Hackathons</a>
            <a href="create-hackathon.html">Host an Event</a>
            <a href="leaderboard.html">Live Leaderboards</a>
            <a href="register.html">Developer Sign Up</a>
            <a href="login.html">Organizer Login</a>
          </div>

          <div class="footer-col">
            <h4>Portals &amp; Guides</h4>
            <a href="register.html?role=participant">Participant Guide</a>
            <a href="register.html?role=organiser">Organizer Guidelines</a>
            <a href="register.html?role=judge">Judge Evaluation Rubric</a>
            <a href="profile.html">Account &amp; Security</a>
          </div>

          <div class="footer-col">
            <h4>Legal &amp; Trust</h4>
            <a href="privacy.html">Privacy Policy</a>
            <a href="terms.html">Terms of Service</a>
            <a href="rules.html">Hackathon Rules &amp; Guidelines</a>
            <a href="code-of-conduct.html">Code of Conduct</a>
          </div>
        </div>

        <div class="footer-bottom">
          <p>&copy; 2026 HackHub. Modern Developer Innovation &amp; Hackathon Platform.</p>
          <div class="social-links">
            <a href="https://github.com/kushtayal2020-agr/HackHub" target="_blank" rel="noopener noreferrer" class="social-btn" aria-label="GitHub Repository">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
            </a>
            <a href="#" class="social-btn" aria-label="LinkedIn">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
            </a>
            <a href="#" class="social-btn" aria-label="Twitter">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>
            </a>
            <a href="#" class="social-btn" aria-label="Discord">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6h0a14.5 14.5 0 0 0-4-1.5 9.6 9.6 0 0 0-.4 1 12.9 12.9 0 0 0-3.2 0 9.6 9.6 0 0 0-.4-1A14.5 14.5 0 0 0 6 6a15.8 15.8 0 0 0-2 9.5 14.8 14.8 0 0 0 4.5 2.3 11.2 11.2 0 0 0 1-1.6 9.6 9.6 0 0 1-1.6-.8l.3-.2a11.8 11.8 0 0 0 10.6 0l.3.2a9.6 9.6 0 0 1-1.6.8 11.2 11.2 0 0 0 1 1.6 14.8 14.8 0 0 0 4.5-2.3A15.8 15.8 0 0 0 18 6z"></path><circle cx="9.5" cy="11.5" r="1.5"></circle><circle cx="14.5" cy="11.5" r="1.5"></circle></svg>
            </a>
          </div>
        </div>
      </div>
    `;
  }
})();
