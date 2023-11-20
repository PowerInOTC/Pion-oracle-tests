const ethJsUtil = require("ethereumjs-util");
const Web3 = require("web3");
const {
  utils: { toBN, BN, keccak256, toChecksumAddress, soliditySha3 },
} = Web3;
const elliptic = require("elliptic");
const EC = elliptic.ec;
const curve = new EC("secp256k1");

function uuid() {
  return (
    Date.now().toString(32) + Math.floor(Math.random() * 999999999).toString(32)
  );
}

function sign(hash, private_key) {
  const web3 = new Web3();
  let sig = web3.eth.accounts.sign(hash, private_key);
  return sig.signature;
}

function validatePublicKey(publicKey) {
  return curve.curve.validate(publicKey);
}

function bn2hex(num, byteLength) {
  return "0x" + num.toBuffer("be", byteLength).toString("hex");
}

function pub2addr(publicKey) {
  let pubKeyHex = publicKey.encode("hex").substr(2);
  let pub_hash = keccak256(Buffer.from(pubKeyHex, "hex"));
  return toChecksumAddress("0x" + pub_hash.substr(-40));
}

function pub2json(pubkey, minimal) {
  let extra = minimal
    ? {}
    : {
        address: pub2addr(pubkey),
        encoded: pubkey.encode("hex", true),
      };
  return {
    ...extra,
    x: "0x" + pubkey.getX().toBuffer("be", 32).toString("hex"),
    yParity: pubkey.getY().mod(toBN(2)).toString(),
  };
}

function schnorrSign(
  signingShare,
  signingPubKey,
  nonceShare,
  noncePublicKey,
  msg,
) {
  let nonceTimesGeneratorAddress = pub2addr(noncePublicKey);
  let e = toBN(schnorrHash(signingPubKey, nonceTimesGeneratorAddress, msg));
  let s = nonceShare.sub(signingShare.mul(e)).umod(curve.n);
  return { s, e };
}

function schnorrVerify(signingPublicKey, msg, sig) {
  if (typeof sig === "string") sig = splitSignature(sig);
  signingPubKey = curve.keyFromPublic(signingPubKey, "hex").getPublic();
  if (!validatePublicKey(signingPublicKey)) return false;
  const s = sig.s.umod(curve.n);
  let r_v = pointAdd(curve.g.mul(s), signingPublicKey.mul(sig.e));
  let nonceTimesGeneratorAddress = pub2addr(r_v);
  let e_v = schnorrHash(signingPublicKey, nonceTimesGeneratorAddress, msg);
  return toBN(e_v).eq(sig.e);
}

function schnorrVerifyWithNonceAddress(
  hash,
  signature,
  nonceAddress,
  signingPubKey,
) {
  nonceAddress = nonceAddress.toLowerCase();
  signature = toBN(signature).umod(curve.n);
  signingPubKey = curve.keyFromPublic(signingPubKey, "hex").getPublic();
  if (!validatePublicKey(signingPubKey)) return false;

  if (toBN(nonceAddress).isZero() || signature.isZero() || toBN(hash).isZero())
    return false;

  const e = toBN(schnorrHash(signingPubKey, nonceAddress, hash));

  let recoveredPubKey = ethJsUtil.ecrecover(
    curve.n
      .sub(signingPubKey.getX().mul(signature).umod(curve.n))
      .toBuffer("be", 32),
    signingPubKey.getY().isEven() ? 27 : 28,
    signingPubKey.getX().toBuffer("be", 32),
    e.mul(signingPubKey.getX()).umod(curve.n).toBuffer("be", 32),
  );
  const addrBuf = ethJsUtil.pubToAddress(recoveredPubKey);
  const addr = ethJsUtil.bufferToHex(addrBuf);

  return nonceAddress === addr;
}

function schnorrHash(signingPublicKey, nonceTimesGeneratorAddress, msg) {
  let totalBuff = Buffer.concat([
    /** signingPubKeyX */
    signingPublicKey.getX().toBuffer("be", 32),
    /** pubKeyYParity */
    Buffer.from(signingPublicKey.getY().isEven() ? "00" : "01", "hex"),
    /** msg hash */
    Buffer.from(msg.replace(/^0x/i, ""), "hex"),
    /** nonceGeneratorAddress */
    Buffer.from(nonceTimesGeneratorAddress.replace(/^0x/i, ""), "hex"),
  ]);
  return keccak256(totalBuff);
}

function pointAdd(point1, point2) {
  const result = point1.add(point2);
  // if any of the input points are not valid elliptic curve points return generator as output
  if ((point1.validate() && point2.validate()) === false) {
    return curve.g;
  } else {
    return result;
  }
}

function stringifySignature(sign) {
  return `0x${sign.e.toString("hex", 64)}${sign.s.toString("hex", 64)}`;
}

function splitSignature(signature) {
  const bytes = signature.replace("0x", "");
  if (bytes.length !== 128) throw `invalid schnorr signature string`;
  return {
    e: toBN(`0x${bytes.substr(0, 64)}`),
    s: toBN(`0x${bytes.substr(64, 64)}`),
  };
}

function moduleIsAvailable(path) {
  try {
    require.resolve(path);
    return true;
  } catch (error) {
    return false;
  }
}

async function runMuonApp(request) {
  const { app, method, params = {} } = request;

  const appPath = `./muon-apps/${app}.js`;
  if (!moduleIsAvailable(appPath)) {
    throw { message: `App not found on optimistic node` };
  }

  const appId = BigInt(soliditySha3(`${app}.js`)).toString(10);

  const response = {
    reqId: null,
    app,
    appId,
    method,
    data: {
      params,
      timestamp: Math.floor(Date.now() / 1000),
    },
  };

  const muonApp = require(appPath);
  response.reqId = "0x" + curve.genKeyPair().getPrivate("hex");
  response.data.uid = uuid();
  const onRequestResult = await muonApp.onRequest(response);
  response.data.result = onRequestResult;
  const appSignParams = muonApp.signParams(response, onRequestResult);
  const hashSecurityParams = soliditySha3(...appSignParams);
  response.data.signParams = [
    { name: "appId", type: "uint256", value: response.appId },
    { name: "reqId", type: "uint256", value: response.reqId },
    ...appSignParams,
  ];
  response.data.resultHash = soliditySha3(...response.data.signParams);

  const nonce = curve.genKeyPair();
  response.data.init = { nonceAddress: pub2addr(nonce.getPublic()) };
  const account = curve.keyFromPrivate(process.env.PRIVATE_KEY);
  const verifyingPubKey = account.getPublic();
  let sig = schnorrSign(
    account.getPrivate(),
    account.getPublic(),
    nonce.getPrivate(),
    nonce.getPublic(),
    response.data.resultHash,
  );
  response.signatures = [
    {
      owner: pub2addr(verifyingPubKey),
      ownerPubKey: pub2json(verifyingPubKey, true),
      signature: bn2hex(sig.s),
    },
  ];

  response.gwAddress = response.signatures[0].owner;
  response.shieldAddress = response.gwAddress;
  response.shieldSignature = sign(
    response.data.resultHash,
    process.env.PRIVATE_KEY,
  );
  response.nodeSignature = response.shieldSignature;
  response.confirmed = true;

  return response;
}

module.exports = {
  runMuonApp,
  schnorrVerifyWithNonceAddress,
};
