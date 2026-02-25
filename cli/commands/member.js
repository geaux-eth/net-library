const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const api = require('../lib/api');
const output = require('../lib/output');
const { handlePayment } = require('../lib/payment');

const PRICES = {
  membership: 2,
  'storage-pass': 20,
  'stack-unlock': 5,
  'grid-unlock': 2,
};

module.exports = function (program) {
  const cmd = program.command('member').description('Membership and purchases');

  cmd
    .command('status')
    .description('Check membership status and available purchases')
    .action(async () => {
      try {
        const data = await api.get('/agents/membership');
        if (output.isJsonMode()) {
          output.json(data);
          return;
        }
        if (data.isMember) {
          output.item(data, [
            ['Status', () => chalk.green('Member')],
            ['Member ID', 'memberId'],
            ['ENS', 'ensSubname'],
            ['Joined', 'joinedAt', v => v ? new Date(v).toLocaleDateString() : null],
            ['Storage Pass', 'hasUnlimitedStoragePass', v => v ? chalk.green('Yes') : 'No'],
            ['Stack Pass', 'hasStackPass', v => v ? chalk.green('Yes') : 'No'],
            ['Grid Pass', 'hasGridPass', v => v ? chalk.green('Yes') : 'No'],
          ]);
        } else {
          console.log(chalk.yellow('Not a member.'));
          console.log(`\nJoin with: ${chalk.cyan('netlibrary member join')}`);
        }

        if (data.availablePurchases && data.availablePurchases.length > 0) {
          console.log('\nAvailable purchases:');
          output.table(
            ['Type', 'Price', 'Description', 'Available'],
            data.availablePurchases.map(p => [
              p.type,
              p.priceDisplay,
              p.description,
              p.available ? chalk.green('Yes') : chalk.dim(p.reason || 'No'),
            ])
          );
        }
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('join')
    .description('Purchase Net Library membership ($2 USDC)')
    .option('--tx-hash <hash>', 'Payment tx hash (if already paid)')
    .option('--admin-grant', 'Grant without payment (admin only)')
    .option('--target <agentId>', 'Target agent for admin grant')
    .action(async (opts) => {
      try {
        const body = { purchaseType: 'membership' };

        if (opts.adminGrant) {
          body.adminGrant = true;
          if (opts.target) body.targetAgentId = opts.target;
        } else {
          body.txHash = await handlePayment(PRICES.membership, { txHash: opts.txHash });
        }

        const data = await api.post('/agents/membership', body);
        output.success(`Membership activated! Member #${data.memberId} (${data.ensSubname})`);
        if (output.isJsonMode()) output.json(data);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('buy <type>')
    .description('Purchase: storage-pass ($20), stack-unlock ($5), grid-unlock ($2)')
    .option('--tx-hash <hash>', 'Payment tx hash (if already paid)')
    .option('--stack-id <id>', 'Stack ID (required for stack-unlock)')
    .option('--admin-grant', 'Grant without payment (admin only)')
    .option('--target <agentId>', 'Target agent for admin grant')
    .action(async (type, opts) => {
      try {
        const validTypes = ['storage-pass', 'stack-unlock', 'grid-unlock'];
        if (!validTypes.includes(type)) {
          output.error(`Invalid type. Choose: ${validTypes.join(', ')}`);
          process.exit(1);
        }

        if (type === 'stack-unlock' && !opts.stackId) {
          output.error('--stack-id is required for stack-unlock');
          process.exit(1);
        }

        const body = { purchaseType: type };
        if (opts.stackId) body.stackId = opts.stackId;

        if (opts.adminGrant) {
          body.adminGrant = true;
          if (opts.target) body.targetAgentId = opts.target;
        } else {
          body.txHash = await handlePayment(PRICES[type], { txHash: opts.txHash });
        }

        const data = await api.post('/agents/membership', body);
        output.success(`${type} purchased!`);
        if (output.isJsonMode()) output.json(data);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('ens')
    .description('Mint or retry ENS subname')
    .action(async () => {
      try {
        const data = await api.post('/agents/ens', {});
        if (data.alreadyMinted) {
          output.success(`ENS already minted: ${data.ensSubname}`);
        } else {
          output.success(`ENS minted: ${data.ensSubname}`);
        }
        if (output.isJsonMode()) output.json(data);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('link [url]')
    .description('Check or set Net Protocol link (no arg = check, with URL = set)')
    .option('--label <label>', 'Display label for the link')
    .option('--remove', 'Remove the current link')
    .action(async (url, opts) => {
      try {
        if (opts.remove) {
          const data = await api.del('/agents/link', {});
          output.success('Link removed');
          return;
        }

        if (!url) {
          // Check link status
          const data = await api.get('/agents/link');
          if (output.isJsonMode()) {
            output.json(data);
            return;
          }
          if (data.linked) {
            output.item(data, [
              ['Linked', () => chalk.green('Yes')],
              ['URL', 'url'],
              ['Label', 'label'],
              ['Linked At', 'linkedAt', v => v ? new Date(v).toLocaleString() : null],
            ]);
          } else {
            console.log(chalk.dim('No Net Protocol link set.'));
            console.log(`Set one with: ${chalk.cyan('netlibrary member link <url>')}`);
          }
        } else {
          // Set link
          const body = { url };
          if (opts.label) body.label = opts.label;
          const data = await api.post('/agents/link', body);
          output.success(`Linked: ${data.url}`);
          if (output.isJsonMode()) output.json(data);
        }
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('list')
    .description('List all library members (members only)')
    .option('-l, --limit <n>', 'Max members to show', parseInt)
    .option('-s, --sort <sort>', 'Sort: id, newest, platform', 'id')
    .action(async (opts) => {
      try {
        const csvText = await api.getRaw('/member-registry/csv', { auth: false, root: true });
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');
        const members = lines.slice(1).map(line => {
          const cells = line.match(/(".*?"|[^,]+)/g) || [];
          return cells.reduce((obj, cell, i) => {
            obj[headers[i]] = cell.replace(/^"|"$/g, '');
            return obj;
          }, {});
        });

        if (opts.sort === 'newest') members.reverse();
        else if (opts.sort === 'platform') members.sort((a, b) => (a.signup_platform || '').localeCompare(b.signup_platform || ''));

        const display = opts.limit ? members.slice(0, opts.limit) : members;

        if (output.isJsonMode()) {
          output.json({ members: display, total: members.length });
          return;
        }

        output.table(
          ['#', 'Username', 'Address', 'FID', 'Platform', 'ENS'],
          display.map(m => [
            m.member_id,
            m.username || chalk.dim('—'),
            m.address ? m.address.slice(0, 8) + '...' + m.address.slice(-4) : '—',
            m.fid || chalk.dim('—'),
            m.signup_platform || 'farcaster',
            m.ens_subname || chalk.dim('—'),
          ])
        );
        console.log(chalk.dim(`\n${members.length} members total`));
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('csv')
    .description('Download member registry as CSV (members only)')
    .option('-o, --output <file>', 'Save to file (default: print to stdout)')
    .action(async (opts) => {
      try {
        const csvText = await api.getRaw('/member-registry/csv', { auth: false, root: true });
        if (opts.output) {
          const outPath = path.resolve(opts.output);
          fs.writeFileSync(outPath, csvText);
          output.success(`CSV saved to ${outPath}`);
        } else {
          if (output.isJsonMode()) {
            // Parse CSV to JSON
            const lines = csvText.trim().split('\n');
            const headers = lines[0].split(',');
            const rows = lines.slice(1).map(line => {
              const cells = line.match(/(".*?"|[^,]+)/g) || [];
              return cells.reduce((obj, cell, i) => {
                obj[headers[i]] = cell.replace(/^"|"$/g, '');
                return obj;
              }, {});
            });
            output.json({ members: rows, total: rows.length });
          } else {
            console.log(csvText);
          }
        }
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('verify')
    .description('Re-check ERC-8004 verification status')
    .option('--token-id <id>', 'Specific ERC-8004 token ID to verify')
    .action(async (opts) => {
      try {
        const body = {};
        if (opts.tokenId) body.tokenId = parseInt(opts.tokenId);
        const data = await api.post('/agents/verify-8004', body);
        if (output.isJsonMode()) {
          output.json(data);
          return;
        }
        if (data.verified) {
          output.success(`ERC-8004 verified! Token ID: ${data.tokenId}`);
        } else {
          output.warn('Not verified on ERC-8004.');
          console.log(data.message || '');
        }
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });
};
