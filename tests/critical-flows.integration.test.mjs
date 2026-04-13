import test from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.STUDYLINK_TEST_BASE_URL || '';
const TEST_EMAIL = process.env.STUDYLINK_TEST_EMAIL || '';
const TEST_PASSWORD = process.env.STUDYLINK_TEST_PASSWORD || '';

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function loginForToken() {
  if (!BASE_URL || !TEST_EMAIL || !TEST_PASSWORD) {
    return '';
  }

  const { response, body } = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
  });

  if (response.status !== 200 || !body.token) {
    return '';
  }

  return body.token;
}

test('health endpoint responds OK', async (t) => {
  if (!BASE_URL) {
    t.skip('Set STUDYLINK_TEST_BASE_URL to run integration tests.');
    return;
  }

  const { response, body } = await request('/health');
  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
});

test('auth endpoints enforce validation', async (t) => {
  if (!BASE_URL) {
    t.skip('Set STUDYLINK_TEST_BASE_URL to run integration tests.');
    return;
  }

  const { response } = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: '', password: '' })
  });

  assert.equal(response.status, 400);
});

test('protected endpoint rejects missing token', async (t) => {
  if (!BASE_URL) {
    t.skip('Set STUDYLINK_TEST_BASE_URL to run integration tests.');
    return;
  }

  const { response } = await request('/bookings/inbox');
  assert.equal(response.status, 401);
});

test('authenticated /me endpoint returns session user', async (t) => {
  if (!BASE_URL) {
    t.skip('Set STUDYLINK_TEST_BASE_URL to run integration tests.');
    return;
  }

  if (!TEST_EMAIL || !TEST_PASSWORD) {
    t.skip('Set STUDYLINK_TEST_EMAIL and STUDYLINK_TEST_PASSWORD to run auth flow tests.');
    return;
  }

  const token = await loginForToken();
  if (!token) {
    t.skip('Unable to login with supplied test credentials.');
    return;
  }

  const { response, body } = await request('/me', {
    headers: { Authorization: `Bearer ${token}` }
  });

  assert.equal(response.status, 200);
  assert.ok(body.user);
  assert.ok(body.user.email);
});

test('authenticated user can access notifications endpoint', async (t) => {
  if (!BASE_URL) {
    t.skip('Set STUDYLINK_TEST_BASE_URL to run integration tests.');
    return;
  }

  if (!TEST_EMAIL || !TEST_PASSWORD) {
    t.skip('Set STUDYLINK_TEST_EMAIL and STUDYLINK_TEST_PASSWORD to run auth flow tests.');
    return;
  }

  const token = await loginForToken();
  if (!token) {
    t.skip('Unable to login with supplied test credentials.');
    return;
  }

  const { response, body } = await request('/notifications', {
    headers: { Authorization: `Bearer ${token}` }
  });

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.notifications));
});
