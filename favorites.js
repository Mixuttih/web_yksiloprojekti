// Favorite state and UI helpers are kept separate from the restaurant and menu views.
import {getApiError, requestAuth} from './api.js';
import {getCurrentUserEmail} from './session.js';

// The API currently supports one favorite restaurant per user.
let favouriteRestaurantId = null;

// Return the favorite as an array so list sorting and membership checks stay simple.
export function getFavorites() {
  return favouriteRestaurantId ? [favouriteRestaurantId] : [];
}

// Normalize the API's possible favorite shapes into a single restaurant ID.
export function setFavouriteRestaurant(user) {
  const favouriteRestaurant = user && user.favouriteRestaurant;
  favouriteRestaurantId = typeof favouriteRestaurant === 'string'
    ? favouriteRestaurant
    : favouriteRestaurant && typeof favouriteRestaurant._id === 'string'
      ? favouriteRestaurant._id
      : null;
}

// Clear in-memory favorite state when the user logs out or the session expires.
export function clearFavouriteRestaurant() {
  favouriteRestaurantId = null;
}

// Create the favorite button used in each restaurant card.
export function createFavoriteButton(restaurant, isFavorite) {
  const button = document.createElement('button');
  button.className = 'favorite-button';
  button.type = 'button';
  button.dataset.restaurantId = restaurant._id;
  updateFavoriteButton(button, restaurant, isFavorite);
  return button;
}

// Synchronize a favorite button's visual state, accessibility text, and login state.
export function updateFavoriteButton(button, restaurant, isFavorite) {
  const isLoggedIn = Boolean(getCurrentUserEmail());
  button.textContent = isFavorite ? '★' : '☆';
  button.classList.toggle('is-favorite', isFavorite);
  button.disabled = !isLoggedIn;
  button.setAttribute('aria-pressed', String(isFavorite));
  button.setAttribute('aria-label', isLoggedIn
    ? `${isFavorite ? 'Remove' : 'Add'} ${restaurant.name.trim()} ${isFavorite ? 'from' : 'to'} favorites`
    : 'Log in to favorite this restaurant');
  button.title = isLoggedIn ? (isFavorite ? 'Remove from favorites' : 'Add to favorites') : 'Log in to favorite';
}

// Toggle the server-side favorite and notify the calling view when the operation ends.
export async function toggleFavorite(restaurantId, {openLogin, onUpdated, selectedRestaurant, menuButton}) {
  if (!getCurrentUserEmail()) {
    openLogin();
    return;
  }

  try {
    const nextFavouriteRestaurantId = favouriteRestaurantId === restaurantId ? null : restaurantId;
    const response = await requestAuth('/users', {
      method: 'PUT',
      body: JSON.stringify(nextFavouriteRestaurantId
        ? {favouriteRestaurant: nextFavouriteRestaurantId}
        : {$unset: {favouriteRestaurant: 1}}),
    });
    if (!response.ok) {
      throw new Error(await getApiError(response, 'The favorite restaurant could not be updated.'));
    }

    const responseBody = await response.text();
    const result = responseBody ? JSON.parse(responseBody) : null;
    setFavouriteRestaurant(result && result.data
      ? result.data
      : {favouriteRestaurant: nextFavouriteRestaurantId});
    onUpdated();
    if (selectedRestaurant && selectedRestaurant._id === restaurantId) {
      updateFavoriteButton(menuButton, selectedRestaurant, favouriteRestaurantId === restaurantId);
    }
  } catch (error) {
    console.error(error);
    onUpdated(error.message || 'The favorite restaurant could not be updated. Please try again later.', true);
  }
}
