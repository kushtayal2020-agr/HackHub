(function () {
  // Apply saved theme immediately to prevent flashing
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  document.addEventListener('DOMContentLoaded', initNavbar);

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
})();
