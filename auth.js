// Authentication UI and account-management workflows.
import {getApiError, requestAuth} from './api.js';
import {
  clearSession,
  getSession,
  saveSession,
} from './session.js';
import {clearFavouriteRestaurant, setFavouriteRestaurant} from './favorites.js';

export function initAuth({rerenderRestaurants}) {
  // Cache all controls owned by the authentication modal.
  const openLoginButton = document.querySelector('#open-login');
  const closeLoginButton = document.querySelector('#close-login');
  const loginModal = document.querySelector('#login-modal');
  const loginForm = document.querySelector('#login-form');
  const authEyebrow = document.querySelector('#auth-eyebrow');
  const loginTitle = document.querySelector('#login-title');
  const passwordConfirmLabel = document.querySelector('#password-confirm-label');
  const passwordConfirmInput = document.querySelector('#login-password-confirm');
  const authMessage = document.querySelector('#auth-message');
  const authSubmit = document.querySelector('#auth-submit');
  const authSwitchPrompt = document.querySelector('#auth-switch-prompt');
  const authSwitchButton = document.querySelector('#auth-switch-button');
  const usernameInput = document.querySelector('#login-username');
  const emailLabel = document.querySelector('#email-label');
  const emailInput = document.querySelector('#login-email');
  const loggedInView = document.querySelector('#logged-in-view');
  const loggedInMessage = document.querySelector('#logged-in-message');
  const accountSettingsToggle = document.querySelector('#account-settings-toggle');
  const accountSettings = document.querySelector('#account-settings');
  const accountSettingsForm = document.querySelector('#account-settings-form');
  const accountEmailInput = document.querySelector('#account-email');
  const accountPasswordInput = document.querySelector('#account-password');
  const accountPasswordConfirmInput = document.querySelector('#account-password-confirm');
  const accountSettingsMessage = document.querySelector('#account-settings-message');
  const accountSettingsSubmit = document.querySelector('#account-settings-submit');
  const accountSettingsCancel = document.querySelector('#account-settings-cancel');
  const logoutButton = document.querySelector('#logout-button');
  // Controls whether the modal shows login or registration fields.
  let authMode = 'login';

  // Update the primary authentication status message.
  function showAuthMessage(message, isError = false) {
    authMessage.textContent = message;
    authMessage.classList.toggle('is-error', isError);
  }

    // Update the account-settings status message.
  function showAccountSettingsMessage(message, isError = false) {
    accountSettingsMessage.textContent = message;
    accountSettingsMessage.classList.toggle('is-error', isError);
  }

    // Populate account settings from the currently stored user.
  function populateAccountSettings() {
    const session = getSession();
    accountEmailInput.value = session && session.user.email ? session.user.email : '';
    accountPasswordInput.value = '';
    accountPasswordConfirmInput.value = '';
    showAccountSettingsMessage('');
  }

    // Switch the modal between logged-out, registration, login, and logged-in views.
  function renderAuthView() {
    const session = getSession();
    const isLoggedIn = Boolean(session && session.user && session.user.username);
    loggedInView.hidden = !isLoggedIn;
    loginForm.hidden = isLoggedIn;
    authSwitchButton.parentElement.hidden = isLoggedIn;
    if (!isLoggedIn) {
      accountSettings.hidden = true;
      accountSettingsToggle.setAttribute('aria-expanded', 'false');
    }
    openLoginButton.setAttribute('aria-label', isLoggedIn
      ? `Logged in as ${session.user.username}`
      : 'Open login form');

    if (isLoggedIn) {
      authEyebrow.textContent = 'Your account';
      loginTitle.textContent = 'You are logged in';
      loggedInMessage.textContent = session.user.username;
      return;
    }

    authEyebrow.textContent = authMode === 'register' ? 'Join the community' : 'Welcome back';
    loginTitle.textContent = authMode === 'register' ? 'Create account' : 'Log in';
    authSubmit.textContent = authMode === 'register' ? 'Create account' : 'Log in';
    authSwitchPrompt.textContent = authMode === 'register' ? 'Already have an account?' : 'New here?';
    authSwitchButton.textContent = authMode === 'register' ? 'Log in' : 'Create an account';
    passwordConfirmLabel.hidden = authMode !== 'register';
    passwordConfirmInput.hidden = authMode !== 'register';
    passwordConfirmInput.required = authMode === 'register';
    emailLabel.hidden = authMode !== 'register';
    emailInput.hidden = authMode !== 'register';
    emailInput.required = authMode === 'register';
    showAuthMessage('');
  }

    // Authenticate credentials and store the returned token and user data.
  async function login(username, password) {
    const response = await requestAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify({username, password}),
    });
    if (!response.ok) {
      throw new Error(await getApiError(response, 'Incorrect username or password.'));
    }
    const result = await response.json();
    if (!result.token || !result.data) {
      throw new Error('The login API returned an invalid response.');
    }
    saveSession({token: result.token, user: result.data});
    setFavouriteRestaurant(result.data);
  }

  async function isUsernameTaken(username) {
    const response = await requestAuth(`/users/available/${encodeURIComponent(username)}`);
    if (!response.ok) {
      return null;
    }
    const result = await response.json();
    return result.available !== true;
  }

    // Validate login/registration input, call the API, and refresh dependent views.
  async function handleLoginSubmit(event) {
    event.preventDefault();
    authSubmit.disabled = true;
    const formData = new FormData(loginForm);
    const username = String(formData.get('username') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');

    try {
      if (!username || !password || (authMode === 'register' && !email)) {
        showAuthMessage('Please complete all required fields.', true);
        return;
      }
      if (authMode === 'register') {
        if (password !== formData.get('passwordConfirm')) {
          showAuthMessage('Passwords do not match.', true);
          return;
        }
        const availabilityResponse = await requestAuth(`/users/available/${encodeURIComponent(username)}`);
        if (!availabilityResponse.ok) {
          throw new Error(`Username availability request failed with status ${availabilityResponse.status}`);
        }
        const availability = await availabilityResponse.json();
        if (availability.available !== true) {
          showAuthMessage('That username is already in use.', true);
          return;
        }
        const registerResponse = await requestAuth('/users', {
          method: 'POST',
          body: JSON.stringify({username, password, email}),
        });
        if (!registerResponse.ok) {
          const registrationError = await getApiError(registerResponse, 'Registration failed.');
          const accountWasCreated = await isUsernameTaken(username);
          if (accountWasCreated === true) {
            try {
              await login(username, password);
              loginForm.reset();
              showAuthMessage('Account created. You are now logged in.');
              renderAuthView();
              rerenderRestaurants();
              return;
            } catch (loginError) {
              loginForm.reset();
              showAuthMessage('Account created, but automatic login failed. Please log in with the new account.');
              return;
            }
          }
          throw new Error(registrationError);
        }
        await login(username, password);
        showAuthMessage('Account created. You are now logged in.');
      } else {
        await login(username, password);
        showAuthMessage('You are now logged in.');
      }
      loginForm.reset();
      renderAuthView();
      rerenderRestaurants();
    } catch (error) {
      console.error(error);
      showAuthMessage(error.message || 'Authentication is unavailable. Please try again later.', true);
    } finally {
      authSubmit.disabled = false;
    }
  }

    // Confirm the stored token with the API and remove it when it is no longer valid.
  async function validateSession() {
    try {
      const session = getSession();
      if (!session) {
        return;
      }
      const response = await requestAuth('/users/token');
      if (!response.ok) {
        clearSession();
        clearFavouriteRestaurant();
        renderAuthView();
        rerenderRestaurants();
        return;
      }
      const user = await response.json();
      const currentSession = getSession();
      if (currentSession && user && user.username) {
        setFavouriteRestaurant(user);
        saveSession({token: currentSession.token, user});
        rerenderRestaurants();
      }
    } catch (error) {
      console.error(error);
    }
  }

    // Open the authentication modal and render the current account state.
  openLoginButton.addEventListener('click', () => {
    loginModal.hidden = false;
    openLoginButton.setAttribute('aria-expanded', 'true');
    renderAuthView();
  });
  // Close the modal and return focus to the button that opened it.
  closeLoginButton.addEventListener('click', () => {
    loginModal.hidden = true;
    openLoginButton.setAttribute('aria-expanded', 'false');
    openLoginButton.focus();
  });
  // Allow clicking the shaded backdrop to close the modal.
  loginModal.addEventListener('click', event => {
    if (event.target === loginModal) {
      closeLoginButton.click();
    }
  });
  // Route form submission and mode switching to the appropriate handlers.
  loginForm.addEventListener('submit', handleLoginSubmit);
  authSwitchButton.addEventListener('click', () => {
    authMode = authMode === 'login' ? 'register' : 'login';
    renderAuthView();
    usernameInput.focus();
  });
  // Clear local authentication and favorite state on logout.
  logoutButton.addEventListener('click', () => {
    clearSession();
    clearFavouriteRestaurant();
    accountSettings.hidden = true;
    accountSettingsToggle.setAttribute('aria-expanded', 'false');
    accountSettingsForm.reset();
    authMode = 'login';
    renderAuthView();
    rerenderRestaurants();
    usernameInput.focus();
  });
  // Show the account settings form for an authenticated user.
  accountSettingsToggle.addEventListener('click', () => {
    accountSettingsToggle.setAttribute('aria-expanded', 'true');
    loggedInView.hidden = true;
    accountSettings.hidden = false;
    authEyebrow.textContent = 'Your account';
    loginTitle.textContent = 'Account settings';
    populateAccountSettings();
    accountEmailInput.focus();
  });
  // Discard unsaved account changes and return to the logged-in view.
  accountSettingsCancel.addEventListener('click', () => {
    accountSettingsForm.reset();
    accountSettings.hidden = true;
    accountSettingsToggle.setAttribute('aria-expanded', 'false');
    loggedInView.hidden = false;
    authEyebrow.textContent = 'Your account';
    loginTitle.textContent = 'You are logged in';
    showAccountSettingsMessage('');
    accountSettingsToggle.focus();
  });
  // Validate and save changed account email or password.
  accountSettingsForm.addEventListener('submit', async event => {
    event.preventDefault();
    accountSettingsSubmit.disabled = true;
    const session = getSession();
    const formData = new FormData(accountSettingsForm);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    const passwordConfirm = String(formData.get('passwordConfirm') || '');
    try {
      if (!email) {
        showAccountSettingsMessage('Email is required.', true);
        return;
      }
      if (password !== passwordConfirm) {
        showAccountSettingsMessage('Passwords do not match.', true);
        return;
      }
      if (!session || (!password && email === session.user.email)) {
        showAccountSettingsMessage('Enter a new email or password to save changes.', true);
        return;
      }
      const body = {email};
      if (password) {
        body.password = password;
      }
      const response = await requestAuth('/users', {method: 'PUT', body: JSON.stringify(body)});
      if (!response.ok) {
        throw new Error(await getApiError(response, 'Account settings could not be updated.'));
      }
      const responseBody = await response.text();
      const result = responseBody ? JSON.parse(responseBody) : null;
      const updatedUser = result && result.data ? result.data : {...session.user, email};
      saveSession({token: session.token, user: updatedUser});
      setFavouriteRestaurant(updatedUser);
      accountPasswordInput.value = '';
      accountPasswordConfirmInput.value = '';
      loggedInMessage.textContent = updatedUser.username;
      showAccountSettingsMessage('Account settings updated.');
      rerenderRestaurants();
    } catch (error) {
      console.error(error);
      showAccountSettingsMessage(error.message || 'Account settings could not be updated.', true);
    } finally {
      accountSettingsSubmit.disabled = false;
    }
  });

  // Render the initial state before returning public authentication actions.
  renderAuthView();
  return {openLogin: () => openLoginButton.click(), validateSession};
}
