const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.config', 'netlibrary');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULTS = {
  baseUrl: 'https://miniapp-generator-fid-282520-251210015136529.neynar.app/api/v1',
  rpcUrl: 'https://base-mainnet.public.blastapi.io',
};

const VALID_KEYS = ['apiKey', 'baseUrl', 'wallet', 'rpcUrl', 'adminKey'];

function load() {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(config) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n');
}

function get(key) {
  return load()[key];
}

function set(key, value) {
  const config = load();
  config[key] = value;
  save(config);
}

module.exports = { load, save, get, set, CONFIG_FILE, VALID_KEYS };
