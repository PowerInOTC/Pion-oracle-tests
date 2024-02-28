const { soliditySha3, schnorrVerifyWithNonceAddress } = MuonAppUtils

const TssApp = {
  APP_NAME: 'tss',
  useTss: true,

  onRequest: async function (request) {
    let {method, data: {params={}}} = request;
    switch (method) {
      case 'test':
        const resp = {"confirmed":true,"reqId":"0xa3ac542b7d2dac10e0731f998bceb9245962fcbb82ef0140bdd0c076ced9e473","app":"tss","appId":"45810160343022089601028851206408642627529628329831086458846511772841706178168","method":"test","deploymentSeed":"0x4319f576b0b22dfaa0f23d9a135a09e89932e6070d7d905ae711155a2c5ebf0f","nSign":7,"gwAddress":"0x01A3e06C7E55FaB20fDB1CC6B5Bad478660CD355","data":{"uid":"1hflvd2nebqm01n","params":{},"timestamp":1700470885,"result":"done","resultHash":"0xf9310affc21220c50e2b1af111e160a9f1b576eb3a4e0ab30841ca92414aa39d","signParams":[{"name":"appId","type":"uint256","value":"45810160343022089601028851206408642627529628329831086458846511772841706178168"},{"name":"reqId","type":"uint256","value":"0xa3ac542b7d2dac10e0731f998bceb9245962fcbb82ef0140bdd0c076ced9e473"},{"type":"string","value":"done"}],"init":{"nonceAddress":"0xcf31D1cb6D82AbAbAF1224E54335f572FD567552"}},"startedAt":1700470885,"confirmedAt":1700470886,"signatures":[{"owner":"0xBBadeEb0117f2d0b95387DA1ea7aAb9b59fd0B76","ownerPubKey":{"x":"0x5bb0f357c4781a73ed4681966ad615d5d6f0e111a25982aab2a7ec005d99197a","yParity":"0"},"signature":"0x1c35513a9a992321922ba4a4bcfa72d511e7c510e87375677d4b22eae1fee7d7"}]}
        const res = schnorrVerifyWithNonceAddress(
          resp.data.resultHash,
          resp.signatures[0].signature,
          resp.data.init.nonceAddress,
          '02' + resp.signatures[0].ownerPubKey.x.replace('0x', ''),
        )
        return `${res}`;
      case 'data-change':
        return Math.random()
      default:
        throw {message: `invalid method ${method}`}
    }
  },

  signParams: function (request, result) {
    switch (request.method) {
      case 'test':
      case 'data-change':
        return [{type: 'string', value: result.toString()}]
      default:
        throw { message: `Unknown method: ${request.method}` }
    }
  }
}

module.exports = TssApp
