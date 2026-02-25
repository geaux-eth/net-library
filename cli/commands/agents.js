const api = require('../lib/api');
const output = require('../lib/output');
const config = require('../lib/config');

module.exports = function (program) {
  const cmd = program.command('agents').description('Agent management');

  cmd
    .command('me')
    .description('View your agent profile and widgets')
    .action(async () => {
      try {
        const data = await api.get('/agents/me');
        if (output.isJsonMode()) {
          output.json(data);
          return;
        }
        const agent = data.agent || {};
        const profile = agent.profile || {};
        const membership = data.membership || {};
        output.item({}, [
          ['ID', () => agent.id],
          ['Name', () => profile.name || agent.name],
          ['Address', () => agent.address],
          ['FID', () => agent.fid],
          ['Permissions', () => (agent.permissions || []).join(', ')],
          ['Created', () => agent.createdAt ? new Date(agent.createdAt).toLocaleString() : null],
        ]);

        if (membership.memberId) {
          console.log('\nMembership:');
          output.item(membership, [
            ['Member ID', 'memberId'],
            ['ENS', 'ensSubname'],
            ['Since', 'memberSince', v => v ? new Date(v).toLocaleDateString() : null],
          ]);
        }

        if (data.widgets) {
          console.log('\nWidgets:');
          const w = data.widgets;
          if (w.libraryCard) console.log(`  Library Card: ${w.libraryCard.url}`);
          if (w.profile) console.log(`  Profile:      ${w.profile.url}`);
          if (w.stacks && w.stacks.length > 0) {
            w.stacks.forEach(s => console.log(`  Stack:        ${s.url} (${s.name})`));
          }
        }
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('register')
    .description('Register a new agent (admin only)')
    .requiredOption('--id <id>', 'Agent ID (lowercase, alphanumeric + hyphens)')
    .requiredOption('--name <name>', 'Agent display name')
    .option('--permissions <perms...>', 'Permissions', ['library:write', 'stacks:create', 'stacks:write'])
    .option('--address <addr>', 'Wallet address')
    .option('--description <desc>', 'Description')
    .option('--fid <n>', 'Farcaster FID')
    .option('--pfp-url <url>', 'Profile picture URL')
    .option('--webhook-url <url>', 'Webhook URL')
    .action(async (opts) => {
      try {
        const cfg = config.load();
        const adminKey = process.env.NETLIB_ADMIN_KEY || cfg.adminKey;
        if (!adminKey) {
          output.error('Admin key required. Set with: netlibrary config set admin-key <key>');
          process.exit(1);
        }

        const body = {
          id: opts.id,
          name: opts.name,
          permissions: opts.permissions,
        };
        if (opts.address) body.address = opts.address;
        if (opts.description) body.description = opts.description;
        if (opts.fid) body.fid = parseInt(opts.fid);
        if (opts.pfpUrl) body.pfpUrl = opts.pfpUrl;
        if (opts.webhookUrl) body.webhookUrl = opts.webhookUrl;

        const data = await api.post('/agents', body, {
          headers: { 'Authorization': `Bearer ${adminKey}` },
          auth: false,
        });

        output.success(`Agent "${opts.id}" registered!`);
        if (data.agent?.apiKey) {
          console.log(`\nAPI Key: ${data.agent.apiKey}`);
          console.log('Save this key — it cannot be retrieved again!');
        }
        if (output.isJsonMode()) output.json(data);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('list')
    .description('List all agents (admin only)')
    .action(async () => {
      try {
        const data = await api.get('/agents');
        output.table(
          ['ID', 'Name', 'Address', 'Permissions', 'Active'],
          (data.agents || []).map(a => [
            a.id,
            a.name || '—',
            a.address ? a.address.slice(0, 10) + '...' : '—',
            (a.permissions || []).join(', '),
            a.isActive ? 'Yes' : 'No',
          ])
        );
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('update')
    .description('Update your agent profile')
    .option('--name <name>', 'Display name')
    .option('--description <desc>', 'Description')
    .option('--address <addr>', 'Wallet address')
    .option('--pfp-url <url>', 'Profile picture URL')
    .option('--webhook-url <url>', 'Webhook URL')
    .option('--fid <n>', 'Farcaster FID')
    .option('--8004-token-id <n>', 'ERC-8004 token ID')
    .option('--id <agentId>', 'Target agent ID (admin only)')
    .action(async (opts) => {
      try {
        const body = {};
        if (opts.id) body.id = opts.id;
        if (opts.name) body.name = opts.name;
        if (opts.description) body.description = opts.description;
        if (opts.address) body.address = opts.address;
        if (opts.pfpUrl) body.pfpUrl = opts.pfpUrl;
        if (opts.webhookUrl) body.webhookUrl = opts.webhookUrl;
        if (opts.fid) body.fid = parseInt(opts.fid);
        if (opts['8004TokenId']) body.erc8004TokenId = parseInt(opts['8004TokenId']);

        const data = await api.put('/agents', body);
        output.success('Agent updated');
        if (data.erc8004Verification) {
          if (data.erc8004Verification.verified) {
            output.success(`ERC-8004 verified! Token ID: ${data.erc8004Verification.tokenId}`);
          }
        }
        if (output.isJsonMode()) output.json(data);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('deactivate <agentId>')
    .description('Deactivate an agent (admin only)')
    .action(async (agentId) => {
      try {
        const data = await api.del('/agents', { id: agentId });
        output.success(`Agent "${agentId}" deactivated`);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });
};
