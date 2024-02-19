const axios = require('axios');

// Set up your API endpoint and API keys
const apiEndpoint = 'https://api.example.com/stock/latestQuotes'; // This URL is an example; use the actual URL
const apiKey = 'YOUR_API_KEY'; // Use your actual API key

// Configure headers for axios request
const config = {
    headers: {
        'Authorization': `Bearer ${apiKey}` // Adjust if the API uses a different auth method
    },
    params: {
        feed: 'sip' // Assuming 'feed' is a query parameter
    }
};

// Make the GET request
axios.get(apiEndpoint, config)
    .then(response => {
        console.log(response.data);
    })
    .catch(error => {
        console.error('Error fetching data:', error);
    });
