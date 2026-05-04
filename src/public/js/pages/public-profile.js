import { api, requireSession, setMessage } from '../api.js';
import { mountNav } from '../nav.js';
import { PAGES } from '../routes.js';

const user = requireSession();
mountNav('leaderboards');

const defaultProfilePicture =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23999'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

const profileCard = document.getElementById('publicProfileCard');
const actionsEl = document.getElementById('publicProfileActions');

function text(value, fallback = '-') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function roleLabel(role) {
  const value = String(role || '').toLowerCase();
  if (value === 'admin') return 'Admin';
  if (value === 'tutor') return 'Tutor';
  return 'Tutee';
}

function getUserIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get('userId') || '';
}

function setProfile(entry) {
  document.getElementById('publicProfileTitle').textContent = `${text(entry.fullName || entry.full_name)} - Public Profile`;
  document.getElementById('publicProfileName').textContent = text(entry.fullName || entry.full_name);
  document.getElementById('publicProfileRole').textContent = `Role: ${roleLabel(entry.role)}`;
  document.getElementById('publicProfileMatric').textContent = 'Matric: Hidden';
  document.getElementById('publicProfilePicture').src = entry.profilePictureUrl || entry.profile_picture_url || defaultProfilePicture;
  document.getElementById('publicProfileAchievements').textContent = String(entry.totalAchievements || entry.total_achievements || 0);
  document.getElementById('publicProfilePoints').textContent = String(entry.totalPoints || entry.total_points || 0);
  document.getElementById('publicProfileRating').textContent = Number(entry.rating || 0).toFixed(2);
  document.getElementById('publicProfileReviews').textContent = String(entry.reviewsReceived || entry.reviews_received || 0);
  document.getElementById('publicProfileVerified').textContent = (entry.isVerified ?? entry.is_verified) ? 'Verified' : 'Not verified';
  document.getElementById('publicProfileMajor').textContent = text(entry.major);
  document.getElementById('publicProfileYear').textContent = text(entry.year_of_study);
  document.getElementById('publicProfileExpertise').textContent = Array.isArray(entry.expertise) && entry.expertise.length
    ? entry.expertise.join(', ')
    : '-';
  document.getElementById('publicProfileTargets').textContent = text(entry.target_subjects);
  document.getElementById('publicProfileBio').textContent = text(entry.bio, 'No bio provided.');

  actionsEl.innerHTML = '';

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'chip';
  backBtn.textContent = 'Back to Leaderboard';
  backBtn.addEventListener('click', () => {
    window.location.href = PAGES.leaderboards;
  });
  actionsEl.appendChild(backBtn);

  if (user?.role === 'tutee' && String(entry.role || '').toLowerCase() === 'tutor') {
    const bookBtn = document.createElement('button');
    bookBtn.type = 'button';
    bookBtn.className = 'chip primary-action';
    bookBtn.textContent = 'Book a Session';
    bookBtn.addEventListener('click', () => {
      const prefill = String(entry.id || '').trim();
      if (prefill) {
        localStorage.setItem('prefillTutorId', prefill);
      }
      window.location.href = PAGES.session;
    });
    actionsEl.appendChild(bookBtn);
  }

  profileCard.classList.remove('hidden');
}

async function loadPublicProfile() {
  const userId = getUserIdFromQuery();
  if (!userId) {
    setMessage('publicProfileMessage', 'Missing user profile id.');
    return;
  }

  try {
    const data = await api(`/users/${encodeURIComponent(userId)}/public`);
    if (!data.user) {
      setMessage('publicProfileMessage', 'User profile not found.');
      return;
    }
    setProfile(data.user);
  } catch (error) {
    setMessage('publicProfileMessage', error.message);
  }
}

document.getElementById('backToLeaderboardBtn').addEventListener('click', () => {
  window.location.href = PAGES.leaderboards;
});

loadPublicProfile();
