import { getUser, clearSession, api } from './api.js';
import { PAGES } from './routes.js';

const NOTIFICATIONS_UPDATED_EVENT = 'studylink:notifications-updated';
const NOTIFICATION_POLL_MS = 30000;
const LOGIN_STREAK_STORAGE_KEY = 'studylinkLoginStreak';
const STREAK_MODAL_ID = 'streakCalendarModal';
const STREAK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MAIN_NAV_ITEMS_BY_ROLE = {
  admin: [
    { key: 'resources', label: 'Resources', href: PAGES.resources },
    { key: 'leaderboards', label: 'Leaderboard', href: PAGES.leaderboards }
  ],
  tutor: [
    { key: 'resources', label: 'Resources', href: PAGES.resources },
    { key: 'tutors', label: 'Tutors', href: PAGES.tutors },
    { key: 'leaderboards', label: 'Leaderboard', href: PAGES.leaderboards },
    { key: 'session', label: 'Sessions', href: PAGES.session }
  ],
  tutee: [
    { key: 'resources', label: 'Resources', href: PAGES.resources },
    { key: 'tutors', label: 'Tutors', href: PAGES.tutors },
    { key: 'leaderboards', label: 'Leaderboard', href: PAGES.leaderboards },
    { key: 'session', label: 'Sessions', href: PAGES.session }
  ]
};
const LAST_NON_NOTIFICATION_PAGE_KEY = 'studylinkLastNonNotificationPage';

function formatRoleLabel(role) {
  const value = String(role || 'guest');
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDateLabel(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return 'Today';
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric'
  }).format(date);
}

function buildStreakCalendarGrid(streakCount, lastLoginAt) {
  const anchorDate = lastLoginAt ? new Date(lastLoginAt) : new Date();
  const safeStreakCount = Math.max(0, Number(streakCount || 0));
  const cells = [];

  for (let offset = 27; offset >= 0; offset -= 1) {
    const cellDate = new Date(anchorDate);
    cellDate.setDate(anchorDate.getDate() - offset);
    const isActive = offset < safeStreakCount;
    const isToday = offset === 0;
    const dayName = STREAK_DAYS[cellDate.getDay()];

    cells.push(`
      <div class="streak-day${isActive ? ' is-active' : ''}${isToday ? ' is-today' : ''}">
        <span class="streak-day-name">${dayName}</span>
        <span class="streak-day-number">${cellDate.getDate()}</span>
      </div>
    `);
  }

  return cells.join('');
}

function ensureStreakModal() {
  let modal = document.getElementById(STREAK_MODAL_ID);
  if (modal) {
    return modal;
  }

  modal = document.createElement('div');
  modal.id = STREAK_MODAL_ID;
  modal.className = 'streak-modal hidden';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="streak-panel">
      <button class="streak-close-btn" type="button" id="streakModalCloseBtn" aria-label="Close activity calendar">×</button>
      <div class="streak-panel-head">
        <p class="streak-kicker">Daily check-ins</p>
        <h3 id="streakCalendarTitle">Activity calendar</h3>
        <p id="streakCalendarMessage" class="streak-message"></p>
      </div>
      <div class="streak-stats">
        <div class="streak-stat">
          <span class="streak-stat-label">Current run</span>
          <strong id="streakCalendarCount">0 days</strong>
        </div>
        <div class="streak-stat">
          <span class="streak-stat-label">Last check-in</span>
          <strong id="streakCalendarLastLogin">Today</strong>
        </div>
      </div>
      <div class="streak-calendar-head" aria-hidden="true">
        <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
      </div>
      <div id="streakCalendarGrid" class="streak-calendar-grid" aria-label="Activity calendar"></div>
      <p class="streak-footnote">Check in daily to maintain your run.</p>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function readPendingLoginStreak() {
  const raw = sessionStorage.getItem(LOGIN_STREAK_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  sessionStorage.removeItem(LOGIN_STREAK_STORAGE_KEY);

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function renderStreakModal(modal, user, streakData = {}) {
  const count = Math.max(0, Number(streakData.count ?? user?.loginStreak ?? 0));
  const lastLoginAt = user?.lastLoginAt || streakData.lastLoginAt || new Date().toISOString();
  const title = modal.querySelector('#streakCalendarMessage');
  const countEl = modal.querySelector('#streakCalendarCount');
  const lastLoginEl = modal.querySelector('#streakCalendarLastLogin');
  const grid = modal.querySelector('#streakCalendarGrid');

  if (title) {
    title.textContent = streakData.message || (count > 0
      ? `You have a ${count}-day check-in run.`
      : 'Check in daily to build your run.');
  }

  if (countEl) {
    countEl.textContent = `${count} day${count === 1 ? '' : 's'}`;
  }

  if (lastLoginEl) {
    lastLoginEl.textContent = formatDateLabel(lastLoginAt);
  }

  if (grid) {
    grid.innerHTML = buildStreakCalendarGrid(count, lastLoginAt);
  }

  return count;
}

function openStreakModal(modal) {
  modal.classList.remove('hidden');
  document.body.classList.add('streak-modal-open');
}

function closeStreakModal(modal) {
  modal.classList.add('hidden');
  document.body.classList.remove('streak-modal-open');
}

function buildQuickAccessItems(user) {
  if (!user) {
    return '';
  }

  const settingsHref = `${PAGES.profile}?tab=settings`;

  if (user.role === 'admin') {
    return `
      <a href="${PAGES.profile}" class="quick-access-item">Profile</a>
      <a href="${settingsHref}" class="quick-access-item">Settings</a>
      <hr class="quick-access-divider" />
      <a href="${PAGES.achievements}" class="quick-access-item">Achievements</a>
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
      <a href="${settingsHref}" class="quick-access-item">Settings</a>
      <hr class="quick-access-divider" />
      <a href="${PAGES.review}" class="quick-access-item">Reviews</a>
      <a href="${PAGES.achievements}" class="quick-access-item">Achievements</a>
      <hr class="quick-access-divider" />
      <a href="${PAGES.verification}" class="quick-access-item">Verification</a>
      <hr class="quick-access-divider" />
    `;
  }

  return `
    <a href="${PAGES.profile}" class="quick-access-item">Profile</a>
    <a href="${settingsHref}" class="quick-access-item">Settings</a>
    <hr class="quick-access-divider" />
    <a href="${PAGES.review}" class="quick-access-item">Reviews</a>
    <a href="${PAGES.achievements}" class="quick-access-item">Achievements</a>
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
  const streakModal = ensureStreakModal();
  const streakButtonCount = Math.max(0, Number(user?.loginStreak || 0));
  const streakButtonBadge = streakButtonCount > 0 ? `<span class="streak-btn-badge">${streakButtonCount}</span>` : '';
  const pendingLoginStreak = readPendingLoginStreak();

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
    <div class="topbar-actions">
      <button class="icon-btn streak-btn" type="button" id="streakBtn" aria-label="Open activity calendar" title="Activity calendar">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M7 3v3M17 3v3M4.5 8.5h15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <rect x="4.5" y="5.5" width="15" height="14.5" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/>
          <path d="M8 11.5h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2M8 15.5h2v2H8zm4 0h2v2h-2" fill="currentColor" opacity="0.9"/>
        </svg>
        ${streakButtonBadge}
      </button>
      <button class="icon-btn notify-btn${notificationsActive}" type="button" id="notificationsBtn" aria-label="Open notifications" title="Notifications">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4.5 7.5A3.5 3.5 0 0 1 8 4h8a3.5 3.5 0 0 1 3.5 3.5v9A3.5 3.5 0 0 1 16 20H8a3.5 3.5 0 0 1-3.5-3.5z" fill="none" stroke="currentColor" stroke-width="1.8"/>
          <path d="m6.5 8.5 5.5 4.5 5.5-4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="notify-dot hidden" id="notifyDot" aria-hidden="true"></span>
      </button>
    </div>
  `;

  nav.innerHTML = buildMainNav(activePage, user?.role);

  const quickAccessBtn = document.getElementById('quickAccessBtn');
  const quickAccessMenu = document.getElementById('quickAccessMenu');
  const quickLogoutBtn = document.getElementById('quickLogoutBtn');
  const streakBtn = document.getElementById('streakBtn');
  const notificationsBtn = document.getElementById('notificationsBtn');
  const notifyDot = document.getElementById('notifyDot');
  const streakModalCloseBtn = document.getElementById('streakModalCloseBtn');
  const streakCalendarCount = document.getElementById('streakCalendarCount');
  const streakCalendarLastLogin = document.getElementById('streakCalendarLastLogin');
  const streakCalendarMessage = document.getElementById('streakCalendarMessage');
  const streakCalendarGrid = document.getElementById('streakCalendarGrid');

  const syncStreakModal = (streakData = {}) => {
    const data = pendingLoginStreak || streakData;
    const count = renderStreakModal(streakModal, user, data);
    if (streakBtn) {
      streakBtn.setAttribute('aria-label', `Open activity calendar (${count} day${count === 1 ? '' : 's'})`);
    }
    if (streakCalendarCount) {
      streakCalendarCount.textContent = `${count} day${count === 1 ? '' : 's'}`;
    }
    if (streakCalendarLastLogin) {
      streakCalendarLastLogin.textContent = formatDateLabel(user?.lastLoginAt || data.lastLoginAt || new Date().toISOString());
    }
    if (streakCalendarMessage) {
      streakCalendarMessage.textContent = data.message || (count > 0
        ? `You have a ${count}-day check-in run.`
        : 'Check in daily to build your run.');
    }
    if (streakCalendarGrid) {
      streakCalendarGrid.innerHTML = buildStreakCalendarGrid(count, user?.lastLoginAt || data.lastLoginAt || new Date().toISOString());
    }
    return count;
  };

  const closeStreak = () => {
    closeStreakModal(streakModal);
  };

  syncStreakModal(pendingLoginStreak || {});

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

  streakBtn.addEventListener('click', () => {
    syncStreakModal({});
    openStreakModal(streakModal);
  });

  if (streakModalCloseBtn) {
    streakModalCloseBtn.addEventListener('click', closeStreak);
  }
  streakModal.addEventListener('click', (event) => {
    if (event.target === streakModal) {
      closeStreak();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !streakModal.classList.contains('hidden')) {
      closeStreak();
    }
  });

  if (pendingLoginStreak) {
    openStreakModal(streakModal);
  }

  loadUnreadCount();
  window.setInterval(() => {
    if (!document.hidden) {
      loadUnreadCount();
    }
  }, NOTIFICATION_POLL_MS);
}
