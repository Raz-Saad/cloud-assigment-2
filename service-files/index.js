const express = require('express');
const RestaurantsMemcachedActions = require('./model/restaurantsMemcachedActions');

const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const app = express();
app.use(express.json());

const MEMCACHED_CONFIGURATION_ENDPOINT = process.env.MEMCACHED_CONFIGURATION_ENDPOINT;
const TABLE_NAME = process.env.TABLE_NAME;
const AWS_REGION = process.env.AWS_REGION;
const USE_CACHE = process.env.USE_CACHE === 'true';

const memcachedActions = new RestaurantsMemcachedActions(MEMCACHED_CONFIGURATION_ENDPOINT);
const DbTableName = 'RestaurantsCdkStack-RestaurantsE94BF231-1RALB2YUXCB28'
app.get('/', (req, res) => {
    const response = {
        MEMCACHED_CONFIGURATION_ENDPOINT: MEMCACHED_CONFIGURATION_ENDPOINT,
        TABLE_NAME: TABLE_NAME,
        AWS_REGION: AWS_REGION,
        USE_CACHE: USE_CACHE
    };
    res.send(response);
});

app.post('/restaurants', async (req, res) => {
    const { name, cuisine, region } = req.body;

    // DynamoDB parameters
    const params = {
        TableName: DbTableName,
        Item: {
            RestaurantName: name,
            Cuisine: cuisine,
            GeoRegion: region,
            Rating: 0, //initialize with 0 
            RatingCount: 0 //initialize with 0 
        },
        ConditionExpression: 'attribute_not_exists(RestaurantName)' // Ensure restaurant doesn't already exist
    };

    try {
        // put item into DynamoDB
        await dynamoDb.put(params).promise();

        // this code is for part B , adding cache mechanism 
        const restaurant = {
            name,
            cuisine,
            rating: 0,
            region
        };

        // updaing the cache
        const cacheKey = `Restaurant-${name}`;
        if (USE_CACHE) {
            await memcachedActions.addRestaurants(cacheKey, restaurant);
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error adding restaurant to DynamoDB:', error);
        if (error.code === 'ConditionalCheckFailedException') {
            res.status(409).json({ success: false, message: 'Restaurant already exists' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to add restaurant' });
        }
    }
});

app.get('/restaurants/:restaurantName', async (req, res) => {
    const restaurantName = req.params.restaurantName;
    const cacheKey = `Restaurant-${restaurantName}`;

    // this code is for part B , adding cache mechanism
    if (USE_CACHE) {
        const cachedRestaurant = await memcachedActions.getRestaurants(cacheKey);
        if (cachedRestaurant && cachedRestaurant.value !== undefined) {
            // parse the cached restaurant data and send it as JSON
            const cachedRestaurantData = JSON.parse(cachedRestaurant.value);
            return res.json(cachedRestaurantData);
        }
    }

    const params = {
        TableName: DbTableName,
        Key: {
            'RestaurantName': restaurantName
        }
    };

    try {
        const data = await dynamoDb.get(params).promise();

        if (!data.Item) {
            return res.status(404).send("Restaurant not found");
        }

        const { RestaurantName, Cuisine, Rating, GeoRegion } = data.Item;
        const restaurant = {
            name: RestaurantName,
            cuisine: Cuisine,
            rating: Rating,
            region: GeoRegion
        };

        // this code is for part B , adding cache mechanism - updaing the cache
        if (USE_CACHE) {
            await memcachedActions.addRestaurants(cacheKey, restaurant);
        }

        res.json(restaurant); // Return the restaurant data as JSON response
    } catch (error) {
        console.error('Error retrieving restaurant:', error);
        res.status(500).send("Error retrieving restaurant");
    }
});

app.delete('/restaurants/:restaurantName', async (req, res) => {
    const restaurantName = req.params.restaurantName;

    const params = {
        TableName: DbTableName,
        Key: {
            'RestaurantName': restaurantName
        }
    };

    try {
        const data = await dynamoDb.delete(params).promise();

        // this code is for part B , adding cache mechanism
        const cacheKey = `Restaurant-${restaurantName}`;
        if (USE_CACHE) {
            await memcachedActions.deleteRestaurants(cacheKey);
        }

        //check the response data for validation
        console.log('DeleteItem succeeded:', JSON.stringify(data, null, 2));

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting restaurant:', error);
        res.status(500).send("Error deleting restaurant");
    }
});

app.post('/restaurants/rating', async (req, res) => {
    const restaurantName = req.body.name;
    const rating = req.body.rating;

    // Retrieve current restaurant data
    const getParams = {
        TableName: DbTableName,
        Key: {
            'RestaurantName': restaurantName
        }
    };

    try {
        const data = await dynamoDb.get(getParams).promise();

        if (!data.Item) {
            return res.status(404).send("Restaurant not found");
        }

        const currentRating = data.Item.Rating || 0; // Get current rating, default to 0 if not set
        const currentRatingCount = data.Item.RatingCount || 0; // Get current rating count, default to 0 if not set

        // Calculate new average rating
        const newRatingCount = currentRatingCount + 1;
        const newRating = ((currentRating * currentRatingCount) + rating) / newRatingCount;

        // Update restaurant with new rating
        const updateParams = {
            TableName: DbTableName,
            Key: {
                'RestaurantName': restaurantName
            },
            UpdateExpression: 'SET Rating = :rating, RatingCount = :ratingCount',
            ExpressionAttributeValues: {
                ':rating': newRating,
                ':ratingCount': newRatingCount
            }
        };

        await dynamoDb.update(updateParams).promise();

        res.json({ success: true });
    } catch (error) {
        console.error('Error adding rating to restaurant:', error);
        res.status(500).send("Error adding rating to restaurant");
    }
});

app.get('/restaurants/cuisine/:cuisine', async (req, res) => {
    const cuisine = req.params.cuisine;
    const ratingGreaterThan = req.query.ratingGreaterThan; // get rating threshold from query parameter
    let limit = req.query.limit; // optional query parameter for limiting results

    try {
        // Ensure the limit is within the range of 10 to 100
        if (limit) {
            limit = parseInt(limit, 10);
            if (limit < 10) {
                limit = 10;
            } else if (limit > 100) {
                limit = 100;
            }
        } else {
            limit = 10; // default limit to 10
        }

        let queryParams = {
            TableName: DbTableName,
            IndexName: 'CuisineGSI',
            KeyConditionExpression: 'Cuisine = :cuisine',
            ExpressionAttributeValues: {
                ':cuisine': cuisine
            },
            ScanIndexForward: false, // sort by rating descending
            Limit: limit
        };

        // Add filter condition for rating greater than a specified value if provided
        if (ratingGreaterThan) {
            queryParams.FilterExpression = 'Rating > :rating';
            queryParams.ExpressionAttributeValues[':rating'] = parseFloat(ratingGreaterThan); // Convert string to number
        }

        const data = await dynamoDb.query(queryParams).promise();

        if (!data.Items || data.Items.length === 0) {
            return res.status(404).json({ error: 'No restaurants found for the specified cuisine and rating criteria' });
        }

        // Map the items to the desired response format
        const restaurants = data.Items.map(item => ({
            name: item.RestaurantName,
            cuisine: item.Cuisine,
            rating: item.Rating,
            region: item.GeoRegion
        }));

        res.json(restaurants);
    } catch (error) {
        console.error('Error fetching top restaurants by cuisine and rating:', error);
        res.status(500).json({ error: 'Failed to fetch top restaurants by cuisine and rating criteria' });
    }
});

app.get('/restaurants/region/:region', async (req, res) => {
    const region = req.params.region;
    let limit = req.query.limit;

    try {
        // Ensure the limit is within the range of 10 to 100
        if (limit) {
            limit = parseInt(limit, 10);
            if (limit < 10) {
                limit = 10;
            } else if (limit > 100) {
                limit = 100;
            }
        } else {
            limit = 10; // default limit to 10
        }

        const queryParams = {
            TableName: DbTableName,
            IndexName: 'GeoRegionGSI', // Assuming 'GeoRegionGSI' is the Global Secondary Index for GeoRegion
            KeyConditionExpression: 'GeoRegion = :region',
            ExpressionAttributeValues: {
                ':region': region
            },
            ScanIndexForward: false, // Sort by rating descending
            Limit: limit
        };

        const data = await dynamoDb.query(queryParams).promise();

        if (!data.Items || data.Items.length === 0) {
            return res.status(404).json({ error: 'No restaurants found for the specified region' });
        }

        const restaurants = data.Items.map(item => ({
            name: item.RestaurantName,
            cuisine: item.Cuisine,
            rating: item.Rating,
            region: item.GeoRegion
        }));

        res.json(restaurants);
    } catch (error) {
        console.error('Error fetching top restaurants by region:', error);
        res.status(500).json({ error: 'Failed to fetch top restaurants by region' });
    }
});

app.get('/restaurants/region/:region/cuisine/:cuisine', async (req, res) => {
    const region = req.params.region;
    const cuisine = req.params.cuisine;
    let limit = req.query.limit;

    try {
        // Ensure the limit is within the range of 10 to 100
        if (limit) {
            limit = parseInt(limit, 10);
            if (limit < 10) {
                limit = 10;
            } else if (limit > 100) {
                limit = 100;
            }
        } else {
            limit = 10; // default limit to 10
        }

        const queryParams = {
            TableName: DbTableName,
            IndexName: 'GeoRegionGSI',
            KeyConditionExpression: 'GeoRegion = :region',
            FilterExpression: 'Cuisine = :cuisine',
            ExpressionAttributeValues: {
                ':region': region,
                ':cuisine': cuisine
            },
            ScanIndexForward: false, // sort by rating descending
            Limit: limit
        };

        const data = await dynamoDb.query(queryParams).promise();

        if (!data.Items || data.Items.length === 0) {
            return res.status(404).json({ error: 'No restaurants found for the specified region and cuisine' });
        }

        const restaurants = data.Items.map(item => ({
            name: item.RestaurantName,
            cuisine: item.Cuisine,
            rating: item.Rating,
            region: item.GeoRegion
        }));

        res.json(restaurants);
    } catch (error) {
        console.error('Error fetching top restaurants by region and cuisine:', error);
        res.status(500).json({ error: 'Failed to fetch top restaurants by region and cuisine' });
    }
});

app.listen(80, () => {
    console.log('Server is running on http://localhost:80');
});

module.exports = { app };