// Key used to persist the authenticated user and token for the current browser session.
export const SESSION_STORAGE_KEY = 'studentRestaurantSession';

// Read and validate the stored session; corrupted data is removed rather than reused.
export function getSession() {
  const storedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!storedSession) {
    return null;
  }

  try {
    const session = JSON.parse(storedSession);
    if (!session || typeof session.token !== 'string' || !session.user) {
      throw new Error('Stored session has an invalid format.');
    }
    return session;
  } catch (error) {
    console.error(error);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

// Return the current user's email when a valid authenticated session exists.
export function getCurrentUserEmail() {
  const session = getSession();
  return session && typeof session.user.email === 'string' ? session.user.email : null;
}

// Persist a newly received or updated authentication session.
export function saveSession(session) {
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

// Remove all local authentication data during logout or token invalidation.
export function clearSession() {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}
