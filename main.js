let restaurants = [];
const RESTAURANTS_API_URL = 'https://media2.edu.metropolia.fi/restaurant/api/v1/restaurants';
const MENU_API_BASE_URL = 'https://media2.edu.metropolia.fi/restaurant/api/v1/restaurants';

const appShell = document.querySelector('.app-shell');
const restaurantList = document.querySelector('#restaurant-list');
const searchInput = document.querySelector('#restaurant-search');
const clearSearchButton = document.querySelector('#clear-search');
const restaurantCount = document.querySelector('#restaurant-count');
const emptyState = document.querySelector('#empty-state');
const closePanelButton = document.querySelector('#close-panel');
const showPanelButton = document.querySelector('#show-panel');
const openLoginButton = document.querySelector('#open-login');
const closeLoginButton = document.querySelector('#close-login');
const loginModal = document.querySelector('#login-modal');
const loginForm = document.querySelector('#login-form');
const menuModal = document.querySelector('#menu-modal');
const closeMenuButton = document.querySelector('#close-menu');
const menuTitle = document.querySelector('#menu-title');
const menuAddress = document.querySelector('#menu-address');
const menuContent = document.querySelector('#menu-content');
const dailyMenuButton = document.querySelector('#daily-menu-button');
const weeklyMenuButton = document.querySelector('#weekly-menu-button');
const englishMenuButton = document.querySelector('#english-menu-button');
const finnishMenuButton = document.querySelector('#finnish-menu-button');
let menuRequestId = 0;
let selectedRestaurant = null;
let selectedMenuType = 'daily';
let selectedMenuLanguage = 'en';

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
  const filteredRestaurants = restaurants.filter(restaurant => {
    const searchableText = `${restaurant.name} ${restaurant.address} ${restaurant.city} ${restaurant.company}`.toLocaleLowerCase();
    return searchableText.includes(normalizedSearch);
  });

  restaurantList.replaceChildren();
  filteredRestaurants.forEach(restaurant => {
    const card = document.createElement('button');
    const address = document.createElement('p');
    const company = document.createElement('p');

    card.className = 'restaurant-card';
    card.type = 'button';
    card.setAttribute('role', 'listitem');
    card.dataset.restaurantId = restaurant._id;

    const name = document.createElement('h3');
    name.className = 'restaurant-name';
    name.textContent = restaurant.name.trim();

    address.className = 'restaurant-meta';
    address.textContent = `${restaurant.address}, ${restaurant.postalCode} ${restaurant.city}`;

    company.className = 'restaurant-company';
    company.textContent = restaurant.company;

    card.append(name, address, company);
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
  const card = event.target.closest('.restaurant-card');
  if (card) {
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

closePanelButton.addEventListener('click', () => {
  appShell.classList.add('panel-collapsed');
  showPanelButton.focus();
});

showPanelButton.addEventListener('click', () => {
  appShell.classList.remove('panel-collapsed');
  searchInput.focus();
});

openLoginButton.addEventListener('click', () => {
  loginModal.hidden = false;
  openLoginButton.setAttribute('aria-expanded', 'true');
  document.querySelector('#login-email').focus();
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
});

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