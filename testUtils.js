const axios = require('axios');
const BigNumber = require('bignumber.js');

async function prepareRequestParams(assetName) {
    const apiKey = "26af8bd5b8c32ba09c0ad04fbd522441";
    let url, route;

    if (assetName.startsWith('fx.')) {
        const pair = assetName.substring(3).toUpperCase();
        url = `https://financialmodelingprep.com/api/v4/forex/last/${pair}?apikey=${apiKey}`;
        route = '/v1/fx';
    } else if (assetName.startsWith('usstock.')) {
        const symbol = assetName.substring(8).toUpperCase();
        url = `https://fmpcloud.io/api/v3/quote/${symbol}?apikey=${apiKey}`;
        route = '/v1/stock';
    } else if (assetName === 'hardusd') {
        const priceBN = new BigNumber('1e18').toString();
        const requestSignTime = Math.floor(Date.now() / 1000).toString();
        return { route: '/v1/hardusd', requestBid: priceBN, requestAsk: priceBN, requestSignTime };
    } else {
        throw new Error('Unsupported asset type');
    }

    try {
        const response = await axios.get(url);
        const data = assetName.startsWith('fx.') ? response.data : response.data[0];

        let requestBid, requestAsk, requestSignTime;
        if (assetName.startsWith('fx.')) {
            requestBid = new BigNumber(data.bid).toString();
            requestAsk = new BigNumber(data.ask).toString();
            requestSignTime = data.timestamp.toString();
        } else if (assetName.startsWith('usstock.')) {
            const priceBN = new BigNumber(data.price).toString();
            requestBid = requestAsk = priceBN;
            requestSignTime = Math.floor(Date.now() / 1000).toString();
        }

        return { route, requestBid, requestAsk, requestSignTime };
    } catch (error) {
        console.error('Failed to fetch financial data:', error);
        throw error;
    }
}


async function getPrice(asset1Name, asset2Name) {
    try {
        const asset1Response = await prepareRequestParams(asset1Name);
        const asset2Response = await prepareRequestParams(asset2Name);

        const asset1Bid = asset1Response.requestBid / asset2Response.requestBid;
        const asset2Ask = asset1Response.requestAsk / asset2Response.requestAsk;

        const asset1BidBigInt = BigInt(Math.round(asset1Bid * 1e18));
        const asset2AskBigInt = BigInt(Math.round(asset2Ask * 1e18));

        const oldestTimestamp = Math.min(asset1Response.requestSignTime, asset2Response.requestSignTime) * 1000;

        return { 
            asset1Bid: asset1BidBigInt.toString(), 
            asset2Ask: asset2AskBigInt.toString(), 
            oldestTimestamp
        };
    } catch (error) {
        console.error('Error fetching asset prices:', error);
        throw error;
    }
}




async function fetchPriceData(params) {
    const body = {
        app: "pionerV1_oracle",
        method: "price",
        params: params
    };
  
    try {
        const response = await fetch('http://localhost:3000/v1/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
  
        const responseData = await response.json();
  
        if (responseData && responseData.result && responseData.result.data) {
            console.log("Data within response.result.data:", JSON.stringify(responseData.result.data));
        } else {
            console.log("No data found in response");
        }
    } catch (error) {
        console.error("Error fetching price data:", error);
    }
  }
  

module.exports = { getPrice, fetchPriceData };
