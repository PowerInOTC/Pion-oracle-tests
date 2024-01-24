Muon Schnorr Signer is a server that run a Muon app and return a schnorr signature on the response.

## Install

```
$ git clone https://github.com/abramsymons/muon-schnorr-signer.git
$ npm install
```

## Configure

```
cp .env.example .env
```
Edit the file and set `SHNORR_PRIVATE_KEY` & `ETH_PRIVATE_KEY`

> **_Security Note:_** Using different private keys is highly recommenended to resolve different sort of potential security concerns.

## Run

Copy your MuonApps to `muon-apps` directoy.

Run the server using:

```
npm start
```

## Call Oracle

```
$body = @{
    app = "pionerV1_oracle"
    method = "price"
    params = @{
        asset1 = "usstock.aapl"
        asset2 = "fx.eurusd"
    }
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri http://localhost:3000/v1/ -Method Post -Body $body -ContentType "application/json"

# Access and print the data within response.result.data
$data = $response.result.data
Write-Host "Data within response.result.data:"
$data | ConvertTo-Json
```


> **_Security Note:_** Although having appId as a parameter in the signature prevents using signatures generated for a different app in other apps, but it's still recommened to not use same server with same key for running multiple apps.
