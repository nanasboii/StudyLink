import { api, clearSession, requireSession, setMessage } from '../api.js';
import { mountNav } from '../nav.js';
import { PAGES } from '../routes.js';

requireSession();
mountNav('profile');

const profileForm = document.getElementById('profileForm');
const passwordForm = document.getElementById('passwordForm');
const deleteAccountBtn = document.getElementById('deleteAccountBtn');
const targetSubjectsRow = document.getElementById('targetSubjectsRow');
const expertiseRow = document.getElementById('expertiseRow');

function applyRoleFields(role) {
  if (role === 'tutor') {
    targetSubjectsRow.classList.add('hidden');
    expertiseRow.classList.remove('hidden');
    return;
  }

  if (role === 'tutee') {
    targetSubjectsRow.classList.remove('hidden');
    expertiseRow.classList.add('hidden');
    return;
  }

  targetSubjectsRow.classList.remove('hidden');
  expertiseRow.classList.remove('hidden');
}

function populateUser(user) {
  document.getElementById('studentId').value = user.studentId || '';
  document.getElementById('fullName').value = user.fullName || '';
  document.getElementById('email').value = user.email || '';
  document.getElementById('phoneNumber').value = user.phoneNumber || '';
  document.getElementById('major').value = user.major || '';
  document.getElementById('yearOfStudy').value = user.yearOfStudy || '';
  document.getElementById('targetSubjects').value = user.targetSubjects || '';
  document.getElementById('expertise').value = Array.isArray(user.expertise)
    ? user.expertise.join(', ')
    : '';
  document.getElementById('bio').value = user.bio || '';
  document.getElementById('role').textContent = user.role || '-';
  document.getElementById('totalPoints').textContent = String(user.totalPoints || 0);
  document.getElementById('rating').textContent = Number(user.rating || 0).toFixed(2);
  document.getElementById('isVerified').textContent = user.isVerified ? 'Yes' : 'No';
  applyRoleFields(user.role || '');
}

async function loadProfile() {
  try {
    const data = await api('/me');
    populateUser(data.user || {});
  } catch (error) {
    setMessage('profileMessage', error.message);
  }
}

profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const yearRaw = document.getElementById('yearOfStudy').value.trim();
  const role = document.getElementById('role').textContent.trim();
  const fullName = document.getElementById('fullName').value.trim();
  const phoneNumber = document.getElementById('phoneNumber').value.trim();
  const expertise = String(document.getElementById('expertise').value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!fullName || fullName.length < 3) {
    setMessage('profileMessage', 'Full name must be at least 3 characters.');
    return;
  }

  if (yearRaw && (!Number.isInteger(Number(yearRaw)) || Number(yearRaw) < 1 || Number(yearRaw) > 8)) {
    setMessage('profileMessage', 'Year of study must be between 1 and 8.');
    return;
  }

  if (phoneNumber && !/^[0-9+\-\s()]{7,20}$/.test(phoneNumber)) {
    setMessage('profileMessage', 'Please enter a valid phone number.');
    return;
  }

  try {
    const response = await api('/me/profile', 'PUT', {
      fullName,
      phoneNumber: phoneNumber || null,
      major: document.getElementById('major').value.trim() || null,
      yearOfStudy: yearRaw ? Number(yearRaw) : null,
      targetSubjects:
        role === 'tutee'
          ? document.getElementById('targetSubjects').value.trim() || null
          : null,
      expertise: role === 'tutor' ? expertise : [],
      bio: document.getElementById('bio').value.trim() || null
    });

    populateUser(response.user || {});
    setMessage('profileMessage', 'Profile updated.', true);
  } catch (error) {
    setMessage('profileMessage', error.message);
  }
});

passwordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (newPassword !== confirmPassword) {
    setMessage('profileMessage', 'New password confirmation does not match.');
    return;
  }

  try {
    await api('/me/password', 'PUT', { currentPassword, newPassword });
    passwordForm.reset();
    setMessage('profileMessage', 'Password updated.', true);
  } catch (error) {
    setMessage('profileMessage', error.message);
  }
});

deleteAccountBtn.addEventListener('click', async () => {
  const confirmed = window.confirm('Delete your account permanently?');
  if (!confirmed) {
    return;
  }

  try {
    await api('/me', 'DELETE');
    clearSession();
    window.location.href = PAGES.login;
  } catch (error) {
    setMessage('profileMessage', error.message);
  }
});

loadProfile();
