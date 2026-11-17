// Menu modal state, API loading, and menu-content rendering.
import {fetchWithTimeout, MENU_API_BASE_URL} from './api.js';
import {getFavorites, toggleFavorite, updateFavoriteButton} from './favorites.js';

// These values identify the currently visible restaurant and menu selections.
let selectedRestaurant = null;
let selectedMenuType = 'daily';
let selectedMenuLanguage = 'en';
let menuRequestId = 0;

// Bind menu controls and return the function used by map/list selections to open a menu.
export function initMenu({openLogin, rerenderRestaurants, showError}) {
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

  // Load the selected restaurant's daily or weekly menu and ignore stale responses.
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
      const response = await fetchWithTimeout(
        `${MENU_API_BASE_URL}/${route}/${encodeURIComponent(restaurant._id)}/${language}`,
      );
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
      if (requestId !== menuRequestId) {
        return;
      }
      console.error(error);
      menuContent.textContent = `The ${menuType} menu could not be loaded. Please try again later.`;
    }
  }

  // Hide the modal and invalidate any request that is still loading.
  function closeMenuModal() {
    menuRequestId += 1;
    menuModal.hidden = true;
    selectedRestaurant = null;
  }

  menuFavoriteButton.addEventListener('click', () => {
    if (selectedRestaurant) {
      toggleFavorite(selectedRestaurant._id, {
        openLogin,
        onUpdated: (message, isError) => {
          if (message) {
            showError(message, isError);
          } else {
            rerenderRestaurants();
          }
        },
        selectedRestaurant,
        menuButton: menuFavoriteButton,
      });
    }
  });
  closeMenuButton.addEventListener('click', closeMenuModal);
  menuModal.addEventListener('click', event => {
    if (event.target === menuModal) {
      closeMenuModal();
    }
  });
  dailyMenuButton.addEventListener('click', () => selectedRestaurant
    && openMenuModal(selectedRestaurant, 'daily', selectedMenuLanguage));
  weeklyMenuButton.addEventListener('click', () => selectedRestaurant
    && openMenuModal(selectedRestaurant, 'weekly', selectedMenuLanguage));
  englishMenuButton.addEventListener('click', () => selectedRestaurant
    && openMenuModal(selectedRestaurant, selectedMenuType, 'en'));
  finnishMenuButton.addEventListener('click', () => selectedRestaurant
    && openMenuModal(selectedRestaurant, selectedMenuType, 'fi'));

  return {openMenuModal};
}

// Convert course data into safe DOM nodes for both daily and weekly menus.
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

// Render one day's courses or the daily empty state.
function renderDailyMenu(courses) {
  const menuContent = document.querySelector('#menu-content');
  menuContent.replaceChildren();
  menuContent.textContent = courses.length ? '' : 'No menu available for today.';
  if (courses.length) {
    menuContent.append(renderCourses(courses));
  }
}

// Render each day in a weekly menu, including days without courses.
function renderWeeklyMenu(days) {
  const menuContent = document.querySelector('#menu-content');
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
    daySection.append(day.courses.length ? renderCourses(day.courses) : createNoCoursesMessage());
    menuContent.append(daySection);
  });
}

// Create the explanatory message used for a day with no available courses.
function createNoCoursesMessage() {
  const noCourses = document.createElement('p');
  noCourses.className = 'menu-course-details';
  noCourses.textContent = 'No courses available.';
  return noCourses;
}
