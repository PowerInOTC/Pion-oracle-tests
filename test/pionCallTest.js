//pionCallTest.js
const axios = require('axios');
const BigNumber = require('bignumber.js');
async function callPionTest(params) {
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
  

module.exports = { callPionTest };
