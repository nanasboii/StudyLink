import { getUser, clearSession, api } from './api.js';
import { PAGES } from './routes.js';

const NOTIFICATIONS_UPDATED_EVENT = 'studylink:notifications-updated';
const NOTIFICATION_POLL_MS = 30000;

const MAIN_NAV_ITEMS_BY_ROLE = {
  admin: [
    { key: 'resources', label: 'Resources', href: PAGES.resources },
    { key: 'leaderboards', label: 'Leaderboard', href: PAGES.leaderboards },
    { key: 'achievements', label: 'Achievements', href: PAGES.achievements }
  ],
  tutor: [
    { key: 'resources', label: 'Resources', href: PAGES.resources },
    { key: 'tutors', label: 'Tutors', href: PAGES.tutors },
    { key: 'review', label: 'Reviews', href: PAGES.review },
    { key: 'leaderboards', label: 'Leaderboard', href: PAGES.leaderboards },
    { key: 'session', label: 'Sessions', href: PAGES.session },
    { key: 'achievements', label: 'Achievements', href: PAGES.achievements }
  ],
  tutee: [
    { key: 'resources', label: 'Resources', href: PAGES.resources },
    { key: 'tutors', label: 'Tutors', href: PAGES.tutors },
    { key: 'review', label: 'Reviews', href: PAGES.review },
    { key: 'leaderboards', label: 'Leaderboard', href: PAGES.leaderboards },
    { key: 'session', label: 'Sessions', href: PAGES.session },
    { key: 'achievements', label: 'Achievements', href: PAGES.achievements }
  ]
};
const LAST_NON_NOTIFICATION_PAGE_KEY = 'studylinkLastNonNotificationPage';

function formatRoleLabel(role) {
  const value = String(role || 'guest');
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildQuickAccessItems(user) {
  if (!user) {
    return '';
  }

  if (user.role === 'admin') {
    return `
      <a href="${PAGES.profile}" class="quick-access-item">Profile</a>
      <hr class="quick-access-divider" />
      <a href="${PAGES.adminVerifications}" class="quick-access-item">Verifications</a>
      <a href="${PAGES.adminResources}" class="quick-access-item">Resource Mgmt</a>
      <a href="${PAGES.adminAnalytics}" class="quick-access-item">Analytics</a>
      <a href="${PAGES.adminActivity}" class="quick-access-item">Activity Logs</a>
      <a href="${PAGES.adminErrors}" class="quick-access-item">Error Logs</a>
      <hr class="quick-access-divider" />
    `;
  }

  if (user.role === 'tutor') {
    return `
      <a href="${PAGES.profile}" class="quick-access-item">Profile</a>
      <hr class="quick-access-divider" />
      <a href="${PAGES.verification}" class="quick-access-item">Verification</a>
      <hr class="quick-access-divider" />
    `;
  }

  return `
    <a href="${PAGES.profile}" class="quick-access-item">Profile</a>
    <hr class="quick-access-divider" />
  `;
}

function buildMainNav(activePage, role) {
  const items = MAIN_NAV_ITEMS_BY_ROLE[role] || MAIN_NAV_ITEMS_BY_ROLE.tutee;
  return items.map((item) => {
    const activeClass = activePage === item.key ? 'active' : '';
    return `<a href="${item.href}" class="${activeClass}">${item.label}</a>`;
  }).join('');
}

export function mountNav(activePage) {
  const user = getUser();
  const topbar = document.getElementById('topbar');
  const nav = document.getElementById('bottomNav');

  if (!topbar || !nav) {
    return;
  }

  const roleLabel = formatRoleLabel(user && user.role);
  const quickAccessItems = buildQuickAccessItems(user);
  const notificationsActive = activePage === 'notifications' ? ' is-active' : '';

  if (activePage !== 'notifications') {
    sessionStorage.setItem(LAST_NON_NOTIFICATION_PAGE_KEY, window.location.pathname);
  }

  topbar.innerHTML = `
    <div class="quick-access-container">
      <button class="quick-access-btn" type="button" id="quickAccessBtn" title="Quick Access Menu" aria-haspopup="menu" aria-expanded="false" aria-controls="quickAccessMenu">...</button>
      <div class="quick-access-menu hidden" id="quickAccessMenu" role="menu" aria-label="Quick access">
        ${quickAccessItems}
        <a href="#" class="quick-access-item logout-item" id="quickLogoutBtn" role="menuitem">Logout</a>
      </div>
    </div>
    <h1>StudyLink - ${roleLabel}</h1>
    <button class="icon-btn notify-btn${notificationsActive}" type="button" id="notificationsBtn" aria-label="Open notifications" title="Notifications">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4.5 7.5A3.5 3.5 0 0 1 8 4h8a3.5 3.5 0 0 1 3.5 3.5v9A3.5 3.5 0 0 1 16 20H8a3.5 3.5 0 0 1-3.5-3.5z" fill="none" stroke="currentColor" stroke-width="1.8"/>
        <path d="m6.5 8.5 5.5 4.5 5.5-4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="notify-dot hidden" id="notifyDot" aria-hidden="true"></span>
    </button>
  `;

  nav.innerHTML = buildMainNav(activePage, user?.role);

  const quickAccessBtn = document.getElementById('quickAccessBtn');
  const quickAccessMenu = document.getElementById('quickAccessMenu');
  const quickLogoutBtn = document.getElementById('quickLogoutBtn');
  const notificationsBtn = document.getElementById('notificationsBtn');
  const notifyDot = document.getElementById('notifyDot');

  const setUnreadBadge = (count) => {
    if (!notifyDot) {
      return;
    }

    if (count > 0) {
      notifyDot.textContent = count > 9 ? '9+' : String(count);
      notifyDot.classList.remove('hidden');
      notificationsBtn.setAttribute('aria-label', `Open notifications (${count} unread)`);
      return;
    }

    notifyDot.classList.add('hidden');
    notifyDot.textContent = '';
    notificationsBtn.setAttribute('aria-label', 'Open notifications');
  };

  const loadUnreadCount = async () => {
    try {
      const response = await api('/notifications');
      const items = Array.isArray(response.notifications) ? response.notifications : [];
      const unreadCount = items.filter((item) => !(item.is_read ?? item.isRead)).length;
      setUnreadBadge(unreadCount);
    } catch (error) {
      setUnreadBadge(0);
    }
  };

  const handleNotificationsUpdated = (event) => {
    const count = Number(event?.detail?.unreadCount);

    if (Number.isFinite(count) && count >= 0) {
      setUnreadBadge(count);
      return;
    }

    loadUnreadCount();
  };

  const closeQuickMenu = () => {
    quickAccessMenu.classList.add('hidden');
    quickAccessBtn.setAttribute('aria-expanded', 'false');
  };

  const toggleQuickMenu = () => {
    const isHidden = quickAccessMenu.classList.contains('hidden');
    if (isHidden) {
      quickAccessMenu.classList.remove('hidden');
      quickAccessBtn.setAttribute('aria-expanded', 'true');
      return;
    }
    closeQuickMenu();
  };

  quickAccessBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleQuickMenu();
  });

  document.addEventListener('click', (e) => {
    if (!quickAccessBtn.contains(e.target) && !quickAccessMenu.contains(e.target)) {
      closeQuickMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeQuickMenu();
    }
  });

  window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleNotificationsUpdated);

  quickAccessMenu.querySelectorAll('.quick-access-item').forEach((item) => {
    item.addEventListener('click', () => {
      closeQuickMenu();
    });
  });

  quickLogoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await api('/auth/logout', 'POST');
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      clearSession();
      window.location.href = PAGES.login;
    }
  });

  notificationsBtn.addEventListener('click', () => {
    if (activePage === 'notifications') {
      const lastPage = sessionStorage.getItem(LAST_NON_NOTIFICATION_PAGE_KEY) || PAGES.resources;
      window.location.href = lastPage;
      return;
    }
    window.location.href = PAGES.notifications;
  });

  loadUnreadCount();
  window.setInterval(() => {
    if (!document.hidden) {
      loadUnreadCount();
    }
  }, NOTIFICATION_POLL_MS);
}
