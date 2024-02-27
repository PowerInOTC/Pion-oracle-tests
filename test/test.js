const { makeApiCalls } = require('./proxyCall.js');
const { callPion } = require('./pionCall.js');

async function main() {
    let price;

    while (!price || price.pairBid === undefined) {
        price = await makeApiCalls(200000, 5, "forex.AUDUSD", "forex.EURUSD");
    }

    const baseParams = {
        requestAsset1: "forex.AUDUSD",
        requestAsset2: "forex.EURUSD",
        requestPairBid: price.pairBid,
        requestPairAsk: price.pairAsk,
        requestConfidence: 1e-3,
        requestSignTime: price.timestamp + 2000,
        requestPrecision: 18,
        maxtimestampdiff: 200000,
    };

    callPion(baseParams);
}

main();
