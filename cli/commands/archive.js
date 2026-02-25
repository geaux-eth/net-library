const api = require('../lib/api');
const output = require('../lib/output');

module.exports = function (program) {
  program
    .command('archive [castHash]')
    .description('Archive a Farcaster cast as a library item')
    .option('--cast-url <url>', 'Warpcast URL (alternative to castHash)')
    .option('--text <text>', 'Cast text content')
    .option('--title <title>', 'Custom title')
    .option('-c, --category <cat...>', 'Additional categories')
    .option('--author-fid <n>', 'Author FID')
    .option('--author-username <name>', 'Author username')
    .option('--add-to-stack <stackId>', 'Add to stack after archiving')
    .action(async (castHash, opts) => {
      try {
        if (!castHash && !opts.castUrl) {
          output.error('Provide a cast hash or --cast-url');
          process.exit(1);
        }

        const body = {};
        if (castHash) body.castHash = castHash;
        if (opts.castUrl) body.castUrl = opts.castUrl;
        if (opts.text) body.text = opts.text;
        if (opts.title) body.title = opts.title;
        if (opts.category) body.categories = opts.category;
        if (opts.authorFid) body.authorFid = parseInt(opts.authorFid);
        if (opts.authorUsername) body.authorUsername = opts.authorUsername;
        if (opts.addToStack) body.addToStack = opts.addToStack;

        const data = await api.post('/archive', body);
        output.success(`Archived: ${data.contentKey}`);
        if (output.isJsonMode()) output.json(data);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });
};
