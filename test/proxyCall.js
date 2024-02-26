//proxyCall.js
const axios = require('axios');
require('dotenv').config();

async function makeApiCalls(abPrecision, asset1, asset2) {
    try {
        const proxyVars = process.env.APPS_PIONERV1_VARS;
        const proxies = JSON.parse(proxyVars);

        const responsePromises = [];
        for (let i = 1; i <= parseInt(proxies.PROXY_NUMBERS); i++) {
            const proxy = proxies[`PROXY${i}`];
            const apiKey = proxies[`PROXY${i}KEY`];

            const apiUrl = `${proxy}${apiKey}&abprecision=${abPrecision}&confprecision=${abPrecision}&a=${asset1}&b=${asset2}`;

            const timeoutConfig = { timeout: 500 };

            responsePromises.push(axios.get(apiUrl, timeoutConfig).then(response => {
                if (response.status === 200) {
                    const { pairBid, pairAsk, confidence, timestamp } = response.data;
                    const numericPairBid = parseFloat(pairBid);
                    const numericPairAsk = parseFloat(pairAsk);
                    const numericConfidence = parseFloat(confidence);
                    const numericTimestamp = parseFloat(timestamp);

                    if (!isNaN(numericPairBid) &&
                        !isNaN(numericPairAsk) &&
                        !isNaN(numericConfidence) &&
                        !isNaN(numericTimestamp)) {
                        return { ...response, data: { ...response.data, pairBid: numericPairBid, pairAsk: numericPairAsk, confidence: numericConfidence, timestamp: numericTimestamp } };
                    } else {
                        console.log(`Invalid data from Proxy ${i}.`);
                        return null;
                    }
                } else {
                    console.log(`Invalid response status from Proxy ${i}. Status: ${response.status}`);
                    return null;
                }
            }).catch(error => {
                console.error(`Error with Proxy ${i}:`, error.message);
                return null;
            }));
        }

        const responses = await Promise.all(responsePromises);

        const validResponses = responses.filter(response => response !== null);
        if ( validResponses.length > 0 ) {
            let averageTimestamp = 0;
            let averagePairBid = 0;
            let averagePairAsk = 0;
            let averageConfidence = 0;

            for (const response of validResponses) {
                const { timestamp, pairBid, pairAsk, confidence } = response.data;

                averageTimestamp += timestamp;
                averagePairBid += pairBid;
                averagePairAsk += pairAsk;
                averageConfidence += confidence;
            }

            averageTimestamp /= validResponses.length;
            averagePairBid /= validResponses.length;
            averagePairAsk /= validResponses.length;
            averageConfidence /= validResponses.length;

            let closestDistance = Infinity;
            let closestResponse = null;

            for (const response of validResponses) {
                const { timestamp, pairBid, pairAsk, confidence } = response.data;

                const distance = Math.abs(timestamp - averageTimestamp) +
                                 Math.abs(pairBid - averagePairBid) +
                                 Math.abs(pairAsk - averagePairAsk) +
                                 Math.abs(confidence - averageConfidence);

                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestResponse = response.data;
                }
            }

            return closestResponse;
        }
    } catch (error) {
        console.error('Error making API calls:', error);
    }
}

// Example usage:
const abPrecision = 11;
const asset1 = 'forex.EURUSD';
const asset2 = 'forex.AUDUSD';

makeApiCalls(abPrecision, asset1, asset2).then(result => {
    console.log("Result:", result);
});

module.exports = { makeApiCalls };