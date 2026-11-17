// Restaurant list, map markers, search, panel controls, and nearest-location flow.
import {fetchWithTimeout, RESTAURANTS_API_URL} from './api.js';
import {findNearestRestaurant} from './location.js';
import {
  createFavoriteButton,
  getFavorites,
  toggleFavorite,
} from './favorites.js';

export function initRestaurants({openLogin, openMenuModal, showError}) {
  // Data and UI state owned by the restaurant feature.
  let restaurants = [];
  let nearestRestaurantId = null;
  const appShell = document.querySelector('.app-shell');
  const restaurantList = document.querySelector('#restaurant-list');
  const searchInput = document.querySelector('#restaurant-search');
  const clearSearchButton = document.querySelector('#clear-search');
  const restaurantCount = document.querySelector('#restaurant-count');
  const emptyState = document.querySelector('#empty-state');
  const findNearestButton = document.querySelector('#find-nearest');
  const locationMessage = document.querySelector('#location-message');
  const closePanelButton = document.querySelector('#close-panel');
  const showPanelButton = document.querySelector('#show-panel');
  const map = L.map('map');
  const markers = new Map();

  // Create the Leaflet map and its OpenStreetMap tile layer.
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  // Display location and favorite-operation feedback in the panel.
  function showLocationMessage(message, isError = false) {
    locationMessage.textContent = message;
    locationMessage.classList.toggle('is-error', isError);
  }

    // Filter, sort, and rebuild restaurant cards from the current API data.
  function renderRestaurantList(searchTerm = '') {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
    const favoriteIds = new Set(getFavorites());
    const filteredRestaurants = restaurants.filter(restaurant => {
      const searchableText = `${restaurant.name} ${restaurant.address} ${restaurant.city} ${restaurant.company}`
        .toLocaleLowerCase();
      return searchableText.includes(normalizedSearch);
    });
    filteredRestaurants.sort((first, second) =>
      Number(favoriteIds.has(second._id)) - Number(favoriteIds.has(first._id)));

    restaurantList.replaceChildren();
    filteredRestaurants.forEach(restaurant => {
      const card = document.createElement('div');
      const address = document.createElement('p');
      const company = document.createElement('p');
      const cardContent = document.createElement('button');
      const favoriteButton = createFavoriteButton(restaurant, favoriteIds.has(restaurant._id));
      card.className = 'restaurant-card';
      card.classList.toggle('is-nearest', restaurant._id === nearestRestaurantId);
      card.setAttribute('role', 'listitem');
      card.dataset.restaurantId = restaurant._id;
      cardContent.className = 'restaurant-card-main';
      cardContent.type = 'button';
      const name = document.createElement('h3');
      name.className = 'restaurant-name';
      name.textContent = restaurant.name.trim();
      address.className = 'restaurant-meta';
      address.textContent = `${restaurant.address}, ${restaurant.postalCode} ${restaurant.city}`;
      company.className = 'restaurant-company';
      company.textContent = restaurant.company;
      if (restaurant._id === nearestRestaurantId) {
        const nearestLabel = document.createElement('span');
        nearestLabel.className = 'nearest-label';
        nearestLabel.textContent = 'Nearest to you';
        cardContent.append(nearestLabel);
      }
      cardContent.append(name, address, company);
      card.append(cardContent, favoriteButton);
      restaurantList.append(card);
    });
    restaurantCount.textContent =
      `${filteredRestaurants.length} ${filteredRestaurants.length === 1 ? 'result' : 'results'}`;
    emptyState.textContent = 'No restaurants match your search.';
    emptyState.hidden = filteredRestaurants.length > 0;
  }

    // Center the map on a restaurant, collapse the panel, and open its menu.
  function selectRestaurant(restaurantId) {
    const restaurant = restaurants.find(item => item._id === restaurantId);
    const marker = markers.get(restaurantId);
    if (!restaurant || !marker) {
      return;
    }
    const [longitude, latitude] = restaurant.location.coordinates;
    map.flyTo([latitude, longitude], 16, {duration: 0.8});
    appShell.classList.add('panel-collapsed');
    showPanelButton.focus();
    openMenuModal(restaurant, 'daily');
  }

    // Add markers only for valid coordinates and fit the map to those markers.
  function addRestaurantMarkers() {
    const validRestaurants = restaurants.filter(restaurant => isValidCoordinates(restaurant.location));
    if (validRestaurants.length > 0) {
      const markerLocations = validRestaurants.map(restaurant => {
        const [longitude, latitude] = restaurant.location.coordinates;
        return [latitude, longitude];
      });
      map.fitBounds(L.latLngBounds(markerLocations));
    }
    validRestaurants.forEach(restaurant => {
      const [longitude, latitude] = restaurant.location.coordinates;
      const marker = L.marker([latitude, longitude])
        .addTo(map)
        .on('click', () => openMenuModal(restaurant, 'daily'));
      markers.set(restaurant._id, marker);
    });
  }

    // Fetch restaurants, initialize markers, and render the first list.
  function loadRestaurants() {
    restaurantCount.textContent = 'Loading...';
    emptyState.hidden = false;
    emptyState.textContent = 'Loading restaurants...';
    fetchWithTimeout(RESTAURANTS_API_URL)
      .then(async response => {
        if (!response.ok) {
          throw new Error(`Restaurant API request failed with status ${response.status}`);
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Restaurant API returned an invalid response');
        }
        restaurants = data;
        addRestaurantMarkers();
        renderRestaurantList(searchInput.value);
      })
      .catch(error => {
        console.error(error);
        restaurantCount.textContent = 'Unavailable';
        emptyState.hidden = false;
        emptyState.textContent = 'Restaurants could not be loaded. Please try again later.';
      });
  }

    // Start geolocation lookup and update the panel when a nearest restaurant is found.
  function handleFindNearest() {
    if (findNearestButton.disabled) {
      return;
    }
    findNearestButton.disabled = true;
    findNearestButton.setAttribute('aria-busy', 'true');
    showLocationMessage('Requesting your location...');
    findNearestRestaurant(restaurants, nearestRestaurant => {
      findNearestButton.disabled = false;
      findNearestButton.removeAttribute('aria-busy');
      nearestRestaurantId = nearestRestaurant._id;
      searchInput.value = '';
      renderRestaurantList();
      showLocationMessage(`Nearest restaurant: ${nearestRestaurant.name.trim()}`);
      selectRestaurant(nearestRestaurant._id);
    }, message => {
      findNearestButton.disabled = false;
      findNearestButton.removeAttribute('aria-busy');
      showLocationMessage(message, true);
    });
  }

    // Handle card and favorite clicks through one delegated list listener.
  restaurantList.addEventListener('click', event => {
    const favoriteButton = event.target.closest('.favorite-button');
    if (favoriteButton) {
      event.stopPropagation();
      toggleFavorite(favoriteButton.dataset.restaurantId, {
        openLogin,
        onUpdated: (message, isError) => {
          if (message) {
            showError(message, isError);
          }
          renderRestaurantList(searchInput.value);
        },
      });
      return;
    }
    const cardContent = event.target.closest('.restaurant-card-main');
    if (cardContent) {
      selectRestaurant(cardContent.closest('.restaurant-card').dataset.restaurantId);
    }
  });
  searchInput.addEventListener('input', event => renderRestaurantList(event.target.value));
  clearSearchButton.addEventListener('click', () => {
    searchInput.value = '';
    renderRestaurantList();
    searchInput.focus();
  });
  findNearestButton.addEventListener('click', handleFindNearest);
  closePanelButton.addEventListener('click', () => {
    appShell.classList.add('panel-collapsed');
    showPanelButton.focus();
  });
  showPanelButton.addEventListener('click', () => {
    appShell.classList.remove('panel-collapsed');
    searchInput.focus();
  });

  // Begin loading data immediately and expose rendering for other modules.
  loadRestaurants();
  return {renderRestaurantList};
}

// Confirm that API coordinates are numeric and within geographic bounds.
function isValidCoordinates(location) {
  if (!location || !Array.isArray(location.coordinates) || location.coordinates.length < 2) {
    return false;
  }
  const [longitude, latitude] = location.coordinates;
  return Number.isFinite(longitude) && Number.isFinite(latitude)
    && longitude >= -180 && longitude <= 180
    && latitude >= -90 && latitude <= 90;
}
