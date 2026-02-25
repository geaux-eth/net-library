const { execSync } = require('child_process');
const config = require('./config');
const output = require('./output');

const UPSTREAM_RELAY = 'https://www.netprotocol.app/api/relay';
const RELAY_SECRET_KEY = 'net-relay-public-access-key-v1';

// EIP-712 domain and types (from @net-protocol/relay SDK)
const EIP712_DOMAIN = {
  name: 'Net Relay Service',
  version: '1',
};
const EIP712_TYPES = {
  RelaySession: [
    { name: 'operatorAddress', type: 'address' },
    { name: 'secretKeyHash', type: 'bytes32' },
    { name: 'expiresAt', type: 'uint256' },
  ],
};

function getWallet() {
  const cfg = config.load();
  const wallet = process.env.NETLIB_WALLET || cfg.wallet;
  if (!wallet) throw new Error('No wallet configured. Run: netlibrary config set wallet <address>');
  return wallet;
}

function computeSecretKeyHash() {
  // keccak256(toBytes('net-relay-public-access-key-v1'))
  // Pre-computed since the secret key is a constant and Node lacks keccak256
  return '0x895bfc170fa97f5c512e664f1f75d0a46413e041815da9c74c2ccf24d38bfd78';
}

/**
 * Sign EIP-712 typed data for relay session.
 * Tries in order: PRIVATE_KEY env var, bankr sign, manual.
 * Returns { signature, expiresAt } or throws.
 */
async function signSession(wallet, chainId) {
  const secretKeyHash = computeSecretKeyHash();
  const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour

  const typedData = {
    domain: { ...EIP712_DOMAIN, chainId },
    types: EIP712_TYPES,
    primaryType: 'RelaySession',
    message: {
      operatorAddress: wallet,
      secretKeyHash,
      expiresAt: expiresAt.toString(),
    },
  };

  // Method 1: Private key (most agents)
  const pk = process.env.PRIVATE_KEY;
  if (pk) {
    return signWithPrivateKey(pk, typedData, chainId, expiresAt);
  }

  // Method 2: Bankr wallet
  let hasBankr = false;
  try { execSync('which bankr', { stdio: 'pipe' }); hasBankr = true; } catch {}

  if (hasBankr) {
    return signWithBankr(typedData, expiresAt);
  }

  // Method 3: Manual — return typed data for user to sign externally
  throw new ManualSignError(typedData, expiresAt);
}

async function signWithPrivateKey(pk, typedData, chainId, expiresAt) {
  // Try ethers v6 first (commonly available for agents)
  try {
    const { ethers } = require('ethers');
    const wallet = new ethers.Wallet(pk);
    const domain = { ...EIP712_DOMAIN, chainId };
    const types = { RelaySession: EIP712_TYPES.RelaySession };
    const message = {
      operatorAddress: typedData.message.operatorAddress,
      secretKeyHash: typedData.message.secretKeyHash,
      expiresAt: BigInt(expiresAt),
    };
    const signature = await wallet.signTypedData(domain, types, message);
    return { signature, expiresAt };
  } catch {
    // Fallback: use cast wallet sign-auth (Foundry)
    const fs = require('fs');
    const tmpFile = '/tmp/netlibrary-relay-session-eip712.json';
    // cast requires full EIP-712 JSON including EIP712Domain
    const fullTypedData = {
      ...typedData,
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
        ],
        ...typedData.types,
      },
    };
    fs.writeFileSync(tmpFile, JSON.stringify(fullTypedData));
    const result = execSync(
      `cast wallet sign --private-key ${pk} --data --from-file ${tmpFile}`,
      { encoding: 'utf8', timeout: 30000 }
    ).trim();
    return { signature: result, expiresAt };
  }
}

function signWithBankr(typedData, expiresAt) {
  const json = JSON.stringify(typedData);
  // Write to temp file to avoid shell escaping issues
  const fs = require('fs');
  const tmpFile = '/tmp/netlibrary-relay-session-eip712.json';
  fs.writeFileSync(tmpFile, json);

  const result = execSync(
    `bankr sign --type eth_signTypedData_v4 --typed-data "$(cat ${tmpFile})"`,
    { encoding: 'utf8', timeout: 60000 }
  );

  // Parse signature from bankr output
  const sigMatch = result.match(/Signature:\s+(0x[a-fA-F0-9]+)/);
  if (!sigMatch) throw new Error('Could not parse Bankr signature output');

  return { signature: sigMatch[1], expiresAt };
}

class ManualSignError extends Error {
  constructor(typedData, expiresAt) {
    super('No signing method available. Sign the EIP-712 data manually and pass --session-token.');
    this.typedData = typedData;
    this.expiresAt = expiresAt;
  }
}

/**
 * Create a relay session token.
 * Returns { sessionToken, expiresAt }.
 */
async function createSession(opts = {}) {
  const wallet = opts.wallet || getWallet();
  const chainId = opts.chainId || 8453;

  // If session token provided directly, use it
  if (opts.sessionToken) {
    return { sessionToken: opts.sessionToken, expiresAt: null };
  }

  const { signature, expiresAt } = await signSession(wallet, chainId);

  const res = await fetch(`${UPSTREAM_RELAY}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chainId,
      operatorAddress: wallet,
      secretKey: RELAY_SECRET_KEY,
      signature,
      expiresAt,
    }),
  });

  const data = await res.json();
  if (!data.success || !data.sessionToken) {
    throw new Error(`Session creation failed: ${data.error || JSON.stringify(data)}`);
  }

  return { sessionToken: data.sessionToken, expiresAt: data.expiresAt };
}

module.exports = {
  createSession,
  signSession,
  ManualSignError,
  UPSTREAM_RELAY,
  RELAY_SECRET_KEY,
  getWallet,
};
