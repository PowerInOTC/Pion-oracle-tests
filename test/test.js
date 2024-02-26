//test.js
const { makeApiCalls } = require('./proxyCall.js');
const { callPion } = require('./pionCall.js');

async function main() {

    const price = await makeApiCalls(11, "forex.AUDUSD", "forex.EURUSD");

    console.log(price);
    const baseParams = {
        requestAsset1: "forex.AUDUSD",
        requestAsset2: "forex.EURUSD",
        requestPairBid: price.pairBid,
        requestPairAsk: price.pairAsk,
        requestConfidence: price.confidence,
        requestSignTime: price.timestamp + 2000,
        requestPrecision: "11",
    };

    console.log(baseParams);
    callPion(baseParams);
}

main();
