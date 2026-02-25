const { execSync } = require('child_process');
const readline = require('readline');
const chalk = require('chalk');
const config = require('./config');
const output = require('./output');

const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const TREASURY = '0xAcAD71e697Ef3bb148093b2DD2fCf0845e957627';

function usdcAmount(dollars) {
  return (dollars * 1_000_000).toString();
}

function hasCast() {
  try {
    execSync('which cast', { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

async function confirm(message) {
  if (output.isJsonMode()) return true;
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr,
  });
  return new Promise((resolve) => {
    rl.question(`${message} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Handle USDC payment. Returns txHash.
 *
 * If --tx-hash is provided, use that directly.
 * If Foundry's `cast` is available, send via cast.
 * Otherwise, show manual payment instructions.
 */
async function handlePayment(amountUsd, opts = {}) {
  // If user already provided a tx hash, just return it
  if (opts.txHash) return opts.txHash;

  const cfg = config.load();
  const wallet = opts.wallet || process.env.NETLIB_WALLET || cfg.wallet;
  const rpcUrl = opts.rpcUrl || process.env.BASE_RPC_URL || cfg.rpcUrl;

  if (!hasCast()) {
    // No Foundry — show manual instructions
    console.log('');
    console.log(chalk.yellow(`Send $${amountUsd} USDC to the Net Library treasury on Base:`));
    console.log('');
    console.log(`  Treasury: ${chalk.cyan(TREASURY)}`);
    console.log(`  USDC:     ${chalk.cyan(USDC_CONTRACT)}`);
    console.log(`  Amount:   ${chalk.green(`${amountUsd} USDC`)} (${usdcAmount(amountUsd)} raw)`);
    console.log(`  Chain:    Base (8453)`);
    console.log('');
    console.log(`After sending, re-run this command with ${chalk.cyan('--tx-hash <hash>')}`);
    process.exit(0);
  }

  if (!wallet) {
    throw new Error('No wallet configured. Run: netlibrary config set wallet <address>');
  }

  const ok = await confirm(
    `This will send $${amountUsd} USDC from ${wallet} to the Net Library treasury. Proceed?`
  );
  if (!ok) {
    console.log('Cancelled.');
    process.exit(0);
  }

  const amount = usdcAmount(amountUsd);
  const cmd = [
    'cast', 'send', USDC_CONTRACT,
    '"transfer(address,uint256)"',
    TREASURY, amount,
    '--rpc-url', rpcUrl,
    '--json',
  ];

  const pk = opts.privateKey || process.env.PRIVATE_KEY;
  if (pk) {
    cmd.push('--private-key', pk);
  } else {
    cmd.push('--from', wallet);
  }

  if (!output.isJsonMode()) {
    console.log(chalk.dim(`Sending $${amountUsd} USDC to treasury...`));
  }

  try {
    const result = execSync(cmd.join(' '), {
      encoding: 'utf8',
      timeout: 120000,
    });
    const parsed = JSON.parse(result);
    const txHash = parsed.transactionHash;
    if (!output.isJsonMode()) {
      console.log(chalk.green('✓'), `Payment sent: ${txHash}`);
    }
    return txHash;
  } catch (err) {
    throw new Error(`Payment failed: ${err.message}`);
  }
}

module.exports = { handlePayment, USDC_CONTRACT, TREASURY, usdcAmount, confirm };
