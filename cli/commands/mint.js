const { execSync } = require('child_process');
const chalk = require('chalk');
const config = require('../lib/config');
const api = require('../lib/api');
const output = require('../lib/output');
const { USDC_CONTRACT, confirm } = require('../lib/payment');

const PASS_CONTRACT = '0xCe559A2A6b64504bE00aa7aA85C5C31EA93a16BB';
const PRICE_RAW = '10000000'; // $10 USDC (6 decimals)
const RPC_DEFAULT = 'https://mainnet.base.org';

function hasCast() {
  try {
    execSync('which cast', { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function castCall(fn, args = [], rpcUrl) {
  const cmd = ['cast', 'call', PASS_CONTRACT, `"${fn}"`, ...args, '--rpc-url', rpcUrl];
  return execSync(cmd.join(' '), { encoding: 'utf8', stdio: 'pipe' }).trim();
}

function getRpcAndWallet(opts) {
  const cfg = config.load();
  const wallet = opts.wallet || process.env.NETLIB_WALLET || cfg.wallet;
  const rpcUrl = opts.rpcUrl || process.env.BASE_RPC_URL || cfg.rpcUrl || RPC_DEFAULT;
  return { wallet, rpcUrl };
}

/**
 * Check if a wallet address is already a Net Library member.
 * Uses the public member registry CSV (no auth needed).
 */
async function checkMembership(wallet) {
  try {
    const csvText = await api.getRaw('/member-registry/csv', { auth: false, root: true });
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    const addrIdx = headers.indexOf('address');
    if (addrIdx === -1) return { isMember: false };

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].match(/(".*?"|[^,]+)/g) || [];
      const addr = (cells[addrIdx] || '').replace(/^"|"$/g, '').toLowerCase();
      if (addr === wallet.toLowerCase()) {
        const idIdx = headers.indexOf('memberNumber');
        const ensIdx = headers.indexOf('ensName');
        return {
          isMember: true,
          memberId: cells[idIdx] ? cells[idIdx].replace(/^"|"$/g, '') : null,
          ensSubname: cells[ensIdx] ? cells[ensIdx].replace(/^"|"$/g, '') : null,
        };
      }
    }
    return { isMember: false };
  } catch {
    return { isMember: false, checkFailed: true };
  }
}

/**
 * Grant free Net Library membership for "we are so early" minters.
 * Calls POST /api/admin/membership/grant with the admin key.
 * Returns membership data on success, null on failure.
 */
async function grantFreeMembership(wallet) {
  const cfg = config.load();
  const adminKey = process.env.NETLIB_ADMIN_KEY || cfg.adminKey;
  if (!adminKey) return null;

  try {
    const baseUrl = (process.env.NETLIB_BASE_URL || cfg.baseUrl).replace(/\/v1\/?$/, '');
    const url = `${baseUrl}/admin/membership/grant`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminKey}`,
      },
      body: JSON.stringify({
        walletAddress: wallet,
        source: 'unlimited-pass-early',
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

module.exports = function (program) {
  const cmd = program.command('mint').description('Mint an Unlimited Pass NFT ($10 USDC)');

  cmd
    .command('status')
    .description('Check Unlimited Pass contract state and your pass status')
    .option('-w, --wallet <address>', 'Wallet to check')
    .action(async (opts) => {
      try {
        if (!hasCast()) {
          output.error('Foundry (cast) is required. Install: https://getfoundry.sh');
          process.exit(1);
        }

        const { wallet, rpcUrl } = getRpcAndWallet(opts);

        const totalSupply = castCall('totalSupply()(uint256)', [], rpcUrl);
        const earlyRemaining = castCall('earlyRemaining()(uint256)', [], rpcUrl);
        const mintActive = castCall('mintActive()(bool)', [], rpcUrl);

        if (output.isJsonMode()) {
          const data = {
            contract: PASS_CONTRACT,
            totalSupply: parseInt(totalSupply),
            earlyRemaining: parseInt(earlyRemaining),
            mintActive: mintActive === 'true',
          };
          if (wallet) {
            const hasPass = castCall('hasUnlimitedPass(address)(bool)', [wallet], rpcUrl);
            data.wallet = wallet;
            data.hasUnlimitedPass = hasPass === 'true';
          }
          output.json(data);
          return;
        }

        console.log(chalk.bold('\nUnlimited Pass Contract'));
        console.log(chalk.dim(`  ${PASS_CONTRACT}`));
        console.log(`  Total minted:    ${chalk.green(totalSupply)}`);
        console.log(`  Early remaining: ${chalk.yellow(earlyRemaining)}/1000`);
        console.log(`  Mint active:     ${mintActive === 'true' ? chalk.green('Yes') : chalk.red('No')}`);
        console.log(`  Price:           ${chalk.cyan('$10 USDC')}`);

        if (wallet) {
          const hasPass = castCall('hasUnlimitedPass(address)(bool)', [wallet], rpcUrl);
          console.log(`\n  Wallet: ${chalk.dim(wallet)}`);
          console.log(`  Has pass: ${hasPass === 'true' ? chalk.green('Yes') : 'No'}`);
        } else {
          console.log(chalk.dim('\n  Set wallet to check your status: netlibrary config set wallet <address>'));
        }
        console.log('');
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('pass')
    .description('Mint an Unlimited Pass ($10 USDC on Base)')
    .option('-w, --wallet <address>', 'Wallet address')
    .option('--private-key <key>', 'Private key for signing')
    .option('--rpc-url <url>', 'Base RPC URL')
    .action(async (opts) => {
      try {
        if (!hasCast()) {
          console.log('');
          console.log(chalk.yellow('Foundry (cast) is required to mint via CLI.'));
          console.log('Install: https://getfoundry.sh');
          console.log('');
          console.log(chalk.bold('Manual mint instructions:'));
          console.log(`  1. Approve USDC:  cast send ${USDC_CONTRACT} "approve(address,uint256)" ${PASS_CONTRACT} ${PRICE_RAW} --rpc-url ${RPC_DEFAULT}`);
          console.log(`  2. Mint:          cast send ${PASS_CONTRACT} "mint()" --rpc-url ${RPC_DEFAULT}`);
          console.log('');
          process.exit(0);
        }

        const { wallet, rpcUrl } = getRpcAndWallet(opts);
        if (!wallet) {
          output.error('No wallet configured. Run: netlibrary config set wallet <address>');
          process.exit(1);
        }

        const pk = opts.privateKey || process.env.PRIVATE_KEY;

        // Step 1: Check if already holds a pass
        const hasPass = castCall('hasUnlimitedPass(address)(bool)', [wallet], rpcUrl);
        if (hasPass === 'true') {
          if (output.isJsonMode()) {
            output.json({ status: 'already_holds_pass', wallet });
            return;
          }
          console.log(chalk.yellow('\nYou already have an Unlimited Pass, mfer.'));
          console.log(chalk.dim('Check your status: netlibrary mint status\n'));
          return;
        }

        // Step 2: Check mint is active
        const mintActive = castCall('mintActive()(bool)', [], rpcUrl);
        if (mintActive !== 'true') {
          output.error('Minting is not active right now.');
          process.exit(1);
        }

        // Step 3: Read tier info
        const earlyRemaining = parseInt(castCall('earlyRemaining()(uint256)', [], rpcUrl));
        const tier = earlyRemaining > 0 ? 'we are so early' : 'early-ish';
        const freeMemb = earlyRemaining > 0 ? ' + FREE Net Library membership' : '';

        // Step 4: Pre-mint membership check (for early tier)
        let preMintMember = null;
        if (earlyRemaining > 0) {
          if (!output.isJsonMode()) {
            console.log(chalk.dim('\nChecking membership status...'));
          }
          preMintMember = await checkMembership(wallet);
        }

        if (!output.isJsonMode()) {
          console.log('');
          console.log(chalk.bold('Unlimited Pass Mint'));
          console.log(`  Tier:    ${chalk.green(tier)}${earlyRemaining > 0 ? chalk.dim(` (${earlyRemaining} early slots left)`) : ''}`);
          console.log(`  Price:   ${chalk.cyan('$10 USDC')}`);
          console.log(`  Wallet:  ${chalk.dim(wallet)}`);
          console.log(`  You get: Upload unlimited items to stacks and grids${freeMemb} + 1 free hazza.name`);
          if (earlyRemaining > 0 && preMintMember && preMintMember.isMember) {
            console.log(`  Member:  ${chalk.green(`Already #${preMintMember.memberId}`)} (${preMintMember.ensSubname})`);
          }
          console.log('');
        }

        const ok = await confirm('Mint Unlimited Pass for $10 USDC?');
        if (!ok) {
          console.log('Cancelled.');
          process.exit(0);
        }

        // Build signing args
        const signArgs = pk ? ['--private-key', pk] : ['--from', wallet];

        // Step 5: Approve USDC
        if (!output.isJsonMode()) {
          console.log(chalk.dim('Approving $10 USDC...'));
        }
        const approveCmd = [
          'cast', 'send', USDC_CONTRACT,
          '"approve(address,uint256)"', PASS_CONTRACT, PRICE_RAW,
          '--rpc-url', rpcUrl, '--json', ...signArgs,
        ];
        try {
          execSync(approveCmd.join(' '), { encoding: 'utf8', timeout: 120000 });
        } catch (err) {
          throw new Error(`USDC approval failed: ${err.message}`);
        }

        // Step 6: Mint
        if (!output.isJsonMode()) {
          console.log(chalk.dim('Minting...'));
        }
        const mintCmd = [
          'cast', 'send', PASS_CONTRACT,
          '"mint()"',
          '--rpc-url', rpcUrl, '--json', ...signArgs,
        ];

        let mintResult;
        try {
          mintResult = JSON.parse(execSync(mintCmd.join(' '), { encoding: 'utf8', timeout: 120000 }));
        } catch (err) {
          throw new Error(`Mint failed: ${err.message}`);
        }

        const txHash = mintResult.transactionHash;

        // Parse Minted event from logs to get tokenId
        // Minted(address indexed to, uint256 indexed tokenId, string tier)
        // Topic[0] = event sig, Topic[1] = to, Topic[2] = tokenId
        let tokenId = null;
        let mintedTier = tier;
        if (mintResult.logs) {
          for (const log of mintResult.logs) {
            if (log.address && log.address.toLowerCase() === PASS_CONTRACT.toLowerCase() && log.topics && log.topics.length >= 3) {
              const topicSig = log.topics[0];
              // Minted event: 0xe7cd4ce7f2a465edc730269a1305e8a48bad821e8fb7e152ec413829c01a53c4
              if (topicSig === '0xe7cd4ce7f2a465edc730269a1305e8a48bad821e8fb7e152ec413829c01a53c4') {
                tokenId = parseInt(log.topics[2], 16);
                mintedTier = tokenId <= 1000 ? 'we are so early' : 'early-ish';
              }
            }
          }
        }

        // Step 7: Notify backend to register pass in KV store
        try {
          const notifyData = await api.postRoot('/membership/stack-pass', {
            address: wallet,
            txHash,
            nftMint: true,
            tokenId,
            tier: mintedTier,
          });
          if (!output.isJsonMode() && notifyData.verified) {
            console.log(chalk.dim('Pass registered with Net Library backend.'));
          }
        } catch {
          // Non-fatal — pass is on-chain regardless
        }

        // Step 8: Post-mint membership handling for "we are so early" tier
        let membership = null;
        let membershipGranted = false;
        if (mintedTier === 'we are so early') {
          // Use pre-mint check if available, otherwise check now
          const memberCheck = preMintMember || await checkMembership(wallet);

          if (!memberCheck.isMember) {
            // Not a member — attempt to auto-grant free membership
            if (!output.isJsonMode()) {
              console.log(chalk.dim('Granting free Net Library membership...'));
            }
            membership = await grantFreeMembership(wallet);
            membershipGranted = !!membership;
          } else {
            // Already a member
            membership = { alreadyMember: true, ...memberCheck };
          }
        }

        // JSON output
        if (output.isJsonMode()) {
          const result = {
            status: 'minted',
            txHash,
            tokenId,
            tier: mintedTier,
            contract: PASS_CONTRACT,
          };
          result.freeHazzaName = true;
          if (mintedTier === 'we are so early') {
            result.freeMembership = true;
            if (membershipGranted && membership) {
              result.membershipGranted = true;
              result.memberId = membership.memberId;
              result.ensSubname = membership.ensSubname;
            } else if (membership && membership.alreadyMember) {
              result.membershipGranted = false;
              result.alreadyMember = true;
              result.memberId = membership.memberId;
              result.ensSubname = membership.ensSubname;
            } else {
              result.membershipGranted = false;
              result.membershipNote = 'Auto-grant unavailable. Configure adminKey or contact @CherylFromNet.';
            }
          }
          output.json(result);
          return;
        }

        // Human-readable output
        console.log('');
        console.log(chalk.green('✓'), chalk.bold('Unlimited Pass minted!'));
        console.log(`  Token ID: ${chalk.green('#' + tokenId)}`);
        console.log(`  Tier:     ${chalk.cyan(mintedTier)}`);
        console.log(`  Tx:       ${chalk.dim(txHash)}`);

        if (mintedTier === 'we are so early') {
          console.log('');
          if (membershipGranted && membership) {
            console.log(chalk.green('  🎉 FREE Net Library membership granted!'));
            if (membership.memberId) {
              console.log(`  Member:  ${chalk.green('#' + membership.memberId)}`);
            }
            if (membership.ensSubname) {
              console.log(`  ENS:     ${chalk.cyan(membership.ensSubname)}`);
            }
          } else if (membership && membership.alreadyMember) {
            console.log(chalk.green('  You\'re already a Net Library member — nice, mfer.'));
            if (membership.ensSubname) {
              console.log(`  ENS:     ${chalk.cyan(membership.ensSubname)}`);
            }
          } else {
            console.log(chalk.green('  🎉 You qualify for a FREE Net Library membership!'));
            console.log(chalk.dim('  Auto-grant: netlibrary config set adminKey <key>'));
            console.log(chalk.dim('  Or contact @CherylFromNet or GEAUX to claim.'));
          }
        }

        console.log('');
        console.log(chalk.green('  + 1 FREE name registration on hazza.name'));
        console.log(chalk.dim('  Register at: https://hazza.name'));

        console.log(`\n  View: ${chalk.cyan(`https://basescan.org/token/${PASS_CONTRACT}?a=${tokenId}`)}\n`);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });
};
