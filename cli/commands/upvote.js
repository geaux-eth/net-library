const { execSync } = require('child_process');
const chalk = require('chalk');
const { keccak256 } = require('js-sha3');
const api = require('../lib/api');
const output = require('../lib/output');
const config = require('../lib/config');
const { confirm } = require('../lib/payment');

// --- Contract addresses (Base, chainId 8453) ---
const UPVOTE_STORAGE_APP = '0x000000060CEB69D023227DF64CfB75eC37c75B62';
const PURE_ALPHA_STRATEGY = '0x00000001b1bcdeddeafd5296aaf4f3f3e21ae876';
const SCORE_CONTRACT = '0x0000000FA09B022E5616E5a173b4b67FA2FBcF28';
const UPVOTE_COST_ETH = 0.000025;

// --- Helpers ---

function requireAuth() {
  const cfg = config.load();
  const key = process.env.NETLIB_API_KEY || cfg.apiKey;
  if (!key) {
    output.error('API key required (membership). Run: netlibrary config set apiKey <key>');
    process.exit(1);
  }
}

function hasCast() {
  try {
    execSync('which cast', { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Pad a hex string to bytes32 (64 hex chars, no 0x prefix).
 * Short hex values are LEFT-padded with zeros (matching the app's generateScoreKey).
 */
function toBytes32(hex) {
  const clean = hex.replace(/^0x/i, '');
  if (clean.length > 64) return clean.slice(0, 64);
  return clean.padStart(64, '0');
}

/**
 * Compute scoreKey = keccak256(abi.encodePacked(bytes32(storageKey), address(operator)))
 * This matches the app's generateScoreKey() exactly.
 */
function generateScoreKey(storageKeyHex, operatorAddress) {
  const keyBytes = toBytes32(storageKeyHex);
  const addrBytes = operatorAddress.replace(/^0x/i, '').toLowerCase().padStart(40, '0');
  const packed = keyBytes + addrBytes; // 64 + 40 = 104 hex chars = 52 bytes
  return '0x' + keccak256(Buffer.from(packed, 'hex'));
}

/**
 * Fetch upvote counts from the app's /api/upvotes endpoint.
 * Takes array of { scoreKey, contentKey } objects.
 */
async function fetchUpvoteCounts(entries) {
  const scoreKeys = entries.map(e => e.scoreKey);
  const contentKeys = entries.map(e => e.contentKey);
  // /api/upvotes is at the app root, not under /api/v1/
  const data = await api.postRoot('/upvotes', { scoreKeys, contentKeys }, { auth: false });
  // Response: { success, counts: [number], contentKeys: [string] }
  // Convert array to map keyed by contentKey for easy lookup
  const countsMap = {};
  if (Array.isArray(data.counts)) {
    const keys = data.contentKeys || contentKeys;
    keys.forEach((k, i) => { countsMap[k] = data.counts[i] || 0; });
  }
  return countsMap;
}

/**
 * Send upvote transaction via Foundry cast (or show manual instructions).
 */
async function sendUpvoteTx(operatorAddress, storageKeyBytes32, count, opts) {
  const cfg = config.load();
  const wallet = opts.wallet || process.env.NETLIB_WALLET || cfg.wallet;
  const rpcUrl = opts.rpcUrl || process.env.BASE_RPC_URL || cfg.rpcUrl;
  const totalCost = UPVOTE_COST_ETH * count;

  if (opts.txHash) return opts.txHash;

  if (!hasCast()) {
    console.log('');
    console.log(chalk.yellow('Send this transaction on Base to upvote:'));
    console.log('');
    console.log(`  Contract: ${chalk.cyan(UPVOTE_STORAGE_APP)}`);
    console.log(`  Function: ${chalk.cyan('upvote(address,address,bytes32,uint256,bytes)')}`);
    console.log(`  Args:`);
    console.log(`    strategy:  ${PURE_ALPHA_STRATEGY}`);
    console.log(`    operator:  ${operatorAddress}`);
    console.log(`    key:       0x${storageKeyBytes32}`);
    console.log(`    count:     ${count}`);
    console.log(`    context:   0x`);
    console.log(`  Value:    ${chalk.green(`${totalCost} ETH`)}`);
    console.log(`  Chain:    Base (8453)`);
    console.log('');
    console.log(`After sending, re-run with ${chalk.cyan('--tx-hash <hash>')}`);
    process.exit(0);
  }

  if (!wallet) {
    throw new Error('No wallet configured. Run: netlibrary config set wallet <address>');
  }

  const ok = await confirm(
    `Upvote ${count}x for ${totalCost} ETH (you receive $ALPHA in return). Proceed?`
  );
  if (!ok) {
    console.log('Cancelled.');
    process.exit(0);
  }

  const cmd = [
    'cast', 'send', UPVOTE_STORAGE_APP,
    '"upvote(address,address,bytes32,uint256,bytes)"',
    PURE_ALPHA_STRATEGY,
    operatorAddress,
    `0x${storageKeyBytes32}`,
    String(count),
    '0x',
    '--value', `${totalCost}ether`,
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
    console.log(chalk.dim(`Sending upvote tx (${totalCost} ETH → $ALPHA)...`));
  }

  try {
    const result = execSync(cmd.join(' '), { encoding: 'utf8', timeout: 120000 });
    const parsed = JSON.parse(result);
    const txHash = parsed.transactionHash;
    if (!output.isJsonMode()) {
      console.log(chalk.green('✓'), `Upvote sent: ${txHash}`);
      console.log(chalk.dim('  You received $ALPHA tokens. Net is $ALPHA.'));
    }
    return txHash;
  } catch (err) {
    throw new Error(`Upvote tx failed: ${err.message}`);
  }
}

// --- Resolver functions: fetch entity details from API ---

async function resolveItem(contentKey) {
  const data = await api.get('/library', { query: { contentKey }, auth: false });
  const items = data.items || data.results || [];
  if (items.length === 0) throw new Error(`Item not found: ${contentKey}`);
  const item = items[0];
  return {
    name: item.title || item.name || contentKey,
    operator: item.operator || item.operatorAddress,
    storageKey: contentKey,
    author: item.author || (item.uploader && item.uploader.username) || '—',
  };
}

async function resolveStack(stackId) {
  const data = await api.get('/stacks', { query: { id: stackId }, auth: false });
  const stacks = data.stacks || [];
  if (stacks.length === 0) throw new Error(`Stack not found: ${stackId}`);
  const stack = stacks[0];
  return {
    name: stack.name || stackId,
    operator: stack.owner,
    storageKey: stackId,
    author: stack.ownerUsername || stack.owner || '—',
  };
}

async function resolveGrid(gridId) {
  // Grid API not yet available — user must provide gridId + creator address
  // For now, we require the gridId to include the creator via --wallet or we error
  throw new Error('Grid lookup not yet available via API. Use: netlibrary upvote grid <gridId> --tx-hash <hash> to upvote a grid directly after sending the tx manually.');
}

async function resolveMember(identifier) {
  // Use member registry CSV since /members API doesn't exist
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

  const isAddress = identifier.startsWith('0x');
  const member = isAddress
    ? members.find(m => m.address && m.address.toLowerCase() === identifier.toLowerCase())
    : members.find(m => m.member_id === identifier || m.username === identifier);

  if (!member) throw new Error(`Member not found: ${identifier}`);

  return {
    name: member.username || member.ens_subname || identifier,
    operator: member.address,
    storageKey: member.address,
    author: member.username || '—',
  };
}

// --- Common upvote action ---

async function doUpvote(type, resolver, id, opts) {
  try {
    requireAuth();
    const count = parseInt(opts.count) || 1;
    const totalCost = (UPVOTE_COST_ETH * count).toFixed(6);

    const entity = await resolver(id);
    if (!entity.operator) {
      throw new Error(`Could not resolve operator address for this ${type}`);
    }

    if (!output.isJsonMode()) {
      console.log('');
      console.log(`  ${chalk.cyan(type.charAt(0).toUpperCase() + type.slice(1))}: ${entity.name}`);
      console.log(`  By: ${entity.author}`);
      console.log(`  Cost: ${chalk.green(`${totalCost} ETH`)} (${count} upvote${count > 1 ? 's' : ''})`);
      console.log(`  You receive: ${chalk.green('$ALPHA')} tokens`);
      console.log('');
    }

    const storageKeyBytes32 = toBytes32(entity.storageKey);
    const txHash = await sendUpvoteTx(entity.operator, storageKeyBytes32, count, opts);

    if (output.isJsonMode()) {
      output.json({
        success: true,
        type,
        id,
        name: entity.name,
        operator: entity.operator,
        count,
        costEth: totalCost,
        txHash,
        reward: '$ALPHA',
      });
    }
  } catch (err) {
    output.error(err.message);
    process.exit(1);
  }
}

// --- Command registration ---

module.exports = function (program) {
  const cmd = program
    .command('upvote')
    .description('Upvote library content onchain (costs ETH, you receive $ALPHA)');

  // --- upvote item ---
  cmd
    .command('item <contentKey>')
    .description('Upvote a library item')
    .option('-n, --count <n>', 'Number of upvotes', '1')
    .option('--tx-hash <hash>', 'Pre-sent tx hash')
    .option('--wallet <addr>', 'Override wallet')
    .option('--rpc-url <url>', 'Override RPC URL')
    .action((contentKey, opts) => doUpvote('item', resolveItem, contentKey, opts));

  // --- upvote stack ---
  cmd
    .command('stack <stackId>')
    .description('Upvote a stack')
    .option('-n, --count <n>', 'Number of upvotes', '1')
    .option('--tx-hash <hash>', 'Pre-sent tx hash')
    .option('--wallet <addr>', 'Override wallet')
    .option('--rpc-url <url>', 'Override RPC URL')
    .action((stackId, opts) => doUpvote('stack', resolveStack, stackId, opts));

  // --- upvote grid ---
  cmd
    .command('grid <gridId>')
    .description('Upvote a grid')
    .option('-n, --count <n>', 'Number of upvotes', '1')
    .option('--tx-hash <hash>', 'Pre-sent tx hash')
    .option('--wallet <addr>', 'Override wallet')
    .option('--rpc-url <url>', 'Override RPC URL')
    .action((gridId, opts) => doUpvote('grid', resolveGrid, gridId, opts));

  // --- upvote member ---
  cmd
    .command('member <identifier>')
    .description('Upvote a member profile (address or member ID)')
    .option('-n, --count <n>', 'Number of upvotes', '1')
    .option('--tx-hash <hash>', 'Pre-sent tx hash')
    .option('--wallet <addr>', 'Override wallet')
    .option('--rpc-url <url>', 'Override RPC URL')
    .action((identifier, opts) => doUpvote('member', resolveMember, identifier, opts));

  // --- upvote counts ---
  cmd
    .command('counts <type> [ids...]')
    .description('Check upvote counts (items, stacks, grids, members)')
    .action(async (type, ids) => {
      try {
        if (!ids || ids.length === 0) {
          output.error('Provide at least one ID');
          process.exit(1);
        }

        const validTypes = ['items', 'stacks', 'grids', 'members'];
        if (!validTypes.includes(type)) {
          output.error(`Invalid type. Choose: ${validTypes.join(', ')}`);
          process.exit(1);
        }

        // Resolve each entity to get operator addresses for scoreKey computation
        const resolvers = {
          items: resolveItem,
          stacks: resolveStack,
          grids: resolveGrid,
          members: resolveMember,
        };

        const entries = [];
        for (const id of ids) {
          try {
            const entity = await resolvers[type](id);
            const scoreKey = generateScoreKey(entity.storageKey, entity.operator);
            entries.push({ id, name: entity.name, scoreKey, contentKey: entity.storageKey });
          } catch (err) {
            if (!output.isJsonMode()) output.warn(`Could not resolve ${id}: ${err.message}`);
          }
        }

        if (entries.length === 0) {
          output.error('No valid entities found');
          process.exit(1);
        }

        const countsMap = await fetchUpvoteCounts(entries);

        output.table(
          ['ID', 'Name', '▲ Upvotes'],
          entries.map(e => [
            e.id.length > 20 ? e.id.slice(0, 10) + '...' + e.id.slice(-6) : e.id,
            e.name,
            String(countsMap[e.contentKey] || 0),
          ])
        );
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  // --- upvote top ---
  cmd
    .command('top')
    .description('Show most upvoted content')
    .option('-t, --type <type>', 'Entity type: items, stacks, grids, members', 'items')
    .option('-l, --limit <n>', 'Max results', '10')
    .action(async (opts) => {
      try {
        const type = opts.type;
        const limit = parseInt(opts.limit) || 10;
        let results = [];

        if (type === 'items') {
          const data = await api.get('/library', { query: { sortBy: 'upvotes', limit }, auth: false });
          results = (data.items || data.results || []).map((item, i) => [
            String(i + 1),
            item.title || item.name || '—',
            item.author || item.uploaderUsername || '—',
            String(item.upvotes || 0),
          ]);
        } else if (type === 'stacks') {
          const data = await api.get('/stacks', { query: { sortBy: 'upvotes', limit }, auth: false });
          results = (data.stacks || []).map((s, i) => [
            String(i + 1),
            s.name || '—',
            s.ownerUsername || s.owner || '—',
            String(s.upvotes || 0),
          ]);
        } else if (type === 'grids') {
          output.warn('Grid ranking not yet available via API. Use the web app to discover grids.');
          return;
        } else if (type === 'members') {
          output.warn('Member ranking by upvotes not yet available via API. Use "netlibrary upvote counts members <address>" to check specific members.');
          return;
        } else {
          output.error('Invalid type. Choose: items, stacks, grids, members');
          process.exit(1);
        }

        if (!output.isJsonMode()) {
          console.log(`\nTop ${type} by upvotes:`);
        }
        output.table(['#', 'Name', 'Author/Owner', '▲ Upvotes'], results);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });
};
