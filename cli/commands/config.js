const chalk = require('chalk');
const config = require('../lib/config');
const output = require('../lib/output');

module.exports = function (program) {
  const cmd = program.command('config').description('Manage CLI configuration');

  cmd
    .command('set <key> <value>')
    .description(`Set a config value. Keys: ${config.VALID_KEYS.join(', ')}`)
    .action((key, value) => {
      // Accept kebab-case and convert to camelCase
      const keyMap = {
        'api-key': 'apiKey',
        'base-url': 'baseUrl',
        'rpc-url': 'rpcUrl',
        'admin-key': 'adminKey',
        'wallet': 'wallet',
      };
      const resolved = keyMap[key] || key;

      if (!config.VALID_KEYS.includes(resolved)) {
        output.error(`Invalid key "${key}". Valid keys: ${config.VALID_KEYS.join(', ')}`);
        process.exit(1);
      }
      config.set(resolved, value);
      output.success(`Set ${resolved} = ${key === 'api-key' || key === 'apiKey' ? value.slice(0, 8) + '...' : value}`);
    });

  cmd
    .command('get <key>')
    .description('Get a config value')
    .action((key) => {
      const keyMap = {
        'api-key': 'apiKey',
        'base-url': 'baseUrl',
        'rpc-url': 'rpcUrl',
        'admin-key': 'adminKey',
        'wallet': 'wallet',
      };
      const resolved = keyMap[key] || key;
      const val = config.get(resolved);
      if (output.isJsonMode()) {
        output.json({ [resolved]: val || null });
      } else {
        console.log(val || chalk.dim('(not set)'));
      }
    });

  cmd
    .command('show')
    .description('Show all config values')
    .action(() => {
      const cfg = config.load();
      if (output.isJsonMode()) {
        output.json(cfg);
        return;
      }
      const masked = { ...cfg };
      if (masked.apiKey) masked.apiKey = masked.apiKey.slice(0, 8) + '...';
      if (masked.adminKey) masked.adminKey = masked.adminKey.slice(0, 8) + '...';
      output.item(masked, [
        ['API Key', 'apiKey'],
        ['Base URL', 'baseUrl'],
        ['Wallet', 'wallet'],
        ['RPC URL', 'rpcUrl'],
        ['Admin Key', 'adminKey'],
      ]);
      console.log(chalk.dim(`\nConfig file: ${config.CONFIG_FILE}`));
    });
};
