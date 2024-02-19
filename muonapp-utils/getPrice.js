const dotenv = require('dotenv');
const axios = require('axios');

// Load environment variables from .env file
dotenv.config();

// Function to fetch price from API
async function fetchPriceFromAPI(config, symbol) {
    const url = `${config.url_before_asset}${symbol}${config.url_after_asset}`;
    try {
        const response = await axios.get(url);
        const data = Array.isArray(response.data) ? response.data[0] : response.data;

        const bid = parseFloat(data[config.bid_field]);
        const ask = parseFloat(data[config.ask_field]);
        if (isNaN(bid) || isNaN(ask) || bid <= 0 || ask <= 0 || ask < bid) {
            console.error(`Invalid price data: `, { bid, ask });
            return null;
        }

        return {
            bid,
            ask
        };
    } catch (error) {
        console.error(`Error fetching price from API: `, error);
        return null;
    }
}

// Load API configs from environment variables
function loadApiConfigsForType(assetType) {
    const allConfigs = JSON.parse(process.env.APPS_PIONERV1_VARS);
    const configs = [];
    const prefix = `API_${assetType.toUpperCase()}_`;

    for (const [key, value] of Object.entries(allConfigs)) {
        if (key.startsWith(prefix)) {
            const parts = key.substring(prefix.length).split('_');
            const apiIdentifier = parts[0];
            const attribute = parts.slice(1).join('_').toLowerCase();
            const existingConfig = configs.find(c => c.identifier === apiIdentifier);
            if (existingConfig) {
                existingConfig[attribute] = value;
            } else {
                configs.push({ identifier: apiIdentifier, [attribute]: value });
            }
        }
    }
    return configs;
}

// Main function to fetch price
async function fetchPrice(asset1, asset2) {
    const [asset1Config, asset2Config] = [
        loadApiConfigsForType(asset1.split('.')[0]),
        loadApiConfigsForType(asset2.split('.')[0])
    ];

    // Fetch prices for both assets
    const [price1, price2] = await Promise.all([
        fetchPriceFromAPI(asset1Config[0], asset1),
        fetchPriceFromAPI(asset2Config[0], asset2)
    ]);

    // Calculate pairBid price
    const pairBidPrice = price1.bid / price2.bid;

    // Print the pairBid price
    console.log(`Pair Bid Price for ${asset1}/${asset2}: ${pairBidPrice}`);
}

// Usage example
const asset1 = 'BTC.USD';
const asset2 = 'ETH.USD';
fetchPrice(asset1, asset2);
