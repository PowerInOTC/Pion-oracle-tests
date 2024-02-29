const { makeApiCalls } = require('./proxyCall.js');

async function getSign(asset1, asset2, Precision) {
    let price;

    while (!price || price.pairBid === undefined) {
        price = await makeApiCalls(200000, 5, asset1, asset2);
    }

    const baseParams = {
        requestAsset1: asset1,
        requestAsset2: asset2,
        requestPairBid: price.pairBid,
        requestPairAsk: price.pairAsk,
        requestConfidence: 1e-3,
        requestSignTime: price.timestamp + 2000,
        requestPrecision: Precision,
        maxtimestampdiff: 200000,
    };

    const { requestAsset1, requestAsset2, requestPairBid, requestPairAsk, requestConfidence, requestSignTime, requestPrecision, maxtimestampdiff } = baseParams;

    const url = `http://localhost:3000/v1/?app=pionerV1_oracle&method=price&params[requestAsset1]=${requestAsset1}&params[requestAsset2]=${requestAsset2}&params[requestPairBid]=${requestPairBid}&params[requestPairAsk]=${requestPairAsk}&params[requestConfidence]=${requestConfidence}&params[requestSignTime]=${requestSignTime}&params[requestPrecision]=${requestPrecision}&params[maxtimestampdiff]=${maxtimestampdiff}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
        return null;
    }
}

module.exports = { getSign };
