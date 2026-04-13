import { getUser, clearSession } from './api.js';
import { PAGES } from './routes.js';

export function mountNav(activePage) {
  const user = getUser();
  const topbar = document.getElementById('topbar');
  const nav = document.getElementById('bottomNav');

  if (!topbar || !nav) {
    return;
  }

  const roleLabel = user ? user.role : 'guest';
  topbar.innerHTML = `
    <button class="icon-btn" type="button" id="logoutBtn">Logout</button>
    <h1>StudyLink - ${roleLabel}</h1>
    <button class="icon-btn" type="button" id="homeBtn">Home</button>
  `;

  nav.innerHTML = `
    <a href="${PAGES.resources}" class="${activePage === 'resources' ? 'active' : ''}">Resources</a>
    <a href="${PAGES.tutors}" class="${activePage === 'tutors' ? 'active' : ''}">Tutor</a>
    <a href="${PAGES.review}" class="${activePage === 'review' ? 'active' : ''}">Review</a>
    <a href="${PAGES.leaderboards}" class="${activePage === 'leaderboards' ? 'active' : ''}">Leaderboard</a>
    <a href="${PAGES.session}" class="${activePage === 'session' ? 'active' : ''}">Session</a>
      <a href="${PAGES.profile}" class="${activePage === 'profile' ? 'active' : ''}">Profile</a>
      <a href="${PAGES.achievements}" class="${activePage === 'achievements' ? 'active' : ''}">Badges</a>
      <a href="${PAGES.notifications}" class="${activePage === 'notifications' ? 'active' : ''}">Notifications</a>
    ${user && user.role === 'tutor' ? `<a href="${PAGES.verification}" class="${activePage === 'verification' ? 'active' : ''}">Verify</a>` : ''}
    ${user && user.role === 'admin' ? `<a href="${PAGES.adminVerifications}" class="${activePage === 'adminVerifications' ? 'active' : ''}">Admin</a>` : ''}
  `;

  const logoutBtn = document.getElementById('logoutBtn');
  const homeBtn = document.getElementById('homeBtn');

  logoutBtn.addEventListener('click', () => {
    clearSession();
    window.location.href = PAGES.login;
  });

  homeBtn.addEventListener('click', () => {
    if (user && user.role === 'admin') {
      window.location.href = PAGES.adminVerifications;
      return;
    }
    window.location.href = PAGES.resources;
  });
}
