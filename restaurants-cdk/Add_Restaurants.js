const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({ region: 'us-east-1' }); 

// Create a DynamoDB Document Client
const dynamoDb = new AWS.DynamoDB.DocumentClient();

// Function to add a new restaurant to DynamoDB
// async function addRestaurant(restaurantName, cuisine, rating, geoRegion) {
//   const params = {
//     TableName: 'RestaurantsCdkStack-RestaurantsE94BF231-1RALB2YUXCB28',
//     Item: {
//       'RestaurantName': restaurantName,
//       'Cuisine': cuisine,
//       'Rating': rating,
//       'GeoRegion': geoRegion
//     }
//   };

//   try {
//     await dynamoDb.put(params).promise();
//     console.log(`Successfully added restaurant ${restaurantName} to DynamoDB`);
//   } catch (error) {
//     console.error('Error adding restaurant to DynamoDB:', error);
//     throw error;
//   }
// }

// const restaurantData = {
//   restaurantName: 'CafeRaz',
//   cuisine: 'Cafe',
//   rating: 4.8,
//   geoRegion: 'Center'
// };

// // Call addRestaurant function with provided data
// addRestaurant(restaurantData.restaurantName, restaurantData.cuisine, restaurantData.rating, restaurantData.geoRegion)
//   .then(() => {
//     console.log('Restaurant added successfully!');
//   })
//   .catch(error => {
//     console.error('Error adding restaurant:', error);
//   });

  // Define parameters for delete operation
const params = {
  TableName: 'RestaurantsCdkStack-RestaurantsE94BF231-1RALB2YUXCB28', // Replace with your DynamoDB table name
  Key: {
    'RestaurantName': 'CafeRaz' // Replace with the RestaurantName you want to delete
  }
};

// Call DynamoDB to delete the item
dynamoDb.delete(params, (err, data) => {
  if (err) {
    console.error('Unable to delete item. Error JSON:', JSON.stringify(err, null, 2));
  } else {
    console.log('DeleteItem succeeded:', JSON.stringify(data, null, 2));
  }
});
