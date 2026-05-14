import { api, requireSession, setMessage } from '../api.js';
import { mountNav } from '../nav.js';

requireSession();
mountNav('notifications');

const notificationsList = document.getElementById('notificationsList');
const markAllReadBtn = document.getElementById('markAllReadBtn');
const filterButtons = Array.from(document.querySelectorAll('.filter-btn'));

let allNotifications = [];
let activeFilter = 'all';
const NOTIFICATION_PAGE_SIZE = 12;
let visibleNotificationCount = NOTIFICATION_PAGE_SIZE;

function relativeTimeLabel(dateValue) {
  const ms = Date.now() - new Date(dateValue).getTime();
  const seconds = Math.max(1, Math.floor(ms / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function showSkeletonList(container, count = 3) {
  container.innerHTML = '';
  for (let i = 0; i < count; i += 1) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-item';
    container.appendChild(skeleton);
  }
}

function ensureLoadMoreButton() {
  let button = document.getElementById('notificationsLoadMoreBtn');
  if (!button) {
    button = document.createElement('button');
    button.id = 'notificationsLoadMoreBtn';
    button.type = 'button';
    button.className = 'chip';
    button.textContent = 'Load more notifications';
    button.addEventListener('click', () => {
      visibleNotificationCount += NOTIFICATION_PAGE_SIZE;
      renderNotifications();
    });
    notificationsList.insertAdjacentElement('afterend', button);
  }
  return button;
}

function ensureNotificationCounter() {
  let counter = document.getElementById('notificationsCounter');
  if (!counter) {
    counter = document.createElement('p');
    counter.id = 'notificationsCounter';
    counter.className = 'meta';
    notificationsList.insertAdjacentElement('beforebegin', counter);
  }
  return counter;
}

function emitUnreadCount() {
  const unreadCount = allNotifications.filter((item) => !item.isRead).length;
  window.dispatchEvent(
    new CustomEvent('studylink:notifications-updated', {
      detail: { unreadCount }
    })
  );
}

function normalizeNotification(item) {
  return {
    id: item.id,
    message: item.message,
    isRead: Boolean(item.is_read),
    createdAt: item.created_at
  };
}

function renderNotifications() {
  notificationsList.innerHTML = '';
  const loadMoreBtn = ensureLoadMoreButton();
  const counter = ensureNotificationCounter();

  const filtered =
    activeFilter === 'unread'
      ? allNotifications.filter((item) => !item.isRead)
      : allNotifications;

  const grouped = [];
  const groupedIndex = new Map();
  filtered.forEach((item) => {
    const key = `${item.message}::${new Date(item.createdAt).toDateString()}::${item.isRead}`;
    if (!groupedIndex.has(key)) {
      groupedIndex.set(key, grouped.length);
      grouped.push({ ...item, groupedCount: 1 });
      return;
    }
    const index = groupedIndex.get(key);
    grouped[index].groupedCount += 1;
  });

  if (!grouped.length) {
    notificationsList.innerHTML = '<div class="empty-state">No notifications found. Check back later for updates.</div>';
    counter.textContent = 'Showing 0 of 0 notifications';
    loadMoreBtn.classList.add('hidden');
    return;
  }

  grouped.slice(0, visibleNotificationCount).forEach((item) => {
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <strong>${item.isRead ? 'Read' : 'Unread'}</strong>
      <div class="meta">${item.message}</div>
      <div class="meta">${new Date(item.createdAt).toLocaleString()} (${relativeTimeLabel(item.createdAt)})</div>
      ${item.groupedCount > 1 ? `<div class="meta">Repeated ${item.groupedCount} times today</div>` : ''}
      <div class="actions"></div>
    `;

    if (!item.isRead) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Mark as read';
      button.addEventListener('click', async () => {
        try {
          await api(`/notifications/${item.id}/read`, 'POST');
          // Update the notification in allNotifications
          const originalNotif = allNotifications.find(n => n.id === item.id);
          if (originalNotif) {
            originalNotif.isRead = true;
          }
          item.isRead = true;
          emitUnreadCount();
          renderNotifications();
        } catch (error) {
          setMessage('notificationsMessage', error.message);
        }
      });
      div.querySelector('.actions').appendChild(button);
    }

    notificationsList.appendChild(div);
  });

  const totalUnread = allNotifications.filter((item) => !item.isRead).length;
  const displayedGroups = Math.min(visibleNotificationCount, grouped.length);
  counter.textContent = `Showing ${displayedGroups} of ${grouped.length} groups (${totalUnread} unread individual notifications)`;

  if (visibleNotificationCount < grouped.length) {
    loadMoreBtn.classList.remove('hidden');
  } else {
    loadMoreBtn.classList.add('hidden');
  }
}

async function loadNotifications() {
  showSkeletonList(notificationsList, 3);
  try {
    const data = await api('/notifications');
    allNotifications = (data.notifications || []).map(normalizeNotification);
    visibleNotificationCount = NOTIFICATION_PAGE_SIZE;
    emitUnreadCount();
    renderNotifications();
  } catch (error) {
    setMessage('notificationsMessage', error.message);
  }
}

markAllReadBtn.addEventListener('click', async () => {
  const unread = allNotifications.filter((item) => !item.isRead);

  try {
    for (const item of unread) {
      await api(`/notifications/${item.id}/read`, 'POST');
      item.isRead = true;
    }
    emitUnreadCount();
    renderNotifications();
    setMessage('notificationsMessage', 'All notifications marked as read.', true);
  } catch (error) {
    setMessage('notificationsMessage', error.message);
  }
});

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    filterButtons.forEach((entry) => entry.classList.remove('active'));
    button.classList.add('active');
    activeFilter = button.dataset.filter || 'all';
    visibleNotificationCount = NOTIFICATION_PAGE_SIZE;
    renderNotifications();
  });
});

loadNotifications();
