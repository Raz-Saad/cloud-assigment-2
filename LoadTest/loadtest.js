const axios = require('axios');

// Define cuisines and regions
const cuisines = ['Italian', 'Indian', 'Pizza', 'Coffee', 'Barbecue'];
const regions = ['Center', 'North', 'South', 'East'];

// Function to generate a random restaurant name
function generateRandomName() {
    const adjectives = ['Purple', 'Yellow', 'Orange', 'Pink', 'Gray', 'Brown', 'Crimson', 'Violet', 'Indigo', 'Maroon'];
//const adjectives = ['Green', 'Blue', 'Red', 'White', 'Black', 'Golden', 'Silver'];
    const nouns = ['Dragon', 'Phoenix', 'Tiger', 'Bear', 'Lion', 'Eagle', 'Snake'];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adjective}_${noun}_Restaurant`;
}

// Array to store restaurant names for future tests
let restaurantNames = [];

// Function to generate restaurant data
function generateRestaurantData() {
    let restaurants = [];

    cuisines.forEach((cuisine) => {
        for (let i = 0; i < 1; i++) {
            const name = generateRandomName();
            const region = regions[Math.floor(Math.random() * regions.length)];
            const restaurant = {
                name: name,
                cuisine: cuisine,
                region: region
            };
            restaurants.push(restaurant);
            restaurantNames.push(name); // Save restaurant name for future tests
        }
    });

    return restaurants;
}

// Function to create restaurants via API
async function createRestaurants() {
    const restaurants = generateRestaurantData();

    try {
        for (const restaurant of restaurants) {
            await axios.post('http://Restau-LB8A1-X2i6k3D0KFio-1837702993.us-east-1.elb.amazonaws.com/restaurants', restaurant);
            console.log(`Created restaurant: ${restaurant.name}`);
        }
        console.log('All restaurants created successfully.');
    } catch (error) {
        console.error('Error creating restaurants:', error.message);
    }
}

// Function to rate restaurants via API
async function rateRestaurants() {
    try {
        for (const name of restaurantNames) {
            const rating = {
                name: name,
                rating: Math.floor(Math.random() * 5) + 1 // Random rating between 1 and 5
            };
            await axios.post('http://Restau-LB8A1-X2i6k3D0KFio-1837702993.us-east-1.elb.amazonaws.com/restaurants/rating', rating);
            console.log(`Rated restaurant ${name} with rating: ${rating.rating}`);
        }
        console.log('All restaurants rated successfully.');
    } catch (error) {
        console.error('Error rating restaurants:', error.message);
    }
}

// Function to delete a restaurant by name via API
async function deleteRestaurantByName(restaurantName) {
    try {
        const response = await axios.delete(`http://Restau-LB8A1-X2i6k3D0KFio-1837702993.us-east-1.elb.amazonaws.com/restaurants/${restaurantName}`);
        console.log(`Deleted restaurant: ${restaurantName}`);
        return response.data; // Assuming the API returns { success: true } upon successful deletion
    } catch (error) {
        console.error(`Error deleting restaurant ${restaurantName}:`, error.message);
        throw error;
    }
}

// Function to delete all restaurants
async function deleteAllRestaurants() {
    try {
        for (const name of restaurantNames) {
            await deleteRestaurantByName(name);
        }
        console.log('All restaurants deleted successfully.');
    } catch (error) {
        console.error('Error deleting restaurants:', error.message);
    }
}

// Function to perform load testing and calculate average response time
async function calculateAverageResponseTime() {
    const http = require('http');
    const agent = new http.Agent({ keepAlive: true, maxSockets: Infinity });
    const endpoint = 'http://Restau-LB8A1-X2i6k3D0KFio-1837702993.us-east-1.elb.amazonaws.com';

    const requestCount = 2; // Adjust as needed
    const concurrencyLevel = 1; // Adjust as needed
    const tasks = Array.from({ length: requestCount }, () => makeRequest(endpoint, agent));

    let totalDuration = 0;
    try {
        const results = await Promise.all(tasks);
        results.forEach(duration => {
            totalDuration += duration;
        });
        const averageDuration = totalDuration / requestCount;
        console.log(`Average Response Time: ${averageDuration.toFixed(2)} ms`);
    } catch (error) {
        console.error('Error in load testing:', error);
    }
}

// Helper function to make a request and measure duration
function makeRequest(endpoint, agent) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        axios.get(endpoint, { httpAgent: agent })
            .then(response => {
                const endTime = Date.now();
                const duration = endTime - startTime;
                console.log(`Response status: ${response.status}, Time Taken: ${duration} ms`);
                resolve(duration);
            })
            .catch(error => {
                const endTime = Date.now();
                const duration = endTime - startTime;
                console.error(`Error: ${error.response ? error.response.status : error.message}, Time Taken: ${duration} ms`);
                reject(error);
            });
    });
}

// Orchestrate the flow of creating restaurants, rating them, load testing, and deleting them
createRestaurants()
    .then(rateRestaurants)
    .then(calculateAverageResponseTime)
    .then(deleteAllRestaurants)
    .catch(error => {
        console.error('An error occurred:', error.message);
    });