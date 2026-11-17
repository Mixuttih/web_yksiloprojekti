// Shared API endpoints and network helpers used by the feature modules.
import {SESSION_STORAGE_KEY} from './session.js';

export const RESTAURANTS_API_URL = 'https://media2.edu.metropolia.fi/restaurant/api/v1/restaurants';
export const MENU_API_BASE_URL = 'https://media2.edu.metropolia.fi/restaurant/api/v1/restaurants';
export const AUTH_API_BASE_URL = 'https://media2.edu.metropolia.fi/restaurant/api/v1';

// Fetch a resource while aborting requests that exceed the specified time limit.
export async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, {...options, signal: controller.signal});
  } finally {
    clearTimeout(timeoutId);
  }
}

// Add JSON and authentication headers before sending an authenticated API request.
export async function requestAuth(path, options = {}) {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const token = getSessionToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetchWithTimeout(`${AUTH_API_BASE_URL}${path}`, {...options, headers});
}

// Read the token without exposing session parsing details to API consumers.
function getSessionToken() {
  try {
    const storedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!storedSession) {
      return null;
    }

    const session = JSON.parse(storedSession);
    return session && typeof session.token === 'string' ? session.token : null;
  } catch (error) {
    console.error(error);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

// Extract a useful server-provided error message, with an HTTP fallback for
// responses that are empty or not valid JSON.
export async function getApiError(response, fallbackMessage) {
  try {
    const result = await response.json();
    return result.message || result.error || fallbackMessage;
  } catch (error) {
    return `${fallbackMessage} (HTTP ${response.status})`;
  }
}
