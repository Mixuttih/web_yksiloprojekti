let restaurants = [];
const RESTAURANTS_API_URL = 'https://media2.edu.metropolia.fi/restaurant/api/v1/restaurants';
const MENU_API_BASE_URL = 'https://media2.edu.metropolia.fi/restaurant/api/v1/restaurants';

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
const loggedInView = document.querySelector('#logged-in-view');
const loggedInMessage = document.querySelector('#logged-in-message');
const logoutButton = document.querySelector('#logout-button');
const menuModal = document.querySelector('#menu-modal');
const closeMenuButton = document.querySelector('#close-menu');
const menuTitle = document.querySelector('#menu-title');
const menuAddress = document.querySelector('#menu-address');
const menuFavoriteButton = document.querySelector('#menu-favorite-button');
const menuContent = document.querySelector('#menu-content');
const dailyMenuButton = document.querySelector('#daily-menu-button');
const weeklyMenuButton = document.querySelector('#weekly-menu-button');
const englishMenuButton = document.querySelector('#english-menu-button');
const finnishMenuButton = document.querySelector('#finnish-menu-button');
let menuRequestId = 0;
let selectedRestaurant = null;
let selectedMenuType = 'daily';
let selectedMenuLanguage = 'en';
let authMode = 'login';
let nearestRestaurantId = null;

const USERS_STORAGE_KEY = 'studentRestaurantUsers';
const SESSION_STORAGE_KEY = 'studentRestaurantSession';
const FAVORITES_STORAGE_KEY = 'studentRestaurantFavorites';

const map = L.map('map');

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const markers = new Map();

function addRestaurantMarkers() {
  const markerLocations = restaurants.map(restaurant => {
    const [longitude, latitude] = restaurant.location.coordinates;
    return [latitude, longitude];
  });

  map.fitBounds(L.latLngBounds(markerLocations));

  restaurants.forEach(restaurant => {
    const [longitude, latitude] = restaurant.location.coordinates;
    const marker = L.marker([latitude, longitude])
      .addTo(map)
      .on('click', () => openMenuModal(restaurant, 'daily'));
    markers.set(restaurant._id, marker);
  });
}

function renderRestaurantList(searchTerm = '') {
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const favoriteIds = new Set(getFavorites());
  const filteredRestaurants = restaurants.filter(restaurant => {
    const searchableText = `${restaurant.name} ${restaurant.address} ${restaurant.city} ${restaurant.company}`.toLocaleLowerCase();
    return searchableText.includes(normalizedSearch);
  });
  filteredRestaurants.sort((first, second) => Number(favoriteIds.has(second._id)) - Number(favoriteIds.has(first._id)));

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

  restaurantCount.textContent = `${filteredRestaurants.length} ${filteredRestaurants.length === 1 ? 'result' : 'results'}`;
  emptyState.textContent = 'No restaurants match your search.';
  emptyState.hidden = filteredRestaurants.length > 0;
}

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

restaurantList.addEventListener('click', event => {
  const favoriteButton = event.target.closest('.favorite-button');
  if (favoriteButton) {
    event.stopPropagation();
    toggleFavorite(favoriteButton.dataset.restaurantId);
    return;
  }

  const cardContent = event.target.closest('.restaurant-card-main');
  if (cardContent) {
    const card = cardContent.closest('.restaurant-card');
    selectRestaurant(card.dataset.restaurantId);
  }
});

searchInput.addEventListener('input', event => {
  renderRestaurantList(event.target.value);
});

clearSearchButton.addEventListener('click', () => {
  searchInput.value = '';
  renderRestaurantList();
  searchInput.focus();
});

findNearestButton.addEventListener('click', findNearestRestaurant);

closePanelButton.addEventListener('click', () => {
  appShell.classList.add('panel-collapsed');
  showPanelButton.focus();
});

showPanelButton.addEventListener('click', () => {
  appShell.classList.remove('panel-collapsed');
  searchInput.focus();
});

menuFavoriteButton.addEventListener('click', () => {
  if (selectedRestaurant) {
    toggleFavorite(selectedRestaurant._id);
  }
});

openLoginButton.addEventListener('click', () => {
  loginModal.hidden = false;
  openLoginButton.setAttribute('aria-expanded', 'true');
  renderAuthView();
});

closeLoginButton.addEventListener('click', () => {
  loginModal.hidden = true;
  openLoginButton.setAttribute('aria-expanded', 'false');
  openLoginButton.focus();
});

loginModal.addEventListener('click', event => {
  if (event.target === loginModal) {
    closeLoginButton.click();
  }
});

loginForm.addEventListener('submit', event => {
  event.preventDefault();

  const formData = new FormData(loginForm);
  const email = normalizeEmail(formData.get('email'));
  const password = formData.get('password');

  try {
    const users = getUsers();

    if (authMode === 'register') {
      const passwordConfirm = formData.get('passwordConfirm');
      if (password !== passwordConfirm) {
        showAuthMessage('Passwords do not match.', true);
        return;
      }

      if (users.some(user => user.email === email)) {
        showAuthMessage('An account with this email already exists.', true);
        return;
      }

      users.push({email, password});
      saveUsers(users);
      setSession(email);
      showAuthMessage('Account created. You are now logged in.');
    } else {
      const user = users.find(account => account.email === email && account.password === password);
      if (!user) {
        showAuthMessage('Incorrect email or password.', true);
        return;
      }

      setSession(user.email);
      showAuthMessage('You are now logged in.');
    }

    loginForm.reset();
    renderAuthView();
    renderRestaurantList(searchInput.value);
  } catch (error) {
    console.error(error);
    showAuthMessage('Authentication is unavailable in this browser. Please try again later.', true);
  }
});

authSwitchButton.addEventListener('click', () => {
  authMode = authMode === 'login' ? 'register' : 'login';
  renderAuthView();
  document.querySelector('#login-email').focus();
});

logoutButton.addEventListener('click', () => {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    authMode = 'login';
    renderAuthView();
    renderRestaurantList(searchInput.value);
    document.querySelector('#login-email').focus();
  } catch (error) {
    console.error(error);
    showAuthMessage('Unable to log out. Please try again later.', true);
  }
});

function normalizeEmail(value) {
  return String(value || '').trim().toLocaleLowerCase();
}

function getUsers() {
  const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
  if (!storedUsers) {
    return [];
  }

  const users = JSON.parse(storedUsers);
  if (!Array.isArray(users) || users.some(user => !user || typeof user.email !== 'string' || typeof user.password !== 'string')) {
    throw new Error('Stored users are invalid');
  }

  return users;
}

function saveUsers(users) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function setSession(email) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({email}));
}

function getSession() {
  const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
  return storedSession ? JSON.parse(storedSession) : null;
}

function getCurrentUserEmail() {
  const session = getSession();
  return session && typeof session.email === 'string' ? session.email : null;
}

function getFavorites() {
  const email = getCurrentUserEmail();
  if (!email) {
    return [];
  }

  const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
  if (!storedFavorites) {
    return [];
  }

  const favoritesByUser = JSON.parse(storedFavorites);
  const favorites = favoritesByUser[email];
  if (!Array.isArray(favorites) || favorites.some(id => typeof id !== 'string')) {
    throw new Error('Stored favorites are invalid');
  }

  return favorites;
}

function saveFavorites(favorites) {
  const email = getCurrentUserEmail();
  if (!email) {
    return;
  }

  const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
  const favoritesByUser = storedFavorites ? JSON.parse(storedFavorites) : {};
  favoritesByUser[email] = favorites;
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoritesByUser));
}

function createFavoriteButton(restaurant, isFavorite) {
  const button = document.createElement('button');
  button.className = 'favorite-button';
  button.type = 'button';
  button.dataset.restaurantId = restaurant._id;
  updateFavoriteButton(button, restaurant, isFavorite);
  return button;
}

function updateFavoriteButton(button, restaurant, isFavorite) {
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

function toggleFavorite(restaurantId) {
  if (!getCurrentUserEmail()) {
    openLoginButton.click();
    return;
  }

  try {
    const favorites = getFavorites();
    const favoriteIndex = favorites.indexOf(restaurantId);
    if (favoriteIndex === -1) {
      favorites.push(restaurantId);
    } else {
      favorites.splice(favoriteIndex, 1);
    }

    saveFavorites(favorites);
    renderRestaurantList(searchInput.value);
    if (selectedRestaurant && selectedRestaurant._id === restaurantId) {
      updateFavoriteButton(menuFavoriteButton, selectedRestaurant, favorites.includes(restaurantId));
    }
  } catch (error) {
    console.error(error);
  }
}

function findNearestRestaurant() {
  if (!navigator.geolocation) {
    showLocationMessage('Location is not supported by this browser.', true);
    return;
  }

  if (restaurants.length === 0) {
    showLocationMessage('Restaurants are still loading. Please try again shortly.', true);
    return;
  }

  findNearestButton.disabled = true;
  findNearestButton.setAttribute('aria-busy', 'true');
  showLocationMessage('Requesting your location...');

  navigator.geolocation.getCurrentPosition(
    position => {
      const nearestRestaurant = getNearestRestaurant(position.coords.latitude, position.coords.longitude);
      findNearestButton.disabled = false;
      findNearestButton.removeAttribute('aria-busy');

      if (!nearestRestaurant) {
        showLocationMessage('No restaurant with valid location data was found.', true);
        return;
      }

      nearestRestaurantId = nearestRestaurant._id;
      searchInput.value = '';
      renderRestaurantList();
      showLocationMessage(`Nearest restaurant: ${nearestRestaurant.name.trim()}`);
      selectRestaurant(nearestRestaurant._id);
    },
    error => {
      findNearestButton.disabled = false;
      findNearestButton.removeAttribute('aria-busy');
      const errorMessage = error.code === 1
        ? 'Location permission was denied. Allow location access to find the nearest restaurant.'
        : error.code === 2
          ? 'Your location is currently unavailable. Please try again.'
          : 'The location request timed out. Please try again.';
      showLocationMessage(errorMessage, true);
    },
    {enableHighAccuracy: true, timeout: 10000, maximumAge: 300000},
  );
}

function getNearestRestaurant(latitude, longitude) {
  let nearestRestaurant = null;
  let nearestDistance = Infinity;

  restaurants.forEach(restaurant => {
    const coordinates = restaurant.location && restaurant.location.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return;
    }

    const [restaurantLongitude, restaurantLatitude] = coordinates;
    if (![restaurantLatitude, restaurantLongitude].every(Number.isFinite)) {
      return;
    }

    const distance = calculateDistance(latitude, longitude, restaurantLatitude, restaurantLongitude);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestRestaurant = restaurant;
    }
  });

  return nearestRestaurant;
}

function calculateDistance(latitudeOne, longitudeOne, latitudeTwo, longitudeTwo) {
  const earthRadiusInKilometres = 6371;
  const latitudeDifference = toRadians(latitudeTwo - latitudeOne);
  const longitudeDifference = toRadians(longitudeTwo - longitudeOne);
  const latitudeOneInRadians = toRadians(latitudeOne);
  const latitudeTwoInRadians = toRadians(latitudeTwo);
  const haversine = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(latitudeOneInRadians) * Math.cos(latitudeTwoInRadians)
    * Math.sin(longitudeDifference / 2) ** 2;

  return earthRadiusInKilometres * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

function showLocationMessage(message, isError = false) {
  locationMessage.textContent = message;
  locationMessage.classList.toggle('is-error', isError);
}

function showAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle('is-error', isError);
}

function renderAuthView() {
  let session = null;
  try {
    session = getSession();
  } catch (error) {
    console.error(error);
    showAuthMessage('Authentication is unavailable in this browser. Please try again later.', true);
  }

  const isLoggedIn = Boolean(session && session.email);
  loggedInView.hidden = !isLoggedIn;
  loginForm.hidden = isLoggedIn;
  authSwitchButton.parentElement.hidden = isLoggedIn;
  openLoginButton.setAttribute('aria-label', isLoggedIn ? `Logged in as ${session.email}` : 'Open login form');

  if (isLoggedIn) {
    authEyebrow.textContent = 'Your account';
    loginTitle.textContent = 'You are logged in';
    loggedInMessage.textContent = session.email;
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
  showAuthMessage('');
}

function renderCourses(courses) {
  const courseList = document.createElement('ul');
  courseList.className = 'menu-course-list';

  courses.forEach(course => {
    const courseItem = document.createElement('li');
    courseItem.className = 'menu-course';

    const courseName = document.createElement('span');
    courseName.className = 'menu-course-name';
    courseName.textContent = course.name;

    const courseDetails = document.createElement('span');
    courseDetails.className = 'menu-course-details';
    courseDetails.textContent = [course.price, course.diets].filter(Boolean).join(' · ');

    courseItem.append(courseName, courseDetails);
    courseList.append(courseItem);
  });

  return courseList;
}

function renderDailyMenu(courses) {
  menuContent.replaceChildren();

  if (courses.length === 0) {
    menuContent.textContent = 'No menu available for today.';
    return;
  }

  menuContent.append(renderCourses(courses));
}

function renderWeeklyMenu(days) {
  menuContent.replaceChildren();

  if (days.length === 0) {
    menuContent.textContent = 'No weekly menu available.';
    return;
  }

  days.forEach(day => {
    const daySection = document.createElement('section');
    daySection.className = 'menu-day';

    const dayTitle = document.createElement('h3');
    dayTitle.className = 'menu-day-title';
    dayTitle.textContent = day.date;
    daySection.append(dayTitle);

    if (day.courses.length === 0) {
      const noCourses = document.createElement('p');
      noCourses.className = 'menu-course-details';
      noCourses.textContent = 'No courses available.';
      daySection.append(noCourses);
    } else {
      daySection.append(renderCourses(day.courses));
    }

    menuContent.append(daySection);
  });
}

async function openMenuModal(restaurant, menuType = 'daily', language = selectedMenuLanguage) {
  const requestId = ++menuRequestId;
  selectedRestaurant = restaurant;
  selectedMenuType = menuType;
  selectedMenuLanguage = language;
  menuTitle.textContent = restaurant.name.trim();
  menuAddress.textContent = `${restaurant.address}, ${restaurant.postalCode} ${restaurant.city}`;
  updateFavoriteButton(menuFavoriteButton, restaurant, getFavorites().includes(restaurant._id));
  menuContent.textContent = 'Loading menu...';
  menuModal.hidden = false;
  dailyMenuButton.classList.toggle('is-active', menuType === 'daily');
  weeklyMenuButton.classList.toggle('is-active', menuType === 'weekly');
  englishMenuButton.classList.toggle('is-active', language === 'en');
  finnishMenuButton.classList.toggle('is-active', language === 'fi');
  closeMenuButton.focus();

  try {
    const route = menuType === 'weekly' ? 'weekly' : 'daily';
    const response = await fetch(`${MENU_API_BASE_URL}/${route}/${encodeURIComponent(restaurant._id)}/${language}`);
    if (!response.ok) {
      throw new Error(`Menu API request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (requestId !== menuRequestId) {
      return;
    }

    if (menuType === 'weekly') {
      if (!data || !Array.isArray(data.days)) {
        throw new Error('Weekly menu API returned an invalid response');
      }
      renderWeeklyMenu(data.days);
    } else {
      if (!data || !Array.isArray(data.courses)) {
        throw new Error('Daily menu API returned an invalid response');
      }
      renderDailyMenu(data.courses);
    }
  } catch (error) {
    console.error(error);
    menuContent.textContent = `The ${menuType} menu could not be loaded. Please try again later.`;
  }
}

function closeMenuModal() {
  menuModal.hidden = true;
  selectedRestaurant = null;
}

closeMenuButton.addEventListener('click', closeMenuModal);

menuModal.addEventListener('click', event => {
  if (event.target === menuModal) {
    closeMenuModal();
  }
});

dailyMenuButton.addEventListener('click', () => {
  if (selectedRestaurant) {
    openMenuModal(selectedRestaurant, 'daily', selectedMenuLanguage);
  }
});

weeklyMenuButton.addEventListener('click', () => {
  if (selectedRestaurant) {
    openMenuModal(selectedRestaurant, 'weekly', selectedMenuLanguage);
  }
});

englishMenuButton.addEventListener('click', () => {
  if (selectedRestaurant) {
    openMenuModal(selectedRestaurant, selectedMenuType, 'en');
  }
});

finnishMenuButton.addEventListener('click', () => {
  if (selectedRestaurant) {
    openMenuModal(selectedRestaurant, selectedMenuType, 'fi');
  }
});

async function loadRestaurants() {
  restaurantCount.textContent = 'Loading...';
  emptyState.hidden = false;
  emptyState.textContent = 'Loading restaurants...';

  try {
    const response = await fetch(RESTAURANTS_API_URL);
    if (!response.ok) {
      throw new Error(`Restaurant API request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Restaurant API returned an invalid response');
    }

    restaurants = data;
    if (restaurants.length > 0) {
      addRestaurantMarkers();
    }
    renderRestaurantList(searchInput.value);
  } catch (error) {
    console.error(error);
    restaurantCount.textContent = 'Unavailable';
    emptyState.hidden = false;
    emptyState.textContent = 'Restaurants could not be loaded. Please try again later.';
  }
}

loadRestaurants();