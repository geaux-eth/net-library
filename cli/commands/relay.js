const chalk = require('chalk');
const { execSync } = require('child_process');
const output = require('../lib/output');
const config = require('../lib/config');
const { confirm, USDC_CONTRACT, usdcAmount } = require('../lib/payment');
const { createSession, ManualSignError, UPSTREAM_RELAY, RELAY_SECRET_KEY, getWallet } = require('../lib/relay-session');

const FUNDING_TIERS = [0.10, 0.25, 5.00];

function getAppBase() {
  const cfg = config.load();
  const baseUrl = process.env.NETLIB_BASE_URL || cfg.baseUrl;
  // Strip /api/v1 to get app root
  return baseUrl.replace(/\/api\/v1\/?$/, '');
}

// Call upstream relay directly (for balance — works without CORS)
async function relayFetch(endpoint, body) {
  const res = await fetch(`${UPSTREAM_RELAY}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Relay-Secret': RELAY_SECRET_KEY,
    },
    body: JSON.stringify({ ...body, secretKey: RELAY_SECRET_KEY }),
  });
  return res.json();
}

// Call app proxy (for fund/verify — these routes only exist on the app)
async function appFetch(path, body) {
  const base = getAppBase();
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { data: await res.json(), status: res.status };
}

module.exports = function (program) {
  const cmd = program.command('relay').description('Relay wallet balance and funding for uploads');

  cmd
    .command('balance')
    .description('Check relay backend wallet balance')
    .action(async () => {
      try {
        const wallet = getWallet();
        const data = await relayFetch('/balance', {
          operatorAddress: wallet,
          chainId: 8453,
        });

        if (!data.success && data.error) {
          output.error(data.error);
          process.exit(1);
        }

        if (output.isJsonMode()) {
          output.json(data);
          return;
        }

        const balanceEth = parseFloat(data.balanceEth || '0');
        const balanceUsdc = balanceEth * 3000; // rough ETH→USD
        const sufficient = data.sufficientBalance ?? false;

        output.item(data, [
          ['Your Wallet', () => wallet],
          ['Backend Wallet', 'backendWalletAddress'],
          ['Balance (ETH)', () => balanceEth.toFixed(6)],
          ['Balance (~USD)', () => `$${balanceUsdc.toFixed(4)}`],
          ['Can Upload', () => sufficient ? chalk.green('Yes') : chalk.red('No — fund with: netlibrary relay fund')],
        ]);

        if (!sufficient) {
          console.log('');
          console.log(chalk.yellow('Your relay wallet needs funding before you can upload.'));
          console.log(`Run: ${chalk.cyan('netlibrary relay fund 0.10')} (or 0.25, 5.00)`);
        }
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('fund <amount>')
    .description('Fund relay wallet with USDC ($0.10, $0.25, or $5.00)')
    .option('--tx-hash <hash>', 'USDC payment tx hash (if already paid)')
    .action(async (amount, opts) => {
      try {
        const amountUsdc = parseFloat(amount);
        if (!FUNDING_TIERS.includes(amountUsdc)) {
          output.error(`Invalid amount. Choose: ${FUNDING_TIERS.map(t => '$' + t.toFixed(2)).join(', ')}`);
          process.exit(1);
        }

        const wallet = getWallet();
        const cfg = config.load();
        const rpcUrl = process.env.BASE_RPC_URL || cfg.rpcUrl;

        // Step 1: Call app proxy fund endpoint to get payTo address
        const { data: fundInfo, status: fundStatus } = await appFetch('/api/relay/fund', {
          operatorAddress: wallet,
          chainId: 8453,
          amountUsdc,
        });

        // If already funded sufficiently
        if (fundInfo.success) {
          output.success('Relay wallet already has sufficient balance!');
          if (output.isJsonMode()) output.json(fundInfo);
          return;
        }

        // Get the payment address from x402 response
        const accepts = fundInfo.accepts?.[0];
        const payTo = accepts?.payTo || accepts?.extra?.facilitator;

        if (!payTo) {
          output.error('Could not get payment address from relay. Response: ' + JSON.stringify(fundInfo));
          process.exit(1);
        }

        let txHash = opts.txHash;

        if (!txHash) {
          // Check for Foundry
          let hasCast = false;
          try { execSync('which cast', { stdio: 'pipe' }); hasCast = true; } catch {}

          if (!hasCast) {
            if (output.isJsonMode()) {
              output.json({ paymentRequired: true, payTo, amount: amountUsdc, usdcContract: USDC_CONTRACT, chain: 'Base (8453)' });
            } else {
              console.log('');
              console.log(chalk.yellow(`Send $${amountUsdc.toFixed(2)} USDC to fund your relay wallet:`));
              console.log('');
              console.log(`  Pay To:   ${chalk.cyan(payTo)}`);
              console.log(`  USDC:     ${chalk.cyan(USDC_CONTRACT)}`);
              console.log(`  Amount:   ${chalk.green(`$${amountUsdc.toFixed(2)} USDC`)} (${usdcAmount(amountUsdc)} raw)`);
              console.log(`  Chain:    Base (8453)`);
              console.log('');
              console.log(`After sending, re-run with: ${chalk.cyan(`netlibrary relay fund ${amount} --tx-hash <hash>`)}`);
            }
            process.exit(0);
          }

          // Pay via cast
          const ok = await confirm(`Send $${amountUsdc.toFixed(2)} USDC from ${wallet} to fund relay wallet?`);
          if (!ok) { console.log('Cancelled.'); process.exit(0); }

          if (!output.isJsonMode()) console.log(chalk.dim(`Sending $${amountUsdc.toFixed(2)} USDC...`));

          const castCmd = [
            'cast', 'send', USDC_CONTRACT,
            '"transfer(address,uint256)"',
            payTo, usdcAmount(amountUsdc),
            '--rpc-url', rpcUrl,
            '--json',
          ];

          const pk = process.env.PRIVATE_KEY;
          if (pk) castCmd.push('--private-key', pk);
          else castCmd.push('--from', wallet);

          const result = JSON.parse(execSync(castCmd.join(' '), { encoding: 'utf8', timeout: 120000 }));
          txHash = result.transactionHash;
          if (!output.isJsonMode()) console.log(chalk.green('✓'), `Payment sent: ${txHash}`);
        }

        // Step 2: Verify payment with relay
        if (!output.isJsonMode()) console.log(chalk.dim('Verifying payment with relay...'));

        let verified = false;
        for (let attempt = 1; attempt <= 10; attempt++) {
          const { data: verifyData } = await appFetch('/api/relay/fund/verify', {
            operatorAddress: wallet,
            chainId: 8453,
            paymentTxHash: txHash,
          });

          if (verifyData.success || verifyData.alreadyProcessed) {
            verified = true;
            output.success(`Relay wallet funded! Backend wallet: ${verifyData.backendWalletAddress || 'confirmed'}`);
            if (output.isJsonMode()) output.json(verifyData);
            break;
          }

          if (attempt < 10) {
            if (!output.isJsonMode()) console.log(chalk.dim(`  Waiting for confirmation (attempt ${attempt}/10)...`));
            await new Promise(r => setTimeout(r, 3000));
          }
        }

        if (!verified) {
          output.error('Payment verification timed out. The relay may take a few moments to process. Check balance with: netlibrary relay balance');
          process.exit(1);
        }
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('session')
    .description('Create a relay session token (required for uploads, valid 1 hour)')
    .option('--session-token <token>', 'Use an existing session token (skip signing)')
    .action(async (opts) => {
      try {
        if (opts.sessionToken) {
          output.success('Using provided session token.');
          if (output.isJsonMode()) output.json({ sessionToken: opts.sessionToken });
          else console.log(opts.sessionToken);
          return;
        }

        const wallet = getWallet();
        if (!output.isJsonMode()) console.log(chalk.dim('Creating relay session...'));

        const { sessionToken, expiresAt } = await createSession({ wallet });

        if (output.isJsonMode()) {
          output.json({ sessionToken, expiresAt });
        } else {
          output.success('Relay session created (valid 1 hour)');
          console.log('');
          console.log(`  ${chalk.cyan(sessionToken)}`);
          console.log('');
          console.log(`Use with: ${chalk.cyan('netlibrary library upload --session-token <token> ...')}`);
        }
      } catch (err) {
        if (err instanceof ManualSignError) {
          if (output.isJsonMode()) {
            output.json({ signingRequired: true, typedData: err.typedData, expiresAt: err.expiresAt });
          } else {
            console.log('');
            console.log(chalk.yellow('No signing method available (no PRIVATE_KEY, no bankr).'));
            console.log('Sign this EIP-712 typed data with your wallet and create the session manually:');
            console.log('');
            console.log(JSON.stringify(err.typedData, null, 2));
            console.log('');
            console.log('Then POST to: https://www.netprotocol.app/api/relay/session');
            console.log(`Pass the returned sessionToken with: ${chalk.cyan('--session-token <token>')}`);
          }
          process.exit(0);
        }
        output.error(err.message);
        process.exit(1);
      }
    });
};
