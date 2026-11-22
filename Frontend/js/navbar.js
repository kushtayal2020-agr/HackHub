(function () {
  // Apply saved theme immediately to prevent flashing
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  document.addEventListener('DOMContentLoaded', initNavbar);

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
      const isActive = link.href === currentPath ? ' active' : '';
      return `<a href="${link.href}" class="nav-link${isActive}">${escapeHtml(link.label)}</a>`;
    }).join('');

    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    const themeIcon = theme === 'dark' ? '&#9728;' : '&#9790;'; // Sun or Moon

    let rightHtml = `
      <div id="nav-bell-slot"></div>
      <button type="button" class="btn-theme-toggle" id="theme-toggle" title="Toggle Theme" aria-label="Toggle dark/light theme">${themeIcon}</button>
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
        <button type="button" class="btn-logout" id="logout-btn">Logout</button>
      `;
    }

    navbar.innerHTML = `
      <div class="nav-container">
        <div class="nav-brand-wrap">
          <a href="index.html" class="nav-brand">HackHub</a>
          <button type="button" class="nav-toggle" id="nav-toggle" aria-label="Toggle navigation">&#9776;</button>
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
        themeBtn.innerHTML = nextTheme === 'dark' ? '&#9728;' : '&#9790;';
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
