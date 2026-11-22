# Student Restaurant Map

Student Restaurant Map is a web application created by Mika Hielkema Suutari as an individual project assignment for **Metropolia University of Applied Sciences**.

The application helps users discover student restaurants, browse their locations on an interactive map, and check current daily or weekly menus.

## Live demo

[Open Student Restaurant Map](https://users.metropolia.fi/~mikahiel/yksilotehtava/)

> **Warning:** The live demo requires a connection to the Metropolia Network to function properly. This includes access through the Metropolia campus network or another authorized network connection.

## Features

- Interactive restaurant map with OpenStreetMap tiles and restaurant markers
- Restaurant list for Finland with search by name, city, address, or company
- Geolocation support for finding the nearest student restaurant
- Daily and weekly menu views
- Menu language selection for English and Finnish
- User registration and login
- Account settings for updating email and password
- Server-backed favorite restaurant support for signed-in users
- Session validation and logout
- Responsive, collapsible interface with accessible controls and status messages

## How to use

1. Open the live demo from the Metropolia Network.
2. Search the restaurant list or explore the markers on the map.
3. Select a restaurant to view its address and current daily or weekly menu.
4. Switch between English and Finnish menu content.
5. Allow browser location access to find the nearest available restaurant.
6. Create an account or log in to save a favorite restaurant and manage account settings.

## Technologies

- HTML5
- CSS3
- JavaScript ES modules
- Leaflet
- OpenStreetMap
- Browser Geolocation API
- Metropolia Restaurant REST API

## Project structure

- `index.html` contains the application layout and dialogs.
- `styles.css` provides the visual design and responsive layout.
- `main.js` initializes the application features.
- `restaurants.js` manages restaurant loading, search, map markers, and location selection.
- `menu.js` loads and displays daily and weekly menus.
- `auth.js` handles registration, login, logout, and account settings.
- `favorites.js` manages favorite restaurant actions.
- `location.js` calculates the nearest restaurant from the user's coordinates.
- `session.js` stores and retrieves the authenticated browser session.
- `api.js` contains shared API endpoints and request helpers.

## External services

This project depends on the Metropolia Restaurant API and OpenStreetMap. Availability and content depend on those services and on network access.
