require('dotenv').config();
const { BN, toBaseUnit, Web3, axios } = MuonAppUtils;

const PionerV1App = {
    APP_NAME: 'pionerV1_oracle',
    useTss: true,

    onRequest: async function (request) {
        let { method, data: { params = {} } } = request;
        switch (method) {
            case 'price':
                const { asset1, asset2, requestPairBid, requestPairAsk, requestConfidence, requestSignTime } = params;
                const prices = await this.fetchPrices(asset1, asset2);

                return {
                    asset1: this.convertToBytes32(asset1),
                    asset2: this.convertToBytes32(asset2),
                    requestPairBid: requestPairBid.toString(),
                    requestPairAsk: requestPairAsk.toString(),
                    pairBid: prices.pairBid.toString(),
                    pairAsk: prices.pairAsk.toString(),
                    confidence: prices.confidence.toString(),
                    requestConfidence: requestConfidence.toString(),
                    requestSignTime: requestSignTime.toString(),
                    oldestTimestamp: prices.oldestTimestamp.toString() 
                };
        }
    },
    

    signParams: function (request, result) {
        const signTimeBN = new BN(result.oldestTimestamp);
        const requestSignTimeBN = new BN(result.requestSignTime);
        const confidenceBN = new BN((result.confidence * 1e18).toFixed(0), 10);
        const pairBidBN = new BN((result.pairBid * 1e18).toFixed(0), 10);
        const pairAskBN = new BN((result.pairAsk * 1e18).toFixed(0), 10);
        const requestConfidenceBN = new BN(result.requestConfidence);
        const requestPairBidBN = new BN(result.requestPairBid);
        const requestPairAskBN = new BN(result.requestPairAsk);

        if (signTimeBN.gt(requestSignTimeBN)) { throw new Error(`0x100`);}
        if (confidenceBN.gt(requestConfidenceBN)) {throw new Error(`0x101`);}
        if (result.oldestTimestamp >= result.requestSignTime) {throw new Error(`0x102`);}
        console.log(pairBidBN, requestPairBidBN, "bob");
        let ratioBN = pairBidBN.mul(new BN('1e18')).div(requestPairBidBN); // Adjusted for precision

// Calculating the difference from 1e18 (to maintain precision, 1e18 is used when calculating the ratio)
let differenceBN = new BN('1e18').sub(ratioBN).abs();

// Checking if the difference is greater than the allowed confidence level
if (differenceBN.gt(requestConfidenceBN)) {
    throw new Error(`0x103`);
} else {
    console.log("The condition is not met, no error thrown.");
}
        if (new BN(1e18).sub(pairBidBN.div(requestPairBidBN)).abs().gt(requestConfidenceBN)) throw new Error(`0x103`);
        if (new BN(1e18).sub(pairAskBN.div(requestPairAskBN)).abs().gt(requestConfidenceBN)) throw new Error(`0x104`);
        if (pairBidBN.gt(pairAskBN)) throw new Error(`0x105`);
        
        switch (request.method) {
            case 'price':
                return [
                    { name: 'asset1', type: 'bytes32', value: result.asset1 },
                    { name: 'asset2', type: 'bytes32', value: result.asset2 },
                    { name: 'requestPairBid', type: 'uint256', value: this.scaleUp(result.requestPairBid).toString() },
                    { name: 'requestPairAsk', type: 'uint256', value: this.scaleUp(result.requestPairAsk).toString() },
                    { name: 'requestConfidence', type: 'uint256', value: this.scaleUp(result.requestConfidence).toString() },
                    { name: 'requestSignTime', type: 'uint256', value: this.scaleUp(result.requestSignTime).toString() },
                ];
        }
    },
    

    fetchPrices: async function (asset1, asset2) {
        const [result1, result2] = await Promise.all([
            this.fetchAssetPrices(asset1),
            this.fetchAssetPrices(asset2)
        ]);
        console.log(result1, result2, "result1, result2");

        const adjustedPrices1 = asset1 === 'hardusd' ? { avgBid: 1, avgAsk: 1 } : this.calculateAveragePrices(result1.prices);
        const adjustedPrices2 = asset2 === 'hardusd' ? { avgBid: 1, avgAsk: 1 } : this.calculateAveragePrices(result2.prices);
        const asset1Confidence = asset1 === 'hardusd' ? 0 : this.calculateConfidence(result1.prices);
        const asset2Confidence = asset2 === 'hardusd' ? 0 : this.calculateConfidence(result2.prices);
        const highestConfidence = Math.max(asset1Confidence, asset2Confidence);
        const oldestTimestamp = Math.min(result1.oldestTimestamp, result2.oldestTimestamp);

        return {
            pairBid: adjustedPrices1.avgBid / adjustedPrices2.avgBid,
            pairAsk: adjustedPrices1.avgAsk / adjustedPrices2.avgAsk,
            confidence: highestConfidence,
            oldestTimestamp
        };
    },

    fetchAssetPrices: async function (asset) {
        if (asset === 'hardusd') return { prices: [{ bid: 1, ask: 1, timestamp: 17083563950000 }], oldestTimestamp: 17083563950000 };
        const [assetType, assetSymbol] = asset.split('.');
        const apiConfigs = this.loadApiConfigsForType(assetType);
        let oldestTimestamp = 170835639500000;
        const prices = [];

        for (const config of apiConfigs) {
            const formattedSymbol = this.formatSymbolForAPI(assetType, assetSymbol);
            const priceData = await this.fetchPriceFromAPI(config, formattedSymbol);
            if (priceData && priceData.timestamp !== null && priceData.timestamp !== 0 && priceData.bid !== null && priceData.ask !== null) {
                prices.push(priceData);
                if (priceData.timestamp < oldestTimestamp) {
                    oldestTimestamp = priceData.timestamp;
                }
            } else {
                console.log("Invalid priceData, skipping...");
            }
        }
        return { prices, oldestTimestamp };
    },

    loadApiConfigsForType: function (assetType) {
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
    },
    
    formatSymbolForAPI: function (assetType, symbol) {
        return assetType === 'fx' ? symbol.toLowerCase() : symbol.toUpperCase();
    },

    fetchPriceFromAPI: async function (config, symbol) {
        const url = `${config.url_before_asset}${symbol}${config.url_after_asset}`;
        console.log(url, "url");
        try {
            const response = await axios.get(url);
            const data = Array.isArray(response.data) ? response.data[0] : response.data;
            const timestampField = config.time_field;
            let timestamp = data[timestampField];
            if (typeof timestamp === 'number') {
                timestamp *= timestamp < 1e12 ? 1000 : 1;
            } else if (typeof timestamp === 'string') {
                timestamp = new Date(timestamp).getTime();
            } else {
                timestamp = null;
            }    
            const bid = parseFloat(data[config.bid_field]);
            const ask = parseFloat(data[config.ask_field]);
            if (isNaN(bid) || isNaN(ask) || bid <= 0 || ask <= 0 || ask < bid) {
                return null;
            }
            console.log(bid, ask, timestamp, "bid, ask, timestamp");
    
            return {
                bid,
                ask,
                timestamp
            };
        } catch (error) {
            console.error(`Error fetching price from API: `, error);
            return null;
        }
    },


    calculateAveragePrices: function (prices) {
        const totalBid = prices.reduce((sum, price) => sum + (price ? price.bid : 0), 0);
        const totalAsk = prices.reduce((sum, price) => sum + (price ? price.ask : 0), 0);
        const count = prices.filter(price => price).length;
        return {
            avgBid: count > 0 ? totalBid / count : NaN,
            avgAsk: count > 0 ? totalAsk / count : NaN
        };
    },

    calculateConfidence: function (prices) {
        console.log(prices, "prices");
        let minBid = prices[0].bid, maxBid = prices[0].bid;
        let minAsk = prices[0].ask, maxAsk = prices[0].ask;
        prices.forEach(price => {
            if (price.bid < minBid) minBid = price.bid;
            if (price.bid > maxBid) maxBid = price.bid;
            if (price.ask < minAsk) minAsk = price.ask;
            if (price.ask > maxAsk) maxAsk = price.ask;
        });
        const bidSpread = ((maxBid - minBid) / minBid) * 100;
        const askSpread = ((maxAsk - minAsk) / minAsk) * 100;
        return Math.max(bidSpread, askSpread);
    },
    

    convertToBytes32: function (str) {
        const hex = Web3.utils.toHex(str);
        return Web3.utils.padRight(hex, 64);
    },

    scaleUp: function (value) {
        return new BN(toBaseUnit(String(value), 18));
    }
};

module.exports = PionerV1App;
