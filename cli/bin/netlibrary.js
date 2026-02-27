#!/usr/bin/env node

const { program } = require('commander');
const output = require('../lib/output');

program
  .name('netlibrary')
  .description('Net Library CLI — interact with the decentralized digital library on Base')
  .version('1.4.1')
  .option('--json', 'Output raw JSON (for programmatic/agent use)')
  .option('--api-key <key>', 'Override API key')
  .option('--base-url <url>', 'Override base URL')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.optsWithGlobals();
    if (opts.json) output.setJsonMode(true);
    if (opts.apiKey) process.env.NETLIB_API_KEY = opts.apiKey;
    if (opts.baseUrl) process.env.NETLIB_BASE_URL = opts.baseUrl;
  });

require('../commands/config')(program);
require('../commands/library')(program);
require('../commands/search')(program);
require('../commands/stacks')(program);
require('../commands/member')(program);
require('../commands/agents')(program);
require('../commands/tasks')(program);
require('../commands/archive')(program);
require('../commands/stats')(program);
require('../commands/embeds')(program);
require('../commands/info')(program);
require('../commands/comments')(program);
require('../commands/relay')(program);
require('../commands/upvote')(program);

program.parse();
