require('dotenv').config();
const HttpsProxyAgent = require('https-proxy-agent');
const { BN, toBaseUnit, Web3, axios } = MuonAppUtils;

const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : null;

const PionerV1App = {
    APP_NAME: 'pionerV1_oracle',
    useTss: true,

    onRequest: async function (request) {
        let { method, data: { params = {} } } = request;
        switch (method) {
            case 'price':
                const { asset1, asset2 } = params;
                const prices = await this.fetchPrices(asset1, asset2);
                return {
                    asset1: this.convertToBytes32(asset1),
                    asset2: this.convertToBytes32(asset2),
                    pairBid: this.scaleUp(prices.pairBid).toString(),
                    pairAsk: this.scaleUp(prices.pairAsk).toString(),
                    confidence: this.scaleUp(prices.confidence).toString()
                };
        }
    },

    signParams: function (request, result) {
        const currentTime = Math.floor(Date.now() / 1000);
        switch (request.method) {
            case 'price':
                return [
                    { type: 'bytes32', value: result.asset1 },
                    { type: 'bytes32', value: result.asset2 },
                    { type: 'uint256', value: result.pairBid },
                    { type: 'uint256', value: result.pairAsk },
                    { type: 'uint256', value: result.confidence },
                    { type: 'uint256', value: this.scaleUp(currentTime).toString() }
                ];
        }
    },

    fetchPrices: async function (asset1, asset2) {
        const [prices1, prices2] = await Promise.all([this.fetchAssetPrices(asset1), this.fetchAssetPrices(asset2)]);
        const adjustedPrices1 = asset1 === 'hardusd' ? { avgBid: 1, avgAsk: 1 } : this.calculateAveragePrices(prices1);
        const adjustedPrices2 = asset2 === 'hardusd' ? { avgBid: 1, avgAsk: 1 } : this.calculateAveragePrices(prices2);
        const asset1Confidence = asset1 === 'hardusd' ? 0 : this.calculateConfidence(prices1);
        const asset2Confidence = asset2 === 'hardusd' ? 0 : this.calculateConfidence(prices2);
        const highestConfidence = Math.max(asset1Confidence, asset2Confidence);
        
        return {
            pairBid: adjustedPrices1.avgBid / adjustedPrices2.avgBid,
            pairAsk: adjustedPrices1.avgAsk / adjustedPrices2.avgAsk,
            confidence: Math.max(1 - highestConfidence / 100, 0)
        };
    },

    fetchAssetPrices: async function (asset) {
        if (asset === 'hardusd') return [{ bid: 1, ask: 1 }];
        const [assetType, assetSymbol] = asset.split('.');
        const apiConfigs = this.loadApiConfigsForType(assetType);
        const prices = [];
        for (const config of apiConfigs) {
            const formattedSymbol = this.formatSymbolForAPI(assetType, assetSymbol);
            const priceData = await this.fetchPriceFromAPI(config, formattedSymbol);
            if (priceData) prices.push(priceData);
        }
        return prices;
    },

    loadApiConfigsForType: function (assetType) {
        const configs = [];
        const prefix = `API_${assetType.toUpperCase()}_`;
        for (const [key, value] of Object.entries(process.env)) {
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
        const url = `${config.url_before_asset}${symbol}${config.url_after_asset}`
        const response = await axios.get(url, agent ? { httpsAgent: agent } : {});
        const data = Array.isArray(response.data) ? response.data[0] : response.data;
        return {
            bid: parseFloat(data[config.bid_field]),
            ask: parseFloat(data[config.ask_field])
        };
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