const { makeApiCalls } = require('./proxyCall.js');
const { callPionTest } = require('./pionCallTest.js');

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
    const requestAsset1 = baseParams.requestAsset1;
    const requestAsset2 = baseParams.requestAsset2;
    const requestPairBid = baseParams.requestPairBid;
    const requestPairAsk = baseParams.requestPairAsk;
    const requestConfidence = baseParams.requestConfidence;
    const requestSignTime = baseParams.requestSignTime;
    const requestPrecision = baseParams.requestPrecision;
    const maxtimestampdiff = baseParams.maxtimestampdiff;

    //url with parameters
    // http://127.0.0.1:3000/v1/?app=pionerV1_oracle&method=price&params[requestAsset1]=requestAsset1&params[requestAsset2]=requestAsset2&params[requestPairBid]=requestPairBid&params[requestPairAsk]=requestPairAsk&params[requestConfidence]=requestConfidence&params[requestSignTime]=requestSignTime&params[requestPrecision]=requestPrecision&params[maxtimestampdiff]=maxtimestampdiff
    
    callPionTest(baseParams);
}

main();
