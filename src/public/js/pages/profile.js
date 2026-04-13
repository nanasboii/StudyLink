import { api, clearSession, getToken, requireSession, setMessage } from '../api.js';
import { mountNav } from '../nav.js';
import { PAGES } from '../routes.js';

requireSession();
mountNav('profile');

const profileForm = document.getElementById('profileForm');
const passwordForm = document.getElementById('passwordForm');
const deleteAccountBtn = document.getElementById('deleteAccountBtn');
const targetSubjectsRow = document.getElementById('targetSubjectsRow');
const expertiseRow = document.getElementById('expertiseRow');
const editProfileBtn = document.getElementById('editProfileBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const editActions = document.getElementById('editActions');
const profilePictureInput = document.getElementById('profilePictureInput');
const picUploadLabel = document.getElementById('picUploadLabel');
const profilePicture = document.getElementById('profilePicture');
const removePictureBtn = document.getElementById('removePictureBtn');
const defaultProfilePicture =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23999'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

let isEditMode = false;
let currentProfilePictureUrl = '';
let removePictureRequested = false;
const editableFields = ['fullName', 'phoneNumber', 'major', 'yearOfStudy', 'targetSubjects', 'expertise', 'bio'];

function updatePictureControls() {
  if (!isEditMode) {
    removePictureBtn.classList.add('hidden');
    return;
  }

  const hasCustomPicture =
    Boolean(currentProfilePictureUrl) ||
    Boolean(profilePictureInput.files?.[0]) ||
    profilePicture.src !== defaultProfilePicture;

  if (hasCustomPicture) {
    removePictureBtn.classList.remove('hidden');
  } else {
    removePictureBtn.classList.add('hidden');
  }
}

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

function setEditMode(enabled) {
  isEditMode = enabled;
  editableFields.forEach((fieldId) => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.disabled = !enabled;
    }
  });

  if (enabled) {
    editActions.classList.remove('hidden');
    picUploadLabel.classList.remove('hidden');
    editProfileBtn.disabled = true;
    editProfileBtn.style.opacity = '0.6';
  } else {
    editActions.classList.add('hidden');
    picUploadLabel.classList.add('hidden');
    editProfileBtn.disabled = false;
    editProfileBtn.style.opacity = '1';
  }

  updatePictureControls();
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
  currentProfilePictureUrl = user.profilePictureUrl || '';
  profilePicture.src = currentProfilePictureUrl || defaultProfilePicture;
  removePictureRequested = false;
  
  if (user.createdAt) {
    const date = new Date(user.createdAt);
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    document.getElementById('createdAt').textContent = `${month} ${year}`;
  }

  applyRoleFields(user.role || '');
  updatePictureControls();
}

async function uploadProfilePicture(file) {
  const token = getToken();
  if (!token) {
    throw new Error('Session expired. Please login again.');
  }

  const payload = new FormData();
  payload.append('image', file);

  const response = await fetch('/uploads/profile-picture', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: payload
  });

  const responseText = await response.text();
  let result = {};
  if (responseText) {
    try {
      result = JSON.parse(responseText);
    } catch (error) {
      result = { message: responseText };
    }
  }

  if (!response.ok) {
    throw new Error(result.message || 'Unable to upload profile picture. Please try again.');
  }

  return result.fileUrl;
}

async function loadProfile() {
  try {
    const data = await api('/me');
    populateUser(data.user || {});
  } catch (error) {
    setMessage('profileMessage', error.message);
  }
}

editProfileBtn.addEventListener('click', () => {
  setEditMode(true);
});

cancelEditBtn.addEventListener('click', (e) => {
  e.preventDefault();
  setEditMode(false);
  loadProfile();
});

profilePictureInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  // Show preview immediately
  const reader = new FileReader();
  reader.onload = (e) => {
    profilePicture.src = e.target?.result || '';
    removePictureRequested = false;
    updatePictureControls();
  };
  reader.readAsDataURL(file);
});

removePictureBtn.addEventListener('click', () => {
  removePictureRequested = true;
  profilePictureInput.value = '';
  profilePicture.src = defaultProfilePicture;
  updatePictureControls();
});

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
    let profilePictureUrl = null;
    const selectedPicture = profilePictureInput.files?.[0];
    if (selectedPicture) {
      profilePictureUrl = await uploadProfilePicture(selectedPicture);
    }

    const shouldRemoveProfilePicture = removePictureRequested && !selectedPicture;

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
      bio: document.getElementById('bio').value.trim() || null,
      profilePictureUrl,
      removeProfilePicture: shouldRemoveProfilePicture
    });

    populateUser(response.user || {});
    profilePictureInput.value = '';
    removePictureRequested = false;
    setEditMode(false);
    setMessage('profileMessage', 'Profile updated successfully.', true);
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
