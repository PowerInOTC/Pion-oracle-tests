const { getSign } = require('./getSign.js');

async function example() {
    const asset1 = "stock.nasdaq.AAPL";
    const asset2 = "forex.EURUSD";
    const requestPrecision = 18;

    try {
        const signData = await getSign(asset1, asset2, requestPrecision);
        console.log(signData.result.data);
    } catch (error) {
        console.error('Error occurred during sign retrieval:', error);
    }
}

example();
