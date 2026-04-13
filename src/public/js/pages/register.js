import { api, setMessage } from '../api.js';
import { PAGES } from '../routes.js';

const form = document.getElementById('registerForm');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('registerMessage', '');
  const data = new FormData(form);

  if (data.get('password') !== data.get('confirmPassword')) {
    setMessage('registerMessage', 'Passwords do not match.');
    return;
  }

  try {
    await api('/auth/register', 'POST', {
      role: data.get('role'),
      studentId: data.get('studentId'),
      fullName: `${data.get('firstName')} ${data.get('lastName')}`,
      phoneNumber: data.get('phoneNumber'),
      email: data.get('email'),
      major: data.get('major'),
      yearOfStudy: data.get('yearOfStudy') ? Number(data.get('yearOfStudy')) : null,
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
