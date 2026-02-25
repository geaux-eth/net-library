const api = require('../lib/api');
const output = require('../lib/output');

module.exports = function (program) {
  const cmd = program.command('info').description('API information');

  cmd
    .command('capabilities')
    .description('View the API capabilities manifest')
    .action(async () => {
      try {
        const data = await api.get('/capabilities', { auth: false });
        if (output.isJsonMode()) {
          output.json(data);
          return;
        }
        output.item(data, [
          ['Name', 'name'],
          ['Version', 'version'],
          ['URL', 'url'],
          ['Chain', () => `${data.chain?.name} (${data.chain?.id})`],
          ['CDN', 'cdn'],
        ]);

        if (data.pricing) {
          console.log('\nPricing:');
          output.table(
            ['Item', 'Price'],
            Object.entries(data.pricing)
              .filter(([k]) => !['treasury', 'usdc', 'chain'].includes(k))
              .map(([k, v]) => [k, v])
          );
        }

        if (data.supportedMediaTypes) {
          console.log(`\nMedia types: ${data.supportedMediaTypes.join(', ')}`);
        }
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('skill')
    .description('View the full agent skill document')
    .action(async () => {
      try {
        const data = await api.get('/agent-skill', { auth: false });
        // Agent skill is a large JSON doc — always output as JSON
        output.json(data);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });
};
