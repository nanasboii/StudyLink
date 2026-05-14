import { api, setMessage } from '../api.js';
import { PAGES } from '../routes.js';

const form = document.getElementById('registerForm');
const roleSelect = form.querySelector('select[name="role"]');
const targetSubjectsRow = document.getElementById('targetSubjectsRow');
const expertiseRow = document.getElementById('expertiseRow');

function applyRoleFields() {
  const role = roleSelect.value;
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
  expertiseRow.classList.add('hidden');
}

roleSelect.addEventListener('change', applyRoleFields);
applyRoleFields();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('registerMessage', '');
  const data = new FormData(form);
  const email = String(data.get('email') || '').trim();
  const password = String(data.get('password') || '');
  const role = String(data.get('role') || '').trim();
  const phoneNumber = String(data.get('phoneNumber') || '').trim();

  if (!role) {
    setMessage('registerMessage', 'Please select a role to register.');
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setMessage('registerMessage', 'Please enter a valid email address.');
    return;
  }

  if (password.length < 8 || !/[0-9]/.test(password)) {
    setMessage('registerMessage', 'Password must be at least 8 characters and include a number.');
    return;
  }

  if (phoneNumber && !/^[0-9+\-\s()]{7,20}$/.test(phoneNumber)) {
    setMessage('registerMessage', 'Please enter a valid phone number.');
    return;
  }

  if (data.get('password') !== data.get('confirmPassword')) {
    setMessage('registerMessage', 'Passwords do not match.');
    return;
  }

  try {
    const expertiseInput = String(data.get('expertise') || '').trim();
    const expertise = expertiseInput
      ? expertiseInput.split(',').map((entry) => entry.trim()).filter(Boolean)
      : [];

    await api('/auth/register', 'POST', {
      role,
      studentId: data.get('studentId'),
      fullName: `${data.get('firstName')} ${data.get('lastName')}`,
      phoneNumber: data.get('phoneNumber'),
      email: data.get('email'),
      major: data.get('major'),
      yearOfStudy: data.get('yearOfStudy') ? Number(data.get('yearOfStudy')) : null,
      targetSubjects: role === 'tutee' ? (data.get('targetSubjects') || null) : null,
      expertise: role === 'tutor' ? expertise : [],
      bio: data.get('bio') || null,
      password: data.get('password')
    });

    setMessage('registerMessage', 'Registration successful. Redirecting to login...', true);
    setTimeout(() => {
      window.location.href = PAGES.login;
    }, 700);
  } catch (error) {
    setMessage('registerMessage', error.message);
  }
});
