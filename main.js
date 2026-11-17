// Application entry point: initialize each feature module and connect their callbacks.
import {initAuth} from './auth.js';
import {initMenu} from './menu.js';
import {initRestaurants} from './restaurants.js';

// This is assigned after the restaurant module is initialized, but callbacks may be
// registered earlier by the authentication and menu modules.
let restaurantView;

// Display errors from shared features in the restaurant panel's status area.
const showError = (message, isError = false) => {
  const locationMessage = document.querySelector('#location-message');
  locationMessage.textContent = message;
  locationMessage.classList.toggle('is-error', isError);
};

// Refresh the visible restaurant cards after authentication or favorite changes.
const rerenderRestaurants = () => {
  if (restaurantView) {
    restaurantView.renderRestaurantList(document.querySelector('#restaurant-search').value);
  }
};

// Initialize authentication first so the other modules can open the login dialog.
const auth = initAuth({rerenderRestaurants});
// Menu actions need access to login and restaurant-list refresh callbacks.
const menu = initMenu({
  openLogin: auth.openLogin,
  rerenderRestaurants,
  showError,
});
// The restaurant module owns the map, list, search, and nearest-location controls.
restaurantView = initRestaurants({
  openLogin: auth.openLogin,
  openMenuModal: menu.openMenuModal,
  showError,
});
// Validate an existing stored token after the initial UI has been created.
auth.validateSession();
