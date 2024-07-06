const axios = require('axios');
const { Console } = require('console');

// Define cuisines and regions
const cuisines = ['Italian', 'Indian', 'Pizza', 'Coffee', 'Barbecue'];
const regions = ['Center', 'North', 'South', 'East'];
const endpoint = 'http://Restau-LB8A1-qlnmVvcwBmQj-1834180061.us-east-1.elb.amazonaws.com'

// Function to generate a random restaurant name
function generateRandomName() {
    const adjectives = ['Green', 'Blue', 'Red', 'White', 'Black', 'Golden', 'Silver','Purple', 'Yellow', 'Orange', 'Pink', 'Gray', 'Brown', 'Crimson', 'Violet', 'Indigo'];
    const nouns = ['Dragon', 'Phoenix', 'Tiger', 'Bear', 'Lion', 'Eagle', 'Snake'];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNum = Math.floor(Math.random() * 1000000) + 1;
    return `${adjective}_${noun}_Restaurant_${randomNum}`;
}

// Array to store restaurant names for future tests
let restaurantNames = [];

// Function to generate restaurant data
function generateRestaurantData() {
    let restaurants = [];

    cuisines.forEach((cuisine) => {
        for (let i = 0; i < 10; i++) {
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
            await axios.post(`${endpoint}/restaurants`, restaurant);
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
            await axios.post(`${endpoint}/restaurants/rating`, rating);
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
        const response = await axios.delete(`${endpoint}/restaurants/${restaurantName}`);
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
    
    const requestCount = 100; // Adjust as needed
    const tasks = Array.from({ length: requestCount }, () => makeRequest(agent));

    try {

        const results = await Promise.all(tasks);
        let totalDuration = 0;
        let totalRequestCount = 0;

        results.forEach(result => {
            totalDuration += result.totalDuration;
            totalRequestCount += result.apiCount;
        });

        const averageDuration = totalDuration / totalRequestCount;
        console.log(`Average Response Time: ${averageDuration.toFixed(2)} ms`);
    } catch (error) {
        console.error('Error in load testing:', error);
    }
}

// this function helps for getting a random element from any array
function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getRandomNumberBetweenOneToThree() {
    return Math.floor(Math.random() * 3) + 1;
}

// Helper function to make a request and measure duration
function makeRequest(agent) {
    return new Promise(async (resolve, reject) => {
        try {
            const apis = [
                `${endpoint}/restaurants/cuisine/${getRandomElement(cuisines)}`,
                `${endpoint}/restaurants/region/${getRandomElement(regions)}`,
                `${endpoint}/restaurants/region/${getRandomElement(regions)}/cuisine/${getRandomElement(cuisines)}`,
                `${endpoint}/restaurants/cuisine/${getRandomElement(cuisines)}?ratingGreaterThan=${getRandomNumberBetweenOneToThree()}`,
                `${endpoint}/restaurants/cuisine/${getRandomElement(cuisines)}?limit=5`,
                `${endpoint}/restaurants/region/${getRandomElement(regions)}?limit=5`,
                `${endpoint}/restaurants/${getRandomElement(restaurantNames)}`
            ];
            
            const durations = [];
            for (const api of apis) {
                const startTime = Date.now();
                await axios.get(api, { agent });
                const endTime = Date.now();
                const duration = endTime - startTime;
                durations.push(duration);
                console.log(`Response from ${api}, Time Taken: ${duration} ms`);
            }
            
            const totalDuration = durations.reduce((acc, cur) => acc + cur, 0);
            const apiCount = apis.length;
            resolve({ totalDuration, apiCount });
            
        } catch (error) {
            console.error(`Error: ${error.response ? error.response.status : error.message}`);
            reject(error);
        }
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