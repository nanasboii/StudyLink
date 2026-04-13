import test from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.STUDYLINK_TEST_BASE_URL || '';

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  const body = await response.json().catch(() => ({}));
  return { response, body };
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
