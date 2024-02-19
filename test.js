const { getPrice, fetchPriceData } = require('./testUtils');

async function main() {
    const price = await getPrice("usstock.aapl", "fx.eurusd");

    const baseParams = {
        asset1: "usstock.aapl",
        asset2: "fx.eurusd",
        requestPairBid: price.asset1Bid,
        requestPairAsk: price.asset2Ask,
        requestConfidence: "1000000000000000000",
        requestSignTime: price.oldestTimestamp
    };

    console.log(baseParams);
    fetchPriceData(baseParams);

    const baseParams1 = {
      asset1: "usstock.aapl",
      asset2: "fx.eurusd",
      requestPairBid: price.asset1Bid,
      requestPairAsk: price.asset2Ask,
      requestConfidence: "10000000000000000000",
      requestSignTime: price.oldestTimestamp
  };
  //fetchPriceData(baseParams1);
}

main();
