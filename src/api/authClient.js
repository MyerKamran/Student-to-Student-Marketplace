import { requestJson } from './httpClient';

export async function authMe() {
  return requestJson('/api/auth/me');
}

export async function authGoogle(idToken) {
  return requestJson('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
}

export async function authGoogleWithPassword(idToken, password) {
  return requestJson('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken, password }),
  });
}

export async function authRegister(payload) {
  return requestJson('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function authLogin(payload) {
  return requestJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function authLogout() {
  return requestJson('/api/auth/logout', { method: 'POST' });
}

