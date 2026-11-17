// Request the user's position and report the nearest valid restaurant through callbacks.
export function findNearestRestaurant(restaurants, onNearest, onError) {
  if (!navigator.geolocation) {
    onError('Location is not supported by this browser.');
    return;
  }

  if (restaurants.length === 0) {
    onError('Restaurants are still loading. Please try again shortly.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    position => {
      const nearestRestaurant = getNearestRestaurant(
        restaurants,
        position.coords.latitude,
        position.coords.longitude,
      );
      if (!nearestRestaurant) {
        onError('No restaurant with valid location data was found.');
        return;
      }
      onNearest(nearestRestaurant);
    },
    error => {
      const errorMessage = error.code === 1
        ? 'Location permission was denied. Allow location access to find the nearest restaurant.'
        : error.code === 2
          ? 'Your location is currently unavailable. Please try again.'
          : 'The location request timed out. Please try again.';
      onError(errorMessage);
    },
    {enableHighAccuracy: true, timeout: 10000, maximumAge: 300000},
  );
}

// Compare all restaurants with valid coordinates and return the closest one.
function getNearestRestaurant(restaurants, latitude, longitude) {
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

// Calculate the great-circle distance between two latitude/longitude coordinates.
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

// Convert degrees to radians for the trigonometric distance calculation.
function toRadians(degrees) {
  return degrees * Math.PI / 180;
}
