// API Key for OpenWeatherMap
const API_KEY = '5f472b7acba333cd8a035ea85a0d4d4c'; // OpenWeatherMap API key (free tier)

// DOM Elements
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const locationStatus = document.getElementById('location-status');
const loadingSpinner = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const currentWeather = document.getElementById('current-weather');
const forecastContainer = document.getElementById('forecast-container');
const additionalInfo = document.getElementById('additional-info');
const celsiusBtn = document.getElementById('celsius-btn');
const fahrenheitBtn = document.getElementById('fahrenheit-btn');

// Weather data storage
let weatherData = null;
let units = 'metric'; // Default to Celsius

// Initialize autocomplete for Indian cities
$(document).ready(function() {
    $("#city-input").autocomplete({
        source: indianCities,
        minLength: 1,
        select: function(event, ui) {
            setTimeout(() => {
                searchBtn.click();
            }, 100);
        }
    }).autocomplete("instance")._renderItem = function(ul, item) {
        return $("<li>")
            .append("<div class='autocomplete-item'>" + item.label + "</div>")
            .appendTo(ul);
    };
});

// Event Listeners
searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        getWeatherByCity(city);
    } else {
        showError('Please enter a city name');
    }
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchBtn.click();
    }
});

locationBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        showLoading();
        locationStatus.textContent = "Requesting location access...";
        locationStatus.classList.remove('d-none', 'text-danger', 'text-success');
        locationStatus.classList.add('text-muted');
        
        const locationTimeout = setTimeout(() => {
            hideLoading();
            locationStatus.textContent = "Location request timed out. Please try again or search by city name.";
            locationStatus.classList.remove('text-muted');
            locationStatus.classList.add('text-danger');
        }, 10000);
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                clearTimeout(locationTimeout);
                const { latitude, longitude } = position.coords;
                locationStatus.textContent = "Location found! Fetching weather data...";
                locationStatus.classList.remove('text-danger', 'text-muted');
                locationStatus.classList.add('text-success');
                getWeatherByCoordinates(latitude, longitude);
                
                setTimeout(() => {
                    locationStatus.classList.add('d-none');
                }, 3000);
            },
            (error) => {
                clearTimeout(locationTimeout);
                hideLoading();
                locationStatus.classList.remove('text-muted');
                locationStatus.classList.add('text-danger');
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        locationStatus.textContent = "Location access was denied. Please enable location services in your browser settings.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        locationStatus.textContent = "Location information is unavailable. Please try searching by city name.";
                        break;
                    case error.TIMEOUT:
                        locationStatus.textContent = "Location request timed out. Please try again or search by city name.";
                        break;
                    default:
                        locationStatus.textContent = "An unknown error occurred while getting location. Please try searching by city name.";
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    } else {
        showError('Geolocation is not supported by your browser. Please search by city name.');
    }
});

celsiusBtn.addEventListener('click', () => {
    if (units !== 'metric') {
        units = 'metric';
        updateTemperatureDisplay();
        celsiusBtn.classList.remove('btn-outline-light');
        celsiusBtn.classList.add('btn-light');
        fahrenheitBtn.classList.remove('btn-light');
        fahrenheitBtn.classList.add('btn-outline-light');
    }
});

fahrenheitBtn.addEventListener('click', () => {
    if (units !== 'imperial') {
        units = 'imperial';
        updateTemperatureDisplay();
        fahrenheitBtn.classList.remove('btn-outline-light');
        fahrenheitBtn.classList.add('btn-light');
        celsiusBtn.classList.remove('btn-light');
        celsiusBtn.classList.add('btn-outline-light');
    }
});

// Functions
function getWeatherByCity(city) {
    showLoading();
    hideError();
    
    // Add "India" to the search query for better results with Indian cities
    const searchQuery = indianCities.includes(city) ? `${city},IN` : city;
    
    fetch(`https://api.openweathermap.org/data/2.5/weather?q=${searchQuery}&units=${units}&appid=${API_KEY}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('City not found. Please check the spelling or try another city.');
            }
            return response.json();
        })
        .then(data => {
            weatherData = data;
            displayCurrentWeather(data);
            getForecast(data.coord.lat, data.coord.lon);
            
            // Save to localStorage
            localStorage.setItem('lastCity', city);
        })
        .catch(error => {
            hideLoading();
            showError(error.message);
        });
}

function getWeatherByCoordinates(lat, lon) {
    showLoading();
    hideError();
    
    // First, get the city name from coordinates using reverse geocoding
    fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Unable to find location name.');
            }
            return response.json();
        })
        .then(geoData => {
            if (geoData.length > 0) {
                const cityName = geoData[0].name;
                cityInput.value = cityName;
                
                // Save to localStorage
                localStorage.setItem('lastCity', cityName);
            }
            
            // Then get the weather data
            return fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${units}&appid=${API_KEY}`);
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Unable to fetch weather data for this location.');
            }
            return response.json();
        })
        .then(data => {
            weatherData = data;
            displayCurrentWeather(data);
            getForecast(lat, lon);
        })
        .catch(error => {
            hideLoading();
            showError(error.message);
        });
}

function getForecast(lat, lon) {
    fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${units}&appid=${API_KEY}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Unable to fetch forecast data.');
            }
            return response.json();
        })
        .then(data => {
            displayForecast(data);
            hideLoading();
        })
        .catch(error => {
            hideLoading();
            showError('Error fetching forecast data. Please try again.');
        });
}

function displayCurrentWeather(data) {
    // Show the weather card
    currentWeather.classList.remove('d-none');
    additionalInfo.classList.remove('d-none');
    
    // Set background based on weather condition
    setWeatherBackground(data.weather[0].main);
    
    // Update weather information
    document.getElementById('city-name').textContent = `${data.name}, ${data.sys.country}`;
    document.getElementById('current-date').textContent = formatDate(new Date());
    document.getElementById('weather-icon').src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;
    document.getElementById('weather-description').textContent = capitalizeFirstLetter(data.weather[0].description);
    document.getElementById('temperature').textContent = `${Math.round(data.main.temp)}°${units === 'metric' ? 'C' : 'F'}`;
    document.getElementById('wind-speed').textContent = `${data.wind.speed} ${units === 'metric' ? 'm/s' : 'mph'}`;
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;
    
    // Additional info
    document.getElementById('sunrise-time').textContent = formatTime(data.sys.sunrise * 1000);
    document.getElementById('sunset-time').textContent = formatTime(data.sys.sunset * 1000);
    document.getElementById('visibility').textContent = `${(data.visibility / 1000).toFixed(1)} km`;
    document.getElementById('feels-like').textContent = `${Math.round(data.main.feels_like)}°${units === 'metric' ? 'C' : 'F'}`;
}

function displayForecast(data) {
    // Show the forecast container
    forecastContainer.classList.remove('d-none');
    
    // Get forecast data for next 5 days (at noon)
    const forecastRow = document.getElementById('forecast-row');
    forecastRow.innerHTML = '';
    
    // Filter forecast data to get one entry per day (at noon)
    const dailyForecasts = {};
    
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const day = date.toDateString();
        
        // If we don't have this day yet, or if this entry is closer to noon than the one we have
        if (!dailyForecasts[day] || Math.abs(date.getHours() - 12) < Math.abs(new Date(dailyForecasts[day].dt * 1000).getHours() - 12)) {
            dailyForecasts[day] = item;
        }
    });
    
    // Take only the next 5 days
    Object.values(dailyForecasts).slice(0, 5).forEach(forecast => {
        const date = new Date(forecast.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const temp = Math.round(forecast.main.temp);
        const icon = forecast.weather[0].icon;
        const description = forecast.weather[0].description;
        
        const forecastItem = document.createElement('div');
        forecastItem.className = 'col forecast-item mx-1';
        forecastItem.innerHTML = `
            <h5>${dayName}</h5>
            <img src="https://openweathermap.org/img/wn/${icon}.png" alt="${description}">
            <p>${temp}°${units === 'metric' ? 'C' : 'F'}</p>
            <p class="small">${capitalizeFirstLetter(description)}</p>
        `;
        
        forecastRow.appendChild(forecastItem);
    });
}

function updateTemperatureDisplay() {
    if (!weatherData) return;
    
    // Fetch weather data again with new units
    getWeatherByCity(weatherData.name);
}

function setWeatherBackground(weatherMain) {
    // Remove all existing weather background classes
    currentWeather.classList.remove('weather-bg-clear', 'weather-bg-clouds', 'weather-bg-rain', 'weather-bg-snow');
    
    // Add appropriate class based on weather
    switch(weatherMain.toLowerCase()) {
        case 'clear':
            currentWeather.classList.add('weather-bg-clear');
            break;
        case 'clouds':
            currentWeather.classList.add('weather-bg-clouds');
            break;
        case 'rain':
        case 'drizzle':
        case 'thunderstorm':
            currentWeather.classList.add('weather-bg-rain');
            break;
        case 'snow':
            currentWeather.classList.add('weather-bg-snow');
            break;
        default:
            // Default gradient
            break;
    }
}

// Helper Functions
function formatDate(date) {
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function showLoading() {
    loadingSpinner.classList.remove('d-none');
    currentWeather.classList.add('d-none');
    forecastContainer.classList.add('d-none');
    additionalInfo.classList.add('d-none');
}

function hideLoading() {
    loadingSpinner.classList.add('d-none');
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('d-none');
}

function hideError() {
    errorMessage.classList.add('d-none');
}

// Initialize the app with a default city or user's location
window.addEventListener('load', () => {
    // Check if user has previously searched for a city
    const lastCity = localStorage.getItem('lastCity');
    
    if (lastCity) {
        cityInput.value = lastCity;
        getWeatherByCity(lastCity);
    } else {
        // Default city - Mumbai
        getWeatherByCity('Mumbai');
    }
});

// List of major Indian cities for autocomplete
const indianCities = [
    "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Ahmedabad", "Pune", "Surat", "Jaipur",
    "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal", "Visakhapatnam", "Pimpri-Chinchwad", "Patna", "Vadodara",
    "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Kalyan-Dombivli", "Vasai-Virar", "Varanasi",
    "Srinagar", "Aurangabad", "Dhanbad", "Amritsar", "Navi Mumbai", "Allahabad", "Ranchi", "Howrah", "Coimbatore", "Jabalpur",
    "Gwalior", "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota", "Guwahati", "Chandigarh", "Solapur", "Hubli-Dharwad",
    "Mysore", "Tiruchirappalli", "Bareilly", "Aligarh", "Tiruppur", "Gurgaon", "Moradabad", "Jalandhar", "Bhubaneswar", "Salem",
    "Warangal", "Mira-Bhayandar", "Thiruvananthapuram", "Bhiwandi", "Saharanpur", "Gorakhpur", "Guntur", "Bikaner", "Amravati", "Noida",
    "Jamshedpur", "Bhilai", "Cuttack", "Firozabad", "Kochi", "Nellore", "Bhavnagar", "Dehradun", "Durgapur", "Asansol",
    "Rourkela", "Nanded", "Kolhapur", "Ajmer", "Akola", "Gulbarga", "Jamnagar", "Ujjain", "Loni", "Siliguri"
    // More cities can be added as needed
];